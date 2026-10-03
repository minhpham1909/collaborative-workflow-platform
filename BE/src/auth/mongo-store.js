import mongoose from 'mongoose';
import { User, Session } from '../models/index.js';
import { AuthError } from './errors.js';
import { secureEqual } from './tokens.js';

const id = (value) => new mongoose.Types.ObjectId(value);
// Only this scoped adapter uses driver mutations; model query/bulk writes remain blocked.
export function createMongoAuthStore() {
  async function userGuard(userId, transaction) {
    const user = await User.collection.findOneAndUpdate({ _id: id(userId) }, { $inc: { authMutationRevision: 1 } }, { session: transaction, returnDocument: 'after' });
    if (!user) throw new AuthError('UNAUTHENTICATED');
    return user;
  }
  return {
    findUserByEmail: (emailCanonical) => User.findOne({ emailCanonical }).select('+passwordHash +authVersion').lean(),
    newSession: (fields) => ({ _id: new mongoose.Types.ObjectId(), ...fields }),
    async issueSession(expectedUser, data) {
      return mongoose.connection.transaction(async (transaction) => {
        const user = await userGuard(expectedUser._id, transaction);
        if (user.authVersion !== expectedUser.authVersion || !secureEqual(user.passwordHash, expectedUser.passwordHash)) throw new AuthError('INVALID_CREDENTIALS');
        await new Session(data).save({ session: transaction });
        return user;
      });
    },
    async readSession(sessionId, userId) {
      const session = await Session.findOne({ _id: id(sessionId), userId: id(userId) }).select('+refreshTokenHash').lean();
      if (!session) return null;
      const user = await User.findById(session.userId).select('+authVersion').lean();
      return user ? { session, user } : null;
    },
    async rotateSession(claims, presentedHash, mint, now) {
      return mongoose.connection.transaction(async (transaction) => {
        const user = await userGuard(claims.sub, transaction);
        const session = await Session.collection.findOne({ _id: id(claims.sid), userId: user._id }, { session: transaction });
        if (!session || session.revokedAt || session.expiresAt <= now || user.authVersion !== claims.av || session.authVersionAtIssue !== claims.av) return { error: 'UNAUTHENTICATED' };
        if (session.refreshGeneration !== claims.generation || !secureEqual(session.refreshTokenHash, presentedHash)) {
          // Return, don't throw inside this transaction: the revocation must commit.
          await Session.collection.updateOne({ _id: session._id }, { $set: { revokedAt: now, revokeReason: 'refresh_reuse' } }, { session: transaction });
          return { error: 'REFRESH_REUSED' };
        }
        const next = await mint(session);
        const result = await Session.collection.updateOne({ _id: session._id, refreshGeneration: claims.generation, refreshTokenHash: presentedHash, revokedAt: null }, { $set: { refreshTokenHash: next.session.refreshTokenHash, refreshGeneration: next.session.refreshGeneration, lastSeenAt: now } }, { session: transaction });
        if (result.modifiedCount !== 1) throw new Error('SESSION_ROTATION_CONFLICT');
        return { ...next, user };
      });
    },
    async revokeSession(sessionId, userId, now, reason) {
      await mongoose.connection.transaction(async (transaction) => {
        const user = await userGuard(userId, transaction);
        await Session.collection.updateOne({ _id: id(sessionId), userId: user._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: reason } }, { session: transaction });
      });
    },
  };
}
