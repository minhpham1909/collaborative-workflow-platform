import { randomUUID } from 'node:crypto';
import { EmailOutbox, AuthToken, User } from '../models/index.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { tokenHash } from '../auth/tokens.js';

export async function dispatchAuthMail({ config, send, now = () => new Date() }) {
  const time = now(); const leaseToken = randomUUID();
  const job = await EmailOutbox.collection.findOneAndUpdate({ category: 'auth', $or: [
    { state: 'pending', nextAttemptAt: { $lte: time } }, { state: 'processing', leaseUntil: { $lte: time } },
  ] }, { $set: { state: 'processing', leaseToken, leaseUntil: new Date(time.getTime() + 60_000), updatedAt: time }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1, _id: 1 }, returnDocument: 'after' });
  if (!job) return { state: 'idle' };
  const finish = async (fields) => EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { $set: { ...fields, leaseToken: null, leaseUntil: null, updatedAt: now() } });
  try {
    const token = await AuthToken.collection.findOne({ _id: job.authTokenId, userId: job.userId, purpose: job.templateKey, usedAt: null, revokedAt: null, expiresAt: { $gt: now() } });
    const user = await User.collection.findOne({ _id: job.userId });
    if (!token || !user || (job.templateKey === 'verify_email' && user.emailVerifiedAt) || (job.templateKey === 'reset_password' && !user.passwordHash)) {
      await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: 'cancelled' };
    }
    const data = createDeliveryCrypto(config.mailKeyHex).open(job.encryptedDeliveryData, job.eventId);
    if (data.to !== user.email || data.purpose !== job.templateKey || !['verify_email', 'reset_password'].includes(data.purpose) || typeof data.token !== 'string' || tokenHash(data.token) !== token.tokenHash) throw new Error('DELIVERY_CONTEXT_INVALID');
    const path = job.templateKey === 'verify_email' ? '/verify-email' : '/reset-password';
    const url = `${config.webOrigin}${path}#token=${data.token}`;
    const providerMessageId = await send({ eventId: job.eventId, to: data.to, purpose: data.purpose, url });
    await finish({ state: 'sent', sentAt: now(), providerMessageId, encryptedDeliveryData: null, lastErrorCode: null });
    return { state: 'sent' };
  } catch {
    await finish({ state: job.attempts >= 5 ? 'failed' : 'pending', nextAttemptAt: new Date(now().getTime() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 6)) * 1000), lastErrorCode: 'AUTH_MAIL_DELIVERY_FAILED' });
    return { state: 'retry_or_failed' };
  }
}
