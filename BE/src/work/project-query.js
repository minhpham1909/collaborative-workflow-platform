import { inputObject } from "../auth/account-input.js";
import { lifecyclePage } from "./input.js";
import { workspaceQuery } from "../workspaces/list-query.js";

export function projectQuery(query) {
  inputObject(query, ["limit", "cursor", "state", "q", "from", "to"]);
  const { state, ...list } = query;
  return { ...workspaceQuery(list), state: lifecyclePage({ state }).state };
}
