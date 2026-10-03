import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { EmailOutbox, WorkspaceInvitation, Workspace, WorkspaceMembership, User, Notification } from '../models/index.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { tokenHash } from '../auth/tokens.js';

export async function dispatchInvitationMail({ config, send, now = () => new Date() }) {
  const time = now(); const leaseToken = randomUUID();
  const job = await EmailOutbox.collection.findOneAndUpdate({ category: 'invitation', $or: [
    { state: 'pending', nextAttemptAt: { $lte: time } }, { state: 'processing', leaseUntil: { $lte: time } },
  ] }, { $set: { state: 'processing', leaseToken, leaseUntil: new Date(time.getTime() + 60_000), updatedAt: time }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1, _id: 1 }, returnDocument: 'after' });
  if (!job) return { state: 'idle' };
  const finish = (fields) => EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { $set: { ...fields, leaseToken: null, leaseUntil: null, updatedAt: now() } });
  try {
    const invitation = await WorkspaceInvitation.collection.findOne({ _id: job.invitationId, workspaceId: job.workspaceId, type: 'EMAIL', revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } });
    const workspace = await Workspace.collection.findOne({ _id: job.workspaceId });
    if (!invitation || !workspace) { const changed = await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: changed.modifiedCount === 1 ? 'cancelled' : 'lease_lost' }; }
    const data = createDeliveryCrypto(config.mailKeyHex).open(job.encryptedDeliveryData, job.eventId);
    if (data.purpose !== 'invitation' || data.to !== invitation.emailCanonical || typeof data.token !== 'string' || tokenHash(data.token) !== invitation.tokenHash) throw new Error('DELIVERY_CONTEXT_INVALID');
    // Capture recipient at send time; registration after this attempt does not create retroactive notifications.
    const recipient = await User.collection.findOne({ emailCanonical: data.to }, { projection: { _id: 1 } });
    if (recipient && await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: recipient._id, state: 'active' })) { const changed = await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: changed.modifiedCount === 1 ? 'cancelled' : 'lease_lost' }; }
    const providerMessageId = await send({ eventId: job.eventId, to: data.to, purpose: 'invitation', workspaceName: workspace.name, url: `${config.webOrigin}/invite#token=${data.token}` });
    const sent = await mongoose.connection.transaction(async (tx) => {
      const locked = await Workspace.collection.findOneAndUpdate({ _id: workspace._id }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
      if (!locked) return false;
      const valid = await WorkspaceInvitation.collection.findOne({ _id: invitation._id, revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      const updated = await EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { $set: { state: 'sent', sentAt: now(), providerMessageId, encryptedDeliveryData: null, leaseToken: null, leaseUntil: null, lastErrorCode: null, updatedAt: now() } }, { session: tx });
      if (updated.modifiedCount !== 1) return false;
      if (valid && recipient && !await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: recipient._id, state: 'active' }, { session: tx })) {
        const notification = new Notification({ eventId: job.eventId, recipientId: recipient._id, category: 'invitation', workspaceId: workspace._id, invitationId: invitation._id, actorId: invitation.createdBy, payload: job.payload });
        await notification.validate();
        await Notification.collection.updateOne({ eventId: job.eventId, recipientId: recipient._id }, { $setOnInsert: { ...notification.toObject(), createdAt: now() } }, { session: tx, upsert: true });
      }
      return true;
    });
    return { state: sent ? 'sent' : 'lease_lost' };
  } catch {
    const changed = await finish({ state: job.attempts >= 5 ? 'failed' : 'pending', nextAttemptAt: new Date(now().getTime() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 6)) * 1000), lastErrorCode: 'INVITATION_MAIL_DELIVERY_FAILED' });
    return { state: changed.modifiedCount === 1 ? 'retry_or_failed' : 'lease_lost' };
  }
}
