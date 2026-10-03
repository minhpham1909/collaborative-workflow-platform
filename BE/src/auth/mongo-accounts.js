import mongoose from 'mongoose';
import { User, Session, AuthToken, AuthIdentity, AuthChallenge, EmailOutbox } from '../models/index.js';
import { createMongoAuthStore } from './mongo-store.js';
import { AuthError } from './errors.js';
import { secureEqual } from './tokens.js';
import { termsInput } from './account-input.js';

const id = (value) => new mongoose.Types.ObjectId(value);
export function createMongoAccountStore() {
  async function guard(userId, tx) {
    const user = await User.collection.findOneAndUpdate({ _id: id(userId) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user) throw new AuthError('UNAUTHENTICATED');
    return user;
  }
  async function activeSession(user, claims, tx, now) {
    const session = await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, revokedAt: null, expiresAt: { $gt: now }, authVersionAtIssue: claims.av }, { session: tx });
    if (!session || user.authVersion !== claims.av) throw new AuthError('UNAUTHENTICATED');
    return session;
  }
  async function saveMail(data, tx) {
    await new AuthToken(data.token).save({ session: tx });
    await new EmailOutbox(data.job).save({ session: tx });
  }
  async function consumeChallenge(hash, purpose, userId, now, tx) {
    const challenge = await AuthChallenge.collection.findOneAndUpdate({ tokenHash: hash, purpose, userId, usedAt: null, revokedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } }, { session: tx, returnDocument: 'after' });
    if (!challenge) throw new AuthError('GOOGLE_CHALLENGE_INVALID');
  }
  async function updateGoogleProfile(user, profile, now, tx) {
    const avatar = profile.picture ? { source: 'google', googlePictureUrl: profile.picture, refreshedAt: now } : { source: 'initials', googlePictureUrl: null, refreshedAt: null };
    const fields = { avatar, updatedAt: now };
    if (!user.emailVerifiedAt && profile.authoritativeEmail && profile.email === user.emailCanonical) fields.emailVerifiedAt = now;
    await User.collection.updateOne({ _id: user._id }, { $set: fields, $inc: { version: 1 } }, { session: tx });
    return { ...user, ...fields, version: user.version + 1 };
  }
  async function safeDuplicate(operation, code = 'ACCOUNT_UNAVAILABLE') {
    try { return await operation(); } catch (error) { if (error.code === 11000) throw new AuthError(code, 409); throw error; }
  }
  return {
    ...createMongoAuthStore(),
    newUser: (fields) => new User(fields).toObject(),
    newToken: (fields) => new AuthToken(fields).toObject(),
    newChallenge: (fields) => new AuthChallenge(fields).toObject(),
    findUserById: (userId) => User.findById(userId).select('+passwordHash +authVersion +emailCanonical').lean(),
    registerAccount: (user, mail) => safeDuplicate(() => mongoose.connection.transaction(async (tx) => {
      await new User(user).save({ session: tx }); await saveMail(mail, tx);
    })),
    async issueAccountToken(expected, mail, now, claims) {
      return mongoose.connection.transaction(async (tx) => {
        const user = await guard(expected._id, tx);
        if (claims) await activeSession(user, claims, tx, now);
        if (user.emailCanonical !== expected.emailCanonical) throw new AuthError('UNAUTHENTICATED');
        const purpose = mail.token.purpose;
        if ((purpose === 'verify_email' && user.emailVerifiedAt) || (purpose === 'reset_password' && !user.passwordHash)) return false;
        await AuthToken.collection.updateMany({ userId: user._id, purpose, usedAt: null, revokedAt: null }, { $set: { revokedAt: now } }, { session: tx });
        await saveMail(mail, tx); return true;
      });
    },
    async consumeAccountToken(purpose, hash, now, passwordHash) {
      return mongoose.connection.transaction(async (tx) => {
        const token = await AuthToken.collection.findOne({ tokenHash: hash, purpose, usedAt: null, revokedAt: null, expiresAt: { $gt: now } }, { session: tx });
        if (!token) throw new AuthError('INVALID_TOKEN', 400);
        const user = await guard(token.userId, tx);
        if (purpose === 'reset_password' && !user.passwordHash) throw new AuthError('INVALID_TOKEN', 400);
        const consumed = await AuthToken.collection.updateOne({ _id: token._id, usedAt: null, revokedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } }, { session: tx });
        if (consumed.modifiedCount !== 1) throw new AuthError('INVALID_TOKEN', 400);
        await AuthToken.collection.updateMany({ userId: user._id, purpose, _id: { $ne: token._id }, usedAt: null, revokedAt: null }, { $set: { revokedAt: now } }, { session: tx });
        if (purpose === 'verify_email') {
          if (!user.emailVerifiedAt) await User.collection.updateOne({ _id: user._id }, { $set: { emailVerifiedAt: now, updatedAt: now }, $inc: { version: 1 } }, { session: tx });
        } else {
          await User.collection.updateOne({ _id: user._id }, { $set: { passwordHash, updatedAt: now }, $inc: { authVersion: 1, version: 1 } }, { session: tx });
          await Session.collection.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: 'password_reset' } }, { session: tx });
        }
      });
    },
    async changeAccountPassword(expected, claims, presentedHash, passwordHash, now, mint) {
      return mongoose.connection.transaction(async (tx) => {
        const user = await guard(expected._id, tx);
        const session = await activeSession(user, claims, tx, now);
        if (!secureEqual(user.passwordHash, expected.passwordHash)) throw new AuthError('INVALID_CREDENTIALS');
        if (!secureEqual(session.refreshTokenHash, presentedHash)) throw new AuthError('UNAUTHENTICATED');
        const next = await mint(session);
        await User.collection.updateOne({ _id: user._id }, { $set: { passwordHash, updatedAt: now }, $inc: { authVersion: 1, version: 1 } }, { session: tx });
        await Session.collection.updateMany({ userId: user._id, _id: { $ne: session._id }, revokedAt: null }, { $set: { revokedAt: now, revokeReason: 'password_change' } }, { session: tx });
        await Session.collection.updateOne({ _id: session._id }, { $set: { authVersionAtIssue: next.session.authVersionAtIssue, refreshTokenHash: next.session.refreshTokenHash, refreshGeneration: next.session.refreshGeneration, lastSeenAt: now } }, { session: tx });
        await AuthToken.collection.updateMany({ userId: user._id, purpose: 'reset_password', usedAt: null, revokedAt: null }, { $set: { revokedAt: now } }, { session: tx });
        return { ...next, user: { ...user, passwordHash, authVersion: user.authVersion + 1, version: user.version + 1 } };
      });
    },
    async saveChallenge(challenge, claims, now) {
      await mongoose.connection.transaction(async (tx) => {
        if (challenge.userId) await activeSession(await guard(challenge.userId, tx), claims, tx, now);
        await new AuthChallenge(challenge).save({ session: tx });
      });
    },
    googleAccountLogin: (hash, profile, input, termsVersion, now, mint, makeMail) => safeDuplicate(() => mongoose.connection.transaction(async (tx) => {
      await consumeChallenge(hash, 'google_login', null, now, tx);
      const identity = await AuthIdentity.collection.findOne({ provider: 'google', providerSubject: profile.subject }, { session: tx });
      let user;
      if (identity) {
        user = await updateGoogleProfile(await guard(identity.userId, tx), profile, now, tx);
        await AuthIdentity.collection.updateOne({ _id: identity._id }, { $set: { lastLoginAt: now } }, { session: tx });
      } else {
        if (await User.collection.findOne({ emailCanonical: profile.email }, { session: tx })) throw new AuthError('ACCOUNT_LINK_REQUIRED', 409);
        termsInput(input, termsVersion);
        const document = new User({ displayName: profile.displayName, email: profile.email, emailVerifiedAt: profile.authoritativeEmail ? now : null, termsAcceptance: { version: termsVersion, acceptedAt: now }, avatar: profile.picture ? { source: 'google', googlePictureUrl: profile.picture, refreshedAt: now } : { source: 'initials' } });
        await document.save({ session: tx }); user = document.toObject();
        await new AuthIdentity({ userId: user._id, provider: 'google', providerSubject: profile.subject, lastLoginAt: now }).save({ session: tx });
        if (!profile.authoritativeEmail) await saveMail(makeMail(user), tx);
      }
      const prepared = await mint(user);
      await new Session(prepared.session).save({ session: tx });
      return { ...prepared, user };
    }), 'GOOGLE_ACCOUNT_CONFLICT'),
    linkGoogleAccount: (expected, claims, hash, profile, now) => safeDuplicate(() => mongoose.connection.transaction(async (tx) => {
      const user = await guard(expected._id, tx); await activeSession(user, claims, tx, now);
      if (!secureEqual(user.passwordHash, expected.passwordHash)) throw new AuthError('INVALID_CREDENTIALS');
      if (profile.email !== user.emailCanonical) throw new AuthError('GOOGLE_EMAIL_MISMATCH', 409);
      await consumeChallenge(hash, 'google_link', user._id, now, tx);
      const identity = await AuthIdentity.collection.findOne({ provider: 'google', providerSubject: profile.subject }, { session: tx });
      if (identity && !identity.userId.equals(user._id)) throw new AuthError('GOOGLE_IDENTITY_IN_USE', 409);
      if (!identity) await new AuthIdentity({ userId: user._id, provider: 'google', providerSubject: profile.subject, lastLoginAt: now }).save({ session: tx });
      await updateGoogleProfile(user, profile, now, tx);
    }), 'GOOGLE_IDENTITY_IN_USE'),
  };
}
