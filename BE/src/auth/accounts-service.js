import { randomBytes, randomUUID } from 'node:crypto';
import { AuthError } from './errors.js';
import { inputObject, emailInput, termsInput, displayNameInput, tokenInput, validatePassword } from './account-input.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { createDeliveryCrypto } from './delivery-crypto.js';
import { createTokenCodec, tokenHash } from './tokens.js';
import { prepareSession, sessionResponse } from './service.js';

export function createAccountsService({ store, config, verifyGoogle, now = () => new Date() }) {
  const crypto = createDeliveryCrypto(config.mailKeyHex);
  const tokens = createTokenCodec(config, now);
  function makeMail(user, purpose) {
    const raw = randomBytes(32).toString('hex');
    const token = store.newToken({ userId: user._id, purpose, tokenHash: tokenHash(raw), expiresAt: new Date(now().getTime() + (purpose === 'verify_email' ? 24 * 60 : 30) * 60_000), usedAt: null, revokedAt: null });
    const eventId = randomUUID();
    const job = {
      eventId, recipientKey: `user:${user._id}`, userId: user._id, authTokenId: token._id,
      category: 'auth', templateKey: purpose, payloadVersion: 1, eventTypes: [], payload: {},
      encryptedDeliveryData: crypto.seal({ to: user.email, token: raw, purpose }, eventId),
      state: 'pending', attempts: 0, nextAttemptAt: now(),
    };
    return { token, job };
  }
  const mint = (user) => prepareSession(store, tokens, config, now, user);
  return {
    capabilities: () => ({ termsVersion: config.termsVersion, googleClientId: config.googleClientId || null }),
    async register(input) {
      inputObject(input, ['displayName', 'email', 'password', 'termsAccepted', 'termsVersion']);
      termsInput(input, config.termsVersion);
      const user = store.newUser({ displayName: displayNameInput(input.displayName), email: emailInput(input.email), passwordHash: await hashPassword(input.password), termsAcceptance: { version: config.termsVersion, acceptedAt: now() } });
      await store.registerAccount(user, makeMail(user, 'verify_email'));
      return { code: 'REGISTRATION_ACCEPTED', emailDelivery: 'queued' };
    },
    async resendVerification(auth, input) {
      inputObject(input, []);
      const user = await store.findUserById(auth.user._id);
      if (!user) throw new AuthError('UNAUTHENTICATED');
      if (user.emailVerifiedAt) return { code: 'EMAIL_ALREADY_VERIFIED' };
      const queued = await store.issueAccountToken(user, makeMail(user, 'verify_email'), now(), auth.claims);
      if (!queued) return { code: 'EMAIL_ALREADY_VERIFIED' };
      return { code: 'VERIFICATION_QUEUED', emailDelivery: 'queued' };
    },
    async verifyEmail(input) {
      inputObject(input, ['token']);
      await store.consumeAccountToken('verify_email', tokenHash(tokenInput(input.token)), now());
      return { code: 'EMAIL_VERIFIED' };
    },
    async requestRecovery(input) {
      inputObject(input, ['email']);
      const user = await store.findUserByEmail(emailInput(input.email));
      if (user?.passwordHash) await store.issueAccountToken(user, makeMail(user, 'reset_password'), now());
      // Same response for missing/Google-only accounts; never claim mail was sent.
      return { code: 'RECOVERY_REQUEST_ACCEPTED' };
    },
    async resetPassword(input) {
      inputObject(input, ['token', 'password']);
      const digest = tokenHash(tokenInput(input.token));
      const passwordHash = await hashPassword(input.password);
      await store.consumeAccountToken('reset_password', digest, now(), passwordHash);
      return { code: 'PASSWORD_RESET', requiresLogin: true };
    },
    async changePassword(auth, refreshToken, input) {
      inputObject(input, ['currentPassword', 'password']); validatePassword(input.currentPassword);
      const user = await store.findUserById(auth.user._id);
      if (!user?.passwordHash) throw new AuthError('LOCAL_PASSWORD_UNAVAILABLE', 409);
      if (!await verifyPassword(user.passwordHash, input.currentPassword)) throw new AuthError('INVALID_CREDENTIALS');
      const refreshClaims = await tokens.verifyRefresh(refreshToken);
      if (refreshClaims.sid !== auth.claims.sid || refreshClaims.sub !== auth.claims.sub) throw new AuthError('UNAUTHENTICATED');
      const passwordHash = await hashPassword(input.password);
      const changed = await store.changeAccountPassword(user, auth.claims, tokenHash(refreshToken), passwordHash, now(), async (session) => {
        const next = { ...session, authVersionAtIssue: user.authVersion + 1, refreshGeneration: session.refreshGeneration + 1, lastSeenAt: now() };
        const raw = await tokens.refresh(next); next.refreshTokenHash = tokenHash(raw);
        return { session: next, refreshToken: raw };
      });
      return sessionResponse(tokens, changed.session, changed.user, changed.refreshToken);
    },
    async googleChallenge(input, auth = null) {
      inputObject(input, ['intent']);
      if (!config.googleClientId) throw new AuthError('GOOGLE_NOT_CONFIGURED', 503);
      if (!['login', 'link'].includes(input.intent) || (input.intent === 'link' && !auth)) throw new AuthError('INVALID_INPUT', 400);
      const nonce = randomBytes(32).toString('hex');
      const challenge = store.newChallenge({ userId: input.intent === 'link' ? auth.user._id : null, purpose: `google_${input.intent}`, tokenHash: tokenHash(nonce), expiresAt: new Date(now().getTime() + 5 * 60_000), usedAt: null, revokedAt: null });
      await store.saveChallenge(challenge, auth?.claims, now());
      return { nonce, expiresAt: challenge.expiresAt };
    },
    async googleLogin(nonce, input) {
      inputObject(input, ['credential', 'termsAccepted', 'termsVersion']); tokenInput(nonce);
      const profile = await verifyGoogle(input.credential, nonce);
      const result = await store.googleAccountLogin(tokenHash(nonce), profile, input, config.termsVersion, now(), mint, (user) => makeMail(user, 'verify_email'));
      return sessionResponse(tokens, result.session, result.user, result.refreshToken);
    },
    async googleLink(auth, nonce, input) {
      inputObject(input, ['credential', 'currentPassword']); tokenInput(nonce); validatePassword(input.currentPassword);
      const user = await store.findUserById(auth.user._id);
      if (!user?.passwordHash || !await verifyPassword(user.passwordHash, input.currentPassword)) throw new AuthError('INVALID_CREDENTIALS');
      const profile = await verifyGoogle(input.credential, nonce);
      await store.linkGoogleAccount(user, auth.claims, tokenHash(nonce), profile, now());
      return { code: 'GOOGLE_LINKED' };
    },
  };
}
