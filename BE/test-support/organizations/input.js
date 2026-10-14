import { inputObject, emailInput } from '../../src/auth/account-input.js';
import { pageInput } from '../../src/workspaces/input.js';
import { searchPatterns, vietnamDay } from '../../src/work/input.js';

export function organizationQuery(query) {
  inputObject(query, ['limit', 'cursor', 'q', 'from', 'to', 'role']);
  const role = query.role ?? 'all';
  if (!['all', 'owner', 'admin', 'member'].includes(role)) fail();
  const from = query.from === undefined ? null : vietnamDay(query.from), to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  const filters = searchPatterns(query.q).map(pattern => ({ name: { $regex: pattern, $options: 'i' } }));
  if (from || to) filters.push({ createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lt: new Date(to.getTime() + 86400_000) } : {}) } });
  return { ...pageInput({ limit: query.limit, cursor: query.cursor }), filters, role };
}
import { objectId, expectedVersion, fail } from '../../src/workspaces/input.js';

export function roleInput(input) {
  inputObject(input, ['role', 'expectedVersion']);
  if (!['admin', 'member'].includes(input.role)) fail();
  return { role: input.role, expectedVersion: expectedVersion(input) };
}
export function managerInput(input) {
  inputObject(input, ['managerId', 'expectedVersion']);
  return { managerId: objectId(input.managerId), expectedVersion: expectedVersion(input) };
}
export function memberInput(input) {
  inputObject(input, ['userId', 'expectedVersion']);
  return { userId: objectId(input.userId), expectedVersion: expectedVersion(input) };
}
export function organizationInvitationInput(input) {
  inputObject(input, ['email', 'workspaceId']);
  return { email: emailInput(input.email), workspaceId: input.workspaceId == null ? null : objectId(input.workspaceId) };
}
