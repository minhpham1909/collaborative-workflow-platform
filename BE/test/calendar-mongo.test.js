import '../test-support/legacy-organizations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {connectDatabase} from '../src/database.js';
import {models,User,WorkspaceMembership,OrganizationMembership,Session,ProjectGuest,AccessBan,Workspace,Project,Task,Notification,EmailOutbox} from '../src/models/index.js';
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
test('calendar: complete counts, Vietnam boundaries, paging, current rights and readonly', {skip:!process.env.TEST_MONGODB_URI,timeout:120000}, async t=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');
 await connectDatabase(process.env.TEST_MONGODB_URI);const config=testConfig(),users=[],logins=[],auths=[],prefix=randomUUID();let server;
 try {
  for(const model of Object.values(models))await model.createIndexes();
  const auth=await createAuthService({store:createMongoAuthStore(),config}),ws=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config,now:()=>new Date('2026-10-12T05:00:00Z')})});
  const password='Private pin fixture password',passwordHash=await hashPassword(password);
  for(let i=0;i<4;i++){const user=await new User({displayName:'Pin tester '+i,email:prefix+'-'+i+'@example.com',passwordHash,emailVerifiedAt:i===3?null:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}}).save();users.push(user);logins.push(await auth.login({email:user.email,password}));auths.push(await auth.authenticate(logins[i].accessToken));}
  const workspace=(await ws.create(auths[0],{name:'Secret workspace'})).workspace;
  const project=(await work.createProject(auths[0],workspace.id,{name:'Secret project'})).project;
  server=createApp({authService:auth,authConfig:config,workService:work}).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  async function call(who,path,method='GET',body,status=200,origin=config.webOrigin){const response=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who===null?{}:{Authorization:'Bearer '+logins[who].accessToken})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}
  const pin=(who,pinned,status=200)=>call(who,'/projects/'+project.id+'/pin','PATCH',{pinned},status);
  const main=[];
  for(let i=0;i<20;i++)main.push((await work.createTask(auths[0],project.id,{title:'Calendar sample '+i,assigneeId:users[0].id,dueAt:'2026-09-30T17:00:00.000Z'})).task);
  await work.status(auths[0],main[0].id,{expectedVersion:main[0].version,status:'done'});
  await work.createTask(auths[0],project.id,{title:'Before month',assigneeId:users[0].id,dueAt:'2026-09-30T16:59:00.000Z'});
  await work.createTask(auths[0],project.id,{title:'After month',assigneeId:users[0].id,dueAt:'2026-10-31T17:00:00.000Z'});
  const none=(await work.createTask(auths[0],project.id,{title:'No deadline',assigneeId:users[0].id})).task;
  const legacy=(await work.createTask(auths[0],project.id,{title:'Legacy no deadline',assigneeId:users[0].id})).task;await Task.collection.updateOne({_id:new mongoose.Types.ObjectId(legacy.id)},{$unset:{dueAt:''}});
  const trash=(await work.createTask(auths[0],project.id,{title:'Trash',assigneeId:users[0].id,dueAt:'2026-09-30T17:00:00.000Z'})).task;await work.deleteTask(auths[0],trash.id,{expectedVersion:trash.version});
  await new WorkspaceMembership({workspaceId:workspace.id,userId:users[1]._id,joinedAt:new Date()}).save();
  await work.createTask(auths[0],project.id,{title:'Other account',assigneeId:users[1].id,dueAt:'2026-09-30T17:00:00.000Z'});
  await new ProjectGuest({workspaceId:workspace.id,projectId:project.id,userId:users[2]._id,grantedBy:users[0]._id,joinedAt:new Date()}).save();
  const guestTask=(await work.createTask(auths[0],project.id,{title:'Legacy guest assignment',dueAt:'2026-09-30T17:00:00.000Z'})).task;await Task.collection.updateOne({_id:new mongoose.Types.ObjectId(guestTask.id)},{$set:{assigneeId:users[2]._id}});
  await work.createTask(auths[0],project.id,{title:'Historical fixed UTC7 boundary',assigneeId:users[0].id,dueAt:'1899-12-31T17:00:00.000Z'});
  await t.test('counts cover more than one page, date cutoffs and missing dueAt; HTTP rejects forged scope',async()=>{
   await call(null,'/my-calendar?month=2026-10','GET',undefined,401);await call(3,'/my-calendar?month=2026-10','GET',undefined,403);
   await call(0,'/my-calendar?month=2026-10&userId='+users[1].id,'GET',undefined,400);await call(0,'/my-calendar?month=2026-13','GET',undefined,400);
   await call(0,'/my-calendar/tasks?month=2026-10&day=2026-11-01','GET',undefined,400);
   const historical=await call(0,'/my-calendar?month=1900-01');assert.equal(historical.days[0].day,'1900-01-01');
   const month=await call(0,'/my-calendar?month=2026-10&status=all');assert.equal(month.total,20);assert.equal(month.noDeadlineCount,2);assert.deepEqual(month.days,[{day:'2026-10-01',total:20,done:1,overdue:19}]);
   const first=await call(0,'/my-calendar/tasks?month=2026-10&day=2026-10-01&status=all&limit=12');assert.equal(first.total,20);assert.equal(first.items.length,12);assert.ok(first.nextCursor);
   const next=await call(0,'/my-calendar/tasks?month=2026-10&day=2026-10-01&status=all&limit=12&cursor='+encodeURIComponent(first.nextCursor));assert.equal(next.items.length,8);assert.equal(new Set([...first.items,...next.items].map(v=>v.id)).size,20);
   assert.equal((await call(0,'/my-calendar?month=2026-10')).total,19);
   assert.equal((await call(0,'/my-calendar?month=2026-09&status=all')).total,1);assert.equal((await call(0,'/my-calendar?month=2026-11&status=all')).total,1);
   assert.equal((await call(0,'/my-calendar/tasks?month=2026-10&day=none')).total,2);
   assert.equal((await call(0,'/my-calendar?month=2026-10&q=no%20matching')).total,0);
   assert.equal((await call(1,'/my-calendar?month=2026-10')).total,1);assert.equal((await call(2,'/my-calendar?month=2026-10')).total,0);
  });
  await t.test('Archive filtering and readonly, Ban/current membership and missing parents agree with My Tasks',async()=>{
   await work.state(auths[0],project.id,{expectedVersion:project.version,state:'archived'});
   assert.equal((await work.calendar(auths[0],{month:'2026-10'})).total,0);
   const month=await work.calendar(auths[0],{month:'2026-10',state:'archived',status:'all'});assert.equal(month.total,20);
   assert.ok((await work.calendarTasks(auths[0],{month:'2026-10',day:'2026-10-01',state:'all',status:'all'})).items.every(v=>v.readOnly&&!v.permissions.status));
   assert.equal((await work.mine(auths[0],{state:'all',status:'all',timeField:'dueAt',from:'2026-10-01',to:'2026-10-31'})).total,month.total);
   const ban=await new AccessBan({scopeType:'project',scopeId:project.id,workspaceId:workspace.id,projectId:project.id,userId:users[1]._id,reason:'fixture',imposedBy:users[0]._id,imposedAt:new Date()}).save();assert.equal((await work.calendar(auths[1],{month:'2026-10',state:'all'})).total,0);await AccessBan.collection.deleteOne({_id:ban._id});
   await WorkspaceMembership.collection.deleteOne({workspaceId:new mongoose.Types.ObjectId(workspace.id),userId:users[1]._id});assert.equal((await work.calendar(auths[1],{month:'2026-10',state:'all'})).total,0);
   await Project.collection.deleteOne({_id:new mongoose.Types.ObjectId(project.id)});assert.equal((await work.calendar(auths[0],{month:'2026-10',state:'all'})).total,0);assert.equal((await work.calendarTasks(auths[0],{month:'2026-10',day:'none',state:'all'})).total,0);
  });
 }finally{if(server)await new Promise(resolve=>server.close(resolve));for(const model of Object.values(models))await model.collection.deleteMany({});await mongoose.disconnect();}
});
