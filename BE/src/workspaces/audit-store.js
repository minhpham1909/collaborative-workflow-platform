import mongoose from 'mongoose';
const literal = value => ({ $literal: value });
const projection = source => ({ _id: 1, createdAt: 1, actorId: 1, targetUserId: { $ifNull: ['$targetUserId', null] }, action: 1,
  invitationType: { $ifNull: ['$invitationType', null] }, changedFields: { $ifNull: ['$changedFields', []] },
  reason: { $ifNull: ['$reason', null] }, previousRole: { $ifNull: ['$previousRole', null] }, role: { $ifNull: ['$role', null] },
  versionScope: { $ifNull: ['$versionScope', null] }, resourceVersion: { $ifNull: ['$resourceVersion', null] },
  source: literal(source), scopeType: literal('workspace'), projectId: literal(null), cleanup: literal(null) });
export async function queryManagementHistory(workspace, page, tx) {
  const workspaceId = workspace._id;
  const branches = [
    [{ $match: { workspaceId, action: { $nin: ['role_changed', 'ownership_transferred', 'archived', 'unarchived'] } } }, { $project: projection('management') }],
    [{ $match: { workspaceId, $nor: [{ previousRole: 'owner', role: 'member' }] } }, { $project: { ...projection('role'), action: { $cond: [{ $eq: ['$role', 'owner'] }, 'ownership_transferred', 'role_changed'] }, versionScope: literal('membership'), resourceVersion: '$membershipVersion' } }],
    [{ $match: { workspaceId } }, { $project: { ...projection('lifecycle'), action: { $cond: [{ $eq: ['$state', 'archived'] }, 'archived', 'unarchived'] }, versionScope: literal('workspace') } }],
    [{ $match: { workspaceId, scopeType: { $in: ['workspace', 'project'] }, action: { $in: ['ban', 'unban'] } } }, { $project: { ...projection('security'), scopeType: 1, projectId: { $ifNull: ['$projectId', null] }, cleanup: { mode: '$cleanup', state: '$state', matchedCount: '$matchedCount', deletedCount: '$deletedCount' } } }],
  ];
  const base = [
    { $match: { ...(page.action !== 'all' ? { action: page.action } : {}), $and: page.filters.length ? page.filters : [{}] } },
    { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', pipeline: [{ $match: { workspaceId } }, { $project: { name: 1 } }], as: 'project' } },
    { $lookup: { from: 'users', localField: 'actorId', foreignField: '_id', pipeline: [{ $project: { displayName: 1 } }], as: 'actor' } },
    { $lookup: { from: 'users', localField: 'targetUserId', foreignField: '_id', pipeline: [{ $project: { displayName: 1 } }], as: 'target' } },
    ...(page.patterns.length ? [{ $match: { $and: page.patterns.map(pattern => ({ $or: [{ 'actor.displayName': { $regex: pattern, $options: 'i' } }, { 'target.displayName': { $regex: pattern, $options: 'i' } }, { reason: { $regex: pattern, $options: 'i' } }] })) } }] : []),
  ];
  const position = page.position;
  const after = position ? { $or: [
    { createdAt: { $lt: new Date(position.at) } },
    { createdAt: new Date(position.at), _id: { $lt: new mongoose.Types.ObjectId(position.id) } },
    { createdAt: new Date(position.at), _id: new mongoose.Types.ObjectId(position.id), source: { $lt: position.source } },
  ] } : {};
  // $unionWith is not supported inside Mongo transactions. Query each canonical source
  // sequentially in this same transaction, fetching only limit+1 candidates per source.
  const collections = ['workspace_management_audit', 'workspace_role_audit', 'workspace_lifecycle_audit', 'moderation_actions'];
  const candidates = []; let total = 0;
  for (let index = 0; index < collections.length; index++) {
    const result = await mongoose.connection.collection(collections[index]).aggregate([...branches[index], ...base, { $facet: {
      totals: [{ $count: 'total' }], rows: [{ $match: after }, { $sort: { createdAt: -1, _id: -1, source: -1 } }, { $limit: page.limit + 1 }],
    } }], { session: tx }).toArray();
    candidates.push(...(result[0]?.rows ?? [])); total += result[0]?.totals[0]?.total ?? 0;
  }
  const rows = candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (String(a._id) === String(b._id) ? (a.source === b.source ? 0 : a.source > b.source ? -1 : 1) : String(a._id) > String(b._id) ? -1 : 1));
  const selected = rows.slice(0, page.limit), last = selected.at(-1);
  return { items: selected.map(row => ({ id: `${row.source}:${row._id}`, source: row.source, createdAt: row.createdAt, action: row.action,
    invitationType: row.invitationType, changedFields: row.changedFields, reason: row.action === 'ownership_transferred' && row.source === 'role' && row.reason === 'ownership_transferred' ? null : row.reason,
    previousRole: row.previousRole, role: row.role, versionScope: row.versionScope, resourceVersion: row.resourceVersion,
    scopeType: row.scopeType, project: row.projectId ? { id: String(row.projectId), name: row.project[0]?.name ?? null } : null, cleanup: row.cleanup,
    actor: { id: String(row.actorId), displayName: row.actor[0]?.displayName ?? null },
    target: row.targetUserId ? { id: String(row.targetUserId), displayName: row.target[0]?.displayName ?? null } : null })),
    nextCursor: rows.length > page.limit ? Buffer.from(JSON.stringify({ at: last.createdAt.toISOString(), id: String(last._id), source: last.source })).toString('base64url') : null,
    total, coverage: 'standalone_available_records_v2' };
}
