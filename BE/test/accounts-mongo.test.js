import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { User, Session, AuthToken, AuthIdentity, AuthChallenge, EmailOutbox } from '../src/models/index.js';
import { createMongoAccountStore } from '../src/auth/mongo-accounts.js';
import { createAuthService } from '../src/auth/service.js';
import { createAccountsService } from '../src/auth/accounts-service.js';
import { createDeliveryCrypto } from '../src/auth/delivery-crypto.js';
import { assertAuthIndexes } from '../src/auth/index-check.js';
import { dispatchAuthMail } from '../src/mail/auth-mail.js';
import { testConfig } from '../test-support/auth-store.js';
import { createApp } from '../src/app.js';
import { once } from 'node:events';

test('Account flows on a real replica set', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated Mongo test database not configured', timeout: 60_000 }, async (t) => {
  const uri = process.env.TEST_MONGODB_URI;
  assert.equal(new URL(uri).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(uri);
  const config = testConfig();
  const store = createMongoAccountStore();
  const auth = await createAuthService({ store, config });
  const prefix = `account-${randomBytes(8).toString('hex')}`;
  const email = `${prefix}@example.com`;
  const password = 'initial account password';
  const profiles = new Map();
  const accounts = createAccountsService({ store, config, verifyGoogle: async (credential) => profiles.get(credential) });
  const crypto = createDeliveryCrypto(config.mailKeyHex);
  const ids = []; const nonces = [];
  const terms = { termsAccepted: true, termsVersion: config.termsVersion };
  const challenge = async (identity = null) => {
    const result = await accounts.googleChallenge({ intent: identity ? 'link' : 'login' }, identity);
    nonces.push(result.nonce); return result.nonce;
  };
  const latestMail = async (userId, purpose) => {
    const job = await EmailOutbox.collection.find({ userId, templateKey: purpose }).sort({ createdAt: -1, _id: -1 }).next();
    return { job, raw: crypto.open(job.encryptedDeliveryData, job.eventId).token };
  };
  let user; let first;
  try {
    for (const model of [User, Session, AuthToken, AuthIdentity, AuthChallenge, EmailOutbox]) await model.createIndexes();
    await assertAuthIndexes();
    const challengeIndex = AuthChallenge.schema.indexes().find(([, options]) => options.unique)[1].name;
    await AuthChallenge.collection.dropIndex(challengeIndex);
    await assert.rejects(assertAuthIndexes(), /unique indexes missing/u);
    await AuthChallenge.createIndexes(); await assertAuthIndexes();
    await t.test('Signup requires Terms, queues encrypted verification and rolls back duplicate accounts', async () => {
      await assert.rejects(accounts.register({ displayName: 'Tester', email, password }), /TERMS_REQUIRED/u);
      await accounts.register({ displayName: 'Tester', email, password, ...terms });
      user = await store.findUserByEmail(email); ids.push(user._id);
      assert.equal(user.emailVerifiedAt, null);
      const queued = await latestMail(user._id, 'verify_email');
      assert.ok(!JSON.stringify(queued.job).includes(queued.raw));
      first = await auth.login({ email, password });
      await assert.rejects(accounts.register({ displayName: 'Duplicate', email, password, ...terms }), /ACCOUNT_UNAVAILABLE/u);
      assert.equal(await EmailOutbox.collection.countDocuments({ userId: user._id }), 1);
      const identity = await auth.authenticate(first.accessToken);
      await accounts.resendVerification(identity, {});
      await assert.rejects(accounts.verifyEmail({ token: queued.raw }), /INVALID_TOKEN/u);
      const current = await latestMail(user._id, 'verify_email');
      const consumed = await Promise.allSettled([accounts.verifyEmail({ token: current.raw }), accounts.verifyEmail({ token: current.raw })]);
      assert.equal(consumed.filter((result) => result.status === 'fulfilled').length, 1);
      assert.ok((await store.findUserById(user._id)).emailVerifiedAt);
    });
    await t.test('Password change retains current session, revokes others and invalidates reset links', async () => {
      const other = await auth.login({ email, password });
      await accounts.requestRecovery({ email });
      const reset = await latestMail(user._id, 'reset_password');
      const identity = await auth.authenticate(first.accessToken);
      await assert.rejects(accounts.changePassword(identity, first.refreshToken, { currentPassword: 'wrong password value', password: 'replacement password' }), /INVALID_CREDENTIALS/u);
      first = await accounts.changePassword(identity, first.refreshToken, { currentPassword: password, password: 'replacement password' });
      await auth.authenticate(first.accessToken);
      await assert.rejects(auth.authenticate(other.accessToken), /UNAUTHENTICATED/u);
      await assert.rejects(accounts.resetPassword({ token: reset.raw, password: 'another valid password' }), /INVALID_TOKEN/u);
      await accounts.requestRecovery({ email });
      const fresh = await latestMail(user._id, 'reset_password');
      await assert.rejects(accounts.verifyEmail({ token: fresh.raw }), /INVALID_TOKEN/u);
      await accounts.resetPassword({ token: fresh.raw, password: 'final account password' });
      await assert.rejects(auth.authenticate(first.accessToken), /UNAUTHENTICATED/u);
      await assert.rejects(accounts.resetPassword({ token: fresh.raw, password: 'replay password value' }), /INVALID_TOKEN/u);
      first = await auth.login({ email, password: 'final account password' });
    });
    await t.test('Google refuses email-only linking; password-proven linking and single-use nonce work', async () => {
      profiles.set('local-google', { subject: `${prefix}-local`, email, displayName: 'Google Tester', authoritativeEmail: false, picture: null });
      await assert.rejects(accounts.googleLogin(await challenge(), { credential: 'local-google', ...terms }), /ACCOUNT_LINK_REQUIRED/u);
      assert.equal(await AuthIdentity.collection.countDocuments({ userId: user._id }), 0);
      const identity = await auth.authenticate(first.accessToken);
      const nonce = await challenge(identity);
      await assert.rejects(accounts.googleLogin(nonce, { credential: 'local-google' }), /GOOGLE_CHALLENGE_INVALID/u);
      await accounts.googleLink(identity, nonce, { credential: 'local-google', currentPassword: 'final account password' });
      await assert.rejects(accounts.googleLink(identity, nonce, { credential: 'local-google', currentPassword: 'final account password' }), /GOOGLE_CHALLENGE_INVALID/u);
      await auth.authenticate((await accounts.googleLogin(await challenge(), { credential: 'local-google' })).accessToken);
      const googleEmail = `${prefix}-external@example.com`;
      profiles.set('external', { subject: `${prefix}-external`, email: googleEmail, displayName: 'External Google', authoritativeEmail: false, picture: null });
      await assert.rejects(accounts.googleLogin(await challenge(), { credential: 'external' }), /TERMS_REQUIRED/u);
      const nonceLogin = await challenge();
      const login = await accounts.googleLogin(nonceLogin, { credential: 'external', ...terms });
      const googleUser = await store.findUserByEmail(googleEmail); ids.push(googleUser._id);
      assert.equal(googleUser.emailVerifiedAt, null);
      await auth.authenticate(login.accessToken);
      await assert.rejects(accounts.googleLogin(nonceLogin, { credential: 'external' }), /GOOGLE_CHALLENGE_INVALID/u);
      assert.deepEqual(await accounts.requestRecovery({ email: googleEmail }), await accounts.requestRecovery({ email: `${prefix}-missing@example.com` }));
      assert.equal(await AuthToken.collection.countDocuments({ userId: googleUser._id, purpose: 'reset_password' }), 0);
      const gmail = `${prefix}@gmail.com`;
      profiles.set('gmail', { subject: `${prefix}-gmail`, email: gmail, displayName: 'Gmail Tester', authoritativeEmail: true, picture: 'https://example.com/google.png' });
      const gmailLogin = await accounts.googleLogin(await challenge(), { credential: 'gmail', ...terms });
      const gmailUser = await store.findUserByEmail(gmail); ids.push(gmailUser._id);
      assert.ok(gmailUser.emailVerifiedAt);
      assert.equal(gmailLogin.user.emailVerified, true);
      assert.equal(gmailUser.avatar.source, 'google');
      assert.equal(await AuthToken.collection.countDocuments({ userId: gmailUser._id }), 0);
    });
    await t.test('Mail dispatcher skips stale links and a lease prevents concurrent duplicate claims', async () => {
      // Previous local jobs now refer to consumed/revoked tokens and must be cancelled.
      const sent = [];
      for (let count = 0; count < 10; count++) {
        const result = await dispatchAuthMail({ config, send: async (message) => { sent.push(message); return 'test-provider'; } });
        if (result.state === 'idle') break;
      }
      assert.equal(sent.length, 1); // Only external Google verification remains valid.
      assert.match(sent[0].url, /\/verify-email#token=[a-f0-9]{64}$/u);
      await accounts.requestRecovery({ email });
      const results = await Promise.all([dispatchAuthMail({ config, send: async (message) => { sent.push(message); return 'test-provider'; } }), dispatchAuthMail({ config, send: async (message) => { sent.push(message); return 'test-provider'; } })]);
      assert.equal(results.filter((result) => result.state === 'sent').length, 1);
      assert.equal(sent.length, 2);
      await accounts.requestRecovery({ email });
      await dispatchAuthMail({ config, send: async () => { throw new Error('secret-provider-error'); } });
      const failed = (await latestMail(user._id, 'reset_password')).job;
      assert.equal(failed.state, 'pending');
      assert.equal(failed.lastErrorCode, 'AUTH_MAIL_DELIVERY_FAILED');
      assert.ok(!JSON.stringify(failed).includes('secret-provider-error'));
    });
    await t.test('Expired reset links and Google challenges are rejected', async () => {
      await accounts.requestRecovery({ email });
      const expired = await latestMail(user._id, 'reset_password');
      await AuthToken.collection.updateOne({ _id: expired.job.authTokenId }, { $set: { expiresAt: new Date(0) } });
      await assert.rejects(accounts.resetPassword({ token: expired.raw, password: 'expired link password' }), /INVALID_TOKEN/u);
      const nonce = await challenge();
      const { tokenHash } = await import('../src/auth/tokens.js');
      await AuthChallenge.collection.updateOne({ tokenHash: tokenHash(nonce) }, { $set: { expiresAt: new Date(0) } });
      await assert.rejects(accounts.googleLogin(nonce, { credential: 'local-google' }), /GOOGLE_CHALLENGE_INVALID/u);
    });
    await t.test('Account HTTP routes enforce validation, Origin, password CSRF and Google nonce cookie', async () => {
      const server = createApp({ authService: auth, authConfig: config, accountsService: accounts }).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const base = `http://127.0.0.1:${server.address().port}/auth`;
      const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { Origin: config.webOrigin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      try {
        assert.equal((await fetch(base + '/capabilities')).status, 200);
        assert.equal((await post('/register', { displayName: 'Tester', email, password, ...terms, ownerId: 'forged' })).status, 400);
        assert.equal((await post('/password/recovery', { email }, { Origin: 'https://evil.example' })).status, 403);
        assert.equal((await post('/password/change', { currentPassword: 'final account password', password: 'new http password' }, { Authorization: `Bearer ${first.accessToken}`, Cookie: `workflow_refresh=${first.refreshToken}` })).status, 403);
        const response = await post('/google/challenge', {});
        assert.equal(response.status, 200);
        const header = response.headers.get('set-cookie');
        assert.ok(header.includes('HttpOnly') && header.includes('SameSite=Strict') && header.includes('Path=/auth/google'));
        nonces.push((await response.json()).nonce);
        assert.equal((await post('/google', { credential: 'local-google' })).status, 401);
        const google = await post('/google', { credential: 'local-google' }, { Cookie: header.split(';')[0] });
        assert.equal(google.status, 200);
        assert.ok(google.headers.get('set-cookie').includes('workflow_refresh='));
        const body = await google.json();
        assert.ok(body.accessToken);
        assert.equal(Object.hasOwn(body, 'refreshToken'), false);
        assert.equal(Object.hasOwn(body.user, 'passwordHash'), false);
      } finally { await new Promise((resolve) => server.close(resolve)); }
    });
  } finally {
    for (const model of [Session, AuthToken, AuthIdentity, AuthChallenge, EmailOutbox]) await model.collection.deleteMany({ userId: { $in: ids } });
    const { tokenHash } = await import('../src/auth/tokens.js');
    await AuthChallenge.collection.deleteMany({ tokenHash: { $in: nonces.map(tokenHash) } });
    await User.collection.deleteMany({ _id: { $in: ids } });
    await mongoose.disconnect();
  }
});
