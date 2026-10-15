import { assertReadable } from './theme-contrast.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || 'playwright');
const { MongoMemoryReplSet } = await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const { default: mongoose } = await import('../../BE/node_modules/mongoose/index.js');
const { models, User, Project, Task, TaskComment, Notification } = await import('../../BE/src/models/index.js');
const { createApp } = await import('../../BE/src/app.js');
const { createAuthService } = await import('../../BE/src/auth/service.js');
const { createMongoAuthStore } = await import('../../BE/src/auth/mongo-store.js');
const { hashPassword } = await import('../../BE/src/auth/passwords.js');
const { createWorkspaceService } = await import('../../BE/src/workspaces/service.js');
const { createMongoWorkspaceStore } = await import('../../BE/src/workspaces/mongo-store.js');
const { createWorkService } = await import('../../BE/src/work/service.js');
const { createMongoWorkStore } = await import('../../BE/src/work/mongo-store.js');
const { createNotificationsService } = await import('../../BE/src/notifications/service.js');
const { createMongoNotificationsStore } = await import('../../BE/src/notifications/mongo-store.js');
const { cutoffCodec } = await import('../../BE/src/notifications/input.js');
const { testConfig } = await import('../../BE/test-support/auth-store.js');
const { createUsersService } = await import('../../BE/src/users/service.js');
const { createMongoUsersStore } = await import('../../BE/src/users/mongo-store.js');

