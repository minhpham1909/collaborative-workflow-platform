import mongoose from 'mongoose';
import { User, Session } from '../models/index.js';
import { AuthError } from '../auth/errors.js';

const id = (value) => new mongoose.Types.ObjectId(value);
export function createMongoUsersStore() {
  return {
    async updateOwn(claims, expectedVersion, fields, now) {
      return mongoose.connection.transaction(async (tx) => {
        // Shared User guard serializes profile writes with password/reset/revoke mutations.
        const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
        if (!user || user.authVersion !== claims.av) throw new AuthError('UNAUTHENTICATED');
        const session = await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now } }, { session: tx });
        if (!session) throw new AuthError('UNAUTHENTICATED');
        if (user.version !== expectedVersion) throw new AuthError('VERSION_CONFLICT', 409);
        const changes = {};
        for (const [path, value] of Object.entries(fields)) {
          const current = path.split('.').reduce((object, key) => object[key], user);
          if (current !== value) changes[path] = value;
        }
        if (!Object.keys(changes).length) return user;
        const updated = await User.collection.findOneAndUpdate({ _id: user._id, version: expectedVersion }, { $set: { ...changes, updatedAt: now }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
        if (!updated) throw new AuthError('VERSION_CONFLICT', 409);
        return updated;
      });
    },
  };
}
