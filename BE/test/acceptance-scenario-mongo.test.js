import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {randomBytes} from 'node:crypto';
import {models,User,Session,Workspace,Task,Notification,TaskComment} from '../src/models/index.js';
import {connectDatabase} from '../src/database.js';
import {testConfig} from '../test-support/auth-store.js';
import {buildAcceptanceScenario} from '../scripts/acceptance-scenario.mjs';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';

test('Product acceptance scenario exercises native roles and populated screen states',{skip:!process.env.TEST_MONGODB_URI,timeout:90000},async()=>{
 await connectDatabase(process.env.TEST_MONGODB_URI);
 const actors={},prefix=randomBytes(6).toString('hex');
 try{
  for(const model of Object.values(models))await model.createIndexes();
  for(const role of ['owner','manager','member','guest']){
   const user=await User.create({displayName:'QA '+role,email:`${prefix}-${role}@example.invalid`,emailVerifiedAt:new Date(),termsAcceptance:{version:'qa-fixture',acceptedAt:new Date()}});
   const session=await Session.create({userId:user._id,authVersionAtIssue:user.authVersion,refreshTokenHash:randomBytes(32).toString('hex'),lastSeenAt:new Date(),expiresAt:new Date(Date.now()+3600000)});
   actors[role]={claims:{sub:user.id,sid:session.id,av:user.authVersion}};
  }
  const config=testConfig(),scenario=await buildAcceptanceScenario({config,actors});
  const ws=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
  assert.equal(scenario.workspaces.length,3);assert.equal(scenario.projects.length,4);assert.equal(scenario.tasks.length,18);
  assert.equal((await ws.get(actors.manager,scenario.mainWorkspaceId)).workspace.role,'manager');
  assert.equal((await ws.get(actors.member,scenario.mainWorkspaceId)).workspace.role,'member');
  await assert.rejects(ws.get(actors.guest,scenario.mainWorkspaceId));
  const project=(await work.getProject(actors.guest,scenario.boardProjectId)).project;
  assert.equal(project.permissions.createTask,false);
  await assert.rejects(work.createTask(actors.guest,scenario.boardProjectId,{title:'Forbidden'}));
  assert.equal((await work.trash(actors.owner,scenario.boardProjectId,{})).total,1);
  assert.equal((await ws.get(actors.owner,scenario.archivedWorkspaceId)).workspace.readOnly,true);
  assert.equal(await TaskComment.countDocuments({taskId:scenario.commentTaskId}),2);
  assert.ok(await Notification.countDocuments({recipientId:actors.owner.claims.sub})>0);
  assert.equal(await Workspace.collection.countDocuments({organizationId:{$ne:null}}),0);
  assert.equal(await Task.countDocuments({_id:{$in:scenario.tasks},completedAt:{$type:'date'}})>0,true);
 }finally{await mongoose.disconnect();}
});
