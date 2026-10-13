import { inputObject } from "../auth/account-input.js";
import { pageInput, fail, objectId } from "./input.js";
import { searchPatterns, vietnamDay } from "../work/input.js";
import { WORKSPACE_AUDIT_ACTIONS, WORKSPACE_AUDIT_SOURCES } from './audit-policy.js';
export function auditQuery(query) {
  inputObject(query, ['limit', 'cursor', 'q', 'from', 'to', 'action']);
  const { action = 'all', cursor, ...rest } = query;
  if (action !== 'all' && !WORKSPACE_AUDIT_ACTIONS.includes(action)) fail();
  let position = null;
  if (cursor !== undefined) {
    try {
      if (typeof cursor !== 'string' || cursor.length > 256 || !/^[A-Za-z0-9_-]+$/u.test(cursor)) fail();
      position = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      inputObject(position, ['at', 'id', 'source']); objectId(position.id);
      if (!WORKSPACE_AUDIT_SOURCES.includes(position.source) || typeof position.at !== 'string' || new Date(position.at).toISOString() !== position.at) fail();
    } catch { fail(); }
  }
  return { ...teamQuery(rest, false, 'createdAt'), action, position };
}
export function workspaceQuery(query) {
  inputObject(query, ["limit", "cursor", "q", "from", "to", "state", "role"]);
  const state = query.state ?? 'all', role = query.role ?? 'all';
  if (!['all', 'active', 'archived'].includes(state) || !['all', 'managed', 'member'].includes(role)) fail();
  const patterns = searchPatterns(query.q ?? ""),
    from = query.from === undefined ? null : vietnamDay(query.from),
    to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  const conditions = patterns.map((pattern) => ({
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { "description.plainText": { $regex: pattern, $options: "i" } },
      { summary: { $regex: pattern, $options: "i" } },
    ],
  }));
  if (from || to)
    conditions.push({
      createdAt: {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lt: new Date(to.getTime() + 86400000) } : {}),
      },
    });
  return {
    ...pageInput({ limit: query.limit, cursor: query.cursor }),
    state, role,
    filters: conditions,
  };
}

export function teamQuery(query, invitations = false, dateField = null) {
  inputObject(query, ["limit", "cursor", "q", "from", "to", ...(invitations ? ["type", "state"] : [])]);
  const patterns = searchPatterns(query.q ?? "");
  const from = query.from === undefined ? null : vietnamDay(query.from);
  const to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  if (invitations && ((query.type !== undefined && !['all', 'EMAIL', 'LINK'].includes(query.type)) || (query.state !== undefined && !['all', 'active', 'expired', 'accepted', 'revoked'].includes(query.state)))) fail();
  const field = dateField ?? (invitations ? 'createdAt' : 'joinedAt');
  return { ...pageInput({ limit: query.limit, cursor: query.cursor }, field), patterns, filters: from || to ? [{ [field]: { ...(from ? { $gte: from } : {}), ...(to ? { $lt: new Date(to.getTime() + 86400000) } : {}) } }] : [], type: query.type ?? 'all', state: query.state ?? 'all' };
}
