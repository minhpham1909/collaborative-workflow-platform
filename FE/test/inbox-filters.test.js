import test from 'node:test';
import assert from 'node:assert/strict';
import {inboxFilters,inboxReturn} from '../src/features/notifications/inbox-filters.js';
import {readRoute} from '../src/app/routes.js';
test('Inbox deep returns retain filters and reject unrelated destinations',()=>{const target='#notifications?read=unread&category=work&q='+encodeURIComponent('Thiết kế?')+'&from=2026-10-01';const detail='#notification/'+'a'.repeat(24)+'?returnTo='+encodeURIComponent(target);assert.equal(readRoute(detail).kind,'notification');assert.deepEqual(inboxFilters(inboxReturn(detail)),inboxFilters(target));assert.equal(inboxReturn('#notification/id?returnTo=https://evil.example'),'#notifications');assert.equal(inboxFilters('#notifications?read=bad&category=bad').read,'all');});
