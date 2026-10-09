// Read-only audit: no backfill, index creation or ownership changes.
export async function auditOrganizationScope(db) {
  const [organizations, workspaces, orgMembers, workspaceMembers] = await Promise.all([
    db.collection('organizations').find({}, { projection: { ownerId: 1 } }).toArray(),
    db.collection('workspaces').find({}, { projection: { ownerId: 1, organizationId: 1, managerId: 1 } }).toArray(),
    db.collection('organization_memberships').find({}, { projection: { organizationId: 1, userId: 1, state: 1 } }).toArray(),
    db.collection('workspace_memberships').find({}, { projection: { workspaceId: 1, userId: 1, state: 1 } }).toArray(),
  ]);
  const same = (a, b) => a != null && b != null && String(a) === String(b);
  const active = (rows, parentKey, parent, user) => rows.some(row => row.state === 'active' && same(row[parentKey], parent) && same(row.userId, user));
  const issues = { mixedOwnership: 0, missingOrganization: 0, missingOwnerMembership: 0, missingManagerMembership: 0, organizationOwnerWithoutMembership: 0, missingUserReference: 0 };
  let standalone = 0, attached = 0, legacyMissingFields = 0;
  const userIds = new Set();
  for (const row of organizations) {
    if (row.ownerId) userIds.add(String(row.ownerId));
    if (!active(orgMembers, 'organizationId', row._id, row.ownerId)) issues.organizationOwnerWithoutMembership++;
  }
  for (const row of workspaces) {
    if (row.organizationId) {
      attached++;
      if (row.ownerId || !row.managerId) issues.mixedOwnership++;
      if (!organizations.some(org => same(org._id, row.organizationId))) issues.missingOrganization++;
      if (!active(orgMembers, 'organizationId', row.organizationId, row.managerId) || !active(workspaceMembers, 'workspaceId', row._id, row.managerId)) issues.missingManagerMembership++;
      if (row.managerId) userIds.add(String(row.managerId));
    } else {
      standalone++;
      if (!Object.hasOwn(row, 'organizationId')) legacyMissingFields++;
      if (!row.ownerId || row.managerId) issues.mixedOwnership++;
      if (!active(workspaceMembers, 'workspaceId', row._id, row.ownerId)) issues.missingOwnerMembership++;
      if (row.ownerId) userIds.add(String(row.ownerId));
    }
  }
  const users = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  const existing = new Set(users.map(user => String(user._id)));
  issues.missingUserReference = [...userIds].filter(user => !existing.has(user)).length;
  return { organizations: organizations.length, workspaces: workspaces.length, standalone, attached, legacyMissingFields,
    issues, valid: Object.values(issues).every(count => count === 0) };
}
