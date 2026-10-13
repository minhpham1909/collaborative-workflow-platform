import '../test-support/legacy-organizations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {connectDatabase} from '../src/database.js';
import {models,User,WorkspaceMembership,OrganizationMembership,Session,ProjectGuest,AccessBan,Workspace,Project,Notification,EmailOutbox} from '../src/models/index.js';
import {createApp} from '../src/app.js';
import {createAuthService} from '../src/auth/service.js';
import {createMongoAuthStore} from '../src/auth/mongo-store.js';
import {hashPassword} from '../src/auth/passwords.js';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
import {createOrganizationService} from '../src/organizations/service.js';
import {createMongoOrganizationStore} from '../src/organizations/mongo-store.js';
import {testConfig} from '../test-support/auth-store.js';
test('personal Project pins: HTTP isolation, current permissions, archive, ban, removal and concurrent cap', {skip:!process.env.TEST_MONGODB_URI,timeout:120000}, async t=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');
 await connectDatabase(process.env.TEST_MONGODB_URI);const config=testConfig(),users=[],logins=[],auths=[],prefix=randomUUID();let server;
 try {
  for(const model of Object.values(models))await model.createIndexes();
  const auth=await createAuthService({store:createMongoAuthStore(),config}),ws=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
  const password='Private pin fixture password',passwordHash=await hashPassword(password);
  for(let i=0;i<4;i++){const user=await new User({displayName:'Pin tester '+i,email:prefix+'-'+i+'@example.com',passwordHash,emailVerifiedAt:i===3?null:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}}).save();users.push(user);logins.push(await auth.login({email:user.email,password}));auths.push(await auth.authenticate(logins[i].accessToken));}
  const workspace=(await ws.create(auths[0],{name:'Secret workspace'})).workspace;
  const project=(await work.createProject(auths[0],workspace.id,{name:'Secret project'})).project;
  server=createApp({authService:auth,authConfig:config,workService:work}).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  async function call(who,path,method='GET',body,status=200,origin=config.webOrigin){const response=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who===null?{}:{Authorization:'Bearer '+logins[who].accessToken})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}
  const pin=(who,pinned,status=200)=>call(who,'/projects/'+project.id+'/pin','PATCH',{pinned},status);
  await t.test('strict HTTP auth/origin/shape and owner-only preference isolation',async()=>{
   await call(null,'/project-pins','GET',undefined,401);await call(3,'/project-pins','GET',undefined,403);
   await call(0,'/projects/'+project.id+'/pin','PATCH',{pinned:true},403,'https://foreign.example');
   await call(0,'/projects/'+project.id+'/pin','PATCH',{pinned:'true'},400);await call(0,'/projects/'+project.id+'/pin','PATCH',{pinned:true,userId:users[1].id},400);
   await call(0,'/projects/not-an-id/pin','PATCH',{pinned:true},400);await call(0,'/project-pins?userId='+users[1].id,'GET',undefined,400);
   await pin(1,true,404);assert.deepEqual((await call(1,'/project-pins')).items,[]);
   await User.collection.updateOne({_id:users[0]._id},{$unset:{projectPins:''}});assert.deepEqual((await call(0,'/project-pins')).items,[]);
   const count=await Notification.collection.countDocuments({}),mail=await EmailOutbox.collection.countDocuments({});
   await pin(0,true);await pin(0,true);assert.equal((await call(0,'/project-pins')).items.length,1);assert.equal(await Notification.collection.countDocuments({}),count);assert.equal(await EmailOutbox.collection.countDocuments({}),mail);
  });
  await new WorkspaceMembership({workspaceId:workspace.id,userId:users[1]._id,joinedAt:new Date()}).save();
  await new ProjectGuest({workspaceId:workspace.id,projectId:project.id,userId:users[2]._id,grantedBy:users[0]._id,joinedAt:new Date()}).save();
  await t.test('Member/Guest pin Archived without gaining write rights; revoke/ban redact and permit unpin',async()=>{
   await pin(1,true);await pin(2,true);
   await work.state(auths[0],project.id,{state:'archived',expectedVersion:project.version});
   assert.equal((await call(2,'/project-pins')).items[0].readOnly,true);assert.equal((await work.getProject(auths[2],project.id)).project.permissions.createTask,false);
   await WorkspaceMembership.collection.updateOne({workspaceId:new mongoose.Types.ObjectId(workspace.id),userId:users[1]._id},{$set:{state:'inactive',leftAt:new Date(),exitReason:'removed'}});
   assert.deepEqual((await call(1,'/project-pins')).items,[{projectId:project.id,available:false}]);await pin(1,true,404);await pin(1,false);assert.deepEqual((await call(1,'/project-pins')).items,[]);
   const ban=await new AccessBan({scopeType:'project',scopeId:project.id,workspaceId:workspace.id,projectId:project.id,userId:users[2]._id,reason:'Fixture ban',imposedBy:users[0]._id,imposedAt:new Date()}).save();
   assert.deepEqual((await call(2,'/project-pins')).items,[{projectId:project.id,available:false}]);await pin(2,true,403);await pin(2,false);
   await AccessBan.collection.deleteOne({_id:ban._id});await pin(2,true);await ProjectGuest.collection.updateOne({projectId:new mongoose.Types.ObjectId(project.id),userId:users[2]._id},{$set:{state:'inactive',revokedAt:new Date()}});
   assert.deepEqual((await call(2,'/project-pins')).items,[{projectId:project.id,available:false}]);await pin(2,false);
   await Workspace.collection.updateOne({_id:new mongoose.Types.ObjectId(workspace.id)},{$set:{state:'archived',archivedAt:new Date(),archivedBy:users[0]._id}});assert.equal((await call(0,'/project-pins')).items[0].readOnly,true);
   await Workspace.collection.updateOne({_id:new mongoose.Types.ObjectId(workspace.id)},{$set:{state:'active',archivedAt:null,archivedBy:null}});
  });
  await t.test('Org Admin reads attached Project without Workspace membership; Org exit hides its pin',async()=>{
   const organizations=createOrganizationService({store:createMongoOrganizationStore({config})});
   const org=(await organizations.create(auths[0],{name:'Pin organization'})).organization;
   const attached=(await organizations.createWorkspace(auths[0],org.id,{name:'Attached scope'})).workspace;
   const child=(await work.createProject(auths[0],attached.id,{name:'Admin-readable project'})).project;
   const membership=await new OrganizationMembership({organizationId:org.id,userId:users[1]._id,role:'admin',joinedAt:new Date()}).save();
   assert.equal(await WorkspaceMembership.collection.countDocuments({workspaceId:new mongoose.Types.ObjectId(attached.id),userId:users[1]._id}),0);
   assert.equal((await work.setPin(auths[1],child.id,{pinned:true})).items[0].available,true);
   await OrganizationMembership.collection.updateOne({_id:membership._id},{$set:{state:'inactive',leftAt:new Date(),exitReason:'removed'}});
   assert.deepEqual((await work.pins(auths[1],{})).items,[{projectId:child.id,available:false}]);await work.setPin(auths[1],child.id,{pinned:false});
  });
  await t.test('bounded newest-first list, no eviction, idempotency and two concurrent final-slot claims',async()=>{
   const projects=[];for(let i=0;i<21;i++)projects.push((await work.createProject(auths[0],workspace.id,{name:'Capacity '+i})).project);
   for(const value of projects.slice(0,18))await work.setPin(auths[0],value.id,{pinned:true});
   const result=await Promise.allSettled(projects.slice(18,20).map(value=>work.setPin(auths[0],value.id,{pinned:true})));
   assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.code,'PIN_LIMIT_REACHED');
   const list=await call(0,'/project-pins');assert.equal(list.items.length,20);assert.equal(list.items.at(-1).projectId,project.id);const order=list.items.map(v=>v.projectId);
   await pin(0,true);assert.deepEqual((await call(0,'/project-pins')).items.map(v=>v.projectId),order);
   await call(0,'/projects/'+projects[20].id+'/pin','PATCH',{pinned:true},409);assert.deepEqual((await call(0,'/project-pins')).items.map(v=>v.projectId),order);
   await Project.collection.deleteOne({_id:new mongoose.Types.ObjectId(project.id)});assert.equal((await call(0,'/project-pins')).items.at(-1).available,false);await pin(0,false);await pin(0,false);assert.equal((await call(0,'/project-pins')).items.length,19);
  });
  await t.test('revoked session cannot list or change personal pins',async()=>{
   await Session.collection.updateOne({_id:new mongoose.Types.ObjectId(auths[0].claims.sid)},{$set:{revokedAt:new Date()}});
   await call(0,'/project-pins','GET',undefined,401);await pin(0,false,401);
  });
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const model of Object.values(models))await model.collection.deleteMany({});await mongoose.disconnect();}
});
