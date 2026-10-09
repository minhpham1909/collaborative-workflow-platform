import mongoose from 'mongoose';
import { cancelReopenRequests } from '../work/reopen-lifecycle.js';
import { User, Session, Organization, OrganizationMembership, OrganizationInvitation, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, ProjectGuest, ProjectGuestInvitation, Task, TaskComment, EmailOutbox, AccessBan, ModerationAction } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { organizationAccess } from '../organizations/access.js';
import { workspaceAccess } from '../organizations/workspace-access.js';
import { projectAccess } from '../work/project-access.js';
import { assertNotBanned } from './guard.js';
import { previewCodec } from './preview.js';
import { commentCriteria } from './criteria.js';
import { paged } from '../workspaces/response.js';

const id = value => new mongoose.Types.ObjectId(value);
const same = (a, b) => a != null && b != null && String(a) === String(b);
const denied = (code, status = 403) => { throw new AuthError(code, status); };
const checkVersion = (row, expected) => { if (row.version !== expected) denied('VERSION_CONFLICT', 409); };
const after = page => page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
const actionDto = row => ({ id: String(row._id), action: row.action, actorId: String(row.actorId), targetUserId: String(row.targetUserId), reason: row.reason,
  cleanup: row.cleanup, cutoff: row.cutoff, from: row.from, state: row.state, matchedCount: row.matchedCount, deletedCount: row.deletedCount, version: row.version, createdAt: row.createdAt, lastErrorCode: row.lastErrorCode });
