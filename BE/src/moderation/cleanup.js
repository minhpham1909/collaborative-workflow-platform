import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { ModerationAction, TaskComment } from '../models/index.js';
import { commentCriteria } from './criteria.js';

export async function runCommentCleanup({ now = () => new Date(), batchSize = 128 } = {}) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('Invalid cleanup batch size');
  const leaseToken = randomUUID();
  const action = await ModerationAction.collection.findOneAndUpdate({ action: 'ban', cleanup: { $ne: 'none' }, $or: [{ state: 'pending' }, { state: 'processing', leaseUntil: { $lte: now() } }] },
    { $set: { state: 'processing', leaseToken, leaseUntil: new Date(now().getTime() + 60_000), updatedAt: now() }, $inc: { version: 1, attempts: 1 } }, { sort: { createdAt: 1, _id: 1 }, returnDocument: 'after' });
  if (!action) return { state: 'idle' };
  try {
    return await mongoose.connection.transaction(async tx => {
      const guard = await ModerationAction.collection.findOneAndUpdate({ _id: action._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!guard) return { state: 'lease_lost' };
      const criteria = await commentCriteria(guard, tx);
      const rows = await TaskComment.collection.find({ ...criteria, ...(guard.lastId ? { _id: { $gt: guard.lastId } } : {}) }, { session: tx, projection: { _id: 1 } }).sort({ _id: 1 }).limit(batchSize).toArray();
      const deleted = rows.length ? await TaskComment.collection.deleteMany({ ...criteria, _id: { $in: rows.map(row => row._id) } }, { session: tx }) : { deletedCount: 0 };
      const state = rows.length === batchSize ? 'pending' : 'completed';
      const result = await ModerationAction.collection.updateOne({ _id: guard._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } },
        { $set: { state, lastId: rows.at(-1)?._id ?? guard.lastId, leaseToken: null, leaseUntil: null, lastErrorCode: null, attempts: 0, updatedAt: now() }, $inc: { version: 1, deletedCount: deleted.deletedCount } }, { session: tx });
      if (result.modifiedCount !== 1) throw new Error('Lease lost');
      return { state, deletedCount: deleted.deletedCount };
    });
  } catch {
    const result = await ModerationAction.collection.updateOne({ _id: action._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } },
      { $set: { state: action.attempts >= 5 ? 'failed' : 'pending', leaseToken: null, leaseUntil: null, lastErrorCode: 'COMMENT_CLEANUP_FAILED', updatedAt: now() }, $inc: { version: 1 } });
    return { state: result.modifiedCount ? 'retry_or_failed' : 'lease_lost' };
  }
}
