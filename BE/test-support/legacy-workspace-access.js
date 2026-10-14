import { Organization, OrganizationMembership, WorkspaceMembership } from '../src/models/index.js';
import { AuthError } from '../src/auth/errors.js';
import { organizationAccess } from '../src/organizations/access.js';
import { assertNotBanned, banFilterStages } from '../src/moderation/guard.js';

const same = (a, b) => a != null && b != null && String(a) === String(b);
export async function workspaceAccess(workspace, userId, tx, { lock = true, requireMember = false } = {}) {
  if (!workspace) throw new AuthError('WORKSPACE_UNAVAILABLE', 404);
  await assertNotBanned(userId, { organizationId: workspace.organizationId, workspaceId: workspace._id }, tx);
  let orgRole = null;
  if (workspace.organizationId) {
    const organization = lock
      ? await Organization.collection.findOneAndUpdate({ _id: workspace.organizationId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' })
      : await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx });
    const orgMembership = await OrganizationMembership.collection.findOne({ organizationId: workspace.organizationId, userId }, { session: tx });
    try { orgRole = organizationAccess(organization, orgMembership, userId); }
    catch (error) { if (error instanceof AuthError) throw new AuthError('WORKSPACE_UNAVAILABLE', 404); throw error; }
  }
  const membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId, state: 'active' }, { session: tx });
  const orgAdmin = orgRole === 'owner' || orgRole === 'admin';
  if ((!membership && !orgAdmin) || (requireMember && !membership)) throw new AuthError('WORKSPACE_UNAVAILABLE', 404);
  const role = orgAdmin ? `organization_${orgRole}` : workspace.organizationId
    ? (same(workspace.managerId, userId) ? 'manager' : 'member')
    : (same(workspace.ownerId, userId) ? 'owner' : membership.role === 'manager' ? 'manager' : 'member');
  return { role, canManage: orgAdmin || role === 'owner' || role === 'manager', isMember: Boolean(membership),
    membership: { ...(membership ?? { userId, version: null, emailOverrides: null }), effectiveRole: role } };
}

// Apply access before pagination/counts. Legacy missing organizationId is standalone.
export function workspaceAccessStages(userId, { requireMember = false } = {}) {
  return [
    ...banFilterStages(userId, { organization: '$organizationId', workspace: '$_id' }),
    { $lookup: { from: 'workspace_memberships', let: { workspace: '$_id' }, pipeline: [
      { $match: { userId, state: 'active', $expr: { $eq: ['$workspaceId', '$$workspace'] } } },
    ], as: 'membership' } },
    { $lookup: { from: 'organization_memberships', let: { organization: '$organizationId' }, pipeline: [
      { $match: { userId, state: 'active', $expr: { $eq: ['$organizationId', '$$organization'] } } },
    ], as: 'organizationMembership' } },
    { $lookup: { from: 'organizations', localField: 'organizationId', foreignField: '_id', as: 'organization' } },
    { $match: { $or: [
      { organizationId: null, 'membership.0': { $exists: true } },
      { organizationId: { $ne: null }, 'organization.0': { $exists: true }, 'organizationMembership.0': { $exists: true },
        ...(requireMember ? { 'membership.0': { $exists: true } } : { $or: [
          { 'membership.0': { $exists: true } }, { 'organizationMembership.role': 'admin' }, { 'organization.ownerId': userId },
        ] }) },
    ] } },
  ];
}

export {queryWorkspaceList} from './legacy-workspace-query.js';
export {projectAccess,projectGuestParentStages,validateGuestParent,profileState} from './legacy-project-access.js';
export {workspaceResponse} from './legacy-workspace-response.js';

export {commentPermissions,authorizeCommentDelete,recordCommentDelete} from './legacy-comment-policy.js';

export {createMongoModerationStore} from './legacy-moderation-store.js';
export {historicalCommentCriteria} from './legacy-moderation-criteria.js';

export {deliverOrganizationInvitation} from './legacy-organization-mail.js';
export {deliverProjectInvitation} from './legacy-project-mail.js';

export {organizationNotification,notificationParentExists} from './legacy-notification-parent.js';

export {assigneeEligibility} from './legacy-assignee-eligibility.js';

export {createMongoWorkspaceStore} from './legacy-workspace-store.js';

export {createWorkspaceDocument} from './legacy-workspace-model.js';
