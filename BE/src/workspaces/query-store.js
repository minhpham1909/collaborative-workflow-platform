import mongoose from 'mongoose';
import { Workspace, WorkspaceMembership, Project } from '../models/index.js';
import { workspaceAccess, workspaceAccessStages } from '../organizations/workspace-access.js';
import { bannedProjectIds } from '../moderation/guard.js';
import { sameId, workspaceResponse, paged } from './response.js';
const id = value => new mongoose.Types.ObjectId(value);
function mongoAfter(after) { return after.$or ? { $or: after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : after; }
// Caller authenticates/locks actor; Org caller additionally guards actual parent.
export async function queryWorkspaceList(user, tx, page) {
      const managed = { $or: [{ ownerId: user._id }, { managerId: user._id }, { 'organization.ownerId': user._id }, { 'organizationMembership.role': 'admin' }] };
      const roleStages = page.role === 'managed' ? [{ $match: managed }] : page.role === 'member' ? [{ $match: { $nor: managed.$or } }] : [];
      const stateStages = page.state === 'active' ? [{ $match: { state: { $ne: 'archived' } } }] : page.state === 'archived' ? [{ $match: { state: 'archived' } }] : [];
      const base = [{ $match: { ...(page.organizationId ? { organizationId: page.organizationId } : {}), $and: [ ...(page.filters?.length ? page.filters : [{}]) ] } }, ...workspaceAccessStages(user._id)];
      const managedExpression = { $or: [{ $eq: ['$ownerId', user._id] }, { $eq: ['$managerId', user._id] },
        { $in: [user._id, { $ifNull: ['$organization.ownerId', []] }] }, { $in: ['admin', { $ifNull: ['$organizationMembership.role', []] }] }] };
      const summaries = await Workspace.collection.aggregate([...base, { $facet: {
        total: [...roleStages, ...stateStages, { $count: 'total' }],
        roles: [...stateStages, { $group: { _id: { $cond: [managedExpression, 'managed', 'member'] }, total: { $sum: 1 } } }],
        states: [...roleStages, { $group: { _id: { $cond: [{ $eq: ['$state', 'archived'] }, 'archived', 'active'] }, total: { $sum: 1 } } }],
      } }], { session: tx }).toArray();
      const summary = summaries[0];
      const roleCounts = Object.fromEntries(['managed', 'member'].map(key => [key, summary.roles.find(row => row._id === key)?.total ?? 0]));
      const stateCounts = Object.fromEntries(['active', 'archived'].map(key => [key, summary.states.find(row => row._id === key)?.total ?? 0]));
      const records = await Workspace.collection.aggregate([...base, ...roleStages, ...stateStages, { $match: mongoAfter(page.after) },
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: page.limit + 1 }], { session: tx }).toArray();
      const ids = records.slice(0, page.limit).map(value => value._id);
      const members = await WorkspaceMembership.collection.aggregate([
        { $match: { workspaceId: { $in: ids }, state: 'active' } },
        { $lookup: { from: 'workspaces', localField: 'workspaceId', foreignField: '_id', as: 'workspace' } }, { $unwind: '$workspace' },
        { $lookup: { from: 'organization_memberships', let: { organization: '$workspace.organizationId', user: '$userId' }, pipeline: [
          { $match: { state: 'active', $expr: { $and: [{ $eq: ['$organizationId', '$$organization'] }, { $eq: ['$userId', '$$user'] }] } } },
        ], as: 'organizationMembership' } },
        { $match: { $or: [{ 'workspace.organizationId': null }, { 'organizationMembership.0': { $exists: true } }] } },
        { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
      ], { session: tx }).toArray();
      const hiddenProjects = await bannedProjectIds(user._id, tx);
      const activeIds = records.slice(0, page.limit).filter(value => value.state !== 'archived').map(value => value._id);
      const projects = await Project.collection.aggregate([{ $match: { _id: { $nin: hiddenProjects }, workspaceId: { $in: activeIds }, state: 'active' } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }], { session: tx }).toArray();
      const values = [];
      for (const value of records) values.push({ ...value, access: await workspaceAccess(value, user._id, tx) });
      return { ...paged(values, page.limit, (value) => ({ ...workspaceResponse(value, value.access.membership), memberCount: members.find(row => sameId(row._id, value._id))?.count ?? 0, activeProjectCount: projects.find(row => sameId(row._id, value._id))?.count ?? 0 })),
        total: summary.total[0]?.total ?? 0, roleCounts: { ...roleCounts, all: roleCounts.managed + roleCounts.member }, stateCounts: { ...stateCounts, all: stateCounts.active + stateCounts.archived } };
}
