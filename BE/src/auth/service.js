import { randomBytes } from 'node:crypto';
import { AuthError } from './errors.js';
import { hashPassword, validatePassword, verifyPassword } from './passwords.js';
import { createTokenCodec, secureEqual, tokenHash } from './tokens.js';
import { canonicalEmail } from '../models/accounts.js';

export function userResponse(user) {
  return {
    id: String(user._id), displayName: user.displayName, email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt), locale: user.locale,
    avatar: { source: user.avatar.source, googlePictureUrl: user.avatar.googlePictureUrl },
    emailPreferences: { ...user.emailPreferences }, version: user.version,
  };
}
export async function createAuthService({ store, config, now = () => new Date() }) {
  const tokens = createTokenCodec(config, now);
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  async function response(session, user, refreshToken) {
    return { accessToken: await tokens.access(session), refreshToken, csrfToken: tokens.csrf(refreshToken), expiresAt: session.expiresAt, user: userResponse(user) };
  }
  async function refreshClaims(raw) { return tokens.verifyRefresh(raw); }
  return {
    async login(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !['email', 'password'].includes(key))) throw new AuthError('INVALID_INPUT', 400);
      let email;
      try { email = canonicalEmail(input.email); validatePassword(input.password); } catch { throw new AuthError('INVALID_INPUT', 400); }
      const user = await store.findUserByEmail(email);
      const valid = await verifyPassword(user?.passwordHash ?? dummyHash, input.password);
      if (!user?.passwordHash || !valid) throw new AuthError('INVALID_CREDENTIALS');
      const expiresAt = new Date(Math.floor(now().getTime() / 1000) * 1000 + config.refreshTtlSeconds * 1000);
      const session = store.newSession({ userId: user._id, authVersionAtIssue: user.authVersion, refreshGeneration: 0, expiresAt, lastSeenAt: now(), revokedAt: null, revokeReason: null });
      const refreshToken = await tokens.refresh(session);
      session.refreshTokenHash = tokenHash(refreshToken);
      const currentUser = await store.issueSession(user, session);
      return response(session, currentUser, refreshToken);
    },
    async authenticate(accessToken) {
      const claims = await tokens.verifyAccess(accessToken);
      const auth = await store.readSession(claims.sid, claims.sub);
      if (!auth || auth.session.revokedAt || new Date(auth.session.expiresAt) <= now() || auth.user.authVersion !== claims.av || auth.session.authVersionAtIssue !== claims.av) throw new AuthError('UNAUTHENTICATED');
      return { ...auth, claims };
    },
    async csrf(refreshToken) {
      const claims = await refreshClaims(refreshToken);
      const auth = await store.readSession(claims.sid, claims.sub);
      if (!auth || auth.session.revokedAt || new Date(auth.session.expiresAt) <= now() || auth.user.authVersion !== claims.av || auth.session.authVersionAtIssue !== claims.av || auth.session.refreshGeneration !== claims.generation || !secureEqual(auth.session.refreshTokenHash, tokenHash(refreshToken))) throw new AuthError('UNAUTHENTICATED');
      return tokens.csrf(refreshToken);
    },
    checkCsrf(refreshToken, candidate) {
      if (!refreshToken || !secureEqual(tokens.csrf(refreshToken), candidate)) throw new AuthError('CSRF_REJECTED', 403);
    },
    async refresh(refreshToken) {
      const claims = await refreshClaims(refreshToken);
      // Cryptographically verify before accessing the session: a forged sid must never revoke another user.
      const rotated = await store.rotateSession(claims, tokenHash(refreshToken), async (session) => {
        const next = { ...session, refreshGeneration: session.refreshGeneration + 1, lastSeenAt: now() };
        const raw = await tokens.refresh(next);
        next.refreshTokenHash = tokenHash(raw);
        return { session: next, raw };
      }, now());
      if (rotated.error) throw new AuthError(rotated.error);
      return response(rotated.session, rotated.user, rotated.raw);
    },
    async logout(refreshToken) {
      const claims = await refreshClaims(refreshToken);
      await store.revokeSession(claims.sid, claims.sub, now(), 'logout');
    },
    requireVerified(auth) {
      if (!auth.user.emailVerifiedAt) throw new AuthError('EMAIL_VERIFICATION_REQUIRED', 403);
      return auth;
    },
  };
}
