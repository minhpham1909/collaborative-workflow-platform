import { TaskReopenRequest, Task, Project, Workspace } from '../models/index.js';
import { projectAccess } from './project-access.js';
import { AuthError } from '../auth/errors.js';

export async function cancelReopenRequests(criteria, reason, time, tx, actorId = null) {
  return TaskReopenRequest.collection.updateMany({ ...criteria, state: 'pending' }, { $set: { state: 'cancelled', resolvedAt: time, resolvedBy: actorId, resolutionReason: reason, updatedAt: time }, $inc: { version: 1 } }, { session: tx });
}

export async function reconcileReopenRequests(criteria, time, tx) {
  const records = await TaskReopenRequest.collection.find({ ...criteria, state: 'pending' }, { session: tx }).toArray();
  for (const request of records) {
    const task = await Task.collection.findOne({ _id: request.taskId, projectId: request.projectId, workspaceId: request.workspaceId }, { session: tx });
    const project = await Project.collection.findOne({ _id: request.projectId, workspaceId: request.workspaceId }, { session: tx });
    const workspace = await Workspace.collection.findOne({ _id: request.workspaceId }, { session: tx });
    let reason = !task || task.deletedAt ? 'task_unavailable' : !project || !workspace ? 'parent_unavailable' : project.state !== 'active' || workspace.state === 'archived' ? 'parent_archived' : task.status !== 'done' ? 'task_already_open' : null;
    if (!reason) {
      try {
        const access = await projectAccess(workspace, project, request.requesterId, tx, { lock: false });
        if (access.guest || ![task.createdBy, task.assigneeId].some(value => value && String(value) === String(request.requesterId))) reason = 'requester_ineligible';
      } catch (error) { if (error instanceof AuthError) reason = 'requester_access_lost'; else throw error; }
    }
    if (reason) await cancelReopenRequests({ _id: request._id }, reason, time, tx);
  }
}
