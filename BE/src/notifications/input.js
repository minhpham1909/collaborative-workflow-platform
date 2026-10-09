import { createHmac } from "node:crypto";
import { inputObject } from "../auth/account-input.js";
import { secureEqual } from "../auth/tokens.js";
import { pageInput, objectId, fail } from "../workspaces/input.js";
import { searchPatterns, vietnamDay } from "../work/input.js";

export function inboxQuery(query) {
  inputObject(query, [
    "limit",
    "cursor",
    "read",
    "category",
    "q",
    "from",
    "to",
  ]);
  const read = query.read ?? "all";
  const category = query.category ?? "all";
  if (
    !["all", "unread", "read"].includes(read) ||
    !["all", "work", "invitation", "membership", "organization_invitation", "project_invitation"].includes(category)
  )
    fail();
  const from = query.from === undefined ? null : vietnamDay(query.from),
    to = query.to === undefined ? null : vietnamDay(query.to);
  if (from && to && from > to) fail();
  const patterns = searchPatterns(query.q);
  return {
    ...pageInput({ limit: query.limit, cursor: query.cursor }),
    read,
    category,
    patterns,
    from,
    to: to && new Date(to.getTime() + 86400000),
    filters: {
      q: query.q ?? "",
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    },
  };
}
export function cutoffCodec(keyHex) {
  if (!/^[a-f0-9]{64}$/u.test(keyHex ?? ""))
    throw new Error("Invalid cutoff key");
  const signature = (encoded) =>
    createHmac("sha256", Buffer.from(keyHex, "hex"))
      .update(`notification-cutoff-v2:${encoded}`)
      .digest("hex");
  return {
    seal: (sub, record, category, filters = { q: "" }) => {
      if (!record) return null;
      const encoded = Buffer.from(
        JSON.stringify({
          sub,
          at: record.createdAt.toISOString(),
          id: String(record._id),
          category,
          filters,
        }),
      ).toString("base64url");
      return `${encoded}.${signature(encoded)}`;
    },
    open: (sub, input) => {
      inputObject(input, ["cutoff"]);
      if (typeof input.cutoff !== "string" || input.cutoff.length > 2048)
        fail();
      const [encoded, mac, extra] = input.cutoff.split(".");
      if (
        extra !== undefined ||
        !encoded ||
        !secureEqual(mac, signature(encoded))
      )
        fail();
      try {
        const value = JSON.parse(
          Buffer.from(encoded, "base64url").toString("utf8"),
        );
        inputObject(value, ["sub", "at", "id", "category", "filters"]);
        objectId(value.id);
        inputObject(value.filters, ["q", "from", "to"]);
        inboxQuery({ ...value.filters, category: value.category });
        if (
          value.sub !== sub ||
          !["all", "work", "invitation", "membership", "organization_invitation", "project_invitation"].includes(value.category) ||
          new Date(value.at).toISOString() !== value.at
        )
          fail();
        return { ...value, at: new Date(value.at) };
      } catch {
        fail();
      }
    },
  };
}
