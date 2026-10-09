import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute } from '../src/app/routes.js';
import { defaultFilters, readMyTaskFilters, myTaskParams, myTaskReturn } from '../src/features/tasks/my-task-filters.js';
test('My Tasks filters roundtrip across Task/fullpage return and reject foreign return destinations',()=>{
  const values={...defaultFilters,q:'Thiết kế & phản hồi?',workspaceId:'a'.repeat(24),projectId:'b'.repeat(24),labelId:'c'.repeat(24),priority:'high',status:'all',from:'2026-10-01',to:'2026-10-09'};
  const target='#mine?'+myTaskParams(values);assert.deepEqual(readMyTaskFilters(target),values);
  const task='#task/'+'d'.repeat(24)+'?returnTo='+encodeURIComponent(target);
  assert.equal(readRoute(task).kind,'task');assert.equal(readRoute(target).kind,'mine');assert.equal(myTaskReturn(task),target);
  for(const destination of ['https://evil.example','#settings','#mine-extra'])assert.equal(myTaskReturn('#task/id?returnTo='+encodeURIComponent(destination)),null);
  assert.deepEqual(readMyTaskFilters('#mine?status=invalid&projectId='+values.projectId+'&labelId='+values.labelId),defaultFilters);
});
