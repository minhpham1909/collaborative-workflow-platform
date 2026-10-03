import express from 'express';
import { AuthError } from './errors.js';
import { userResponse } from './service.js';

const COOKIE = 'workflow_refresh';
function cookieValue(req, name = COOKIE) {
  const matches = (req.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (matches.length !== 1) throw new AuthError('UNAUTHENTICATED');
  return matches[0].slice(name.length + 1);
}
function bearer(req) {
  const value = req.headers.authorization;
  if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9_.-]+$/u.test(value)) throw new AuthError('UNAUTHENTICATED');
  return value.slice(7);
}
export function requireAuthentication(service, { verified = false } = {}) {
  return async (req, _res, next) => {
    try {
      req.auth = await service.authenticate(bearer(req));
      if (verified) service.requireVerified(req.auth);
      next();
    } catch (error) { next(error); }
  };
}
export function createRateLimiter({ limit = 60, windowMs = 60_000, maxEntries = 10_000, now = Date.now } = {}) {
  const windows = new Map();
  let nextCleanup = 0;
  return (req, res, next) => {
    const time = now();
    if (time >= nextCleanup) {
      for (const [key, value] of windows) if (value.until <= time) windows.delete(key);
      nextCleanup = time + windowMs;
    }
    const key = req.ip; // trust proxy is disabled; never trust client X-Forwarded-For here.
    let entry = windows.get(key);
    if (!entry || entry.until <= time) {
      if (windows.size >= maxEntries && !windows.has(key)) return next(new AuthError('RATE_LIMITED', 429));
      entry = { count: 0, until: time + windowMs };
      windows.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - time) / 1000))));
      return next(new AuthError('RATE_LIMITED', 429));
    }
    next();
  };
}
export function createAuthRouter({ service, config, accounts }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const cookieOptions = { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/auth' };
  router.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== config.webOrigin) return next(new AuthError('ORIGIN_REJECTED', 403));
    // Cookie-dependent reads and mutations require an exact frontend Origin.
    if ((req.method === 'POST' || req.path === '/csrf') && origin !== config.webOrigin) return next(new AuthError('ORIGIN_REJECTED', 403));
    if (origin) {
      res.set('Access-Control-Allow-Origin', config.webOrigin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      return res.sendStatus(204);
    }
    next();
  });
  router.use(createRateLimiter());
  router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) return next(new AuthError('JSON_REQUIRED', 415));
    if (req.method === 'POST' && ['/refresh', '/logout', '/verify-email/resend', '/google/challenge', '/google/link/challenge'].includes(req.path) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) return next(new AuthError('INVALID_INPUT', 400));
    next();
  });
  function sendSession(res, data) {
    res.cookie(COOKIE, data.refreshToken, { ...cookieOptions, expires: new Date(data.expiresAt) });
    res.json({ accessToken: data.accessToken, csrfToken: data.csrfToken, user: data.user });
  }
  router.post('/login', createRateLimiter({ limit: 10 }), async (req, res) => {
    sendSession(res, await service.login(req.body));
  });
  router.get('/csrf', async (req, res) => res.json({ csrfToken: await service.csrf(cookieValue(req)) }));
  router.post('/refresh', async (req, res) => {
    const refresh = cookieValue(req);
    service.checkCsrf(refresh, req.headers['x-csrf-token']);
    sendSession(res, await service.refresh(refresh));
  });
  router.post('/logout', async (req, res) => {
    const refresh = cookieValue(req);
    service.checkCsrf(refresh, req.headers['x-csrf-token']);
    await service.logout(refresh);
    res.clearCookie(COOKIE, cookieOptions).sendStatus(204);
  });
  router.get('/me', requireAuthentication(service), (req, res) => res.json({ user: userResponse(req.auth.user) }));
  if (accounts) {
    const limited = () => createRateLimiter({ limit: 10 });
    router.get('/capabilities', (_req, res) => res.json(accounts.capabilities()));
    router.post('/register', limited(), async (req, res) => res.status(202).json(await accounts.register(req.body)));
    router.post('/verify-email', limited(), async (req, res) => res.json(await accounts.verifyEmail(req.body)));
    router.post('/verify-email/resend', limited(), requireAuthentication(service), async (req, res) => res.status(202).json(await accounts.resendVerification(req.auth, req.body)));
    router.post('/password/recovery', limited(), async (req, res) => res.status(202).json(await accounts.requestRecovery(req.body)));
    router.post('/password/reset', limited(), async (req, res) => {
      const result = await accounts.resetPassword(req.body);
      res.clearCookie(COOKIE, cookieOptions).json(result);
    });
    router.post('/password/change', limited(), requireAuthentication(service), async (req, res) => {
      const refresh = cookieValue(req); service.checkCsrf(refresh, req.headers['x-csrf-token']);
      sendSession(res, await accounts.changePassword(req.auth, refresh, req.body));
    });
    const nonceName = 'workflow_google_nonce';
    const nonceOptions = { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/auth/google' };
    function challenge(res, result) {
      res.cookie(nonceName, result.nonce, { ...nonceOptions, expires: new Date(result.expiresAt) }).json(result);
    }
    router.post('/google/challenge', limited(), async (_req, res) => challenge(res, await accounts.googleChallenge({ intent: 'login' })));
    router.post('/google/link/challenge', limited(), requireAuthentication(service), async (req, res) => challenge(res, await accounts.googleChallenge({ intent: 'link' }, req.auth)));
    router.post('/google', limited(), async (req, res) => {
      const result = await accounts.googleLogin(cookieValue(req, nonceName), req.body);
      res.clearCookie(nonceName, nonceOptions); sendSession(res, result);
    });
    router.post('/google/link', limited(), requireAuthentication(service), async (req, res) => {
      const result = await accounts.googleLink(req.auth, cookieValue(req, nonceName), req.body);
      res.clearCookie(nonceName, nonceOptions).json(result);
    });
  }
  router.use((error, req, res, next) => {
    if (error instanceof AuthError) {
      if (error.status === 401 && ['/refresh', '/csrf', '/logout'].includes(req.path)) res.clearCookie(COOKIE, cookieOptions);
      return res.status(error.status).json({ error: { code: error.code } });
    }
    if (['entity.parse.failed', 'entity.too.large'].includes(error.type)) {
      return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: { code: 'INVALID_INPUT' } });
    }
    next(error);
  });
  return router;
}
