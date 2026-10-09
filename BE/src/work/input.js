import { inputObject } from '../auth/account-input.js';
import { objectId, expectedVersion, pageInput, fail } from '../workspaces/input.js';
import { normalizeRichText, CONTENT_LIMITS } from '../content/rich-text.js';
import { reasonInput } from '../moderation/input.js';

export const statuses = ['todo', 'in_progress', 'done'];
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(value)) fail();
  return value.trim();
}
function rich(value, scope, required = false) {
  try { return normalizeRichText(value, { maxCharacters: CONTENT_LIMITS[scope], required }); } catch { fail(); }
}
export function projectInput(input, edit = false) {
  inputObject(input, edit ? ['expectedVersion', 'name', 'description', 'icon'] : ['name', 'description', 'icon']);
  const fields = {};
  if (!edit || Object.hasOwn(input, 'name')) fields.name = text(input.name, 200);
  if (Object.hasOwn(input, 'icon')) {
    if (!['folder', 'palette', 'code', 'megaphone', 'layers', 'document'].includes(input.icon)) fail();
    fields.icon = input.icon;
  }
  if (Object.hasOwn(input, 'description')) fields.description = rich(input.description, 'project');
  if (edit && !Object.keys(fields).length) fail();
  return { fields, ...(edit ? { expectedVersion: expectedVersion(input) } : {}) };
}
export function stateInput(input) {
  inputObject(input, ['expectedVersion', 'state']);
  if (!['active', 'archived'].includes(input.state)) fail();
  return { state: input.state, expectedVersion: expectedVersion(input) };
}
export function taskInput(input, edit = false) {
  inputObject(input, ['title', 'description', 'assigneeId', 'dueAt', 'priority', 'labelIds', ...(edit ? ['expectedVersion'] : [])]);
  const fields = {};
  if (!edit || Object.hasOwn(input, 'title')) fields.title = text(input.title, 300);
  if (Object.hasOwn(input, 'description')) fields.description = rich(input.description, 'task');
  if (Object.hasOwn(input, 'priority')) {
    if (!['low', 'medium', 'high'].includes(input.priority)) fail();
    fields.priority = input.priority;
  }
  if (Object.hasOwn(input, 'labelIds')) {
    if (!Array.isArray(input.labelIds) || input.labelIds.length > 20 || new Set(input.labelIds).size !== input.labelIds.length) fail();
    fields.labelIds = input.labelIds.map(objectId);
  }
  if (Object.hasOwn(input, 'assigneeId')) fields.assigneeId = input.assigneeId === null ? null : objectId(input.assigneeId);
  if (Object.hasOwn(input, 'dueAt')) {
    if (input.dueAt === null) fields.dueAt = null;
    else {
      if (typeof input.dueAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/u.test(input.dueAt)) fail();
      const date = new Date(input.dueAt);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== input.dueAt) fail();
      fields.dueAt = date;
    }
  }
  if (edit && !Object.keys(fields).length) fail();
  return { fields, ...(edit ? { expectedVersion: expectedVersion(input) } : {}) };
}
export function statusInput(input) {
  inputObject(input, ['expectedVersion', 'status', 'confirmIncompleteChecklist', 'reason']);
  if (!statuses.includes(input.status)) fail();
  if (input.confirmIncompleteChecklist !== undefined && typeof input.confirmIncompleteChecklist !== 'boolean') fail();
  return { status: input.status, expectedVersion: expectedVersion(input), confirmIncompleteChecklist: input.confirmIncompleteChecklist === true, ...(input.reason === undefined ? {} : { reason: reasonInput(input.reason) }) };
}
export function reopenInput(input) {
  inputObject(input, ['expectedVersion', 'reason', 'targetStatus']);
  if (!['todo', 'in_progress'].includes(input.targetStatus)) fail();
  return { expectedVersion: expectedVersion(input), reason: reasonInput(input.reason), targetStatus: input.targetStatus };
}
export function reopenReviewInput(input) {
  inputObject(input, ['expectedVersion', 'expectedTaskVersion', 'decision', 'reason']);
  if (!['approve', 'reject'].includes(input.decision) || !Number.isSafeInteger(input.expectedTaskVersion) || input.expectedTaskVersion < 0) fail();
  return { expectedVersion: expectedVersion(input), expectedTaskVersion: input.expectedTaskVersion, decision: input.decision, reason: reasonInput(input.reason) };
}
export function statisticsInput(query) {
  inputObject(query, ['from', 'to']);
  const from = query.from === undefined ? null : vietnamDay(query.from);
  const to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  return { from, to: to && new Date(to.getTime() + 86400_000) };
}
export function labelInput(input, edit = false) {
  inputObject(input, ['name', 'color', ...(edit ? ['expectedVersion', 'archived'] : [])]);
  const fields = {};
  if (!edit || Object.hasOwn(input, 'name')) { fields.name = text(input.name, 60); fields.nameKey = fields.name.normalize('NFC').toLowerCase(); }
  if (Object.hasOwn(input, 'color')) { if (!['lavender', 'coral', 'mint', 'blue', 'amber', 'gray'].includes(input.color)) fail(); fields.color = input.color; }
  if (Object.hasOwn(input, 'archived')) { if (typeof input.archived !== 'boolean') fail(); fields.archived = input.archived; }
  if (edit && !Object.keys(fields).length) fail();
  return { fields, ...(edit ? { expectedVersion: expectedVersion(input) } : {}) };
}
export function checklistInput(input) {
  inputObject(input, ['expectedVersion', 'items']);
  if (!Array.isArray(input.items) || input.items.length > 100) fail();
  const items = input.items.map(item => {
    inputObject(item, ['id', 'text']);
    if (item.id !== undefined && (typeof item.id !== 'string' || !/^[a-f0-9-]{36}$/u.test(item.id))) fail();
    return { ...(item.id ? { id: item.id } : {}), text: text(item.text, 300) };
  });
  if (new Set(items.filter(item => item.id).map(item => item.id)).size !== items.filter(item => item.id).length) fail();
  return { items, expectedVersion: expectedVersion(input) };
}
export function checklistTickInput(input) {
  inputObject(input, ['expectedVersion', 'checked']);
  if (typeof input.checked !== 'boolean') fail();
  return { checked: input.checked, expectedVersion: expectedVersion(input) };
}
export function leadInput(input) {
  inputObject(input, ['leadId', 'expectedVersion']);
  if (!Object.hasOwn(input, 'leadId')) fail();
  return { leadId: input.leadId === null ? null : objectId(input.leadId), expectedVersion: expectedVersion(input) };
}
export function commentInput(input, edit = false) {
  inputObject(input, ['content', ...(edit ? ['expectedVersion'] : [])]);
  return { fields: { content: rich(input.content, 'comment', true) }, ...(edit ? { expectedVersion: expectedVersion(input) } : {}) };
}
export function commentDeleteInput(input) {
  inputObject(input, ['expectedVersion', 'reason']);
  return { expectedVersion: expectedVersion(input), ...(input.reason === undefined ? {} : { reason: reasonInput(input.reason) }) };
}
export function lifecyclePage(query, defaultState = 'active') {
  inputObject(query, ['limit', 'cursor', 'state']);
  const state = query.state ?? defaultState;
  if (!['active', 'archived', 'all'].includes(state)) fail();
  return { ...pageInput({ limit: query.limit, cursor: query.cursor }), state };
}
const fold = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/gu, 'd').toLowerCase();
const variants = ['aàáảãạăằắẳẵặâầấẩẫậ', 'eèéẻẽẹêềếểễệ', 'iìíỉĩị', 'oòóỏõọôồốổỗộơờớởỡợ', 'uùúủũụưừứửữự', 'yỳýỷỹỵ', 'dđ'];
export function searchPatterns(value = '') {
  if (typeof value !== 'string' || value.length > 200) fail();
  const words = [...new Set(fold(value).trim().split(/\s+/u).filter(Boolean))];
  if (words.length > 20) fail();
  return words.map((word) => [...word].map((letter) => {
    const group = variants.find((item) => item[0] === letter);
    return group ? `[${group}]` : letter.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }).join(''));
}
export function vietnamDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/u.test(value)) fail();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail();
  return new Date(date.getTime() - 7 * 3600_000);
}
export function taskQuery(query, mine = false) {
  inputObject(query, ['limit', 'cursor', 'status', 'q', 'timeField', 'from', 'to', 'overdue', 'priority', 'labelId', ...(mine ? ['state', 'workspaceId', 'projectId'] : [])]);
  if (query.priority !== undefined && !['low', 'medium', 'high'].includes(query.priority)) fail();
  const status = query.status ?? (mine ? 'open' : 'all');
  if (![...statuses, 'all', 'open'].includes(status)) fail();
  const state = query.state ?? 'active';
  if (!['active', 'archived', 'all'].includes(state)) fail();
  if (query.overdue !== undefined && !['true', 'false'].includes(query.overdue)) fail();
  const timeField = query.timeField ?? 'createdAt';
  if (!['createdAt', 'dueAt'].includes(timeField)) fail();
  const from = query.from === undefined ? null : vietnamDay(query.from);
  const to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  return { ...pageInput({ limit: query.limit, cursor: query.cursor }), status, state, patterns: searchPatterns(query.q), timeField, from, to: to && new Date(to.getTime() + 86400_000), overdue: query.overdue, priority: query.priority, labelId: query.labelId === undefined ? null : objectId(query.labelId), workspaceId: query.workspaceId === undefined ? null : objectId(query.workspaceId), projectId: mine && query.projectId !== undefined ? objectId(query.projectId) : null };
}
