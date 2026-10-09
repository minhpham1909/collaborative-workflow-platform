import { coreSchema, ref, choice, singleLine, nullableDate, integer } from './shared.js';

export const workspaceLifecycleAuditSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, actorId: ref('User'),
  previousState: choice(['active', 'archived']), state: choice(['active', 'archived']),
  reason: singleLine(2000), resourceVersion: integer(),
}, { editable: false, updated: false });

export const taskPurgeAuditSchema = coreSchema({
  workspaceId: ref('Workspace'), projectId: ref('Project'), taskId: ref('Task'),
  actorId: ref('User', true), code: { type: String, default: null },
  deletedAt: { type: Date, required: true }, purgedAt: { type: Date, required: true },
  mode: choice(['retention', 'manual'], 'retention'),
}, { editable: false, updated: false });
