import { AuthError } from '../auth/errors.js';

export function originPolicy({ webOrigin, methods, cookieReads = [] }) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== webOrigin) return next(new AuthError('ORIGIN_REJECTED', 403));
    if ((!['GET', 'HEAD', 'OPTIONS'].includes(req.method) || cookieReads.includes(req.path)) && origin !== webOrigin) return next(new AuthError('ORIGIN_REJECTED', 403));
    if (origin) {
      res.set('Access-Control-Allow-Origin', webOrigin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', methods.join(', '));
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      return res.sendStatus(204);
    }
    next();
  };
}

export function requestError(error, _req, res, next) {
  if (error instanceof AuthError) return res.status(error.status).json({ error: { code: error.code } });
  if (['entity.parse.failed', 'entity.too.large'].includes(error.type)) {
    return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: { code: 'INVALID_INPUT' } });
  }
  next(error);
}
