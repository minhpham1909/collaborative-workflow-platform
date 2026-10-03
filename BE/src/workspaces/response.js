export const sameId = (left, right) => String(left) === String(right);
export function workspaceResponse(workspace, membership) {
  return { id: String(workspace._id), name: workspace.name, description: workspace.description,
    ownerId: String(workspace.ownerId), version: workspace.version, createdAt: workspace.createdAt,
    role: sameId(workspace.ownerId, membership.userId) ? 'owner' : 'member',
    membershipVersion: membership.version, emailOverrides: { ...membership.emailOverrides } };
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