export function createMongoModerationStore({ config, now = () => new Date() } = {}) {
  const run = (claims, operation) => mongoose.connection.transaction(async tx => {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) denied('UNAUTHENTICATED', 401);
    if (!user.emailVerifiedAt) denied('EMAIL_VERIFICATION_REQUIRED');
    return operation(user, tx);
  });
  async function scope(user, type, scopeId, tx) {
    let organization = null, workspace = null, project = null, role;
    if (type === 'organization') {
      organization = await Organization.collection.findOneAndUpdate({ _id: id(scopeId) }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
      if (!organization) denied('ORGANIZATION_UNAVAILABLE', 404);
      await assertNotBanned(user._id, { organizationId: organization._id }, tx);
      const membership = await OrganizationMembership.collection.findOne({ organizationId: organization._id, userId: user._id }, { session: tx });
      role = organizationAccess(organization, membership, user._id, { manage: true });
    } else {
      if (type === 'project') project = await Project.collection.findOne({ _id: id(scopeId) }, { session: tx });
      if (type === 'project' && !project) denied('RESOURCE_UNAVAILABLE', 404);
      workspace = await Workspace.collection.findOneAndUpdate({ _id: type === 'project' ? project.workspaceId : id(scopeId) }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
      if (!workspace) denied('WORKSPACE_UNAVAILABLE', 404);
      const access = type === 'project' ? (await projectAccess(workspace, project, user._id, tx)).access : await workspaceAccess(workspace, user._id, tx);
      if (!access.canManage) denied('OWNER_REQUIRED'); role = access.role;
      if (workspace.organizationId) organization = await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx });
      if (project) project = await Project.collection.findOne({ _id: project._id, workspaceId: workspace._id }, { session: tx });
    }
    const workspaces = type === 'organization' ? await Workspace.collection.find({ organizationId: organization._id }, { session: tx }).sort({ _id: 1 }).toArray() : [workspace];
    return { type, scopeId: id(scopeId), organization, workspace, project, role, workspaces, resource: project ?? workspace ?? organization };
  }
  async function protect(user, context, targetUserId, tx) {
    if (same(user._id, targetUserId)) denied('CANNOT_MODERATE_SELF', 409);
    if (!await User.collection.findOne({ _id: id(targetUserId) }, { session: tx, projection: { _id: 1 } })) denied('RESOURCE_UNAVAILABLE', 404);
    if (same(context.organization?.ownerId, targetUserId) || same(context.workspace?.ownerId, targetUserId)) denied('CANNOT_REMOVE_OWNER', 409);
    if (context.organization) {
      const target = await OrganizationMembership.collection.findOne({ organizationId: context.organization._id, userId: id(targetUserId), state: 'active' }, { session: tx });
      if (target?.role === 'admin' && !['owner', 'organization_owner'].includes(context.role)) denied('ORGANIZATION_OWNER_REQUIRED');
    }
    if (same(context.workspace?.managerId, targetUserId) && !['organization_owner', 'organization_admin'].includes(context.role)) denied('ORGANIZATION_ADMIN_REQUIRED');
  }
  const references = context => ({ scopeType: context.type, scopeId: context.scopeId, organizationId: context.organization?._id ?? null,
    workspaceId: context.workspace?._id ?? null, projectId: context.project?._id ?? null });
  async function selection(context, targetUserId, cleanup, cutoff, tx) {
    const row = { ...references(context), targetUserId: id(targetUserId), workspaceIds: context.workspaces.map(workspace => workspace._id), cleanup, cutoff,
      from: cleanup === 'none' || cleanup === 'all' ? null : new Date(cutoff.getTime() - Number(cleanup) * 86400_000) };
    const matchedCount = cleanup === 'none' ? 0 : await TaskComment.collection.countDocuments(await commentCriteria(row, tx), { session: tx });
    return { ...row, matchedCount };
  }
  async function takeOver(user, workspace, tx) {
    let membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id }, { session: tx });
    if (membership?.state !== 'active') {
      if (membership) await WorkspaceMembership.collection.updateOne({ _id: membership._id, version: membership.version },
        { $set: { state: 'active', leftAt: null, exitReason: null, joinedAt: now(), emailOverrides: { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' }, updatedAt: now() }, $inc: { version: 1, membershipGeneration: 1 } }, { session: tx });
      else await new WorkspaceMembership({ workspaceId: workspace._id, userId: user._id, joinedAt: now() }).save({ session: tx });
    }
    await Workspace.collection.updateOne({ _id: workspace._id, version: workspace.version }, { $set: { managerId: user._id, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
  }
  async function endAccess(user, context, targetUserId, tx) {
    const target = id(targetUserId), workspaceIds = context.workspaces.map(workspace => workspace._id), takeoverWorkspaceIds = [];
    if (context.type !== 'project') {
      for (const workspace of context.workspaces) {
        await Workspace.collection.updateOne({ _id: workspace._id }, { $inc: { mutationRevision: 1 } }, { session: tx });
        if (same(workspace.managerId, target)) { await takeOver(user, workspace, tx); takeoverWorkspaceIds.push(workspace._id); }
      }
      await WorkspaceMembership.collection.updateMany({ workspaceId: { $in: workspaceIds }, userId: target, state: 'active' },
        { $set: { state: 'inactive', leftAt: now(), exitReason: 'removed', emailOverrides: { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' }, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      if (context.type === 'organization') await OrganizationMembership.collection.updateMany({ organizationId: context.organization._id, userId: target, state: 'active' },
        { $set: { state: 'inactive', leftAt: now(), exitReason: 'removed', role: 'member', updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    }
    const projects = { workspaceId: { $in: workspaceIds }, ...(context.project ? { _id: context.project._id } : {}) };
    const projectIds = (await Project.collection.find(projects, { session: tx, projection: { _id: 1 } }).toArray()).map(row => row._id);
    await cancelReopenRequests({ projectId: { $in: projectIds }, requesterId: target }, 'requester_access_lost', now(), tx, user._id);
    await Project.collection.updateMany({ ...projects, leadId: target }, { $set: { leadId: null, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    await ProjectGuest.collection.updateMany({ projectId: { $in: projectIds }, userId: target, state: 'active' }, { $set: { state: 'inactive', revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    const taskIds = (await Task.collection.find({ projectId: { $in: projectIds } }, { session: tx, projection: { _id: 1 } }).toArray()).map(row => row._id);
    await Task.collection.updateMany({ projectId: { $in: projectIds }, assigneeId: target, status: { $ne: 'done' }, deletedAt: null }, { $set: { assigneeId: null, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
    const recipient = await User.collection.findOne({ _id: target }, { session: tx, projection: { emailCanonical: 1 } });
    const revoked = [];
    for (const [model, field, parent] of [
      [ProjectGuestInvitation, 'projectInvitationId', { projectId: { $in: projectIds } }],
      ...(context.type === 'project' ? [] : [[WorkspaceInvitation, 'invitationId', { workspaceId: { $in: workspaceIds } }]]),
      ...(context.type === 'organization' ? [[OrganizationInvitation, 'organizationInvitationId', { organizationId: context.organization._id }]] : []),
    ]) {
      const query = { ...parent, revokedAt: null, acceptedAt: null, $or: [{ createdBy: target }, { emailCanonical: recipient.emailCanonical }] };
      const invites = await model.collection.find(query, { session: tx, projection: { _id: 1 } }).toArray();
      const ids = invites.map(row => row._id); if (!ids.length) continue;
      await model.collection.updateMany({ _id: { $in: ids } }, { $set: { revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      revoked.push({ [field]: { $in: ids } });
    }
    await EmailOutbox.collection.updateMany({ state: { $in: ['pending', 'processing', 'failed'] }, $or: [{ category: 'work', userId: target, taskId: { $in: taskIds } }, ...revoked] },
      { $set: { state: 'cancelled', encryptedDeliveryData: null, leaseToken: null, leaseUntil: null, updatedAt: now() } }, { session: tx });
    return takeoverWorkspaceIds;
  }
  async function bump(context, tx) {
    const model = context.type === 'organization' ? Organization : context.type === 'workspace' ? Workspace : Project;
    await model.collection.updateOne({ _id: context.scopeId }, { $inc: { version: 1 }, $set: { updatedAt: now() } }, { session: tx });
  }
  return {
    preview: (claims, type, scopeId, input) => run(claims, async (user, tx) => {
      const context = await scope(user, type, scopeId, tx); await protect(user, context, input.userId, tx);
      const selected = await selection(context, input.userId, input.cleanup, now(), tx);
      const ticket = input.cleanup === 'none' ? null : previewCodec(config?.accessKeyHex, now).seal({ actorId: String(user._id), scopeType: type, scopeId, targetUserId: input.userId,
        cleanup: input.cleanup, expectedVersion: context.resource.version, cutoff: selected.cutoff.toISOString(), from: selected.from?.toISOString() ?? null, matchedCount: selected.matchedCount });
      return { scopeType: type, scopeId, targetUserId: input.userId, cleanup: input.cleanup, cutoff: selected.cutoff, matchedCount: selected.matchedCount, expectedVersion: context.resource.version, preview: ticket };
    }),
    ban: async (claims, type, scopeId, input) => {
      let indexes; try { indexes = await AccessBan.collection.listIndexes().toArray(); } catch { denied('MODERATION_SETUP_REQUIRED', 503); }
      if (!indexes.some(index => index.unique && !index.partialFilterExpression && Object.keys(index.key).length === 3 && ['scopeType', 'scopeId', 'userId'].every(key => index.key[key] === 1))) denied('MODERATION_SETUP_REQUIRED', 503);
      return run(claims, async (user, tx) => {
        const context = await scope(user, type, scopeId, tx); await protect(user, context, input.userId, tx); checkVersion(context.resource, input.expectedVersion);
        const current = await AccessBan.collection.findOne({ scopeType: type, scopeId: context.scopeId, userId: id(input.userId) }, { session: tx });
        if (current?.state === 'active') denied('BAN_ALREADY_ACTIVE', 409);
        const decoded = input.cleanup === 'none' ? null : previewCodec(config?.accessKeyHex, now).open(input.preview, { actorId: String(user._id), scopeType: type, scopeId, targetUserId: input.userId, cleanup: input.cleanup, expectedVersion: input.expectedVersion });
        const selected = await selection(context, input.userId, input.cleanup, decoded?.cutoff ?? now(), tx);
        const fields = { ...references(context), userId: id(input.userId), state: 'active', imposedBy: user._id, imposedAt: now(), reason: input.reason, revokedAt: null, revokedBy: null };
        let ban;
        if (current) ban = await AccessBan.collection.findOneAndUpdate({ _id: current._id, version: current.version }, { $set: { ...fields, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
        else { const created = new AccessBan(fields); await created.save({ session: tx }); ban = created.toObject(); }
        if (!ban) denied('VERSION_CONFLICT', 409);
        const takeovers = await endAccess(user, context, input.userId, tx);
        await bump(context, tx);
        const action = new ModerationAction({ ...selected, actorId: user._id, action: 'ban', banId: ban._id, reason: input.reason, takeoverWorkspaceIds: takeovers,
          state: input.cleanup !== 'none' && selected.matchedCount ? 'pending' : 'completed' });
        await action.save({ session: tx });
        return { code: 'ACCESS_BANNED', banId: String(ban._id), version: ban.version, action: actionDto(action.toObject()) };
      });
    },
    unban: (claims, type, scopeId, userId, input) => run(claims, async (user, tx) => {
      const context = await scope(user, type, scopeId, tx); await protect(user, context, userId, tx);
      const ban = await AccessBan.collection.findOne({ scopeType: type, scopeId: context.scopeId, userId: id(userId) }, { session: tx });
      if (!ban) denied('RESOURCE_UNAVAILABLE', 404); checkVersion(ban, input.expectedVersion);
      if (ban.state === 'revoked') return { code: 'ALREADY_UNBANNED', version: ban.version };
      await AccessBan.collection.updateOne({ _id: ban._id, version: ban.version }, { $set: { state: 'revoked', revokedAt: now(), revokedBy: user._id, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      await bump(context, tx);
      await new ModerationAction({ ...references(context), actorId: user._id, targetUserId: ban.userId, action: 'unban', banId: ban._id, reason: input.reason, cutoff: now(), workspaceIds: context.workspaces.map(row => row._id) }).save({ session: tx });
      return { code: 'ACCESS_UNBANNED', version: ban.version + 1 };
    }),
    bans: (claims, type, scopeId, page) => run(claims, async (user, tx) => {
      const context = await scope(user, type, scopeId, tx);
      const rows = await AccessBan.collection.find({ scopeType: type, scopeId: context.scopeId, ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const people = await User.collection.find({ _id: { $in: rows.map(row => row.userId) } }, { session: tx, projection: { displayName: 1 } }).toArray();
      return paged(rows, page.limit, row => ({ id: String(row._id), userId: String(row.userId), displayName: people.find(person => same(person._id, row.userId))?.displayName ?? 'Người dùng không còn khả dụng', state: row.state, reason: row.reason, version: row.version, imposedAt: row.imposedAt, revokedAt: row.revokedAt }));
    }),
    actions: (claims, type, scopeId, page) => run(claims, async (user, tx) => {
      const context = await scope(user, type, scopeId, tx);
      const rows = await ModerationAction.collection.find({ scopeType: type, scopeId: context.scopeId, ...after(page) }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const people = await User.collection.find({ _id: { $in: rows.map(row => row.targetUserId) } }, { session: tx, projection: { displayName: 1 } }).toArray();
      return paged(rows, page.limit, row => ({ ...actionDto(row), targetDisplayName: people.find(person => same(person._id, row.targetUserId))?.displayName ?? 'Người dùng không còn khả dụng' }));
    }),
    retry: (claims, type, scopeId, actionId, expectedVersion) => run(claims, async (user, tx) => {
      const context = await scope(user, type, scopeId, tx);
      const action = await ModerationAction.collection.findOne({ _id: id(actionId), scopeType: type, scopeId: context.scopeId }, { session: tx });
      if (!action) denied('RESOURCE_UNAVAILABLE', 404); checkVersion(action, expectedVersion);
      if (action.state !== 'failed' || action.action !== 'ban' || action.cleanup === 'none') denied('MODERATION_RETRY_UNAVAILABLE', 409);
      await ModerationAction.collection.updateOne({ _id: action._id, version: action.version }, { $set: { state: 'pending', attempts: 0, lastErrorCode: null, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      return { code: 'COMMENT_CLEANUP_REQUEUED' };
    }),
  };
}
