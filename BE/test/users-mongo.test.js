import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { User, Session, AuthIdentity, EmailOutbox, Notification } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createMongoUsersStore } from '../src/users/mongo-store.js';
import { createUsersService } from '../src/users/service.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';

test('Own Profile/Settings HTTP and concurrency on MongoDB replica set', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated Mongo test database not configured', timeout: 60_000 }, async (t) => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = testConfig(); const password = 'profile integration password';
  const userIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const email = `profile-${randomBytes(8).toString('hex')}@example.com`;
  const store = createMongoUsersStore(); const users = createUsersService({ store });
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  let server;
  try {
    for (const model of [User, Session, AuthIdentity]) await model.createIndexes();
    await new User({ _id: userIds[0], displayName: 'Original User', email, passwordHash: await hashPassword(password), termsAcceptance: { version: 'test-only', acceptedAt: new Date() }, avatar: { source: 'google', googlePictureUrl: 'https://example.com/avatar.png', refreshedAt: new Date() } }).save();
    await new User({ _id: userIds[1], displayName: 'Other User', email: `other-${email}`, termsAcceptance: { version: 'test-only', acceptedAt: new Date() } }).save();
    await new AuthIdentity({ userId: userIds[0], provider: 'google', providerSubject: `subject-${email}`, lastLoginAt: new Date() }).save();
    const login = await auth.login({ email, password }); const identity = await auth.authenticate(login.accessToken);
    server = createApp({ authService: auth, authConfig: config, usersService: users }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/users`;
    const headers = { Origin: config.webOrigin, Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' };
    const get = () => fetch(base + '/me', { headers });
    const patch = (path, body, extra = {}) => fetch(base + path, { method: 'PATCH', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
    const own = () => User.collection.findOne({ _id: userIds[0] });
    await t.test('Unverified Users may view/edit themselves; response and immutable identity fields remain safe', async () => {
      const initial = await own(); const googleIdentity = await AuthIdentity.collection.findOne({ userId: userIds[0] });
      const viewed = await get(); assert.equal(viewed.status, 200);
      const view=await viewed.json();assert.equal(view.user.emailVerified,false);assert.deepEqual(view.account,{hasLocalPassword:true,googleLinked:true});assert.ok(!JSON.stringify(view).includes('providerSubject'));
      const changed = await patch('/me/profile', { expectedVersion: 0, displayName: 'Nguyễn An 👋' });
      assert.equal(changed.status, 200); const body = await changed.json();
      assert.equal(body.user.version, 1); assert.equal(body.user.displayName, 'Nguyễn An 👋');
      for (const secret of ['passwordHash', 'emailCanonical', 'authVersion', 'authMutationRevision', 'providerSubject']) assert.equal(Object.hasOwn(body.user, secret), false);
      const actual = await own();
      assert.deepEqual(actual.avatar, initial.avatar); assert.equal(actual.passwordHash, initial.passwordHash); assert.equal(actual.email, email); assert.equal(actual.authVersion, initial.authVersion);
      assert.deepEqual(await AuthIdentity.collection.findOne({ userId: userIds[0] }), googleIdentity);
      assert.equal((await auth.authenticate(login.accessToken)).user.displayName, 'Nguyễn An 👋');
      assert.equal((await User.collection.findOne({ _id: userIds[1] })).displayName, 'Other User');
    });
    await t.test('DTO, Origin, JSON and preflight enforce server validation and own-user scope', async () => {
      assert.equal((await fetch(base + '/me')).status, 401);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: 'Bad', userId: String(userIds[1]) })).status, 400);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: 'Bad', email: 'takeover@example.com' })).status, 400);
      assert.equal((await patch('/me/preferences', { expectedVersion: 1, emailPreferences: { assignment: 'false' } })).status, 400);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: 'Bad' }, { Origin: 'https://evil.example' })).status, 403);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: 'Bad' }, { Origin: '' })).status, 403);
      assert.equal((await patch('/me/profile', {}, { 'Content-Type': 'text/plain' })).status, 415);
      assert.equal((await fetch(base + '/me/profile', { method: 'PATCH', headers, body: '{invalid' })).status, 400);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: 'x'.repeat(17_000) })).status, 413);
      const options = await fetch(base + '/me/preferences', { method: 'OPTIONS', headers: { Origin: config.webOrigin, 'Access-Control-Request-Method': 'PATCH' } });
      assert.equal(options.status, 204); assert.ok(options.headers.get('access-control-allow-methods').includes('PATCH'));
      assert.equal((await patch('/ME/profile', { expectedVersion: 1, displayName: 'Bad' })).status, 404);
      assert.equal((await fetch(base + '/' + userIds[1] + '/profile', { method: 'PATCH', headers, body: '{}' })).status, 404);
      assert.equal((await own()).version, 1);
    });
    await t.test('Concurrent profile/preferences edits share version; stale writes fail and no-op preserves timestamp', async () => {
      const responses = await Promise.all([patch('/me/profile', { expectedVersion: 1, displayName: 'Concurrent Winner' }), patch('/me/preferences', { expectedVersion: 1, locale: 'en' })]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
      const conflict = responses.find((response) => response.status === 409);
      assert.equal((await conflict.json()).error.code, 'VERSION_CONFLICT');
      const current = await own(); assert.equal(current.version, 2);
      const noop = await patch('/me/profile', { expectedVersion: current.version, displayName: current.displayName });
      assert.equal(noop.status, 200); assert.equal((await noop.json()).user.version, 2);
      assert.deepEqual((await own()).updatedAt, current.updatedAt);
      assert.equal((await patch('/me/profile', { expectedVersion: 1, displayName: current.displayName })).status, 409);
    });
    await t.test('Partial preferences merge keeps unspecified values; locale reset and no-op work without events', async () => {
      const changed = await patch('/me/preferences', { expectedVersion: 2, locale: 'vi', emailPreferences: { comment: true, assignment: false } });
      assert.equal(changed.status, 200); const body = await changed.json();
      assert.deepEqual(body.user.emailPreferences, { assignment: false, comment: true, content: false, status: false });
      assert.equal(body.user.locale, 'vi'); assert.equal(body.user.version, 3);
      const reset = await patch('/me/preferences', { expectedVersion: 3, locale: null });
      assert.equal(reset.status, 200); assert.equal((await reset.json()).user.locale, null);
      const noop = await patch('/me/preferences', { expectedVersion: 4, emailPreferences: { comment: true } });
      assert.equal((await noop.json()).user.version, 4);
      assert.equal(await EmailOutbox.collection.countDocuments({ userId: userIds[0] }), 0);
      assert.equal(await Notification.collection.countDocuments({ recipientId: userIds[0] }), 0);
    });
    await t.test('Repository rechecks revoked/expired/version-invalid sessions after initial authentication', async () => {
      await Session.collection.updateOne({ _id: identity.session._id }, { $set: { revokedAt: new Date(), revokeReason: 'test-only' } });
      await assert.rejects(users.profile(identity, { expectedVersion: 4, displayName: 'Revoked write' }), /UNAUTHENTICATED/u);
      assert.equal((await patch('/me/profile', { expectedVersion: 4, displayName: 'Revoked write' })).status, 401);
      await Session.collection.updateOne({ _id: identity.session._id }, { $set: { revokedAt: null, expiresAt: new Date(0) } });
      await assert.rejects(users.preferences(identity, { expectedVersion: 4, locale: 'en' }), /UNAUTHENTICATED/u);
      await Session.collection.updateOne({ _id: identity.session._id }, { $set: { expiresAt: new Date(Date.now() + 60_000) } });
      await User.collection.updateOne({ _id: userIds[0] }, { $inc: { authVersion: 1 } });
      await assert.rejects(users.profile(identity, { expectedVersion: 4, displayName: 'Stale credential write' }), /UNAUTHENTICATED/u);
      assert.equal((await own()).version, 4);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const model of [Session, AuthIdentity]) await model.collection.deleteMany({ userId: { $in: userIds } });
    await User.collection.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  }
});
