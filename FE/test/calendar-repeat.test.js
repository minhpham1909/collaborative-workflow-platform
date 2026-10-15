import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarFilterChange,calendarFilters} from '../src/features/tasks/calendar-state.js';
test('Repeated Today/day/filter selections are true no-ops',()=>{
 const current=calendarFilters('#calendar?month=2026-10&day=2026-10-15');
 assert.equal(calendarFilterChange(current,{month:'2026-10',day:'2026-10-15'}),null);
 assert.equal(calendarFilterChange(current,{status:'open',q:''}),null);
 assert.equal(calendarFilterChange(current,{day:'2026-10-16'}).day,'2026-10-16');
});
