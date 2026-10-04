import { inputObject } from "../auth/account-input.js";
import { pageInput, fail } from "./input.js";
import { searchPatterns, vietnamDay } from "../work/input.js";
export function workspaceQuery(query) {
  inputObject(query, ["limit", "cursor", "q", "from", "to"]);
  const patterns = searchPatterns(query.q ?? ""),
    from = query.from === undefined ? null : vietnamDay(query.from),
    to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  const conditions = patterns.map((pattern) => ({
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { "description.plainText": { $regex: pattern, $options: "i" } },
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
    filters: conditions,
  };
}

export function teamQuery(query, invitations = false) {
  inputObject(query, ["limit", "cursor", "q", "from", "to", ...(invitations ? ["type", "state"] : [])]);
  const patterns = searchPatterns(query.q ?? "");
  const from = query.from === undefined ? null : vietnamDay(query.from);
  const to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  if (invitations && ((query.type !== undefined && !['all', 'EMAIL', 'LINK'].includes(query.type)) || (query.state !== undefined && !['all', 'active', 'expired', 'accepted', 'revoked'].includes(query.state)))) fail();
  const field = invitations ? 'createdAt' : 'joinedAt';
  return { ...pageInput({ limit: query.limit, cursor: query.cursor }, field), patterns, filters: from || to ? [{ [field]: { ...(from ? { $gte: from } : {}), ...(to ? { $lt: new Date(to.getTime() + 86400000) } : {}) } }] : [], type: query.type ?? 'all', state: query.state ?? 'all' };
}
