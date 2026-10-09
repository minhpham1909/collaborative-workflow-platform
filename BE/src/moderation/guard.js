import { AccessBan } from '../models/index.js';
import { AuthError } from '../auth/errors.js';

export function scopeConditions({ organizationId, workspaceId, projectId }) {
  return [organizationId && { scopeType: 'organization', scopeId: organizationId }, workspaceId && { scopeType: 'workspace', scopeId: workspaceId }, projectId && { scopeType: 'project', scopeId: projectId }].filter(Boolean);
}
export async function assertNotBanned(userId, scopes, tx) {
  const conditions = scopeConditions(scopes);
  if (conditions.length && await AccessBan.collection.findOne({ userId, state: 'active', $or: conditions }, { session: tx, projection: { _id: 1 } })) throw new AuthError('ACCESS_BANNED', 403);
}
export async function bannedProjectIds(userId, tx) {
  return (await AccessBan.collection.find({ userId, state: 'active', scopeType: 'project' }, { session: tx, projection: { scopeId: 1 } }).toArray()).map(row => row.scopeId);
}
export function banFilterStages(userId, scopes) {
  const bindings = Object.fromEntries(Object.entries(scopes).map(([type, expression]) => [`ban_${type}`, expression]));
  const clauses = Object.keys(scopes).map(type => ({ $and: [{ $eq: ['$scopeType', type] }, { $eq: ['$scopeId', `$$ban_${type}`] }] }));
  return [
    { $lookup: { from: 'access_bans', pipeline: [{ $match: { userId, state: 'active', $expr: { $or: clauses } } }], let: bindings, as: 'scopeBans' } },
    { $match: { 'scopeBans.0': { $exists: false } } },
  ];
}
