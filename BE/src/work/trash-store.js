import mongoose from 'mongoose';
import { Task } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { sameId, paged } from '../workspaces/response.js';
import { assertWorkspaceWritable } from '../workspaces/lifecycle.js';

const id = value => new mongoose.Types.ObjectId(value);
export function createTaskTrashStore({ run, projectScope, taskResponse, owner, checkVersion, update, assignee, activity, now }) {
  const deny = (code, status = 409) => { throw new AuthError(code, status); };
  const canRestore = (context, task) => !context.guest && (owner(context) || context.isLead || sameId(task.createdBy, context.user._id));
  async function scope(context, taskId) {
    let task = await Task.collection.findOne({ _id: id(taskId), deletedAt: { $type: 'date' } }, { session: context.tx });
    if (!task) deny('RESOURCE_UNAVAILABLE', 404);
    context = await projectScope(context, String(task.projectId));
    task = await Task.collection.findOne({ _id: task._id, workspaceId: context.workspace._id, projectId: context.project._id, deletedAt: { $type: 'date' } }, { session: context.tx });
    if (!task || !canRestore(context, task)) deny('RESOURCE_UNAVAILABLE', 404);
    return { ...context, task };
  }
  async function response(task, context) {
    const result = await taskResponse(task, context);
    const expired = Boolean(task.purgeAt && task.purgeAt <= now());
    return { ...result, deletedAt: task.deletedAt, deletedBy: String(task.deletedBy), purgeAt: task.purgeAt ?? null, retentionScheduled: Boolean(task.purgeAt),
      permissions: { edit: false, delete: false, status: false, requestReopen: false, manageReopen: false, checklistStructure: false, checklistTick: false,
        restore: !expired && context.workspace.state !== 'archived' && context.project.state === 'active' } };
  }
  return {
    trash: (claims, projectId, page) => run(claims, async context => {
      context = await projectScope(context, projectId);
      if (context.guest) deny('TRASH_ACCESS_FORBIDDEN', 403);
      const criteria = { workspaceId: context.workspace._id, projectId: context.project._id, deletedAt: { $type: 'date' },
        ...(owner(context) || context.isLead ? {} : { createdBy: context.user._id }) };
      const after = page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
      const records = await Task.collection.find({ ...criteria, ...after }, { session: context.tx }).sort({ deletedAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const result = paged(records, page.limit, value => value, 'deletedAt'), items = [];
      for (const task of result.items) items.push(await response(task, context));
      return { items, nextCursor: result.nextCursor, total: await Task.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    restore: (claims, taskId, expectedVersion) => run(claims, async context => {
      context = await scope(context, taskId);
      assertWorkspaceWritable(context.workspace);
      if (context.project.state !== 'active') deny('PROJECT_ARCHIVED');
      checkVersion(context.task, expectedVersion);
      if (context.task.purgeAt && context.task.purgeAt <= now()) deny('TASK_RETENTION_EXPIRED');
      const fields = { deletedAt: null, deletedBy: null, purgeAt: null };
      if (context.task.status !== 'done' && context.task.assigneeId) {
        try { await assignee(context, String(context.task.assigneeId)); }
        catch (error) { if (error instanceof AuthError) fields.assigneeId = null; else throw error; }
      }
      const value = await update(Task, context.task, fields, context.tx);
      await activity(context, value, 'restored', Object.keys(fields));
      // Never replay work events, completedAt, reopen requests or delivery jobs.
      return { task: await taskResponse(value, context) };
    }),
  };
}
