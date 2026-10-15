import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {connectDatabase} from '../src/database.js';
import {models,User,Session,Workspace,WorkspaceMembership,Organization,WorkspaceInvitation,ProjectGuestInvitation,Project,Task,EmailOutbox,AccessBan} from '../test-support/organization-models.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
import {testConfig} from '../test-support/auth-store.js';
import {dispatchInvitationMail} from '../src/mail/invitation-mail.js';
import {dispatchWorkMail} from '../src/mail/work-mail.js';
import {assertNotBanned,banFilterStages} from '../src/moderation/guard.js';
// Default production policy. Fake send collector only; no provider/SMTP or dev database.
test('Current mail rejects retired parents, skips Org/auth queues and preserves valid Workspace/Project deliveries',{skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');await connectDatabase(process.env.TEST_MONGODB_URI);
 const users=[],auths=[],wsIds=[],orgIds=[],extraJobs=[],config=testConfig(),O=value=>new mongoose.Types.ObjectId(value),sent=[];
 const send=async data=>{sent.push(data);return 'fake-provider-'+sent.length;};
 const ws=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
 try{
  for(const model of Object.values(models))await model.createIndexes();
  for(let i=0;i<3;i++){
   const user=await User.create({displayName:'Mail actor '+i,email:`mail-current-${new mongoose.Types.ObjectId()}@test.invalid`,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);
   const session=await Session.create({userId:user._id,refreshTokenHash:String(i).repeat(64),authVersionAtIssue:0,expiresAt:new Date(Date.now()+300000),lastSeenAt:new Date()});auths.push({claims:{sub:String(user._id),sid:String(session._id),av:0}});
  }
  const workspace=(await ws.create(auths[0],{name:'Supported mail parent'})).workspace;wsIds.push(O(workspace.id));
  const obsoleteBan=await AccessBan.create({scopeType:'organization',scopeId:workspace.id,organizationId:workspace.id,userId:users[1]._id,reason:'Ignored retired scope',imposedBy:users[0]._id,imposedAt:new Date()});
  await assertNotBanned(users[1]._id,{organizationId:O(workspace.id),workspaceId:O(workspace.id)});
  const visible=await Workspace.collection.aggregate([{$match:{_id:O(workspace.id)}},...banFilterStages(users[1]._id,{organization:'$_id',workspace:'$_id'})]).toArray();assert.equal(visible.length,1);
  await AccessBan.collection.deleteOne({_id:obsoleteBan._id});
  const now=new Date(),orgJob={_id:new mongoose.Types.ObjectId(),category:'invitation',organizationId:new mongoose.Types.ObjectId(),organizationInvitationId:new mongoose.Types.ObjectId(),state:'pending',attempts:0,nextAttemptAt:new Date(now.getTime()-60000)},authJob={_id:new mongoose.Types.ObjectId(),category:'auth',state:'pending',attempts:0,nextAttemptAt:new Date(now.getTime()-60000)};
  for(const job of [orgJob,authJob]){job.eventId=String(job._id);job.recipientKey='fixture:'+String(job._id);}
  extraJobs.push(orgJob._id,authJob._id);await EmailOutbox.collection.insertMany([orgJob,authJob]);
  const invite=await ws.invite(auths[0],workspace.id,{type:'EMAIL',email:users[1].email});
  assert.equal((await dispatchInvitationMail({config,send})).state,'sent');assert.equal(sent[0].purpose,'invitation');assert.equal(sent[0].to,users[1].emailCanonical);
  const project=(await work.createProject(auths[0],workspace.id,{name:'Supported mail Project'})).project;
  await work.inviteGuest(auths[0],project.id,{type:'EMAIL',email:users[2].email});
  assert.equal((await dispatchInvitationMail({config,send})).state,'sent');assert.equal(sent[1].purpose,'project_guest_invitation');
  for(const job of [orgJob,authJob]){const unchanged=await EmailOutbox.collection.findOne({_id:job._id});assert.equal(unchanged.state,'pending');assert.equal(unchanged.attempts,0);}
  const org=await Organization.create({ownerId:users[0]._id,name:'Retired parent'});orgIds.push(org._id);
  const retired={_id:new mongoose.Types.ObjectId(),organizationId:org._id,managerId:users[0]._id,name:'Old attached parent',version:0,state:'active',createdAt:new Date()};await Workspace.collection.insertOne(retired);wsIds.push(retired._id);
  const oldProject=await Project.create({workspaceId:retired._id,createdBy:users[0]._id,name:'Old Project'});
  const oldTask=await Task.create({workspaceId:retired._id,projectId:oldProject._id,createdBy:users[0]._id,title:'Old task'});
  await WorkspaceMembership.create({workspaceId:retired._id,userId:users[1]._id,joinedAt:new Date()});
  const oldInvite=await WorkspaceInvitation.create({workspaceId:retired._id,createdBy:users[0]._id,type:'EMAIL',email:users[1].email,tokenHash:'a'.repeat(64),expiresAt:new Date(Date.now()+300000)});
  const oldGuestInvite=await ProjectGuestInvitation.create({workspaceId:retired._id,projectId:oldProject._id,createdBy:users[0]._id,type:'EMAIL',email:users[2].email,tokenHash:'b'.repeat(64),expiresAt:new Date(Date.now()+300000)});
  for(const fields of [{category:'invitation',invitationId:oldInvite._id},{category:'invitation',projectInvitationId:oldGuestInvite._id,projectId:oldProject._id},{category:'work',userId:users[1]._id,taskId:oldTask._id,eventTypes:['assignment']}]){
   const job={_id:new mongoose.Types.ObjectId(),workspaceId:retired._id,...fields,state:'pending',attempts:0,nextAttemptAt:new Date(),encryptedDeliveryData:'invalid ciphertext must never be opened'};job.eventId=String(job._id);job.recipientKey='fixture:'+String(job._id);await EmailOutbox.collection.insertOne(job);
   const dispatch=fields.category==='work'?dispatchWorkMail:dispatchInvitationMail;
   assert.equal((await dispatch({config,send})).state,'cancelled');
   const result=await EmailOutbox.collection.findOne({_id:job._id});assert.equal(result.encryptedDeliveryData,null);
  }
  assert.equal(sent.length,2);assert.equal((await dispatchInvitationMail({config,send})).state,'idle');
 }finally{
  for(const [name,model] of Object.entries(models))if(!['User','Session','Workspace','Organization'].includes(name)&&model.schema.path('workspaceId'))await model.collection.deleteMany({workspaceId:{$in:wsIds}});
  await EmailOutbox.collection.deleteMany({_id:{$in:extraJobs}});await AccessBan.collection.deleteMany({userId:{$in:users.map(u=>u._id)}});await Workspace.collection.deleteMany({_id:{$in:wsIds}});await Organization.collection.deleteMany({_id:{$in:orgIds}});await Session.collection.deleteMany({userId:{$in:users.map(u=>u._id)}});await User.collection.deleteMany({_id:{$in:users.map(u=>u._id)}});await mongoose.disconnect();
 }
});
