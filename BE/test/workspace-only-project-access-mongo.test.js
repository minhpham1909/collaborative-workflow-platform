import {createNotificationsService} from '../src/notifications/service.js';
import {createMongoNotificationsStore} from '../src/notifications/mongo-store.js';
import {cutoffCodec} from '../src/notifications/input.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {randomBytes} from 'node:crypto';
import {connectDatabase} from '../src/database.js';
import {models,User,Session,WorkspaceMembership,Workspace,Organization,Project,Task,ProjectGuest,ProjectGuestInvitation,AccessBan,Notification,OrganizationInvitation} from '../src/models/index.js';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {testConfig} from '../test-support/auth-store.js';
import {tokenHash} from '../src/auth/tokens.js';
test('Workspace-only Project/Guest policy closes retired parents across direct, list, pins and invitation paths', {skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');await connectDatabase(process.env.TEST_MONGODB_URI);
 const people=[],auths=[],wsIds=[],orgIds=[];const config=testConfig();
 const work=createWorkService({store:createMongoWorkStore({config})}),ws=createWorkspaceService({store:createMongoWorkspaceStore({config})});
 const token=value=>new URLSearchParams(new URL(value.url).hash.slice(1)).get('token');
 try{
  for(const model of Object.values(models))await model.createIndexes();
  for(let i=0;i<4;i++){const user=new User({displayName:`Project policy ${i}`,email:`f2b-${new mongoose.Types.ObjectId()}@test.invalid`,emailVerifiedAt:new Date(),termsAcceptance:{version:'test',acceptedAt:new Date()}});await user.save();people.push(user);
   const session=new Session({userId:user._id,refreshTokenHash:String(i).repeat(64),authVersionAtIssue:0,expiresAt:new Date(Date.now()+300000),lastSeenAt:new Date()});await session.save();auths.push({claims:{sub:String(user._id),sid:String(session._id),av:0}});}
  const workspace=(await ws.create(auths[0],{name:'Supported Guest Workspace'})).workspace;wsIds.push(new mongoose.Types.ObjectId(workspace.id));
  for(const i of [1,2])await new WorkspaceMembership({workspaceId:workspace.id,userId:people[i]._id,role:i===1?'manager':'member',joinedAt:new Date()}).save();
  const a=(await work.createProject(auths[0],workspace.id,{name:'Allowed Project'})).project;
  const b=(await work.createProject(auths[1],workspace.id,{name:'Private Project'})).project;
  const task=(await work.createTask(auths[0],a.id,{title:'Allowed Task',assigneeId:String(people[2]._id)})).task;
  const invitation=await work.inviteGuest(auths[1],a.id,{type:'LINK'});await work.acceptGuestInvitation(auths[3],{token:token(invitation)});
  assert.equal((await work.getProject(auths[3],a.id)).project.accessRole,'guest');
  await assert.rejects(work.getProject(auths[3],b.id),/RESOURCE_UNAVAILABLE/u);
  await assert.rejects(work.createTask(auths[3],a.id,{title:'Forbidden Guest Task'}),/TASK_CREATE_FORBIDDEN/u);
  await work.createComment(auths[3],task.id,{content:{format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Guest feedback'}]}]}}});
  // Active old Guest grant must not bypass retired parent rejection.
  const org=new Organization({ownerId:people[0]._id,name:'Unsupported organization'});await org.save();orgIds.push(org._id);
  const retired=new Workspace({organizationId:org._id,managerId:people[0]._id,name:'Retired private Workspace'});await retired.save();wsIds.push(retired._id);
  const oldProject=new Project({workspaceId:retired._id,createdBy:people[0]._id,name:'Retired private Project'});await oldProject.save();
  const oldTask=new Task({workspaceId:retired._id,projectId:oldProject._id,createdBy:people[0]._id,title:'Retired private Task'});await oldTask.save();
  await new ProjectGuest({workspaceId:retired._id,projectId:oldProject._id,userId:people[3]._id,grantedBy:people[0]._id,joinedAt:new Date()}).save();
  const oldToken=randomBytes(32).toString('hex'),oldInvite=new ProjectGuestInvitation({workspaceId:retired._id,projectId:oldProject._id,createdBy:people[0]._id,type:'EMAIL',email:people[3].email,tokenHash:tokenHash(oldToken),expiresAt:new Date(Date.now()+300000)});await oldInvite.save();
  await assert.rejects(work.getProject(auths[3],String(oldProject._id)),/RESOURCE_UNAVAILABLE/u);
  await assert.rejects(work.getTask(auths[3],String(oldTask._id)),/RESOURCE_UNAVAILABLE/u);
  await assert.rejects(work.previewGuestInvitation({token:oldToken}),/INVITATION_UNAVAILABLE/u);
  await assert.rejects(work.acceptGuestInvitation(auths[3],{token:oldToken}),/INVITATION_UNAVAILABLE/u);
  const orgInvite=new OrganizationInvitation({organizationId:org._id,createdBy:people[0]._id,email:people[3].email,emailCanonical:people[3].emailCanonical,tokenHash:tokenHash(randomBytes(32).toString('hex')),expiresAt:new Date(Date.now()+300000)});await orgInvite.save();
  const orgNote=new Notification({organizationId:org._id,organizationInvitationId:orgInvite._id,recipientId:people[3]._id,actorId:people[0]._id,eventId:'f2b-org-note',category:'organization_invitation',payload:{organizationName:'Private retired name'}});await orgNote.save();
  const projectNote=new Notification({workspaceId:retired._id,projectId:oldProject._id,projectInvitationId:oldInvite._id,recipientId:people[3]._id,actorId:people[0]._id,eventId:'f2b-project-note',category:'project_invitation'});await projectNote.save();
  const cutoff=cutoffCodec(config.accessKeyHex),inbox=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const retiredNotice=(await inbox.get(auths[3],String(orgNote._id))).notification;assert.equal(retiredNotice.available,false);assert.equal(retiredNotice.code,'ORGANIZATIONS_RETIRED');assert.equal(retiredNotice.payload,null);assert.equal(retiredNotice.target,null);
  assert.equal((await inbox.get(auths[3],String(projectNote._id))).notification.available,false);

  const shared=await work.shared(auths[3],{limit:'1'});assert.equal(shared.items.length,1);assert.equal(shared.items[0].id,a.id);assert.equal(shared.nextCursor,null);
  assert.equal((await work.shared(auths[3],{q:'Retired private'})).items.length,0);
  await User.collection.updateOne({_id:people[3]._id},{$set:{projectPins:[oldProject._id,new mongoose.Types.ObjectId(a.id)]}});
  const pins=await work.pins(auths[3],{});assert.deepEqual(pins.items[0],{projectId:String(oldProject._id),available:false});assert.equal(pins.items[1].available,true);
  await ws.state(auths[0],workspace.id,{expectedVersion:0,state:'archived',confirmName:workspace.name,reason:'Read-only test'});
  assert.equal((await work.getProject(auths[3],a.id)).project.readOnly,true);
  const ban=new AccessBan({scopeType:'project',scopeId:a.id,workspaceId:workspace.id,projectId:a.id,userId:people[3]._id,reason:'Guest ban test',imposedBy:people[0]._id,imposedAt:new Date()});await ban.save();
  await assert.rejects(work.getProject(auths[3],a.id),/ACCESS_BANNED/u);assert.equal((await work.shared(auths[3],{})).items.length,0);
 }finally{for(const [name,model] of Object.entries(models)){if(!['User','Session','Organization'].includes(name)&&model.schema.path('workspaceId'))await model.collection.deleteMany({workspaceId:{$in:wsIds}});}
  await Workspace.collection.deleteMany({_id:{$in:wsIds}});await OrganizationInvitation.collection.deleteMany({organizationId:{$in:orgIds}});await Notification.collection.deleteMany({organizationId:{$in:orgIds}});await Organization.collection.deleteMany({_id:{$in:orgIds}});await Session.collection.deleteMany({userId:{$in:people.map(p=>p._id)}});await User.collection.deleteMany({_id:{$in:people.map(p=>p._id)}});await mongoose.disconnect();}
});
