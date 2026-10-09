import { inputObject } from '../auth/account-input.js';
import { objectId, expectedVersion, fail } from '../workspaces/input.js';

export const cleanupChoices = ['none', '1', '3', '7', '30', 'all'];
export function scopeType(value) { if (!['organization', 'workspace', 'project'].includes(value)) fail(); return value; }
export function reasonInput(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000 || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(value)) fail();
  return value.trim();
}
export function previewInput(input) {
  inputObject(input, ['userId', 'cleanup']);
  const cleanup = input.cleanup ?? 'none'; if (!cleanupChoices.includes(cleanup)) fail();
  return { userId: objectId(input.userId), cleanup };
}
export function banInput(input) {
  inputObject(input, ['userId', 'cleanup', 'reason', 'expectedVersion', 'preview']);
  const cleanup = input.cleanup ?? 'none'; if (!cleanupChoices.includes(cleanup)) fail();
  if (cleanup !== 'none' && (typeof input.preview !== 'string' || input.preview.length > 4096)) fail();
  if (cleanup === 'none' && input.preview !== undefined) fail();
  return { userId: objectId(input.userId), cleanup, reason: reasonInput(input.reason), expectedVersion: expectedVersion(input), preview: input.preview };
}
export function unbanInput(input) {
  inputObject(input, ['reason', 'expectedVersion']);
  return { reason: reasonInput(input.reason), expectedVersion: expectedVersion(input) };
}
