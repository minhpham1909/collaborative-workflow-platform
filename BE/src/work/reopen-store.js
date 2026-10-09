import mongoose from 'mongoose';
import { TaskReopenRequest, Task } from '../models/index.js';
import { sameId, paged } from '../workspaces/response.js';
import { AuthError } from '../auth/errors.js';
import { reconcileReopenRequests } from './reopen-lifecycle.js';

const id = value => new mongoose.Types.ObjectId(value);
const deny = (code, status = 409) => { throw new AuthError(code, status); };
const after = page => page.after.$or ? { $or: page.after.$or.map(part => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};

export function createReopenStore({ run, taskScope, projectScope, owner, checkVersion, now, identity, taskResponse, applyReopen }) {
  const manager = context => !context.guest && (owner(context) || context.isLead);
  const participant = context => !context.guest && [context.task.createdBy, context.task.assigneeId].some(value => sameId(value, context.user._id));
  async function response(value, context) {
    return { id: String(value._id), taskId: String(value.taskId), projectId: String(value.projectId), requester: await identity(value.requesterId, context),
      reason: value.reason, targetStatus: value.targetStatus, state: value.state, version: value.version, createdAt: value.createdAt,
      resolvedAt: value.resolvedAt, resolvedBy: await identity(value.resolvedBy, context), resolutionReason: value.resolutionReason,
      permissions: { review: value.state === 'pending' && manager(context) && !sameId(value.requesterId, context.user._id) } };
  }
  return {
    requestReopen: (claims, taskId, input) => run(claims, async context => {
      context = await taskScope(context, taskId, true);
      if (!participant(context)) deny('REOPEN_REQUEST_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      if (context.task.status !== 'done') deny('TASK_NOT_DONE');
      await reconcileReopenRequests({ taskId: context.task._id }, now(), context.tx);
      if (await TaskReopenRequest.collection.findOne({ taskId: context.task._id, state: 'pending' }, { session: context.tx })) deny('REOPEN_REQUEST_PENDING');
      const rejected = await TaskReopenRequest.collection.findOne({ taskId: context.task._id, requesterId: context.user._id, state: 'rejected', resolvedAt: { $gt: new Date(now().getTime() - 86400_000) } }, { session: context.tx });
      if (rejected) deny('REOPEN_REQUEST_COOLDOWN', 429);
      if (await TaskReopenRequest.collection.countDocuments({ taskId: context.task._id, requesterId: context.user._id, createdAt: { $gt: new Date(now().getTime() - 7 * 86400_000) } }, { session: context.tx }) >= 3) deny('REOPEN_REQUEST_RATE_LIMIT', 429);
      const request = new TaskReopenRequest({ workspaceId: context.workspace._id, projectId: context.project._id, taskId: context.task._id,
        requesterId: context.user._id, reason: input.reason, targetStatus: input.targetStatus, createdAt: now(), updatedAt: now() });
      await request.save({ session: context.tx });
      return { request: await response(request.toObject(), context), task: await taskResponse(context.task, context) };
    }),
    reopenRequests: (claims, taskId, page) => run(claims, async context => {
      context = await taskScope(context, taskId);
      if (context.guest) deny('REOPEN_HISTORY_FORBIDDEN', 403);
      await reconcileReopenRequests({ taskId: context.task._id }, now(), context.tx);
      const criteria = { taskId: context.task._id, workspaceId: context.workspace._id, projectId: context.project._id };
      const records = await TaskReopenRequest.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const result = paged(records, page.limit, value => value), items = [];
      for (const value of result.items) items.push(await response(value, context));
      return { items, nextCursor: result.nextCursor };
    }),
    projectReopenRequests: (claims, projectId, page) => run(claims, async context => {
      context = await projectScope(context, projectId);
      if (!manager(context)) deny('PROJECT_MANAGEMENT_REQUIRED', 403);
      await reconcileReopenRequests({ projectId: context.project._id }, now(), context.tx);
      const criteria = { projectId: context.project._id, workspaceId: context.workspace._id, state: 'pending' };
      const records = await TaskReopenRequest.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const result = paged(records, page.limit, value => value), items = [];
      for (const value of result.items) {
        const task = await Task.collection.findOne({ _id: value.taskId, projectId: context.project._id, workspaceId: context.workspace._id, deletedAt: null }, { session: context.tx });
        items.push({ ...await response(value, context), task: { id: String(task._id), title: task.title, code: task.code ?? null, version: task.version } });
      }
      return { items, nextCursor: result.nextCursor, total: await TaskReopenRequest.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    reviewReopen: (claims, taskId, requestId, input) => run(claims, async context => {
      context = await taskScope(context, taskId, true);
      if (!manager(context)) deny('PROJECT_MANAGEMENT_REQUIRED', 403);
      let request = await TaskReopenRequest.collection.findOne({ _id: id(requestId), taskId: context.task._id, projectId: context.project._id, workspaceId: context.workspace._id }, { session: context.tx });
      if (!request) deny('RESOURCE_UNAVAILABLE', 404);
      if (sameId(request.requesterId, context.user._id)) deny('REOPEN_SELF_REVIEW_FORBIDDEN', 403);
      checkVersion(request, input.expectedVersion); checkVersion(context.task, input.expectedTaskVersion);
      if (request.state !== 'pending') deny('REOPEN_REQUEST_RESOLVED');
      await reconcileReopenRequests({ _id: request._id }, now(), context.tx);
      request = await TaskReopenRequest.collection.findOne({ _id: request._id }, { session: context.tx });
      if (request.state !== 'pending') return { code: 'REOPEN_REQUEST_CANCELLED', request: await response(request, context) };
      const value = await TaskReopenRequest.collection.findOneAndUpdate({ _id: request._id, state: 'pending', version: request.version },
        { $set: { state: input.decision === 'approve' ? 'approved' : 'rejected', resolvedAt: now(), resolvedBy: context.user._id, resolutionReason: input.reason, updatedAt: now() }, $inc: { version: 1 } }, { session: context.tx, returnDocument: 'after' });
      if (!value) deny('VERSION_CONFLICT');
      const task = input.decision === 'approve' ? await applyReopen(context, request.targetStatus, input.reason, request._id) : context.task;
      return { request: await response(value, context), task: await taskResponse(task, context) };
    }),
  };
}
