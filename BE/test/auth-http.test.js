import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createAuthService } from '../src/auth/service.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createRateLimiter } from '../src/auth/http.js';
import { memoryAuthStore, testConfig, testUser } from '../test-support/auth-store.js';

const password = 'password with spaces';
const encoded = await hashPassword(password);
async function serverFixture(context) {
  const config = testConfig(); const user = testUser(encoded, false); const store = memoryAuthStore(user);
  let time = new Date();
  const service = await createAuthService({ store, config, now: () => time });
  const server = createApp({ authService: service, authConfig: config }).listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options = {}) => fetch(`${base}/auth${path}`, {
    ...options, headers: { Origin: config.webOrigin, ...options.headers },
  });
  const login = () => request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
  return { request, login, config, store, advance: () => { time = new Date(time.getTime() + 901_000); } };
}
test('HTTP login/me/CSRF/refresh/logout; cookie flags, no refresh response body and revoke existing JWT', async (context) => {
  const f = await serverFixture(context);
  const login = await f.login(); assert.equal(login.status, 200);
  const cookieHeader = login.headers.get('set-cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/auth']) assert.ok(cookieHeader.includes(flag));
  const cookie = cookieHeader.split(';')[0]; const session = await login.json();
  assert.equal(Object.hasOwn(session, 'refreshToken'), false);
  assert.equal(session.user.emailVerified, false);
  assert.equal(login.headers.get('access-control-allow-origin'), f.config.webOrigin);
  const me = await f.request('/me', { headers: { Authorization: `Bearer ${session.accessToken}` } });
  assert.equal(me.status, 200); assert.equal((await me.json()).user.email, 'an@example.com');
  const csrf = await f.request('/csrf', { headers: { Cookie: cookie } });
  assert.equal((await csrf.json()).csrfToken, session.csrfToken);
  const refresh = await f.request('/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': session.csrfToken }, body: '{}' });
  assert.equal(refresh.status, 200);
  const nextCookie = refresh.headers.get('set-cookie').split(';')[0]; const next = await refresh.json();
  const logout = await f.request('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: nextCookie, 'X-CSRF-Token': next.csrfToken }, body: '{}' });
  assert.equal(logout.status, 204);
  assert.equal((await f.request('/me', { headers: { Authorization: `Bearer ${next.accessToken}` } })).status, 401);
});
test('HTTP rejects hostile origin, forged fields, non-JSON, malformed/oversized body, missing CSRF and duplicate cookies', async (context) => {
  const f = await serverFixture(context);
  assert.equal((await f.request('/login', { method: 'POST', headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.request('/login', { method: 'POST', headers: { Origin: '' } })).status, 403);
  assert.equal((await f.request('/LOGIN', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
  assert.equal((await f.request('/csrf/', { headers: { Origin: '' } })).status, 404);
  assert.equal((await f.request('/login', { method: 'POST', body: 'form=data' })).status, 415);
  assert.equal((await f.request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
  assert.equal((await f.request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'an@example.com', password, ownerId: 'fake' }) })).status, 400);
  assert.equal((await f.request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x'.repeat(17000), password }) })).status, 413);
  const response = await f.login(); const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await f.request('/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}' })).status, 403);
  assert.equal((await f.request('/csrf', { headers: { Cookie: `${cookie}; ${cookie}` } })).status, 401);
});
test('expired access on /me does not clear a still-valid refresh cookie', async (context) => {
  const f = await serverFixture(context); const response = await f.login();
  const cookie = response.headers.get('set-cookie').split(';')[0]; const session = await response.json();
  f.advance();
  const me = await f.request('/me', { headers: { Authorization: `Bearer ${session.accessToken}`, Cookie: cookie } });
  assert.equal(me.status, 401); assert.equal(me.headers.get('set-cookie'), null);
  assert.equal((await f.request('/csrf', { headers: { Cookie: cookie } })).status, 200);
});
test('rate limiter bounds requests, expiry and memory capacity without trusting proxy headers', () => {
  let time = 0; const limiter = createRateLimiter({ limit: 2, maxEntries: 1, windowMs: 1000, now: () => time });
  const calls = []; const req = { ip: '127.0.0.1' }; const res = { set() {} };
  for (let count = 0; count < 3; count++) limiter(req, res, (error) => calls.push(error?.code ?? 'ok'));
  assert.deepEqual(calls, ['ok', 'ok', 'RATE_LIMITED']);
  limiter({ ip: 'another-ip' }, res, (error) => assert.equal(error.code, 'RATE_LIMITED'));
  time = 1000;
  limiter(req, res, (error) => assert.equal(error, undefined));
});
