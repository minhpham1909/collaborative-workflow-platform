import mongoose from 'mongoose';
import { queryWorkspaceList } from '../workspaces/query-store.js';
import { cancelReopenRequests, reconcileReopenRequests } from '../work/reopen-lifecycle.js';
import { assertWorkspaceWritable } from '../workspaces/lifecycle.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { User, Session, Organization, OrganizationMembership, OrganizationAudit, OrganizationInvitation, Workspace, WorkspaceMembership, Notification, EmailOutbox, Task, Project, ProjectGuest } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { organizationAccess } from './access.js';
import { assertOrganizationIndexes, assertOrganizationInvitationIndexes } from './index-check.js';
import { paged } from '../workspaces/response.js';
import { workspaceResponse } from '../workspaces/response.js';
import { workspaceAccess, workspaceAccessStages } from './workspace-access.js';
import { tokenHash } from '../auth/tokens.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { assertNotBanned, banFilterStages } from '../moderation/guard.js';
import { invitationState } from '../workspaces/response.js';

const id = value => new mongoose.Types.ObjectId(value);
const response = (organization, role) => ({ id: String(organization._id), name: organization.name,
  ownerId: String(organization.ownerId), role, version: organization.version,
  permissions: { createWorkspace: ['owner', 'admin'].includes(role), edit: ['owner', 'admin'].includes(role) },
  createdAt: organization.createdAt, updatedAt: organization.updatedAt });
