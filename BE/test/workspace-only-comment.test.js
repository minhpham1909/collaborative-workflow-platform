import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commentDeleteInput} from '../src/work/input.js';
import {commentPermissions} from '../src/work/comment-permissions.js';
test('Current comment deletion accepts only CAS; permissions are author-only and archive-aware',()=>{
 assert.deepEqual(commentDeleteInput({expectedVersion:0}),{expectedVersion:0});
 for(const extra of [{reason:'Moderator override'},{moderate:true},{authorId:'forged'}])assert.throws(()=>commentDeleteInput({expectedVersion:0,...extra}));
 for(const role of ['owner','manager','member','guest'])for(const workspaceState of ['active','archived'])for(const projectState of ['active','archived'])for(const own of [true,false]){
  const writable=workspaceState==='active'&&projectState==='active';
  const permissions=commentPermissions({authorId:'author'},{user:{_id:own?'author':'someone'},workspace:{state:workspaceState},project:{state:projectState},access:{role,canManage:['owner','manager'].includes(role)}});
  assert.deepEqual(permissions,{edit:own&&writable,delete:own&&writable});
 }
});
