import mongoose from 'mongoose';
import { Task, Workspace, Organization, Project, TaskComment, TaskActivity, TaskReopenRequest, Notification, EmailOutbox, TaskPurgeAudit } from '../models/index.js';

export async function purgeExpiredTask(taskId, expectedVersion, { now = () => new Date() } = {}) {
  return mongoose.connection.transaction(async tx => {
    const candidate = await Task.collection.findOne({ _id: taskId }, { session: tx });
    if (!candidate) return { state: 'skipped' };
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: candidate.workspaceId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace) return { state: 'orphan_skipped' };
    if (workspace.organizationId && !await Organization.collection.findOneAndUpdate({ _id: workspace.organizationId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' })) return { state: 'orphan_skipped' };
    const task = await Task.collection.findOne({ _id: taskId, workspaceId: workspace._id, version: expectedVersion, deletedAt: { $type: 'date' }, purgeAt: { $type: 'date', $lte: now() } }, { session: tx });
    if (!task) return { state: 'skipped' };
    if (task.purgeAt.getTime() !== task.deletedAt.getTime() + 30 * 86400_000) return { state: 'invalid_retention_skipped' };
    if (!await Project.collection.findOne({ _id: task.projectId, workspaceId: workspace._id }, { session: tx })) return { state: 'orphan_skipped' };
    const criteria = { taskId: task._id, workspaceId: task.workspaceId };
    await TaskComment.collection.deleteMany(criteria, { session: tx });
    await TaskActivity.collection.deleteMany({ ...criteria, projectId: task.projectId }, { session: tx });
    await TaskReopenRequest.collection.deleteMany({ ...criteria, projectId: task.projectId }, { session: tx });
    await Notification.collection.deleteMany(criteria, { session: tx });
    await EmailOutbox.collection.deleteMany(criteria, { session: tx });
    const result = await Task.collection.deleteOne({ _id: task._id, version: task.version, purgeAt: { $lte: now() }, deletedAt: task.deletedAt }, { session: tx });
    if (result.deletedCount !== 1) throw new Error('TASK_PURGE_CONFLICT');
    await new TaskPurgeAudit({ workspaceId: task.workspaceId, projectId: task.projectId, taskId: task._id, code: task.code ?? null,
      deletedAt: task.deletedAt, purgedAt: now(), mode: 'retention', createdAt: now() }).save({ session: tx });
    return { state: 'purged' };
  });
}

export async function runTaskRetention({ now = () => new Date(), limit = 20, after = null } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_RETENTION_LIMIT');
  const cursor = after ? { $or: [{ purgeAt: { $gt: new Date(after.at) } }, { purgeAt: new Date(after.at), _id: { $gt: new mongoose.Types.ObjectId(after.id) } }] } : {};
  const records = await Task.collection.find({ deletedAt: { $type: 'date' }, purgeAt: { $type: 'date', $lte: now() }, ...cursor }, { projection: { _id: 1, version: 1, purgeAt: 1 } }).sort({ purgeAt: 1, _id: 1 }).limit(limit).toArray();
  const result = { selected: records.length, purged: 0, skipped: 0, failed: 0 };
  for (const task of records) {
    try { const outcome = await purgeExpiredTask(task._id, task.version, { now }); outcome.state === 'purged' ? result.purged++ : result.skipped++; }
    catch { result.failed++; } // No payload/body/credentials in worker logs. Next run retries eligible rows.
  }
  const last = records.at(-1);
  return { ...result, nextCursor: records.length === limit ? { at: last.purgeAt.toISOString(), id: String(last._id) } : null };
}