export function createMongoOrganizationStore({ now = () => new Date(), config } = {}) {
  async function actor(claims, tx) {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({
      _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() },
    }, { session: tx })) throw new AuthError('UNAUTHENTICATED');
    if (!user.emailVerifiedAt) throw new AuthError('EMAIL_VERIFICATION_REQUIRED', 403);
    return user;
  }
  const run = (claims, operation) => mongoose.connection.transaction(async tx => operation(await actor(claims, tx), tx));
  async function scope(user, organizationId, tx, manage = false) {
    // Role changes will use this same guard when membership management is introduced.
    const organization = await Organization.collection.findOneAndUpdate({ _id: id(organizationId) },
      { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    const membership = organization && await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: user._id }, { session: tx });
    if (organization) await assertNotBanned(user._id, { organizationId: organization._id }, tx);
    return { organization, role: organizationAccess(organization, membership, user._id, { manage }) };
  }
  const same = (a, b) => String(a) === String(b);
  const checkVersion = (record, version) => { if (record.version !== version) throw new AuthError('VERSION_CONFLICT', 409); };
  const after = page => page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
  async function targetMember(organization, userId, tx) {
    await assertNotBanned(id(userId), { organizationId: organization._id }, tx);
    const membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: id(userId), state: 'active' }, { session: tx });
    const person = membership && await User.collection.findOne({ _id: membership.userId }, { session: tx, projection: { emailVerifiedAt: 1 } });
    if (!membership || !person?.emailVerifiedAt) throw new AuthError('ORGANIZATION_MEMBER_REQUIRED', 409);
    return membership;
  }
  async function workspaceScope(user, organization, workspaceId, tx) {
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: id(workspaceId), organizationId: organization._id },
      { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace) throw new AuthError('WORKSPACE_UNAVAILABLE', 404);
    const access = await workspaceAccess(workspace, user._id, tx);
    return { workspace, access };
  }
  async function addWorkspaceMembership(user, organization, workspace, userId, tx) {
    await assertNotBanned(id(userId), { organizationId: organization._id, workspaceId: workspace._id }, tx);
    await targetMember(organization, userId, tx);
    let membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: id(userId) }, { session: tx });
    if (membership?.state === 'active') return { added: false, membership };
    if (membership) {
      membership = await WorkspaceMembership.collection.findOneAndUpdate({ _id: membership._id, version: membership.version },
        { $set: { state: 'active', joinedAt: now(), leftAt: null, exitReason: null, emailOverrides: { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' }, updatedAt: now() },
          $inc: { version: 1, membershipGeneration: 1 } }, { session: tx, returnDocument: 'after' });
      if (!membership) throw new AuthError('VERSION_CONFLICT', 409);
    } else {
      const value = new WorkspaceMembership({ workspaceId: workspace._id, userId: id(userId), joinedAt: now() });
      await value.save({ session: tx }); membership = value.toObject();
    }
    await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: id(userId), workspaceId: workspace._id, action: 'workspace_member_added' }).save({ session: tx });
    if (!same(user._id, userId)) await new Notification({ recipientId: id(userId), actorId: user._id, eventId: randomUUID(), category: 'membership', workspaceId: workspace._id,
      payload: { workspaceName: workspace.name, actorDisplayName: user.displayName } }).save({ session: tx });
    return { added: true, membership };
  }
  async function updateWorkspace(workspace, fields, tx) {
    const updated = await Workspace.collection.findOneAndUpdate({ _id: workspace._id, version: workspace.version },
      { $set: { ...fields, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
    if (!updated) throw new AuthError('VERSION_CONFLICT', 409);
    return updated;
  }
  const invitationResponse = value => ({ id: String(value._id), organizationId: String(value.organizationId), workspaceId: value.workspaceId ? String(value.workspaceId) : null,
    email: value.email, role: 'member', state: invitationState(value, now()), version: value.version, createdAt: value.createdAt, expiresAt: value.expiresAt });
  async function invitationTarget(value, tx, lock = false) {
    const organization = lock ? await Organization.collection.findOneAndUpdate({ _id: value.organizationId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' })
      : await Organization.collection.findOne({ _id: value.organizationId }, { session: tx });
    const workspace = value.workspaceId ? await Workspace.collection.findOne({ _id: value.workspaceId, organizationId: value.organizationId }, { session: tx }) : null;
    if (!organization || (value.workspaceId && !workspace)) throw new AuthError('INVITATION_UNAVAILABLE', 404);
    return { organization, workspace };
  }
  async function acceptOrganizationInvitation(user, tx, lookup) {
    let value = await OrganizationInvitation.collection.findOne(lookup, { session: tx });
    if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404);
    const { organization, workspace } = await invitationTarget(value, tx, true);
    if (workspace) assertWorkspaceWritable(workspace);
    await assertNotBanned(user._id, { organizationId: organization._id, workspaceId: workspace?._id }, tx);
    value = await OrganizationInvitation.collection.findOne({ _id: value._id }, { session: tx });
    if (!value || value.revokedAt || value.expiresAt <= now()) throw new AuthError('INVITATION_UNAVAILABLE', 404);
    if (value.emailCanonical !== user.emailCanonical) throw new AuthError('INVITATION_EMAIL_MISMATCH', 403);
    let membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: user._id }, { session: tx });
    if (value.acceptedAt) {
      if (!same(value.acceptedBy, user._id) || membership?.state !== 'active') throw new AuthError('INVITATION_UNAVAILABLE', 404);
      return { code: 'ALREADY_ACCEPTED', organization: response(organization, organizationAccess(organization, membership, user._id)) };
    }
    if (membership?.state !== 'active') {
      if (membership) {
        membership = await OrganizationMembership.collection.findOneAndUpdate({ _id: membership._id, version: membership.version },
          { $set: { state: 'active', role: 'member', joinedAt: now(), leftAt: null, exitReason: null, updatedAt: now() }, $inc: { version: 1, membershipGeneration: 1 } }, { session: tx, returnDocument: 'after' });
      } else {
        const created = new OrganizationMembership({ organizationId: organization._id, userId: user._id, joinedAt: now() });
        await created.save({ session: tx }); membership = created.toObject();
      }
      if (!membership) throw new AuthError('VERSION_CONFLICT', 409);
      await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: user._id, action: 'organization_member_joined' }).save({ session: tx });
    }
    if (workspace) {
      const current = await Workspace.collection.findOneAndUpdate({ _id: workspace._id, organizationId: organization._id }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
      if (!current) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const result = await addWorkspaceMembership(user, organization, current, String(user._id), tx);
      if (result.added) await updateWorkspace(current, {}, tx);
    }
    const consumed = await OrganizationInvitation.collection.updateOne({ _id: value._id, version: value.version, acceptedAt: null, revokedAt: null },
      { $set: { acceptedAt: now(), acceptedBy: user._id, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    if (consumed.modifiedCount !== 1) throw new AuthError('VERSION_CONFLICT', 409);
    await EmailOutbox.collection.updateMany({ organizationInvitationId: value._id, state: { $in: ['pending', 'processing', 'failed'] } },
      { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
    return { code: 'ORGANIZATION_JOINED', organization: response(organization, organizationAccess(organization, membership, user._id)), workspaceId: workspace ? String(workspace._id) : null };
  }
  async function endOrganizationMembership(user, organization, membership, reason, tx) {
    const workspaces = await Workspace.collection.find({ organizationId: organization._id }, { session: tx }).sort({ _id: 1 }).toArray();
    if (workspaces.some(workspace => same(workspace.managerId, membership.userId))) throw new AuthError('MANAGER_REPLACEMENT_REQUIRED', 409);
    for (const workspace of workspaces) {
      await Workspace.collection.updateOne({ _id: workspace._id }, { $inc: { mutationRevision: 1 } }, { session: tx });
      await WorkspaceMembership.collection.updateMany({ workspaceId: workspace._id, userId: membership.userId, state: 'active' },
        { $set: { state: 'inactive', leftAt: now(), exitReason: reason, emailOverrides: { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' }, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    }
    const workspaceIds = workspaces.map(workspace => workspace._id);
    await Project.collection.updateMany({ workspaceId: { $in: workspaceIds }, leadId: membership.userId },
      { $set: { leadId: null, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    await ProjectGuest.collection.updateMany({ workspaceId: { $in: workspaceIds }, userId: membership.userId, state: 'active' },
      { $set: { state: 'inactive', revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    await Task.collection.updateMany({ workspaceId: { $in: workspaceIds }, assigneeId: membership.userId, status: { $ne: 'done' }, deletedAt: null },
      { $set: { assigneeId: null, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    await EmailOutbox.collection.updateMany({ category: 'work', userId: membership.userId, workspaceId: { $in: workspaceIds }, state: { $in: ['pending', 'processing', 'failed'] } },
      { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
    const updated = await OrganizationMembership.collection.updateOne({ _id: membership._id, version: membership.version, state: 'active' },
      { $set: { state: 'inactive', role: 'member', leftAt: now(), exitReason: reason, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    if (updated.modifiedCount !== 1) throw new AuthError('VERSION_CONFLICT', 409);
    await cancelReopenRequests({ workspaceId: { $in: workspaceIds }, requesterId: membership.userId }, 'requester_access_lost', now(), tx, user._id);
    await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: membership.userId,
      action: reason === 'left' ? 'organization_member_left' : 'organization_member_removed', previousRole: membership.role }).save({ session: tx });
  }
  return {
    invite: async (claims, organizationId, input) => {
      await assertOrganizationInvitationIndexes();
      return run(claims, async (user, tx) => {
        const { organization } = await scope(user, organizationId, tx, true);
        if (input.workspaceId) assertWorkspaceWritable((await workspaceScope(user, organization, input.workspaceId, tx)).workspace);
        const recipient = await User.collection.findOne({ emailCanonical: input.email }, { session: tx });
        if (recipient) await assertNotBanned(recipient._id, { organizationId: organization._id, workspaceId: input.workspaceId ? id(input.workspaceId) : null }, tx);
        if (recipient) {
          const current = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: recipient._id, state: 'active' }, { session: tx });
          const workspaceMember = current && input.workspaceId && await WorkspaceMembership.collection.findOne({ workspaceId: id(input.workspaceId), userId: recipient._id, state: 'active' }, { session: tx });
          if (current && (!input.workspaceId || workspaceMember)) return { code: 'ALREADY_MEMBER' };
        }
        const token = randomBytes(32).toString('hex');
        const invitation = new OrganizationInvitation({ organizationId: organization._id, workspaceId: input.workspaceId && id(input.workspaceId), createdBy: user._id,
          email: input.email, emailCanonical: input.email, tokenHash: tokenHash(token), expiresAt: new Date(now().getTime() + 7 * 86400_000) });
        await invitation.save({ session: tx });
        const eventId = randomUUID();
        const job = new EmailOutbox({ eventId, recipientKey: `email:${input.email}`, category: 'invitation', organizationId: organization._id, organizationInvitationId: invitation._id,
          templateKey: 'organization_invitation', nextAttemptAt: now(), payload: { organizationName: organization.name, actorDisplayName: user.displayName },
          encryptedDeliveryData: createDeliveryCrypto(config?.mailKeyHex).seal({ to: input.email, token, purpose: 'organization_invitation' }, eventId) });
        await job.save({ session: tx });
        if (recipient) await new Notification({ eventId, recipientId: recipient._id, actorId: user._id, category: 'organization_invitation', organizationId: organization._id,
          organizationInvitationId: invitation._id, payload: { organizationName: organization.name, actorDisplayName: user.displayName } }).save({ session: tx });
        await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: recipient?._id ?? null, action: 'organization_invitation_created' }).save({ session: tx });
        return { code: 'INVITATION_CREATED', invitation: invitationResponse(invitation.toObject()), emailDelivery: job.state };
      });
    },
    invitations: (claims, organizationId, page) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx, true);
      const state = page.state === 'active' ? { revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } } : page.state === 'expired' ? { revokedAt: null, acceptedAt: null, expiresAt: { $lte: now() } } : page.state === 'accepted' ? { revokedAt: null, acceptedAt: { $ne: null } } : page.state === 'revoked' ? { revokedAt: { $ne: null } } : {};
      const criteria = { organizationId: organization._id, ...state, $and: [...page.filters, ...page.patterns.map(pattern => ({ email: { $regex: pattern, $options: 'i' } })), ...(page.type === 'LINK' ? [{ _id: null }] : [])] };
      if (!criteria.$and.length) delete criteria.$and;
      const records = await OrganizationInvitation.collection.find({ ...criteria, ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      return { ...paged(records, page.limit, invitationResponse), total: await OrganizationInvitation.collection.countDocuments(criteria, { session: tx }) };
    }),
    revokeInvitation: (claims, organizationId, invitationId, expectedVersion) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx, true);
      const value = await OrganizationInvitation.collection.findOne({ _id: id(invitationId), organizationId: organization._id }, { session: tx });
      if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      checkVersion(value, expectedVersion);
      if (value.revokedAt || value.acceptedAt) return { code: 'INVITATION_UNCHANGED' };
      await OrganizationInvitation.collection.updateOne({ _id: value._id, version: value.version }, { $set: { revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      await EmailOutbox.collection.updateMany({ organizationInvitationId: value._id, state: { $in: ['pending', 'processing', 'failed'] } },
        { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
      await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: null, action: 'organization_invitation_revoked' }).save({ session: tx });
      return { code: 'INVITATION_REVOKED' };
    }),
    previewInvitation: token => mongoose.connection.transaction(async tx => {
      const value = await OrganizationInvitation.collection.findOne({ tokenHash: tokenHash(token), revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const { organization, workspace } = await invitationTarget(value, tx);
      const inviter = await User.collection.findOne({ _id: value.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { preview: { organizationName: organization.name, workspaceName: workspace?.name ?? null, role: 'member', inviterDisplayName: inviter?.displayName ?? 'Unavailable User', expiresAt: value.expiresAt } };
    }),
    acceptInvitation: (claims, token) => run(claims, (user, tx) => acceptOrganizationInvitation(user, tx, { tokenHash: tokenHash(token) })),
    acceptInvitationById: (claims, invitationId) => run(claims, (user, tx) => acceptOrganizationInvitation(user, tx, { _id: id(invitationId), emailCanonical: user.emailCanonical })),
    leave: (claims, organizationId, expectedVersion) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx);
      if (role === 'owner') throw new AuthError('TRANSFER_REQUIRED', 409);
      const membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: user._id, state: 'active' }, { session: tx });
      checkVersion(membership, expectedVersion);
      await endOrganizationMembership(user, organization, membership, 'left', tx);
      return { code: 'ORGANIZATION_LEFT' };
    }),
    remove: (claims, organizationId, userId, expectedVersion) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx, true);
      if (same(organization.ownerId, userId)) throw new AuthError('CANNOT_REMOVE_OWNER', 409);
      const membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: id(userId) }, { session: tx });
      if (!membership) throw new AuthError('ORGANIZATION_MEMBER_REQUIRED', 404);
      if (role !== 'owner' && membership.role === 'admin') throw new AuthError('ORGANIZATION_OWNER_REQUIRED', 403);
      checkVersion(membership, expectedVersion);
      if (membership.state === 'inactive') return { code: 'MEMBER_ALREADY_INACTIVE' };
      await endOrganizationMembership(user, organization, membership, 'removed', tx);
      return { code: 'ORGANIZATION_MEMBER_REMOVED' };
    }),
    members: (claims, organizationId, page) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx);
      const base = [
        { $match: { organizationId: organization._id, state: 'active', ...(page.filters.length ? { $and: page.filters } : {}) } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', pipeline: [{ $project: { displayName: 1, avatar: 1 } }], as: 'person' } }, { $unwind: '$person' },
        ...(page.patterns.length ? [{ $match: { $and: page.patterns.map(pattern => ({ 'person.displayName': { $regex: pattern, $options: 'i' } })) } }] : []),
      ];
      const records = await OrganizationMembership.collection.aggregate([...base, { $match: after(page) }, { $sort: { joinedAt: -1, _id: -1 } }, { $limit: page.limit + 1 }], { session: tx }).toArray();
      const counts = await OrganizationMembership.collection.aggregate([...base, { $count: 'total' }], { session: tx }).toArray();
      return { ...paged(records, page.limit, row => ({ userId: String(row.userId), displayName: row.person.displayName, avatar: row.person.avatar,
        role: same(organization.ownerId, row.userId) ? 'owner' : row.role, version: row.version, joinedAt: row.joinedAt }), 'joinedAt'), total: counts[0]?.total ?? 0 };
    }),
    role: (claims, organizationId, userId, input) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx);
      if (role !== 'owner') throw new AuthError('ORGANIZATION_OWNER_REQUIRED', 403);
      if (same(organization.ownerId, userId)) throw new AuthError('OWNER_ROLE_IMMUTABLE', 409);
      const membership = await targetMember(organization, userId, tx); checkVersion(membership, input.expectedVersion);
      if (membership.role === input.role) return { code: 'ROLE_UNCHANGED', userId, role: membership.role, version: membership.version };
      const updated = await OrganizationMembership.collection.findOneAndUpdate({ _id: membership._id, version: membership.version },
        { $set: { role: input.role, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!updated) throw new AuthError('VERSION_CONFLICT', 409);
      if (input.role === 'member') {
        const ids = (await Workspace.collection.find({ organizationId: organization._id }, { session: tx, projection: { _id: 1 } }).toArray()).map(row => row._id);
        await reconcileReopenRequests({ workspaceId: { $in: ids }, requesterId: membership.userId }, now(), tx);
      }
      await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: membership.userId,
        action: 'member_role_changed', previousRole: membership.role, role: input.role }).save({ session: tx });
      return { code: 'ROLE_CHANGED', userId, role: updated.role, version: updated.version };
    }),
    addMember: (claims, organizationId, workspaceId, input) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx);
      const { workspace, access } = await workspaceScope(user, organization, workspaceId, tx);
      assertWorkspaceWritable(workspace);
      if (!access.canManage) throw new AuthError('WORKSPACE_MANAGER_REQUIRED', 403);
      checkVersion(workspace, input.expectedVersion);
      const result = await addWorkspaceMembership(user, organization, workspace, input.userId, tx);
      const updated = result.added ? await updateWorkspace(workspace, {}, tx) : workspace;
      return { code: result.added ? 'WORKSPACE_MEMBER_ADDED' : 'ALREADY_MEMBER', userId: input.userId,
        membershipVersion: result.membership.version, workspaceVersion: updated.version };
    }),
    manager: (claims, organizationId, workspaceId, input) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx, true);
      const { workspace } = await workspaceScope(user, organization, workspaceId, tx); checkVersion(workspace, input.expectedVersion);
      await targetMember(organization, input.managerId, tx);
      const added = await addWorkspaceMembership(user, organization, workspace, input.managerId, tx);
      const changed = !same(workspace.managerId, input.managerId);
      const updated = changed || added.added ? await updateWorkspace(workspace, { managerId: id(input.managerId) }, tx) : workspace;
      if (changed) await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: id(input.managerId), workspaceId: workspace._id,
        action: 'workspace_manager_changed', previousUserId: workspace.managerId }).save({ session: tx });
      const access = await workspaceAccess(updated, user._id, tx);
      return { code: changed ? 'WORKSPACE_MANAGER_CHANGED' : 'MANAGER_UNCHANGED', workspace: workspaceResponse(updated, access.membership) };
    }),
    transfer: (claims, organizationId, input) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx);
      if (role !== 'owner') throw new AuthError('ORGANIZATION_OWNER_REQUIRED', 403);
      checkVersion(organization, input.expectedVersion);
      if (same(organization.ownerId, input.memberId)) throw new AuthError('TRANSFER_TARGET_INVALID', 409);
      await targetMember(organization, input.memberId, tx);
      const updated = await Organization.collection.findOneAndUpdate({ _id: organization._id, ownerId: user._id, version: organization.version },
        { $set: { ownerId: id(input.memberId), updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!updated) throw new AuthError('VERSION_CONFLICT', 409);
      await new OrganizationAudit({ organizationId: organization._id, actorId: user._id, targetUserId: id(input.memberId), previousUserId: user._id, action: 'ownership_transferred' }).save({ session: tx });
      const membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: user._id }, { session: tx });
      return { organization: response(updated, organizationAccess(updated, membership, user._id)) };
    }),
    audit: (claims, organizationId, page) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx, true);
      const records = await OrganizationAudit.collection.find({ organizationId: organization._id, ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const people = await User.collection.find({ _id: { $in: records.flatMap(row => [row.actorId, row.targetUserId].filter(Boolean)) } }, { session: tx, projection: { displayName: 1 } }).toArray();
      const personName = userId => people.find(person => same(person._id, userId))?.displayName ?? null;
      return paged(records, page.limit, row => ({ id: String(row._id), action: row.action, actorId: String(row.actorId), targetUserId: row.targetUserId ? String(row.targetUserId) : null,
        actorName: personName(row.actorId), targetName: row.targetUserId ? personName(row.targetUserId) : null,
        workspaceId: row.workspaceId ? String(row.workspaceId) : null, previousRole: row.previousRole, role: row.role,
        previousUserId: row.previousUserId ? String(row.previousUserId) : null, createdAt: row.createdAt }));
    }),
    createWorkspace: (claims, organizationId, fields) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx, true);
      const workspace = new Workspace({ ...fields, organizationId: organization._id, managerId: user._id, ownerId: null });
      await workspace.save({ session: tx });
      const membership = new WorkspaceMembership({ workspaceId: workspace._id, userId: user._id, joinedAt: now() });
      await membership.save({ session: tx });
      const access = await workspaceAccess(workspace.toObject(), user._id, tx);
      return { workspace: workspaceResponse(workspace.toObject(), access.membership) };
    }),
    workspaces: (claims, organizationId, page) => run(claims, async (user, tx) => {
      const { organization } = await scope(user, organizationId, tx);
      return queryWorkspaceList(user, tx, { ...page, organizationId: organization._id });
    }),
    create: async (claims, fields) => {
      await assertOrganizationIndexes();
      return run(claims, async (user, tx) => {
        const organization = new Organization({ name: fields.name, ownerId: user._id });
        await organization.save({ session: tx });
        await new OrganizationMembership({ organizationId: organization._id, userId: user._id, joinedAt: now() }).save({ session: tx });
        return { organization: response(organization.toObject(), 'owner') };
      });
    },
    list: (claims, page) => run(claims, async (user, tx) => {
      const after = page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
      const base = [
        { $match: { $and: page.filters?.length ? page.filters : [{}] } },
        ...banFilterStages(user._id, { organization: '$_id' }),
        { $lookup: { from: 'organization_memberships', let: { organization: '$_id' }, pipeline: [
          { $match: { userId: user._id, state: 'active', $expr: { $eq: ['$organizationId', '$$organization'] } } },
        ], as: 'membership' } },
        { $unwind: '$membership' },
        { $set: { effectiveRole: { $cond: [{ $eq: ['$ownerId', user._id] }, 'owner', '$membership.role'] } } },
      ];
      const roleStages = page.role && page.role !== 'all' ? [{ $match: { effectiveRole: page.role } }] : [];
      const result = await Organization.collection.aggregate([...base, { $facet: { total: [...roleStages, { $count: 'total' }], roles: [{ $group: { _id: '$effectiveRole', total: { $sum: 1 } } }] } }], { session: tx }).toArray();
      const counts = Object.fromEntries(['owner', 'admin', 'member'].map(role => [role, result[0].roles.find(value => value._id === role)?.total ?? 0]));
      const records = await Organization.collection.aggregate([...base, ...roleStages, { $match: after }, { $sort: { createdAt: -1, _id: -1 } }, { $limit: page.limit + 1 }], { session: tx }).toArray();
      return { ...paged(records, page.limit, org => response(org, organizationAccess(org, org.membership, user._id))), total: result[0].total[0]?.total ?? 0,
        roleCounts: { ...counts, all: counts.owner + counts.admin + counts.member } };
    }),
    get: (claims, organizationId) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx);
      return { organization: response(organization, role) };
    }),
    update: (claims, organizationId, input) => run(claims, async (user, tx) => {
      const { organization, role } = await scope(user, organizationId, tx, true);
      if (organization.version !== input.expectedVersion) throw new AuthError('VERSION_CONFLICT', 409);
      if (organization.name === input.fields.name) return { organization: response(organization, role) };
      const updated = await Organization.collection.findOneAndUpdate({ _id: organization._id, version: input.expectedVersion },
        { $set: { name: input.fields.name, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!updated) throw new AuthError('VERSION_CONFLICT', 409);
      return { organization: response(updated, role) };
    }),
  };
}
