import mongoose from 'mongoose';
import { reconcileReopenRequests } from './reopen-lifecycle.js';
import { assertWorkspaceWritable } from '../workspaces/lifecycle.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { User, Session, Workspace, Organization, Project, ProjectGuest, ProjectGuestInvitation, ProjectAccessAudit, Notification, EmailOutbox } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { workspaceAccess } from '../organizations/workspace-access.js';
import { paged, invitationState } from '../workspaces/response.js';
import { tokenHash } from '../auth/tokens.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { assertNotBanned } from '../moderation/guard.js';

const id = value => new mongoose.Types.ObjectId(value);
const same = (a, b) => String(a) === String(b);
const unavailable = () => { throw new AuthError('INVITATION_UNAVAILABLE', 404); };
const version = (record, expected) => { if (record.version !== expected) throw new AuthError('VERSION_CONFLICT', 409); };
const after = page => page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
const invitationDto = (value, now) => ({ id: String(value._id), projectId: String(value.projectId), type: value.type, email: value.type === 'EMAIL' ? value.email : null,
  role: 'guest', state: invitationState(value, now()), version: value.version, createdAt: value.createdAt, expiresAt: value.expiresAt });
export function createMongoProjectGuestStore({ config, now = () => new Date() } = {}) {
  const run = (claims, operation) => mongoose.connection.transaction(async tx => {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) throw new AuthError('UNAUTHENTICATED');
    if (!user.emailVerifiedAt) throw new AuthError('EMAIL_VERIFICATION_REQUIRED', 403);
    return operation(user, tx);
  });
  async function target(projectId, workspaceId, tx, lock = true) {
    let project = await Project.collection.findOne({ _id: id(projectId), ...(workspaceId ? { workspaceId } : {}) }, { session: tx });
    if (!project) unavailable();
    const workspace = lock ? await Workspace.collection.findOneAndUpdate({ _id: project.workspaceId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' })
      : await Workspace.collection.findOne({ _id: project.workspaceId }, { session: tx });
    if (!workspace) unavailable();
    if (workspace.organizationId) {
      const org = lock ? await Organization.collection.findOneAndUpdate({ _id: workspace.organizationId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' })
        : await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx });
      if (!org) unavailable();
    }
    project = await Project.collection.findOne({ _id: project._id, workspaceId: workspace._id }, { session: tx });
    if (!project) unavailable();
    return { project, workspace };
  }
  async function manage(user, projectId, tx) {
    const value = await target(projectId, null, tx);
    await assertNotBanned(user._id, { organizationId: value.workspace.organizationId, workspaceId: value.workspace._id, projectId: value.project._id }, tx);
    const access = await workspaceAccess(value.workspace, user._id, tx);
    if (!access.canManage) throw new AuthError('OWNER_REQUIRED', 403);
    return value;
  }
  async function assertIndexes() {
    for (const [model, keys] of [[ProjectGuest, ['projectId', 'userId']], [ProjectGuestInvitation, ['tokenHash']]]) {
      let indexes;
      try { indexes = await model.collection.listIndexes().toArray(); } catch { throw new AuthError('PROJECT_ACCESS_SETUP_REQUIRED', 503); }
      if (!indexes.some(index => index.unique && !index.partialFilterExpression && Object.keys(index.key).length === keys.length && keys.every(key => index.key[key] === 1))) throw new AuthError('PROJECT_ACCESS_SETUP_REQUIRED', 503);
    }
  }
  async function accept(user, lookup, tx) {
    let invitation = await ProjectGuestInvitation.collection.findOne(lookup, { session: tx });
    if (!invitation) unavailable();
    const { project, workspace } = await target(String(invitation.projectId), invitation.workspaceId, tx);
    assertWorkspaceWritable(workspace);
    await assertNotBanned(user._id, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: project._id }, tx);
    invitation = await ProjectGuestInvitation.collection.findOne({ _id: invitation._id }, { session: tx });
    if (!invitation || invitation.revokedAt || invitation.expiresAt <= now()) unavailable();
    if (invitation.type === 'EMAIL' && invitation.emailCanonical !== user.emailCanonical) throw new AuthError('INVITATION_EMAIL_MISMATCH', 403);
    let grant = await ProjectGuest.collection.findOne({ projectId: project._id, userId: user._id }, { session: tx });
    if (grant && !same(grant.workspaceId, workspace._id)) unavailable();
    if (invitation.acceptedAt) {
      if (!same(invitation.acceptedBy, user._id) || grant?.state !== 'active') unavailable();
      return { code: 'ALREADY_GUEST', projectId: String(project._id) };
    }
    const changed = grant?.state !== 'active';
    if (changed) {
      if (grant) {
        grant = await ProjectGuest.collection.findOneAndUpdate({ _id: grant._id, workspaceId: workspace._id, version: grant.version },
          { $set: { state: 'active', revokedAt: null, joinedAt: now(), grantedBy: invitation.createdBy, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
        if (!grant) throw new AuthError('VERSION_CONFLICT', 409);
      } else {
        const created = new ProjectGuest({ workspaceId: workspace._id, projectId: project._id, userId: user._id, grantedBy: invitation.createdBy, joinedAt: now() });
        await created.save({ session: tx }); grant = created.toObject();
      }
      await new ProjectAccessAudit({ workspaceId: workspace._id, projectId: project._id, actorId: user._id, targetUserId: user._id, action: 'guest_joined' }).save({ session: tx });
    }
    if (invitation.type === 'EMAIL') {
      const result = await ProjectGuestInvitation.collection.updateOne({ _id: invitation._id, acceptedAt: null, version: invitation.version },
        { $set: { acceptedAt: now(), acceptedBy: user._id, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      if (result.modifiedCount !== 1) throw new AuthError('VERSION_CONFLICT', 409);
      await EmailOutbox.collection.updateMany({ projectInvitationId: invitation._id, state: { $in: ['pending', 'processing', 'failed'] } },
        { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
    }
    return { code: changed ? 'PROJECT_GUEST_JOINED' : 'ALREADY_GUEST', projectId: String(project._id) };
  }
  return {
    inviteGuest: async (claims, projectId, input) => {
      await assertIndexes();
      return run(claims, async (user, tx) => {
        const { project, workspace } = await manage(user, projectId, tx);
        assertWorkspaceWritable(workspace);
        if (project.state !== 'active') throw new AuthError('PROJECT_ARCHIVED', 409);
        const token = randomBytes(32).toString('hex');
        const invitation = new ProjectGuestInvitation({ workspaceId: workspace._id, projectId: project._id, createdBy: user._id, type: input.type, email: input.email,
          tokenHash: tokenHash(token), expiresAt: new Date(now().getTime() + 7 * 86400_000) });
        await invitation.save({ session: tx });
        if (input.type === 'EMAIL') {
          const eventId = randomUUID();
          await new EmailOutbox({ eventId, recipientKey: `email:${input.email}`, category: 'invitation', workspaceId: workspace._id, projectId: project._id, projectInvitationId: invitation._id,
            templateKey: 'project_guest_invitation', nextAttemptAt: now(), payload: { workspaceName: workspace.name, projectName: project.name, actorDisplayName: user.displayName },
            encryptedDeliveryData: createDeliveryCrypto(config?.mailKeyHex).seal({ to: input.email, token, purpose: 'project_guest_invitation' }, eventId) }).save({ session: tx });
          const recipient = await User.collection.findOne({ emailCanonical: input.email }, { session: tx });
          if (recipient) await assertNotBanned(recipient._id, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: project._id }, tx);
          if (recipient) await new Notification({ eventId, recipientId: recipient._id, actorId: user._id, category: 'project_invitation', workspaceId: workspace._id, projectId: project._id,
            projectInvitationId: invitation._id, payload: { workspaceName: workspace.name, projectName: project.name, actorDisplayName: user.displayName } }).save({ session: tx });
        }
        await new ProjectAccessAudit({ workspaceId: workspace._id, projectId: project._id, actorId: user._id, action: 'guest_invitation_created' }).save({ session: tx });
        return { code: 'INVITATION_CREATED', invitation: invitationDto(invitation.toObject(), now), ...(input.type === 'LINK' ? { url: `${config.webOrigin}/project-invite#token=${token}` } : { emailDelivery: 'pending' }) };
      });
    },
    guestInvitations: (claims, projectId, page) => run(claims, async (user, tx) => {
      const { project } = await manage(user, projectId, tx);
      const records = await ProjectGuestInvitation.collection.find({ projectId: project._id, ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      return paged(records, page.limit, value => invitationDto(value, now));
    }),
    revokeGuestInvitation: (claims, projectId, invitationId, expectedVersion) => run(claims, async (user, tx) => {
      const { project, workspace } = await manage(user, projectId, tx);
      const value = await ProjectGuestInvitation.collection.findOne({ _id: id(invitationId), projectId: project._id, workspaceId: workspace._id }, { session: tx });
      if (!value) unavailable(); version(value, expectedVersion);
      if (value.revokedAt || value.acceptedAt) return { code: 'INVITATION_UNCHANGED' };
      await ProjectGuestInvitation.collection.updateOne({ _id: value._id, version: value.version }, { $set: { revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      await EmailOutbox.collection.updateMany({ projectInvitationId: value._id, state: { $in: ['pending', 'processing', 'failed'] } },
        { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
      await new ProjectAccessAudit({ workspaceId: workspace._id, projectId: project._id, actorId: user._id, action: 'guest_invitation_revoked' }).save({ session: tx });
      return { code: 'INVITATION_REVOKED' };
    }),
    guests: (claims, projectId, page) => run(claims, async (user, tx) => {
      const { project } = await manage(user, projectId, tx);
      const records = await ProjectGuest.collection.find({ projectId: project._id, state: 'active', ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const identities = await User.collection.find({ _id: { $in: records.map(record => record.userId) } }, { session: tx, projection: { displayName: 1, avatar: 1 } }).toArray();
      return paged(records, page.limit, value => { const identity = identities.find(person => same(person._id, value.userId)); return { userId: String(value.userId), role: 'guest', displayName: identity?.displayName ?? 'Unavailable User', avatar: identity?.avatar, version: value.version, joinedAt: value.joinedAt }; });
    }),
    revokeGuest: (claims, projectId, userId, expectedVersion) => run(claims, async (user, tx) => {
      const { project, workspace } = await manage(user, projectId, tx);
      const value = await ProjectGuest.collection.findOne({ projectId: project._id, workspaceId: workspace._id, userId: id(userId) }, { session: tx });
      if (!value) throw new AuthError('RESOURCE_UNAVAILABLE', 404); version(value, expectedVersion);
      if (value.state === 'inactive') return { code: 'GUEST_ALREADY_INACTIVE' };
      await ProjectGuest.collection.updateOne({ _id: value._id, version: value.version }, { $set: { state: 'inactive', revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      await reconcileReopenRequests({ projectId: project._id, requesterId: value.userId }, now(), tx);
      await new ProjectAccessAudit({ workspaceId: workspace._id, projectId: project._id, actorId: user._id, targetUserId: value.userId, action: 'guest_revoked' }).save({ session: tx });
      return { code: 'PROJECT_GUEST_REVOKED' };
    }),
    previewGuestInvitation: token => mongoose.connection.transaction(async tx => {
      const value = await ProjectGuestInvitation.collection.findOne({ tokenHash: tokenHash(token), revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      if (!value) unavailable();
      const { project, workspace } = await target(String(value.projectId), value.workspaceId, tx, false);
      const inviter = await User.collection.findOne({ _id: value.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { preview: { projectName: project.name, workspaceName: workspace.name, role: 'guest', inviterDisplayName: inviter?.displayName ?? 'Unavailable User', expiresAt: value.expiresAt } };
    }),
    acceptGuestInvitation: async (claims, token) => { await assertIndexes(); return run(claims, (user, tx) => accept(user, { tokenHash: tokenHash(token) }, tx)); },
    acceptGuestInvitationById: async (claims, invitationId) => { await assertIndexes(); return run(claims, (user, tx) => accept(user, { _id: id(invitationId), type: 'EMAIL', emailCanonical: user.emailCanonical }, tx)); },
  };
}
