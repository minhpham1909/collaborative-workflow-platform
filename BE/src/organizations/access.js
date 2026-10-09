import { AuthError } from '../auth/errors.js';

const same = (a, b) => a != null && b != null && String(a) === String(b);
export function organizationAccess(organization, membership, userId, { manage = false } = {}) {
  if (!organization || !membership || membership.state !== 'active' ||
      !same(membership.organizationId, organization._id) || !same(membership.userId, userId)) {
    throw new AuthError('ORGANIZATION_UNAVAILABLE', 404);
  }
  const role = same(organization.ownerId, userId) ? 'owner' : membership.role;
  if (!['owner', 'admin', 'member'].includes(role)) throw new AuthError('ORGANIZATION_UNAVAILABLE', 404);
  if (manage && role === 'member') throw new AuthError('ORGANIZATION_ADMIN_REQUIRED', 403);
  return role;
}
