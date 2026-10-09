import { coreSchema, ref, choice, singleLine, nullableDate } from './shared.js';

export const taskReopenRequestSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true },
  taskId: { ...ref('Task'), immutable: true }, requesterId: { ...ref('User'), immutable: true },
  reason: singleLine(2000), targetStatus: choice(['todo', 'in_progress']),
  state: choice(['pending', 'approved', 'rejected', 'cancelled'], 'pending'),
  resolvedAt: nullableDate(), resolvedBy: ref('User', true),
  resolutionReason: { type: String, default: null, maxlength: 2000 },
});
taskReopenRequestSchema.pre('validate', function() {
  if (this.state === 'pending' && (this.resolvedAt || this.resolvedBy || this.resolutionReason)) this.invalidate('state', 'Pending has no resolution');
  if (this.state !== 'pending' && (!this.resolvedAt || !this.resolutionReason)) this.invalidate('state', 'Resolved requires time and reason');
  if (['approved', 'rejected'].includes(this.state) && (!this.resolvedBy || String(this.resolvedBy) === String(this.requesterId))) this.invalidate('resolvedBy', 'Independent reviewer required');
});
