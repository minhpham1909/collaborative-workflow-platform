import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { EmailOutbox, Workspace, WorkspaceMembership, User, Task, Project } from '../models/index.js';
import { workspaceAccess } from '../organizations/workspace-access.js';
import { AuthError } from '../auth/errors.js';
import { assertNotBanned } from '../moderation/guard.js';

export async function dispatchWorkMail({ config, send, now = () => new Date() }) {
  const time = now(); const leaseToken = randomUUID();
  const job = await EmailOutbox.collection.findOneAndUpdate({ category: 'work', $or: [{ state: 'pending', nextAttemptAt: { $lte: time } }, { state: 'processing', leaseUntil: { $lte: time } }] }, { $set: { state: 'processing', leaseToken, leaseUntil: new Date(time.getTime() + 60_000), updatedAt: time }, $inc: { attempts: 1 } }, { sort: { nextAttemptAt: 1, _id: 1 }, returnDocument: 'after' });
  if (!job) return { state: 'idle' };
  const finish = (fields) => EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { $set: { ...fields, leaseToken: null, leaseUntil: null, updatedAt: now() } });
  try {
    if (job.attempts > 5) { const result = await finish({ state: 'failed', lastErrorCode: 'WORK_MAIL_ATTEMPTS_EXHAUSTED' }); return { state: result.modifiedCount === 1 ? 'failed' : 'lease_lost' }; }
    const delivery = await mongoose.connection.transaction(async (tx) => {
      const workspace = await Workspace.collection.findOneAndUpdate({ _id: job.workspaceId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
      const recipient = await User.collection.findOne({ _id: job.userId }, { session: tx });
      const membership = await WorkspaceMembership.collection.findOne({ workspaceId: job.workspaceId, userId: job.userId, state: 'active' }, { session: tx });
      const task = await Task.collection.findOne({ _id: job.taskId, workspaceId: job.workspaceId, deletedAt: null }, { session: tx });
      if (!workspace || workspace.state === 'archived' || !recipient?.emailVerifiedAt || !membership || !task || !await Project.collection.findOne({ _id: task.projectId, workspaceId: workspace._id }, { session: tx })) return null;
      try {
        await assertNotBanned(job.userId, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: task.projectId }, tx);
        await workspaceAccess(workspace, job.userId, tx, { requireMember: true });
      }
      catch (error) { if (error instanceof AuthError) return null; throw error; }
      const eventTypes = job.eventTypes.filter((type) => membership.emailOverrides[type] === 'on' || (membership.emailOverrides[type] === 'inherit' && recipient.emailPreferences[type]));
      if (!eventTypes.length || !await EmailOutbox.collection.findOne({ _id: job._id, state: 'processing', leaseToken, leaseUntil: { $gt: now() } }, { session: tx })) return null;
      return { eventId: job.eventId, deliveryKey: String(job._id), to: recipient.emailCanonical, purpose: 'work', locale: recipient.locale ?? 'vi', eventTypes, taskTitle: task.title, workspaceName: workspace.name, ...(eventTypes.includes('status') ? { previousStatus: job.payload.previousStatus, status: job.payload.status } : {}), url: `${config.webOrigin}/#task/${task._id}` };
    });
    if (!delivery) { const result = await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: result.modifiedCount === 1 ? 'cancelled' : 'lease_lost' }; }
    const providerMessageId = await send(delivery);
    const result = await finish({ state: 'sent', sentAt: now(), providerMessageId, lastErrorCode: null, encryptedDeliveryData: null });
    return { state: result.modifiedCount === 1 ? 'sent' : 'lease_lost' };
  } catch {
    const result = await finish({ state: job.attempts >= 5 ? 'failed' : 'pending', nextAttemptAt: new Date(now().getTime() + Math.min(3600, 30 * 2 ** Math.min(job.attempts, 6)) * 1000), lastErrorCode: 'WORK_MAIL_DELIVERY_FAILED' });
    return { state: result.modifiedCount === 1 ? 'retry_or_failed' : 'lease_lost' };
  }
}
