import { createHash } from 'node:crypto';
const id = value => value == null ? null : String(value);
export function validateInventoryTarget(config) {
  const url = new URL(config.mongoUri);
  if (config.nodeEnv !== 'development' || url.protocol !== 'mongodb:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.port !== '27018' || url.pathname === '/') throw Error('PROJECT_LOCAL_REPLICA_REQUIRED');
}
export const inventoryProjections = Object.freeze({
  users: { _id:1, emailVerifiedAt:1 }, organizations: { _id:1, ownerId:1, version:1 },
  organization_memberships: { _id:1, organizationId:1, userId:1, state:1, role:1, version:1, exitReason:1 },
  workspaces: { _id:1, organizationId:1, ownerId:1, managerId:1, state:1, version:1 },
  workspace_memberships: { _id:1, workspaceId:1, userId:1, state:1, role:1, version:1, membershipGeneration:1 },
  projects: { _id:1, workspaceId:1, state:1, leadId:1, version:1 },
  tasks: { _id:1, workspaceId:1, projectId:1, assigneeId:1, createdBy:1, status:1, deletedAt:1, purgeAt:1, version:1 },
  task_comments: { _id:1, workspaceId:1, taskId:1, authorId:1 },
  project_guests: { _id:1, workspaceId:1, projectId:1, userId:1, state:1, version:1, membershipGeneration:1 },
  access_bans: { _id:1, scopeType:1, scopeId:1, organizationId:1, workspaceId:1, projectId:1, userId:1, state:1, version:1, membershipGeneration:1 },
  organization_invitations: { _id:1, organizationId:1, workspaceId:1, revokedAt:1, acceptedAt:1, expiresAt:1 },
  workspace_invitations: { _id:1, workspaceId:1, revokedAt:1, acceptedAt:1, expiresAt:1 },
  project_guest_invitations: { _id:1, workspaceId:1, projectId:1, revokedAt:1, acceptedAt:1, expiresAt:1 },
  notifications: { _id:1, workspaceId:1, organizationId:1, category:1 },
  email_outbox: { _id:1, workspaceId:1, organizationId:1, state:1, category:1 },
  moderation_actions: { _id:1, workspaceId:1, organizationId:1, scopeType:1, state:1, action:1, workspaceIds:1 },
  task_reopen_requests: { _id:1, workspaceId:1, state:1 },
  workspace_creations: { _id:1, workspaceId:1, userId:1 },
  organization_audit:{_id:1,organizationId:1,workspaceId:1}, workspace_role_audit:{_id:1,workspaceId:1},
  workspace_lifecycle_audit:{_id:1,workspaceId:1}, workspace_management_audit:{_id:1,workspaceId:1},
  project_access_audit:{_id:1,workspaceId:1,projectId:1}, task_activity:{_id:1,workspaceId:1,projectId:1,taskId:1},
  task_purge_audit:{_id:1,workspaceId:1,projectId:1,taskId:1}, project_labels:{_id:1,workspaceId:1,projectId:1},
});
export async function readInventorySnapshot(db, session) {
  const snapshot = {};
  // Reads only; sequential inside one snapshot transaction. No models/hooks/index creation.
  for (const [collection, projection] of Object.entries(inventoryProjections)) snapshot[collection] = await db.collection(collection).find({}, { session, projection, maxTimeMS:10000 }).toArray();
  return snapshot;
}
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toHexString === 'function') return value.toHexString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
export function inventoryFingerprint(snapshot) {
  const ordered = Object.fromEntries(Object.keys(inventoryProjections).sort().map(name=>[name,[...(snapshot[name]??[])].sort((a,b)=>id(a._id)>id(b._id)?1:id(a._id)<id(b._id)?-1:0)]));
  return createHash('sha256').update(JSON.stringify(canonical(ordered))).digest('hex');
}
export function analyzeWorkspaceOnlyInventory(snapshot, asOf = new Date()) {
  const rows = name => snapshot[name] ?? [], users = new Map(rows('users').map(row => [id(row._id), row]));
  const orgs = new Map(rows('organizations').map(row => [id(row._id), row]));
  const workspaces = new Map(rows('workspaces').map(row => [id(row._id), row]));
  const projects = new Map(rows('projects').map(row => [id(row._id), row]));
  const findings = [], proposals = [], transitions = [], requiredBanMappings = [];
  const flag = (code, workspaceId, detail = {}) => findings.push({code, workspaceId, ...detail});
  const memberships = (name, field, scopeId) => rows(name).filter(row => id(row[field]) === scopeId);
  for (const [collection, field] of [['workspace_memberships','workspaceId'], ['organization_memberships','organizationId']]) {
    const seen = new Set();
    for (const row of rows(collection)) { const key = `${id(row[field])}:${id(row.userId)}`; if (seen.has(key)) flag('DUPLICATE_MEMBERSHIP', collection === 'workspace_memberships' ? id(row.workspaceId) : null, {collection, scopeId:id(row[field]), userId:id(row.userId)}); seen.add(key); }
  }
  const activeBans = rows('access_bans').filter(row => row.state === 'active');
  const banned = (workspace, userId) => activeBans.some(row => id(row.userId) === userId && ((row.scopeType === 'workspace' && id(row.scopeId) === id(workspace._id)) || (workspace.organizationId && row.scopeType === 'organization' && id(row.scopeId) === id(workspace.organizationId))));
  for (const workspace of rows('workspaces')) {
    const workspaceId = id(workspace._id), organizationId = id(workspace.organizationId), org = orgs.get(organizationId);
    const wm = memberships('workspace_memberships','workspaceId',workspaceId);
    if (!organizationId) {
      const ownerId = id(workspace.ownerId), ownerMembership = wm.find(row => id(row.userId) === ownerId && row.state === 'active');
      if (!ownerId || !users.has(ownerId) || !ownerMembership || workspace.managerId) flag('STANDALONE_OWNERSHIP_INVALID', workspaceId);
      continue;
    }
    if (!org) { flag('ORGANIZATION_MISSING', workspaceId); continue; }
    if (workspace.ownerId || !workspace.managerId) flag('ATTACHED_OWNERSHIP_INVALID', workspaceId);
    const om = memberships('organization_memberships','organizationId',organizationId);
    const ownerId = id(org.ownerId), ownerOrg = om.find(row => id(row.userId) === ownerId && row.state === 'active');
    const ownerEligible = Boolean(ownerOrg && users.get(ownerId)?.emailVerifiedAt && !banned(workspace,ownerId));
    const proposal = {workspaceId, organizationId, workspaceVersion:workspace.version ?? null, candidateOwnerId:ownerEligible ? ownerId : null, managers:[], retainedMembers:[], membershipReview:[]};
    if (!ownerEligible) flag('OWNER_SELECTION_REQUIRED',workspaceId,{candidateUserId:ownerId});
    const ownerWs = wm.find(row => id(row.userId) === ownerId);
    if (ownerEligible && ownerWs?.state !== 'active') flag('OWNER_MEMBERSHIP_EXPLICIT_APPROVAL_REQUIRED',workspaceId,{userId:ownerId, previousMembershipState:ownerWs?.state ?? 'missing'});
    const candidates = new Set([...om.map(row => id(row.userId)), ...wm.map(row => id(row.userId)), ownerId]);
    for (const userId of candidates) {
      const user = users.get(userId), orgMember = om.find(row => id(row.userId) === userId), member = wm.find(row => id(row.userId) === userId);
      const effective = Boolean(user?.emailVerifiedAt && orgMember?.state === 'active' && !banned(workspace,userId));
      const orgAdmin = userId === ownerId || orgMember?.role === 'admin';
      const before = {read:effective && (orgAdmin || member?.state === 'active'), manage:effective && (orgAdmin || member?.state === 'active' && id(workspace.managerId) === userId), member:effective && member?.state === 'active'};
      let role = null;
      if (ownerEligible && userId === ownerId) role = 'owner';
      else if (orgMember?.state === 'active' && member?.state === 'active' && user && !banned(workspace,userId)) {
        role = id(workspace.managerId) === userId && user.emailVerifiedAt ? 'manager' : 'member';
        (role === 'manager' ? proposal.managers : proposal.retainedMembers).push(userId);
      }
      if (member?.state === 'active' && orgMember?.state !== 'active') { proposal.membershipReview.push({userId, code:'STALE_ORGANIZATION_EXIT', membershipVersion:member.version ?? null}); flag('STALE_MEMBERSHIP_MUST_NOT_REACTIVATE',workspaceId,{userId}); }
      if (banned(workspace,userId) && member?.state === 'active') proposal.membershipReview.push({userId,code:'BANNED_MEMBER_KEEP_DENIED',membershipVersion:member.version ?? null});
      if (!user) flag('USER_REFERENCE_MISSING',workspaceId,{userId});
      const after = {read:Boolean(role && user?.emailVerifiedAt),manage:Boolean(['owner','manager'].includes(role) && user?.emailVerifiedAt),member:Boolean(role && user?.emailVerifiedAt)};
      transitions.push({workspaceId,userId,orgRole:userId === ownerId ? 'owner' : orgMember?.role ?? null,candidateRole:role,before,after,
        gained:Object.keys(before).filter(key => !before[key] && after[key]),lost:Object.keys(before).filter(key => before[key] && !after[key])});
      if (orgMember?.role === 'admin' && before.manage && !after.manage) flag('ORG_ADMIN_MAPPING_REVIEW_REQUIRED',workspaceId,{userId});
    }
    if (!proposal.managers.includes(id(workspace.managerId)) && id(workspace.managerId) !== proposal.candidateOwnerId) flag('LEGACY_MANAGER_MAPPING_REVIEW_REQUIRED',workspaceId,{userId:id(workspace.managerId)});
    for (const ban of activeBans.filter(row => row.scopeType === 'organization' && id(row.scopeId) === organizationId)) requiredBanMappings.push({workspaceId,userId:id(ban.userId),sourceBanId:id(ban._id)});
    proposals.push(proposal);
  }
  const attachedIds = new Set(rows('workspaces').filter(row=>row.organizationId).map(row=>id(row._id)));
  for (const [name,field] of [['workspace_memberships','workspaceId'],['organization_memberships','organizationId']]) for (const row of rows(name)) {
    if (!Number.isSafeInteger(row.version) || row.version < 0) flag('CAS_VERSION_REVIEW_REQUIRED',name==='workspace_memberships'?id(row[field]):null,{collection:name,membershipId:id(row._id)});
  }
  for (const project of rows('projects')) if (!workspaces.has(id(project.workspaceId))) flag('PROJECT_PARENT_INVALID',id(project.workspaceId),{projectId:id(project._id)});
  for (const task of rows('tasks')) {
    if (!workspaces.has(id(task.workspaceId)) || id(projects.get(id(task.projectId))?.workspaceId) !== id(task.workspaceId)) flag('TASK_PARENT_INVALID',id(task.workspaceId),{taskId:id(task._id)});
    if (task.assigneeId && !users.has(id(task.assigneeId))) flag('TASK_ASSIGNEE_MISSING',id(task.workspaceId),{taskId:id(task._id)});
  }
  for (const grant of rows('project_guests').filter(row => row.state === 'active' && attachedIds.has(id(row.workspaceId)))) {
    const workspace = workspaces.get(id(grant.workspaceId));
    if (!workspace) { flag('GUEST_WORKSPACE_MISSING',id(grant.workspaceId),{projectId:id(grant.projectId)}); continue; }
    if (id(projects.get(id(grant.projectId))?.workspaceId) !== id(grant.workspaceId)) flag('GUEST_PROJECT_PARENT_INVALID',id(grant.workspaceId),{projectId:id(grant.projectId)});
    const orgMember = rows('organization_memberships').find(row => id(row.organizationId) === id(workspace.organizationId) && id(row.userId) === id(grant.userId));
    if (orgMember?.state === 'inactive') flag('EXITED_ORG_GUEST_REVIEW_REQUIRED',id(grant.workspaceId),{userId:id(grant.userId),projectId:id(grant.projectId)});
    if (banned(workspace,id(grant.userId))) flag('BANNED_GUEST_KEEP_DENIED',id(grant.workspaceId),{userId:id(grant.userId),projectId:id(grant.projectId)});
  }
  const activeInvitation = row => !row.revokedAt && !row.acceptedAt && new Date(row.expiresAt) > asOf;
  return {formatVersion:1,sourceFingerprint:inventoryFingerprint(snapshot),asOf:asOf.toISOString(),mode:'read_only_candidate_inventory',canApply:false,
    counts:Object.fromEntries(Object.keys(inventoryProjections).map(name => [name,rows(name).length])),
    summary:{standaloneWorkspaces:rows('workspaces').filter(row=>!row.organizationId).length,attachedWorkspaces:rows('workspaces').filter(row=>row.organizationId).length,findings:findings.length,
      activeOrganizationInvitations:rows('organization_invitations').filter(activeInvitation).length,
      pendingOrganizationMail:rows('email_outbox').filter(row=>row.organizationId && ['pending','processing','failed'].includes(row.state)).length,
      organizationNotifications:rows('notifications').filter(row=>row.organizationId).length,
      pendingOrganizationCleanup:rows('moderation_actions').filter(row=>row.scopeType==='organization' && ['pending','processing','failed'].includes(row.state)).length,
      pendingReopenRequests:rows('task_reopen_requests').filter(row=>row.state==='pending').length,
      pendingAttachedReopenRequests:rows('task_reopen_requests').filter(row=>row.state==='pending' && attachedIds.has(id(row.workspaceId))).length,
      historicalLeadReferences:rows('projects').filter(row=>row.leadId).length,
      requiredOrganizationBanMappings:requiredBanMappings.length, candidateGainActors:transitions.filter(row=>row.gained.length).length, candidateLossActors:transitions.filter(row=>row.lost.length).length},
    findings,proposals,transitions,requiredBanMappings,
    gates:['explicit Owner and Manager mapping approval','preserve exits and all Ban scopes','retire/redact organization invitations, notification links and queued deliveries without replay','review pending cleanup/reopen jobs','isolated data and permission rehearsal','backup/restore and cutover concurrency plan','explicit authorization before live migration']};
}
