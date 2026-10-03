import express from 'express';
import { AuthError } from '../auth/errors.js';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { originPolicy, requestError } from '../http/policy.js';

export function createUsersRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'PATCH'] }));
  router.use(createRateLimiter());
  router.use(requireAuthentication(authService)); // Unverified Users may edit their own profile/settings.
  router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => {
    if (req.method === 'PATCH' && !req.is('application/json')) return next(new AuthError('JSON_REQUIRED', 415));
    next();
  });
  router.get('/me', (req, res) => res.json(service.me(req.auth)));
  router.patch('/me/profile', async (req, res) => res.json(await service.profile(req.auth, req.body)));
  router.patch('/me/preferences', async (req, res) => res.json(await service.preferences(req.auth, req.body)));
  router.use(requestError);
  return router;
}
