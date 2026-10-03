import express from 'express';
import { AuthError } from '../auth/errors.js';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { originPolicy, requestError } from '../http/policy.js';

export function createWorkRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use((req, _res, next) => /^\/(?:projects(?:\/|$)|tasks(?:\/|$)|my-tasks(?:\/|$)|workspaces\/[^/]+\/projects(?:\/|$))/u.test(req.path) ? next() : next('router'));
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'POST', 'PATCH'] }));
  router.use(createRateLimiter());
  router.use(express.json({ limit: '256kb', strict: true }));
  router.use((req, _res, next) => ['POST', 'PATCH'].includes(req.method) && !req.is('application/json') ? next(new AuthError('JSON_REQUIRED', 415)) : next());
  router.use(requireAuthentication(authService, { verified: true }));
  const route = (method, path, call, code = 200) => router[method](path, async (req, res) => res.status(code).json(await call(req)));
  route('get', '/workspaces/:workspaceId/projects', (r) => service.projects(r.auth, r.params.workspaceId, r.query));
  route('post', '/workspaces/:workspaceId/projects', (r) => service.createProject(r.auth, r.params.workspaceId, r.body), 201);
  route('get', '/projects/:projectId', (r) => service.getProject(r.auth, r.params.projectId));
  route('patch', '/projects/:projectId', (r) => service.updateProject(r.auth, r.params.projectId, r.body));
  route('patch', '/projects/:projectId/state', (r) => service.state(r.auth, r.params.projectId, r.body));
  route('get', '/projects/:projectId/tasks', (r) => service.tasks(r.auth, r.params.projectId, r.query));
  route('get', '/projects/:projectId/board', (r) => service.board(r.auth, r.params.projectId, r.query));
  route('post', '/projects/:projectId/tasks', (r) => service.createTask(r.auth, r.params.projectId, r.body), 201);
  route('get', '/my-tasks', (r) => service.mine(r.auth, r.query));
  route('get', '/tasks/:taskId', (r) => service.getTask(r.auth, r.params.taskId));
  route('patch', '/tasks/:taskId', (r) => service.updateTask(r.auth, r.params.taskId, r.body));
  route('patch', '/tasks/:taskId/status', (r) => service.status(r.auth, r.params.taskId, r.body));
  route('post', '/tasks/:taskId/delete', (r) => service.deleteTask(r.auth, r.params.taskId, r.body));
  route('get', '/tasks/:taskId/comments', (r) => service.comments(r.auth, r.params.taskId, r.query));
  route('post', '/tasks/:taskId/comments', (r) => service.createComment(r.auth, r.params.taskId, r.body), 201);
  route('patch', '/tasks/:taskId/comments/:commentId', (r) => service.updateComment(r.auth, r.params.taskId, r.params.commentId, r.body));
  route('post', '/tasks/:taskId/comments/:commentId/delete', (r) => service.deleteComment(r.auth, r.params.taskId, r.params.commentId, r.body));
  router.use(requestError); return router;
}
