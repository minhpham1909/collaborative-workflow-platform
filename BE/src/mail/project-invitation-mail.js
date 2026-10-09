import mongoose from 'mongoose';
import { ProjectGuestInvitation, Project, Workspace, Organization, EmailOutbox, User } from '../models/index.js';
import { assertNotBanned } from '../moderation/guard.js';
import { AuthError } from '../auth/errors.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { tokenHash } from '../auth/tokens.js';

export async function deliverProjectInvitation({ job, config, send, now, finish }) {
  const invitation = await ProjectGuestInvitation.collection.findOne({ _id: job.projectInvitationId, projectId: job.projectId, workspaceId: job.workspaceId,
    type: 'EMAIL', revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } });
  const project = invitation && await Project.collection.findOne({ _id: job.projectId, workspaceId: job.workspaceId });
  const workspace = project && await Workspace.collection.findOne({ _id: job.workspaceId });
  if (!workspace || workspace.state === 'archived' || (workspace.organizationId && !await Organization.collection.findOne({ _id: workspace.organizationId }))) {
    const result = await finish({ state: 'cancelled', encryptedDeliveryData: null });
    return { state: result.modifiedCount === 1 ? 'cancelled' : 'lease_lost' };
  }
  const data = createDeliveryCrypto(config.mailKeyHex).open(job.encryptedDeliveryData, job.eventId);
  const recipient = await User.collection.findOne({ emailCanonical: data.to }, { projection: { _id: 1 } });
  if (recipient) {
    try { await assertNotBanned(recipient._id, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: project._id }); }
    catch (error) { if (!(error instanceof AuthError)) throw error; const result = await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: result.modifiedCount ? 'cancelled' : 'lease_lost' }; }
  }
  if (data.purpose !== 'project_guest_invitation' || data.to !== invitation.emailCanonical || typeof data.token !== 'string' || tokenHash(data.token) !== invitation.tokenHash) throw new Error('DELIVERY_CONTEXT_INVALID');
  const providerMessageId = await send({ eventId: job.eventId, to: data.to, purpose: 'project_guest_invitation', projectName: project.name, workspaceName: workspace.name,
    url: `${config.webOrigin}/project-invite#token=${data.token}` });
  const committed = await mongoose.connection.transaction(async tx => {
    const locked = await Workspace.collection.findOneAndUpdate({ _id: workspace._id }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!locked) return false;
    const result = await EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken: job.leaseToken, leaseUntil: { $gt: now() } },
      { $set: { state: 'sent', sentAt: now(), providerMessageId, leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, lastErrorCode: null, updatedAt: now() } }, { session: tx });
    return result.modifiedCount === 1;
  });
  return { state: committed ? 'sent' : 'lease_lost' };
}
