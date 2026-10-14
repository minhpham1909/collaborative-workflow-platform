import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {connectDatabase} from '../src/database.js';
import {models,User,Session,WorkspaceMembership,Workspace,TaskReopenRequest,Project,TaskActivity} from '../src/models/index.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
import {testConfig} from '../test-support/auth-store.js';
// No historical fixture registration: this exercises the current application policy.
test('Workspace-only reopen works without Project Lead and rechecks current management', {skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');await connectDatabase(process.env.TEST_MONGODB_URI);
 const users=[],auths=[],wsIds=[],config=testConfig(),O=value=>new mongoose.Types.ObjectId(value);
 const ws=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
 try{
  for(const model of Object.values(models))await model.createIndexes();
  for(let i=0;i<4;i++){
   const user=await User.create({displayName:'Reopen actor '+i,email:`reopen-current-${new mongoose.Types.ObjectId()}@test.invalid`,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);
   const session=await Session.create({userId:user._id,refreshTokenHash:String(i).repeat(64),authVersionAtIssue:0,expiresAt:new Date(Date.now()+300000),lastSeenAt:new Date()});auths.push({claims:{sub:String(user._id),sid:String(session._id),av:0}});
  }
  const workspace=(await ws.create(auths[0],{name:'Current reopen Workspace'})).workspace;wsIds.push(O(workspace.id));
  for(const i of [1,2])await WorkspaceMembership.create({workspaceId:workspace.id,userId:users[i]._id,role:i===1?'manager':'member',joinedAt:new Date()});
  const project=(await work.createProject(auths[0],workspace.id,{name:'No Lead Project'})).project;
  assert.equal(Object.hasOwn(await Project.collection.findOne({_id:O(project.id)}),'leadId'),false);
  const invite=await work.inviteGuest(auths[0],project.id,{type:'LINK'});await work.acceptGuestInvitation(auths[3],{token:new URLSearchParams(new URL(invite.url).hash.slice(1)).get('token')});
  const doneTask=async(author=2)=>{const task=(await work.createTask(auths[author],project.id,{title:'Completed work',assigneeId:String(users[2]._id)})).task;return (await work.status(auths[author],task.id,{expectedVersion:task.version,status:'done'})).task;};
  const request=async(task,actor=2)=>(await work.requestReopen(auths[actor],task.id,{expectedVersion:task.version,targetStatus:'todo',reason:'Please check again'})).request;
  const review=(task,req,actor=1,expectedVersion=req.version)=>work.reviewReopen(auths[actor],task.id,req.id,{expectedVersion,expectedTaskVersion:task.version,decision:'approve',reason:'Approved after review'});
  let task=await doneTask();
  await assert.rejects(work.status(auths[2],task.id,{expectedVersion:task.version,status:'todo',reason:'Direct Member reopen'}),/REOPEN_APPROVAL_REQUIRED/u);
  await assert.rejects(work.requestReopen(auths[3],task.id,{expectedVersion:task.version,targetStatus:'todo',reason:'Guest request'}),/REOPEN_REQUEST_FORBIDDEN/u);
  for(const manager of [0,1]){
   await assert.rejects(work.status(auths[manager],task.id,{expectedVersion:task.version,status:'todo'}),/REOPEN_REASON_REQUIRED/u);
   const opened=(await work.status(auths[manager],task.id,{expectedVersion:task.version,status:'todo',reason:'Direct management reopen'})).task;
   assert.equal(opened.completedAt,null);assert.equal(opened.status,'todo');task=(await work.status(auths[manager],task.id,{expectedVersion:opened.version,status:'done'})).task;
  }
  let req=await request(task);
  await assert.rejects(work.status(auths[0],task.id,{expectedVersion:task.version,status:'todo',reason:'Bypass pending'}),/REOPEN_REQUEST_PENDING/u);
  await assert.rejects(review(task,req,2),/PROJECT_MANAGEMENT_REQUIRED/u);
  await assert.rejects(review(task,req,3),/PROJECT_MANAGEMENT_REQUIRED/u);
  await assert.rejects(review(task,req,1,99),/VERSION_CONFLICT/u);
  await ws.role(auths[0],workspace.id,String(users[1]._id),{expectedVersion:0,role:'member',reason:'Demoted during review'});
  await assert.rejects(review(task,req,1),/PROJECT_MANAGEMENT_REQUIRED/u);
  await assert.rejects(work.projectReopenRequests(auths[1],project.id,{}),/PROJECT_MANAGEMENT_REQUIRED/u);
  await ws.role(auths[0],workspace.id,String(users[1]._id),{expectedVersion:1,role:'manager',reason:'Reappointed by Owner'});
  const approved=await review(task,req);assert.equal(approved.request.state,'approved');assert.equal(approved.task.status,'todo');assert.equal(approved.task.completedAt,null);
  assert.ok(await TaskActivity.collection.countDocuments({taskId:O(task.id),action:'status_changed'})>=4);
  task=await doneTask(1);req=await request(task,1);
  await assert.rejects(review(task,req,1),/REOPEN_SELF_REVIEW_FORBIDDEN/u);
  await assert.rejects(work.status(auths[1],task.id,{expectedVersion:task.version,status:'todo',reason:'Self bypass'}),/REOPEN_SELF_REVIEW_FORBIDDEN/u);
  assert.equal((await review(task,req,0)).request.state,'approved');
  task=await doneTask();req=await request(task);
  await ws.state(auths[0],workspace.id,{expectedVersion:0,state:'archived',confirmName:workspace.name,reason:'Read-only check'});
  await assert.rejects(review(task,req),/WORKSPACE_ARCHIVED/u);
  await ws.state(auths[0],workspace.id,{expectedVersion:1,state:'active',confirmName:workspace.name,reason:'Continue check'});
  task=await doneTask();req=await request(task);
  const version=(await Project.collection.findOne({_id:O(project.id)})).version;
  await ws.leave(auths[2],workspace.id,{expectedVersion:0});
  assert.equal((await TaskReopenRequest.collection.findOne({_id:O(req.id)})).state,'cancelled');
  assert.equal((await Project.collection.findOne({_id:O(project.id)})).version,version);
  await assert.rejects(work.getTask(auths[2],task.id),/RESOURCE_UNAVAILABLE/u);
 }finally{
  for(const [name,model] of Object.entries(models))if(!['User','Session'].includes(name)&&model.schema.path('workspaceId'))await model.collection.deleteMany({workspaceId:{$in:wsIds}});
  await Workspace.collection.deleteMany({_id:{$in:wsIds}});await Session.collection.deleteMany({userId:{$in:users.map(u=>u._id)}});await User.collection.deleteMany({_id:{$in:users.map(u=>u._id)}});await mongoose.disconnect();
 }
});
