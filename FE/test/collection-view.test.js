import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readView,writeView,viewKey} from '../src/lib/collection-view.js';
import {rememberInboxPosition,takeInboxPosition} from '../src/features/notifications/inbox-position.js';
test('view preference separates accounts and scopes, rejects unknown modes and tolerates blocked storage',()=>{
 const values=new Map(),storage=()=>({getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}),allowed=['detailed','compact'];
 assert.equal(writeView('one','notifications',allowed,'compact',storage),true);
 assert.equal(readView('one','notifications',allowed,'detailed',storage),'compact');
 assert.equal(readView('two','notifications',allowed,'detailed',storage),'detailed');
 assert.equal(readView('one','tasks',allowed,'detailed',storage),'detailed');
 assert.equal(writeView('one','notifications',allowed,'forged',storage),false);
 values.set(viewKey('one','notifications'),'invalid');assert.equal(readView('one','notifications',allowed,'detailed',storage),'detailed');
 const blocked=()=>{throw Error('blocked')};assert.equal(readView('one','notifications',allowed,'detailed',blocked),'detailed');assert.equal(writeView('one','notifications',allowed,'compact',blocked),false);
});
test('Inbox return anchor is account/query-scoped, consumed once and bounds fresh page reloads',()=>{
 rememberInboxPosition('one','read=unread','a'.repeat(24),120,900,5000);
 assert.equal(takeInboxPosition('two','read=unread'),null);assert.equal(takeInboxPosition('one','read=all'),null);
 assert.deepEqual(takeInboxPosition('one','read=unread'),{query:'read=unread',anchorId:'a'.repeat(24),offset:120,scrollY:900,pages:20});
 assert.equal(takeInboxPosition('one','read=unread'),null);
});