const feOrigin=process.env.WORKFLOW_FE_ORIGIN??'http://localhost:5173';assert.ok(/^http:\/\/localhost:(5173|4176)$/.test(feOrigin));
const theme=process.env.WORKFLOW_JOURNEY_THEME==='dark'?'dark':'light';
const language=process.env.WORKFLOW_JOURNEY_LANGUAGE==='en'?'en':'vi';
const width=Number(process.env.WORKFLOW_JOURNEY_WIDTH??1440);assert.ok([375,1440].includes(width));
const ui=(vi,en)=>language==='en'?en:vi;
const out=fileURLToPath(new URL('../../.local/product-p1b2/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_web_journey_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),refreshTtlSeconds:30*86400,webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  let clock=new Date();const auth=await createAuthService({store:createMongoAuthStore(),config}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config,now:()=>clock})}),usersService=createUsersService({store:createMongoUsersStore()});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<4;i++){const user=await User.create({email:`journey-${i}@example.com`,displayName:['QA Owner','QA Member','QA Guest','QA Manager'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const ws=(await workspaces.create(auths[0],{name:'QA Workspace'})).workspace;
  const admission=await workspaces.invite(auths[0],ws.id,{type:'LINK'});
  const admissionToken=new URLSearchParams(new URL(admission.url).hash.slice(1)).get('token');
  for(const i of [1,3])await workspaces.accept(auths[i],{token:admissionToken});
  await workspaces.role(auths[0],ws.id,users[3].id,{expectedVersion:0,role:'manager',reason:'Workspace-only browser fixture appointment'});
  const app=()=>createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,notificationsService});
  async function rotate(){const previous=server;server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;if(previous)await new Promise(resolve=>previous.close(resolve));}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  async function pageFor(index){const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});const page=await context.newPage();await page.addInitScript(value=>localStorage.setItem('workflow.auth.locale',value),language);await page.addInitScript(value=>localStorage.setItem('workflow.theme',value),theme);page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/status of (401|404)/.test(message.text()))console.log('Browser diagnostic:',message.text().slice(0,1200));});page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/src/')||new URL(request.url()).pathname.startsWith('/assets/'))console.log('Asset request failure:',new URL(request.url()).pathname,request.failure()?.errorText);});await page.goto(feOrigin+'/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel(ui('Mật khẩu','Password'),{exact:true}).fill(password);await page.getByRole('button',{name:ui('Đăng nhập','Sign in'),exact:true}).click();await page.locator('.studio-home').waitFor();return page;}
  async function navigate(page,name){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();const menu=page.getByRole('dialog',{name:ui('Menu điều hướng','Navigation menu'),exact:true});await menu.getByRole('link',{name,exact:true}).click();await menu.waitFor({state:'hidden'});}else await page.getByRole('link',{name,exact:true}).first().click();}
  const project=(await work.createProject(auths[0],ws.id,{name:'P1b2 isolated project'})).project;
  const owner=await pageFor(0),manager=await pageFor(3),member=await pageFor(1);
  // Commit POST, then drop the response: no second create may be sent.
  await owner.goto(feOrigin+'/#project/'+project.id);await owner.getByRole('button',{name:ui('+ Tạo Task','+ Create task'),exact:true}).click();
  await owner.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true}).fill('P1b2 response lost create');let creates=0;
  await owner.route('**/projects/'+project.id+'/tasks',async route=>{if(route.request().method()!=='POST')return route.fallback();creates++;const response=await route.fetch({url:origin+'/projects/'+project.id+'/tasks'});assert.equal(response.status(),201);await route.abort('failed');});
  const save=owner.getByRole('button',{name:ui('Lưu Task','Save task'),exact:true});await save.click();await owner.getByText(ui('Chưa xác nhận kết quả. Kiểm tra dữ liệu trước khi gửi lại.','The outcome is unconfirmed. Check the data before submitting again.'),{exact:true}).waitFor();assert.ok(await save.isDisabled());assert.equal(creates,1);assert.equal(await Task.countDocuments({projectId:project.id,title:'P1b2 response lost create'}),1);
  await owner.unroute('**/projects/'+project.id+'/tasks');await owner.getByRole('button',{name:ui('Hủy','Cancel'),exact:true}).click();await owner.locator('.system-dialog .primary').click();await owner.getByRole('link',{name:'P1b2 response lost create',exact:true}).waitFor();assert.equal(creates,1);
  // Full membership removal during editing rejects the stale form and fresh reads.
  const task=(await work.createTask(auths[0],project.id,{title:'P1b2 access loss'})).task;
  await manager.goto(feOrigin+'/#task/'+task.id);await manager.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).click();await manager.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true}).fill('P1b2 removed account draft');
  const membership=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[3].id);await workspaces.remove(auths[0],ws.id,users[3].id,{expectedVersion:membership.version});
  const denied=manager.waitForResponse(response=>response.url().endsWith('/tasks/'+task.id)&&response.request().method()==='PATCH');await manager.getByRole('button',{name:ui('Lưu Task','Save task'),exact:true}).click();assert.equal((await denied).status(),404);assert.equal((await Task.findById(task.id)).title,task.title);assert.equal(await manager.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true}).inputValue(),'P1b2 removed account draft');await assert.rejects(work.getTask(auths[3],task.id),/RESOURCE_UNAVAILABLE/u);
  // Reject a Member request, then reject immediate resubmission under the 24h cooldown.
  let done=(await work.createTask(auths[0],project.id,{title:'P1b2 rejected reopening',assigneeId:users[1].id})).task;done=(await work.status(auths[0],done.id,{expectedVersion:done.version,status:'done'})).task;
  async function request(page,taskId,reasonText){const target=feOrigin+'/#task/'+taskId;if(page.url()===target)await page.reload();else await page.goto(target);await page.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();const dialog=page.locator('.reopen-dialog');await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill(reasonText);return dialog;}
  let dialog=await request(member,done.id,'Please reconsider');await dialog.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();await dialog.waitFor({state:'hidden'});
  await owner.goto(feOrigin+'/#task/'+done.id);await owner.getByRole('button',{name:ui('Từ chối yêu cầu','Reject request'),exact:true}).click();dialog=owner.locator('.reopen-dialog');await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('No additional work needed');await dialog.getByRole('button',{name:ui('Từ chối yêu cầu','Reject request'),exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal((await Task.findById(done.id)).status,'done');
  dialog=await request(member,done.id,'Immediate repeated request');const cooldown=member.waitForResponse(response=>response.url().endsWith('/reopen-requests')&&response.request().method()==='POST');await dialog.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();const cooldownResponse=await cooldown;assert.equal((await cooldownResponse.json()).error.code,'REOPEN_REQUEST_COOLDOWN');await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).inputValue(),'Immediate repeated request');assert.equal((await Task.findById(done.id)).status,'done');
  // Advance only the isolated store clock; do not sleep for real days or edit records.
  const baseTime=clock.getTime();
  for(let day=1;day<=2;day++){
    clock=new Date(baseTime+day*86400000+1000);
    const current=(await work.getTask(auths[0],done.id)).task;
    const requested=await work.requestReopen(auths[1],done.id,{expectedVersion:current.version,targetStatus:'todo',reason:'Allowed after cooldown '+day});
    const reviewTask=(await work.getTask(auths[0],done.id)).task;
    await work.reviewReopen(auths[0],done.id,requested.request.id,{expectedVersion:requested.request.version,expectedTaskVersion:reviewTask.version,decision:'reject',reason:'Quota acceptance rejection'});
  }
  clock=new Date(baseTime+3*86400000+2000);
  let current=(await work.getTask(auths[0],done.id)).task;
  await assert.rejects(work.requestReopen(auths[1],done.id,{expectedVersion:current.version,targetStatus:'todo',reason:'Fourth request in seven days'}),{code:'REOPEN_REQUEST_RATE_LIMIT'});
  clock=new Date(baseTime+7*86400000+2000);
  const allowed=await work.requestReopen(auths[1],done.id,{expectedVersion:current.version,targetStatus:'todo',reason:'First request outside seven-day window'});assert.ok(allowed.request.id);
  // Archive the parent while the approval dialog is already open: stale approval cannot reopen.
  const archiveReviewer=await pageFor(0);await archiveReviewer.goto(feOrigin+'/#task/'+done.id);await archiveReviewer.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();const archiveDialog=archiveReviewer.locator('.reopen-dialog');await archiveDialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('Approval races parent archive');
  const currentProject=(await work.getProject(auths[0],project.id)).project;await work.state(auths[0],project.id,{expectedVersion:currentProject.version,state:'archived'});
  const archived=archiveReviewer.waitForResponse(response=>response.url().endsWith('/review')&&response.request().method()==='POST');await archiveDialog.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();const archivedResponse=await archived;assert.equal((await archivedResponse.json()).error.code,'PROJECT_ARCHIVED');await archiveDialog.getByRole('alert').waitFor();assert.equal((await Task.findById(done.id)).status,'done');
  assert.deepEqual(errors,[]);console.log('PASS P1b2 '+theme+'/'+language+': lost committed create response yields one Task and read-back; removed Manager cannot save/read; rejection keeps Done and immediate reopening request is blocked with retained reason. Quota permits after cooldown, blocks fourth request and expires window; archived parent blocks stale approval. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1400));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
