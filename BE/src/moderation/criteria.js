import { Workspace, Project, Task } from '../models/index.js';

export async function commentCriteria(action, tx) {
  const workspaces = await Workspace.collection.find({ _id: { $in: action.workspaceIds }, organizationId: action.organizationId ?? null }, { session: tx, projection: { _id: 1 } }).toArray();
  const workspaceIds = workspaces.map(row => row._id);
  const criteria = { workspaceId: { $in: workspaceIds }, authorId: action.targetUserId, createdAt: { $lte: action.cutoff, ...(action.from ? { $gte: action.from } : {}) } };
  if (action.scopeType === 'project') {
    const project = await Project.collection.findOne({ _id: action.projectId, workspaceId: { $in: workspaceIds } }, { session: tx });
    const tasks = project ? await Task.collection.find({ projectId: project._id, workspaceId: project.workspaceId }, { session: tx, projection: { _id: 1 } }).toArray() : [];
    criteria.taskId = { $in: tasks.map(row => row._id) };
  }
  return criteria;
}
