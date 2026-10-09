export function deadlineBounds(now) {
  const vietnamDate = new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const start = new Date(new Date(`${vietnamDate}T00:00:00.000Z`).getTime() - 7 * 3600_000);
  return { start, end: new Date(start.getTime() + 86400_000) };
}
export function deadlineGroup(task, now) {
  if (task.status === 'done') return 'completed';
  if (!task.dueAt) return 'no_deadline';
  if (task.dueAt < now) return 'overdue';
  if (task.dueAt < deadlineBounds(now).end) return 'today';
  return 'upcoming';
}
export function deadlineGroupExpression(now) {
  return { $switch: { branches: [
    { case: { $eq: ['$status', 'done'] }, then: 'completed' },
    { case: { $eq: [{ $ifNull: ['$dueAt', null] }, null] }, then: 'no_deadline' },
    { case: { $lt: ['$dueAt', now] }, then: 'overdue' },
    { case: { $lt: ['$dueAt', deadlineBounds(now).end] }, then: 'today' },
  ], default: 'upcoming' } };
}
