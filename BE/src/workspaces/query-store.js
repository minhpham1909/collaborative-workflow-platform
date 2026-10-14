import mongoose from 'mongoose';
import { Workspace, WorkspaceMembership, Project } from '../models/index.js';
import { workspaceAccess, workspaceAccessStages, historicalWorkspaceFixture } from '../workspaces/access.js';
import { bannedProjectIds } from '../moderation/guard.js';
import { sameId, workspaceResponse, paged } from './response.js';
const id = value => new mongoose.Types.ObjectId(value);
function mongoAfter(after) { return after.$or ? { $or: after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : after; }
// Caller authenticates/locks actor; runtime lists use only Workspace membership authority.
export async function queryWorkspaceList(user, tx, page) {
      const historical=historicalWorkspaceFixture(); if(historical)return historical.queryWorkspaceList(user,tx,page);
      const manager = { 'membership.role': 'manager' };
      const managed = { $or: [{ ownerId: user._id }, manager] };
      const roleStages = page.role === 'managed' ? [{ $match: managed }] : page.role === 'member' ? [{ $match: { $nor: managed.$or } }] : [];
      const stateStages = page.state === 'active' ? [{ $match: { state: { $ne: 'archived' } } }] : page.state === 'archived' ? [{ $match: { state: 'archived' } }] : [];
      const base = [{ $match: { $and: [ ...(page.filters?.length ? page.filters : [{}]) ] } }, ...workspaceAccessStages(user._id)];
      const managedExpression = { $or: [{ $eq: ['$ownerId', user._id] }, { $in: ['manager', '$membership.role'] }] };
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
        { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
      ], { session: tx }).toArray();
      const hiddenProjects = await bannedProjectIds(user._id, tx);
      const projects = await Project.collection.aggregate([{ $match: { _id: { $nin: hiddenProjects }, workspaceId: { $in: ids } } }, { $group: {
        _id: '$workspaceId', active: { $sum: { $cond: [{ $eq: ['$state', 'active'] }, 1, 0] } },
        archived: { $sum: { $cond: [{ $eq: ['$state', 'archived'] }, 1, 0] } },
      } }], { session: tx }).toArray();
      const values = [];
      for (const value of records) values.push({ ...value, access: await workspaceAccess(value, user._id, tx) });
      return { ...paged(values, page.limit, (value) => ({ ...workspaceResponse(value, value.access.membership), memberCount: members.find(row => sameId(row._id, value._id))?.count ?? 0, activeProjectCount: projects.find(row => sameId(row._id, value._id))?.active ?? 0, archivedProjectCount: projects.find(row => sameId(row._id, value._id))?.archived ?? 0 })),
        total: summary.total[0]?.total ?? 0, roleCounts: { ...roleCounts, all: roleCounts.managed + roleCounts.member }, stateCounts: { ...stateCounts, all: stateCounts.active + stateCounts.archived } };
}
