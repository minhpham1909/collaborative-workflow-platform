import {workspaceResponse} from '../src/workspaces/response.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {testConfig} from '../test-support/auth-store.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {connectDatabase} from '../src/database.js';
import {models,User,Workspace,WorkspaceMembership,Organization,OrganizationMembership,AccessBan,Session,WorkspaceRoleAudit,WorkspaceManagementAudit,WorkspaceInvitation} from '../src/models/index.js';
import {workspaceAccess,workspaceAccessStages,registerHistoricalWorkspaceFixture} from '../src/workspaces/access.js';
import {queryWorkspaceList} from '../src/workspaces/query-store.js';
import {workspaceQuery} from '../src/workspaces/list-query.js';
test('Workspace-only policy derives authority from active membership, hides old Org parents and aligns list facets', {skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');await connectDatabase(process.env.TEST_MONGODB_URI);
 const people=[],wsIds=[],orgIds=[];
 try{
  for(const model of Object.values(models))await model.createIndexes();
  for(let i=0;i<4;i++){const person=new User({displayName:`Access ${i}`,email:`ws-policy-${new mongoose.Types.ObjectId()}@test.invalid`,emailVerifiedAt:new Date(),termsAcceptance:{version:'test',acceptedAt:new Date()}});await person.save();people.push(person);}
  const workspace=new Workspace({ownerId:people[0]._id,name:'Workspace-only fixture'});await workspace.save();wsIds.push(workspace._id);
  for(const [i,role] of [[0,'member'],[1,'manager'],[2,'member']])await new WorkspaceMembership({workspaceId:workspace._id,userId:people[i]._id,role,joinedAt:new Date()}).save();
  const org=new Organization({ownerId:people[3]._id,name:'Retired fixture'});await org.save();orgIds.push(org._id);
  for(const i of [2,3])await new OrganizationMembership({organizationId:org._id,userId:people[i]._id,role:'admin',joinedAt:new Date()}).save();
  const attached=new Workspace({organizationId:org._id,managerId:people[2]._id,name:'Unsupported parent'});await attached.save();wsIds.push(attached._id);
  await new WorkspaceMembership({workspaceId:attached._id,userId:people[2]._id,role:'manager',joinedAt:new Date()}).save();
  const read=i=>mongoose.connection.transaction(tx=>workspaceAccess(workspace.toObject(),people[i]._id,tx));
  assert.equal((await read(0)).role,'owner');assert.equal((await read(1)).canManage,true);assert.equal((await read(2)).canManage,false);
  await assert.rejects(read(3),/WORKSPACE_UNAVAILABLE/u);
  for(const i of [2,3])await assert.rejects(mongoose.connection.transaction(tx=>workspaceAccess(attached.toObject(),people[i]._id,tx)),/WORKSPACE_UNAVAILABLE/u);
  // managerId no longer grants management even if an old/corrupt field is present.
  const forged={...workspace.toObject(),managerId:people[2]._id};assert.equal((await mongoose.connection.transaction(tx=>workspaceAccess(forged,people[2]._id,tx))).role,'member');
  const list=(i,role)=>mongoose.connection.transaction(tx=>queryWorkspaceList(people[i].toObject(),tx,workspaceQuery({role})));
  assert.equal((await list(1,'managed')).total,1);assert.equal((await list(2,'managed')).total,0);assert.equal((await list(2,'member')).total,1);assert.equal((await list(3,'all')).total,0);
  const ban=new AccessBan({scopeType:'workspace',scopeId:workspace._id,workspaceId:workspace._id,userId:people[1]._id,reason:'Policy fixture',imposedBy:people[0]._id,imposedAt:new Date()});await ban.save();
  await assert.rejects(read(1),/ACCESS_BANNED/u);assert.equal((await list(1,'all')).total,0);
  await WorkspaceMembership.collection.updateOne({workspaceId:workspace._id,userId:people[2]._id},{$set:{state:'inactive'}});await assert.rejects(read(2),/WORKSPACE_UNAVAILABLE/u);
  await WorkspaceMembership.collection.updateOne({workspaceId:workspace._id,userId:people[0]._id},{$set:{state:'inactive'}});await assert.rejects(read(0),/WORKSPACE_UNAVAILABLE/u);
  assert.ok(!JSON.stringify(workspaceAccessStages(people[0]._id)).includes('organization_memberships'));
  // DTO authority ignores injected effectiveRole and obsolete single-Manager pointers.
  const memberDto=workspaceResponse(forged,{userId:people[2]._id,role:'member',effectiveRole:'organization_admin',version:0});
  assert.equal(memberDto.role,'member');assert.equal(memberDto.permissions.manage,false);
  assert.equal(Object.hasOwn(memberDto,'organizationId'),false);assert.equal(Object.hasOwn(memberDto,'managerId'),false);
  const managerDto=workspaceResponse({...forged,managerId:people[1]._id},{userId:people[1]._id,role:'manager',version:0});
  assert.equal(managerDto.permissions.leave,true);assert.equal(managerDto.permissions.manageRoles,false);
  assert.equal(workspaceResponse(forged,{userId:people[0]._id,role:'member',version:0}).permissions.leave,false);
  // Current store mutations run without the historical fixture registration.
  const identities=[];
  for(let i=0;i<people.length;i++){const session=new Session({userId:people[i]._id,refreshTokenHash:String(i).repeat(64),authVersionAtIssue:people[i].authVersion,expiresAt:new Date(Date.now()+300000),lastSeenAt:new Date()});await session.save();identities.push({claims:{sub:String(people[i]._id),sid:String(session._id),av:people[i].authVersion}});}
  const service=createWorkspaceService({store:createMongoWorkspaceStore({config:testConfig()})});
  const created=(await service.create(identities[0],{name:'Strict runtime writes'})).workspace;wsIds.push(new mongoose.Types.ObjectId(created.id));
  await new WorkspaceMembership({workspaceId:created.id,userId:people[1]._id,joinedAt:new Date()}).save();
  await service.role(identities[0],created.id,String(people[1]._id),{expectedVersion:0,role:'manager',reason:'Owner appointment'});
  assert.equal((await service.update(identities[1],created.id,{expectedVersion:0,summary:'Current Manager edit'})).workspace.version,1);
  assert.ok((await service.invite(identities[1],created.id,{type:'LINK'})).url);
  await assert.rejects(service.role(identities[1],created.id,String(people[1]._id),{expectedVersion:1,role:'member',reason:'Must not self appoint'}),/OWNER_REQUIRED/u);
  await service.role(identities[0],created.id,String(people[1]._id),{expectedVersion:1,role:'member',reason:'Demote manager'});
  await assert.rejects(service.invite(identities[1],created.id,{type:'LINK'}),/OWNER_REQUIRED/u);

 }finally{registerHistoricalWorkspaceFixture(null);for(const model of [WorkspaceMembership,AccessBan,WorkspaceRoleAudit,WorkspaceManagementAudit,WorkspaceInvitation])await model.collection.deleteMany({workspaceId:{$in:wsIds}});await Workspace.collection.deleteMany({_id:{$in:wsIds}});await OrganizationMembership.collection.deleteMany({organizationId:{$in:orgIds}});await Organization.collection.deleteMany({_id:{$in:orgIds}});await Session.collection.deleteMany({userId:{$in:people.map(p=>p._id)}});await User.collection.deleteMany({_id:{$in:people.map(p=>p._id)}});await mongoose.disconnect();}
});
