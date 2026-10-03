import express from 'express';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { AuthError } from '../auth/errors.js';
import { originPolicy, requestError } from '../http/policy.js';
export function createNotificationsRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'POST'] }));
  router.use(createRateLimiter()); router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => req.method === 'POST' && !req.is('application/json') ? next(new AuthError('JSON_REQUIRED', 415)) : next());
  router.use(requireAuthentication(authService));
  router.get('/', async (req, res) => res.json(await service.list(req.auth, req.query)));
  router.post('/read-all', async (req, res) => res.json(await service.readAll(req.auth, req.body)));
  router.get('/:notificationId', async (req, res) => res.json(await service.get(req.auth, req.params.notificationId)));
  router.post('/:notificationId/read', async (req, res) => res.json(await service.read(req.auth, req.params.notificationId, req.body)));
  router.use(requestError); return router;
}
