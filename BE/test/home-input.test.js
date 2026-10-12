import test from 'node:test';
import assert from 'node:assert/strict';
import { homePriorityQuery } from '../src/work/home-input.js';
test('Home priority only accepts a bounded slice, not forged user/query scope or cursor', () => {
  assert.equal(homePriorityQuery({}).limit, 3); assert.equal(homePriorityQuery({ limit: '5' }).limit, 5);
  for (const query of [{ limit: '6' }, { limit: '01' }, { limit: '0' }, { limit: 3 }, { userId: 'forged' }, { cursor: 'old' }, { state: 'all' }]) assert.throws(() => homePriorityQuery(query), /INVALID_INPUT/u);
});
