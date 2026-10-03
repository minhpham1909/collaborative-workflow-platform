import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, decodeJwt } from 'jose';
import { hashPassword, verifyPassword, validatePassword } from '../src/auth/passwords.js';
import { createAuthService } from '../src/auth/service.js';
import { createTokenCodec, tokenHash } from '../src/auth/tokens.js';
import { readAuthConfig } from '../src/config.js';
import { memoryAuthStore, testConfig, testUser } from '../test-support/auth-store.js';

const password = '  mật khẩu đủ dài 👨‍👩‍👧‍👦  ';
const encoded = await hashPassword(password);
async function fixture(verified = true) {
  let time = new Date('2026-10-03T06:00:00Z');
  const now = () => new Date(time);
  const config = testConfig(); const user = testUser(encoded, verified); const store = memoryAuthStore(user);
  const service = await createAuthService({ store, config, now });
  return { service, store, user, config, now, advance: (seconds) => { time = new Date(time.getTime() + seconds * 1000); } };
}
test('Argon2id salts hashes, preserves password whitespace/Unicode and enforces 12–128 length', async () => {
  assert.match(encoded, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/u);
  assert.notEqual(await hashPassword(password), encoded);
  assert.equal(await verifyPassword(encoded, password), true);
  assert.equal(await verifyPassword(encoded, password.trim()), false);
  assert.equal(await verifyPassword('malformed-hash', password), false);
  assert.throws(() => validatePassword('short'), /INVALID_INPUT/u);
  assert.throws(() => validatePassword('x'.repeat(129)), /INVALID_INPUT/u);
});
test('JWT configuration rejects missing/reused keys, malformed origin and HTTP production origin', () => {
  const config = testConfig();
  const env = { WEB_ORIGIN: config.webOrigin, JWT_ACCESS_KEY_HEX: config.accessKeyHex, JWT_REFRESH_KEY_HEX: config.refreshKeyHex };
  assert.equal(readAuthConfig(env).accessTtlSeconds, 900);
  assert.throws(() => readAuthConfig({ ...env, JWT_REFRESH_KEY_HEX: env.JWT_ACCESS_KEY_HEX }));
  assert.throws(() => readAuthConfig({ ...env, WEB_ORIGIN: `${env.WEB_ORIGIN}/path` }));
  assert.throws(() => readAuthConfig({ ...env, NODE_ENV: 'production' }));
});
test('login returns minimal user, stores only refresh hash, and rejects incorrect/unknown/Google-only accounts uniformly', async () => {
  const f = await fixture();
  const session = await f.service.login({ email: ' AN@example.com ', password });
  const claims = decodeJwt(session.accessToken);
  assert.equal(claims.purpose, 'access');
  assert.equal(claims.exp - claims.iat, 900);
  assert.equal(Object.hasOwn(claims, 'role'), false);
  assert.equal(Object.hasOwn(session.user, 'passwordHash'), false);
  assert.equal(Object.hasOwn(session.user, 'authVersion'), false);
  assert.equal(f.store.sessions.get(claims.sid).refreshTokenHash, tokenHash(session.refreshToken));
  assert.equal(JSON.stringify([...f.store.sessions.values()]).includes(session.refreshToken), false);
  for (const input of [
    { email: 'an@example.com', password: 'wrong password long' }, { email: 'unknown@example.com', password },
  ]) await assert.rejects(f.service.login(input), /INVALID_CREDENTIALS/u);
  f.store.users.get(f.user._id).passwordHash = null;
  await assert.rejects(f.service.login({ email: 'an@example.com', password }), /INVALID_CREDENTIALS/u);
  await assert.rejects(f.service.login({ email: { $ne: null }, password }), /INVALID_INPUT/u);
  await assert.rejects(f.service.login({ email: 'an@example.com', password, role: 'owner' }), /INVALID_INPUT/u);
});
test('refresh/access purposes, signature, expiry, issuer/audience and claims are enforced', async () => {
  const f = await fixture(); const session = await f.service.login({ email: 'an@example.com', password });
  await assert.rejects(f.service.authenticate(session.refreshToken), /UNAUTHENTICATED/u);
  await assert.rejects(f.service.refresh(session.accessToken), /UNAUTHENTICATED/u);
  const claims = decodeJwt(session.accessToken);
  for (const modified of [{ ...claims, iss: 'evil' }, { ...claims, aud: 'wrong' }, { ...claims, sid: 'invalid-id' }, { ...claims, av: -1 }]) {
    const bad = await new SignJWT(modified).setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' }).sign(Buffer.from(f.config.accessKeyHex, 'hex'));
    await assert.rejects(f.service.authenticate(bad), /UNAUTHENTICATED/u);
  }
  const unrelatedCodec = createTokenCodec(testConfig(), f.now);
  const forged = await unrelatedCodec.refresh([...f.store.sessions.values()][0]);
  await assert.rejects(f.service.refresh(forged), /UNAUTHENTICATED/u);
  assert.equal([...f.store.sessions.values()][0].revokedAt, null);
  f.advance(901);
  await assert.rejects(f.service.authenticate(session.accessToken), /UNAUTHENTICATED/u);
  assert.equal(typeof await f.service.csrf(session.refreshToken), 'string');
});
test('refresh rotates hash/generation and absolute expiry; replay revokes even still-valid access', async () => {
  const f = await fixture(); const original = await f.service.login({ email: 'an@example.com', password });
  f.service.checkCsrf(original.refreshToken, original.csrfToken);
  assert.throws(() => f.service.checkCsrf(original.refreshToken, 'forged'), /CSRF_REJECTED/u);
  f.advance(30);
  const next = await f.service.refresh(original.refreshToken);
  assert.notEqual(next.refreshToken, original.refreshToken);
  assert.notEqual(next.csrfToken, original.csrfToken);
  assert.equal(decodeJwt(next.refreshToken).generation, 1);
  assert.equal(decodeJwt(next.refreshToken).exp, decodeJwt(original.refreshToken).exp);
  assert.equal((await f.service.authenticate(next.accessToken)).user._id, f.user._id);
  await assert.rejects(f.service.refresh(original.refreshToken), /REFRESH_REUSED/u);
  await assert.rejects(f.service.authenticate(next.accessToken), /UNAUTHENTICATED/u);
});
test('two simultaneous refreshes fail closed: one rotates, the stale retry revokes the session', async () => {
  const f = await fixture(); const session = await f.service.login({ email: 'an@example.com', password });
  const results = await Promise.allSettled([f.service.refresh(session.refreshToken), f.service.refresh(session.refreshToken)]);
  assert.equal(results.filter((entry) => entry.status === 'fulfilled').length, 1);
  assert.equal(results.filter((entry) => entry.status === 'rejected' && entry.reason.code === 'REFRESH_REUSED').length, 1);
  assert.equal([...f.store.sessions.values()][0].revokeReason, 'refresh_reuse');
});
test('logout, account authVersion change and session expiry invalidate otherwise-valid access immediately', async () => {
  const f = await fixture(); const session = await f.service.login({ email: 'an@example.com', password });
  await f.service.logout(session.refreshToken);
  await assert.rejects(f.service.authenticate(session.accessToken), /UNAUTHENTICATED/u);
  const next = await f.service.login({ email: 'an@example.com', password });
  f.store.users.get(f.user._id).authVersion++;
  await assert.rejects(f.service.authenticate(next.accessToken), /UNAUTHENTICATED/u);
  await assert.rejects(f.service.refresh(next.refreshToken), /UNAUTHENTICATED/u);
  f.store.users.get(f.user._id).authVersion--;
  f.store.sessions.get(decodeJwt(next.accessToken).sid).expiresAt = f.now();
  await assert.rejects(f.service.authenticate(next.accessToken), /UNAUTHENTICATED/u);
});
test('unverified users can authenticate but verified gate refuses business access', async () => {
  const f = await fixture(false); const session = await f.service.login({ email: 'an@example.com', password });
  const auth = await f.service.authenticate(session.accessToken);
  assert.equal(session.user.emailVerified, false);
  assert.throws(() => f.service.requireVerified(auth), /EMAIL_VERIFICATION_REQUIRED/u);
});
