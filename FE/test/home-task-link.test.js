import test from 'node:test';
import assert from 'node:assert/strict';
import { homeTaskLink } from '../src/lib/home-task-link.js';
import { readMyTaskFilters } from '../src/features/tasks/my-task-filters.js';
test('Home links preserve exact Today/Overdue/attention scopes without merging deadline groups', () => {
  const params = kind => new URLSearchParams(homeTaskLink(kind, '2026-10-12').split('?')[1]);
  assert.equal(params('today').get('from'), '2026-10-12'); assert.equal(params('today').get('to'), '2026-10-12');
  assert.equal(params('overdue').get('overdue'), 'true'); assert.equal(params('overdue').has('to'), false);
  assert.equal(params('attention').get('to'), '2026-10-12'); assert.equal(params('attention').has('from'), false);
  for (const kind of ['today', 'overdue', 'attention']) {
    assert.equal(params(kind).get('status'), 'open'); assert.equal(params(kind).get('state'), 'active'); assert.equal(params(kind).get('timeField'), 'dueAt');
  }
  assert.equal(readMyTaskFilters(homeTaskLink('today', '2026-10-12')).from, '2026-10-12');
  assert.equal(readMyTaskFilters(homeTaskLink('overdue', '2026-10-12')).overdue, true);
});
