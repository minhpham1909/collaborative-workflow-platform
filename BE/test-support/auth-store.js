import { randomBytes } from 'node:crypto';
import { AuthError } from '../src/auth/errors.js';
import { secureEqual } from '../src/auth/tokens.js';

// Test double only. Mutex simulates serialized transactions, not MongoDB integration coverage.
export function memoryAuthStore(user) {
  const users = new Map([[String(user._id), structuredClone(user)]]);
  const sessions = new Map();
  let tail = Promise.resolve();
  function serial(operation) {
    const result = tail.then(operation);
    tail = result.catch(() => {});
    return result;
  }
  return {
    users, sessions,
    async findUserByEmail(email) { return structuredClone([...users.values()].find((entry) => entry.emailCanonical === email) ?? null); },
    newSession: (fields) => ({ _id: randomBytes(12).toString('hex'), ...fields }),
    issueSession: (expected, session) => serial(async () => {
      const current = users.get(String(expected._id));
      if (!current || current.authVersion !== expected.authVersion || !secureEqual(current.passwordHash, expected.passwordHash)) throw new AuthError('INVALID_CREDENTIALS');
      sessions.set(String(session._id), structuredClone(session));
      return structuredClone(current);
    }),
    async readSession(sid, uid) {
      const session = sessions.get(sid); const current = users.get(uid);
      return session && current && String(session.userId) === uid ? structuredClone({ session, user: current }) : null;
    },
    rotateSession: (claims, hash, mint, now) => serial(async () => {
      const session = sessions.get(claims.sid); const current = users.get(claims.sub);
      if (!session || !current || String(session.userId) !== claims.sub || session.revokedAt || session.expiresAt <= now || current.authVersion !== claims.av || session.authVersionAtIssue !== claims.av) return { error: 'UNAUTHENTICATED' };
      if (session.refreshGeneration !== claims.generation || !secureEqual(session.refreshTokenHash, hash)) {
        session.revokedAt = now; session.revokeReason = 'refresh_reuse';
        return { error: 'REFRESH_REUSED' };
      }
      const next = await mint(structuredClone(session));
      sessions.set(claims.sid, structuredClone(next.session));
      return { ...next, user: structuredClone(current) };
    }),
    revokeSession: (sid, uid, now, reason) => serial(async () => {
      const session = sessions.get(sid);
      if (session && String(session.userId) === uid && !session.revokedAt) { session.revokedAt = now; session.revokeReason = reason; }
    }),
  };
}
export const testConfig = () => ({
  accessKeyHex: randomBytes(32).toString('hex'), refreshKeyHex: randomBytes(32).toString('hex'),
  issuer: 'workflow-api', audience: 'workflow-web', accessTtlSeconds: 900, refreshTtlSeconds: 604_800,
  webOrigin: 'http://localhost:5173', secureCookies: true,
});
export function testUser(passwordHash, verified = true) {
  return {
    _id: randomBytes(12).toString('hex'), displayName: 'Nguyễn An', email: 'an@example.com', emailCanonical: 'an@example.com',
    passwordHash, authVersion: 0, authMutationRevision: 0, emailVerifiedAt: verified ? new Date() : null,
    locale: 'vi', avatar: { source: 'initials', googlePictureUrl: null },
    emailPreferences: { assignment: true, comment: false, content: false, status: false }, version: 0,
  };
}
