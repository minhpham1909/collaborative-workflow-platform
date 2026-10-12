import { inputObject } from '../auth/account-input.js';
import { fail } from '../workspaces/input.js';
export function homePriorityQuery(query) {
  inputObject(query, ['limit']);
  if (query.limit !== undefined && (typeof query.limit !== 'string' || !/^[1-5]$/u.test(query.limit))) fail();
  return { limit: query.limit === undefined ? 3 : Number(query.limit) };
}
