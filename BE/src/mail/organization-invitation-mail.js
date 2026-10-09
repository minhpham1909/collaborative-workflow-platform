import mongoose from 'mongoose';
import { Organization, OrganizationInvitation, Workspace, EmailOutbox, User } from '../models/index.js';
import { assertNotBanned } from '../moderation/guard.js';
import { AuthError } from '../auth/errors.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { tokenHash } from '../auth/tokens.js';

// The shared invitation dispatcher owns the lease and retry policy.
export async function deliverOrganizationInvitation({ job, config, send, now, finish }) {
  const invitation = await OrganizationInvitation.collection.findOne({ _id: job.organizationInvitationId, organizationId: job.organizationId,
    revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } });
  const organization = await Organization.collection.findOne({ _id: job.organizationId });
  const workspace = invitation?.workspaceId && await Workspace.collection.findOne({ _id: invitation.workspaceId, organizationId: job.organizationId });
  if (!invitation || !organization || (invitation.workspaceId && (!workspace || workspace.state === 'archived'))) {
    const changed = await finish({ state: 'cancelled', encryptedDeliveryData: null });
    return { state: changed.modifiedCount === 1 ? 'cancelled' : 'lease_lost' };
  }
  const data = createDeliveryCrypto(config.mailKeyHex).open(job.encryptedDeliveryData, job.eventId);
  const recipient = await User.collection.findOne({ emailCanonical: data.to }, { projection: { _id: 1 } });
  if (recipient) {
    try { await assertNotBanned(recipient._id, { organizationId: organization._id, workspaceId: workspace?._id }); }
    catch (error) { if (!(error instanceof AuthError)) throw error; const result = await finish({ state: 'cancelled', encryptedDeliveryData: null }); return { state: result.modifiedCount ? 'cancelled' : 'lease_lost' }; }
  }
  if (data.purpose !== 'organization_invitation' || data.to !== invitation.emailCanonical || typeof data.token !== 'string' || tokenHash(data.token) !== invitation.tokenHash) throw new Error('DELIVERY_CONTEXT_INVALID');
  const providerMessageId = await send({ eventId: job.eventId, to: data.to, purpose: 'organization_invitation', organizationName: organization.name,
    workspaceName: workspace?.name ?? null, url: `${config.webOrigin}/organization-invite#token=${data.token}` });
  const committed = await mongoose.connection.transaction(async tx => {
    const locked = await Organization.collection.findOneAndUpdate({ _id: organization._id }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!locked) return false;
    const changed = await EmailOutbox.collection.updateOne({ _id: job._id, state: 'processing', leaseToken: job.leaseToken, leaseUntil: { $gt: now() } },
      { $set: { state: 'sent', providerMessageId, sentAt: now(), leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, lastErrorCode: null, updatedAt: now() } }, { session: tx });
    return changed.modifiedCount === 1;
  });
  return { state: committed ? 'sent' : 'lease_lost' };
}
