import {historicalWorkspaceFixture} from './access.js';
import { WORKSPACE_IDENTITY_DEFAULTS } from './identity.js';
export const sameId = (left, right) => String(left) === String(right);
export function workspaceResponse(workspace, membership) {
  const historical=historicalWorkspaceFixture();if(historical)return historical.workspaceResponse(workspace,membership);
  const role = workspace.ownerId && sameId(workspace.ownerId,membership.userId) ? 'owner' : membership.role === 'manager' ? 'manager' : 'member';
  const manage = ['owner','manager'].includes(role);
  const writable = workspace.state !== 'archived';
  return { id: String(workspace._id), name: workspace.name, description: workspace.description,
    summary: workspace.summary ?? null, icon: workspace.icon ?? WORKSPACE_IDENTITY_DEFAULTS.icon,
    color: workspace.color ?? WORKSPACE_IDENTITY_DEFAULTS.color, coverId: workspace.coverId ?? WORKSPACE_IDENTITY_DEFAULTS.coverId,
    updatedAt: workspace.updatedAt ?? workspace.createdAt, readOnly: !writable, readOnlyReason: writable ? null : 'workspace_archived',
    state: workspace.state ?? 'active', archivedAt: workspace.archivedAt ?? null, archivedBy: workspace.archivedBy ? String(workspace.archivedBy) : null,
    ownerId: workspace.ownerId ? String(workspace.ownerId) : null, version: workspace.version, createdAt: workspace.createdAt,
    role, permissions: { manage, edit: manage && writable, createProject: manage && writable, changeState: role === 'owner', manageRoles: role === 'owner', transferOwnership: role === 'owner', emailPreferences: membership.version != null, invite: manage && writable,
      leave: membership.version != null && !sameId(workspace.ownerId, membership.userId) },
    membershipVersion: membership.version, emailOverrides: membership.emailOverrides ? { ...membership.emailOverrides } : null };
}
export function invitationState(invitation, now) {
  return invitation.revokedAt ? 'revoked' : invitation.acceptedAt ? 'accepted' : invitation.expiresAt <= now ? 'expired' : 'active';
}
export function invitationResponse(invitation, now, job = null) {
  return { id: String(invitation._id), type: invitation.type, email: invitation.type === 'EMAIL' ? invitation.email : null,
    expiresAt: invitation.expiresAt, state: invitationState(invitation, now), version: invitation.version,
    createdAt: invitation.createdAt, emailDelivery: job?.state ?? null };
}
export function paged(records, limit, mapper, field = 'createdAt') {
  const selected = records.slice(0, limit); const last = selected.at(-1);
  return { items: selected.map(mapper), nextCursor: records.length > limit ? Buffer.from(JSON.stringify({ at: last[field].toISOString(), id: String(last._id) })).toString('base64url') : null };
}
