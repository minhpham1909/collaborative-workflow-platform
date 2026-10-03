import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { AuthError } from './errors.js';

const objectIdPattern = /^[a-f0-9]{24}$/u;
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export function secureEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function createTokenCodec(config, now = () => new Date()) {
  const accessKey = Buffer.from(config.accessKeyHex, 'hex');
  const refreshKey = Buffer.from(config.refreshKeyHex, 'hex');
  if (!/^[a-f0-9]{64}$/u.test(config.accessKeyHex ?? '') || !/^[a-f0-9]{64}$/u.test(config.refreshKeyHex ?? '') || secureEqual(config.accessKeyHex, config.refreshKeyHex)) {
    throw new Error('Distinct random 32-byte JWT keys must be configured');
  }
  if (!config.issuer || !config.audience || !Number.isInteger(config.accessTtlSeconds) || config.accessTtlSeconds < 60 || config.accessTtlSeconds > 3600) throw new Error('Invalid JWT configuration');
  const seconds = () => Math.floor(now().getTime() / 1000);
  async function sign(kind, session) {
    const expiry = Math.floor(new Date(session.expiresAt).getTime() / 1000);
    return new SignJWT({ sid: String(session._id), av: session.authVersionAtIssue, purpose: kind, ...(kind === 'refresh' ? { generation: session.refreshGeneration } : {}) })
      .setProtectedHeader({ alg: 'HS256', typ: kind === 'access' ? 'at+jwt' : 'rt+jwt' })
      .setSubject(String(session.userId)).setIssuer(config.issuer).setAudience(`${config.audience}:${kind}`)
      .setIssuedAt(seconds()).setExpirationTime(kind === 'access' ? Math.min(seconds() + config.accessTtlSeconds, expiry) : expiry)
      .setJti(randomBytes(32).toString('hex')).sign(kind === 'access' ? accessKey : refreshKey);
  }
  async function verifyToken(token, kind) {
    if (typeof token !== 'string' || token.length > 4096) throw new AuthError('UNAUTHENTICATED');
    try {
      const { payload, protectedHeader } = await jwtVerify(token, kind === 'access' ? accessKey : refreshKey, {
        algorithms: ['HS256'], issuer: config.issuer, audience: `${config.audience}:${kind}`, currentDate: now(),
        requiredClaims: ['sub', 'sid', 'av', 'purpose', 'iat', 'exp', 'jti'],
      });
      if (protectedHeader.typ !== (kind === 'access' ? 'at+jwt' : 'rt+jwt') || payload.purpose !== kind || !objectIdPattern.test(payload.sub) || !objectIdPattern.test(payload.sid) || !Number.isSafeInteger(payload.av) || payload.av < 0 || !/^[a-f0-9]{64}$/u.test(payload.jti) || payload.iat > seconds() || (kind === 'refresh' && (!Number.isSafeInteger(payload.generation) || payload.generation < 0))) throw new Error('Invalid claims');
      return payload;
    } catch { throw new AuthError('UNAUTHENTICATED'); }
  }
  return {
    access: (session) => sign('access', session), refresh: (session) => sign('refresh', session),
    verifyAccess: (token) => verifyToken(token, 'access'), verifyRefresh: (token) => verifyToken(token, 'refresh'),
    csrf: (refresh) => createHmac('sha256', refreshKey).update(`workflow-csrf-v1:${refresh}`).digest('hex'),
  };
}
