import { Task } from '../models/index.js';
import { deadlineBounds } from './deadline-groups.js';
import { TASK_LIST_PROJECTION } from './task-list.js';
import { taskQuery } from './input.js';
const scope = 'my_assigned_active_nontrash';
const query = () => taskQuery({ status: 'open', state: 'active' }, true);
const priorityProjection = { ...TASK_LIST_PROJECTION, 'project.name': 1, 'workspace.name': 1 };
export function createHomeStore({ run, assignedPipeline, taskPage, projectScope, now }) {
  return {
    homeOverview: claims => run(claims, async context => {
      const asOf = now(), { start, end } = deadlineBounds(asOf);
      const day = new Date(start.getTime() + 7 * 3600000).toISOString().slice(0, 10);
      const pipeline = await assignedPipeline(context, query());
      const [result] = await Task.collection.aggregate([...pipeline, { $facet: {
        today: [{ $match: { dueAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: 1 }, workspaces: { $addToSet: '$workspaceId' } } }],
        overdue: [{ $match: { dueAt: { $type: 'date', $lt: asOf } } }, { $count: 'total' }],
        attention: [{ $match: { dueAt: { $type: 'date', $lt: end } } }, { $count: 'total' }],
      } }], { session: context.tx }).toArray();
      return { scope, timeZone: '+07:00', day, asOf,
        dueTodayOpenCount: result.today[0]?.total ?? 0, dueTodayWorkspaceCount: result.today[0]?.workspaces.length ?? 0,
        overdueOpenCount: result.overdue[0]?.total ?? 0, attentionOpenCount: result.attention[0]?.total ?? 0 };
    }),
    homePriority: (claims, page) => run(claims, async context => {
      const asOf = now(), { end } = deadlineBounds(asOf), day = new Date(end.getTime() - 1 + 7 * 3600000).toISOString().slice(0, 10);
      const pipeline = [...await assignedPipeline(context, query()), { $match: { dueAt: { $type: 'date', $lt: end } } }];
      const [count] = await Task.collection.aggregate([...pipeline, { $count: 'total' }], { session: context.tx }).toArray();
      const records = await Task.collection.aggregate([...pipeline, { $set: {
        urgencyRank: { $cond: [{ $lt: ['$dueAt', asOf] }, 0, 1] },
        priorityRank: { $switch: { branches: [{ case: { $eq: ['$priority', 'high'] }, then: 0 }, { case: { $eq: ['$priority', 'low'] }, then: 2 }], default: 1 } },
      } }, { $sort: { urgencyRank: 1, priorityRank: 1, dueAt: 1, createdAt: -1, _id: -1 } }, { $limit: page.limit }, { $project: priorityProjection }], { session: context.tx }).toArray();
      const result = await taskPage(records, page, value => projectScope(context, String(value.projectId)));
      return { items: result.items.map((item, index) => ({ ...item, workspaceName: records[index].workspace.name, projectName: records[index].project.name })),
        totalMatching: count?.total ?? 0, selectionRule: 'overdue_then_today_priority', scope, timeZone: '+07:00', day, asOf };
    }),
  };
}
