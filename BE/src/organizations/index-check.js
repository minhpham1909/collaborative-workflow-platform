import { OrganizationMembership, OrganizationInvitation } from '../models/index.js';
import { AuthError } from '../auth/errors.js';

export async function assertOrganizationIndexes() {
  let indexes;
  try { indexes = await OrganizationMembership.collection.listIndexes().toArray(); }
  catch { throw new AuthError('ORGANIZATION_SETUP_REQUIRED', 503); }
  if (!indexes.some(index => index.name === 'organization_membership_pair_unique' && index.unique === true &&
      Object.keys(index.key).length === 2 && index.key.organizationId === 1 && index.key.userId === 1 && !index.partialFilterExpression)) {
    throw new AuthError('ORGANIZATION_SETUP_REQUIRED', 503);
  }
}

export async function assertOrganizationInvitationIndexes() {
  await assertOrganizationIndexes();
  let indexes;
  try { indexes = await OrganizationInvitation.collection.listIndexes().toArray(); }
  catch { throw new AuthError('ORGANIZATION_SETUP_REQUIRED', 503); }
  if (!indexes.some(index => index.unique && Object.keys(index.key).length === 1 && index.key.tokenHash === 1 && !index.partialFilterExpression)) throw new AuthError('ORGANIZATION_SETUP_REQUIRED', 503);
}
