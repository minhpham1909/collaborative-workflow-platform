export const sameId = (left, right) => String(left) === String(right);
export function workspaceResponse(workspace, membership) {
  const role = membership.effectiveRole ?? (workspace.organizationId ? (sameId(workspace.managerId, membership.userId) ? 'manager' : 'member') : (sameId(workspace.ownerId, membership.userId) ? 'owner' : 'member'));
  const manage = ['owner', 'manager', 'organization_owner', 'organization_admin'].includes(role);
  const writable = workspace.state !== 'archived';
  return { id: String(workspace._id), name: workspace.name, description: workspace.description,
    state: workspace.state ?? 'active', archivedAt: workspace.archivedAt ?? null, archivedBy: workspace.archivedBy ? String(workspace.archivedBy) : null,
    ownerId: workspace.ownerId ? String(workspace.ownerId) : null, organizationId: workspace.organizationId ? String(workspace.organizationId) : null,
    managerId: workspace.managerId ? String(workspace.managerId) : null, version: workspace.version, createdAt: workspace.createdAt,
    role, permissions: { manage, edit: manage && writable, createProject: manage && writable, changeState: manage, emailPreferences: membership.version != null, invite: manage && !workspace.organizationId && writable,
      leave: membership.version != null && !sameId(workspace.ownerId, membership.userId) && !sameId(workspace.managerId, membership.userId) },
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
