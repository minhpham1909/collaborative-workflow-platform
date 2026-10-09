import { randomBytes } from 'node:crypto';
import { Project, Workspace, Task } from '../models/index.js';
import mongoose from 'mongoose';
import { AuthError } from '../auth/errors.js';

// The unique Project prefix and Task code indexes must exist before enabling writes.
export async function nextTaskCode(project, tx) {
  let prefix = project.taskPrefix;
  if (!prefix) {
    do { prefix = randomBytes(3).toString('hex').toUpperCase(); }
    while (await Project.collection.findOne({ taskPrefix: prefix }, { session: tx, projection: { _id: 1 } }));
  }
  const value = await Project.collection.findOneAndUpdate({ _id: project._id }, { $set: { taskPrefix: prefix }, $inc: { taskSequence: 1 } }, { session: tx, returnDocument: 'after' });
  if (!value || !Number.isSafeInteger(value.taskSequence)) throw new AuthError('TASK_SEQUENCE_EXHAUSTED', 409);
  return `WF-${prefix}-${value.taskSequence}`;
}

export async function auditTaskCodes() {
  const missingCodes = await Task.collection.countDocuments({ code: null });
  const unknownDoneTimes = await Task.collection.countDocuments({ status: 'done', completedAt: null });
  const problems = [];
  for (const [model, field] of [[Project, 'taskPrefix'], [Task, 'code']]) {
    const duplicates = await model.collection.aggregate([{ $match: { [field]: { $type: 'string' } } }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]).toArray();
    if (duplicates.length) problems.push({ issue: `duplicate_${field}`, count: duplicates.length });
  }
  for await (const project of Project.collection.find({})) {
    if (project.taskPrefix != null && !/^[A-F0-9]{6}$/u.test(project.taskPrefix)) problems.push({ projectId: String(project._id), issue: 'invalid_prefix' });
    if (!await Workspace.collection.findOne({ _id: project.workspaceId }, { projection: { _id: 1 } })) problems.push({ projectId: String(project._id), issue: 'missing_workspace' });
    if (await Task.collection.countDocuments({ projectId: project._id, workspaceId: { $ne: project.workspaceId } })) problems.push({ projectId: String(project._id), issue: 'task_workspace_mismatch' });
    const records = await Task.collection.find({ projectId: project._id, code: { $type: 'string' } }, { projection: { code: 1, workspaceId: 1 } }).toArray();
    let max = 0;
    for (const task of records) {
      const match = /^WF-([A-F0-9]{6})-([1-9][0-9]*)$/u.exec(task.code);
      if (!match || match[1] !== project.taskPrefix || String(task.workspaceId) !== String(project.workspaceId) || !Number.isSafeInteger(Number(match[2]))) problems.push({ projectId: String(project._id), taskId: String(task._id), issue: 'code_parent_mismatch' });
      else max = Math.max(max, Number(match[2]));
    }
    if (!Number.isSafeInteger(project.taskSequence ?? 0) || (project.taskSequence ?? 0) < max) problems.push({ projectId: String(project._id), issue: 'counter_below_reserved_code' });
  }
  const orphans = await Task.collection.aggregate([{ $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'parent' } }, { $match: { 'parent.0': { $exists: false } } }, { $count: 'count' }]).toArray();
  if (orphans[0]?.count) problems.push({ issue: 'orphan_tasks', count: orphans[0].count });
  return { missingCodes, unknownDoneTimes, problems };
}

// Explicit migration only. Batch transaction locks the same Workspace as live writes;
// archived/deleted Tasks are included so future restores keep their reserved code.
export async function backfillTaskCodes(projectId, limit = 100) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_BATCH_LIMIT');
  return mongoose.connection.transaction(async tx => {
    let project = await Project.collection.findOne({ _id: projectId }, { session: tx });
    if (!project) throw new Error('PROJECT_NOT_FOUND');
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: project.workspaceId }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace) throw new Error('WORKSPACE_NOT_FOUND');
    project = await Project.collection.findOne({ _id: projectId }, { session: tx });
    const records = await Task.collection.find({ projectId, workspaceId: project.workspaceId, code: null }, { session: tx }).sort({ createdAt: 1, _id: 1 }).limit(limit).toArray();
    for (const task of records) {
      const code = await nextTaskCode(project, tx);
      // Keep updatedAt/completedAt: adding identifiers cannot invent business history.
      const result = await Task.collection.updateOne({ _id: task._id, code: null, version: task.version }, { $set: { code }, $inc: { version: 1 } }, { session: tx });
      if (result.modifiedCount !== 1) throw new Error('TASK_MIGRATION_CONFLICT');
      project = await Project.collection.findOne({ _id: projectId }, { session: tx });
    }
    return records.length;
  });
}
