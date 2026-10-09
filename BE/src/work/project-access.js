import { Organization, ProjectGuest } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { workspaceAccess } from '../organizations/workspace-access.js';
import { assertNotBanned } from '../moderation/guard.js';

export async function projectAccess(workspace, project, userId, tx, { lock = true } = {}) {
  if (!workspace || !project || String(project.workspaceId) !== String(workspace._id)) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  await assertNotBanned(userId, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: project._id }, tx);
  try {
    const access = await workspaceAccess(workspace, userId, tx, { lock });
    return { access, guest: false, isLead: access.isMember && project.leadId != null && String(project.leadId) === String(userId) };
  } catch (error) { if (!(error instanceof AuthError) || error.status !== 404) throw error; }
  // External guests need no Org/Workspace membership, but the parent must still exist.
  if (workspace.organizationId && !await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx })) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  const grant = await ProjectGuest.collection.findOne({ workspaceId: workspace._id, projectId: project._id, userId, state: 'active' }, { session: tx });
  if (!grant) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  return { access: { canManage: false, isMember: false, role: 'guest', membership: null }, guest: true, isLead: false };
}
