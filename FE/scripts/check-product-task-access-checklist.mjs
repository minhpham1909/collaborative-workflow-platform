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
const out=fileURLToPath(new URL('../../.local/product-p4a/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_web_journey_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),usersService=createUsersService({store:createMongoUsersStore()});
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
  const project=(await work.createProject(auths[0],ws.id,{name:'P4a Board project'})).project;
  const task=(await work.createTask(auths[0],project.id,{title:'P4a checklist and access',assigneeId:users[1].id})).task;
  const invitation=await work.inviteGuest(auths[0],project.id,{type:'LINK'});await work.acceptGuestInvitation(auths[2],{token:new URLSearchParams(new URL(invitation.url).hash.slice(1)).get('token')});
  const owner=await pageFor(0),member=await pageFor(1),guest=await pageFor(2);
  await guest.goto(feOrigin+'/#project/'+project.id);await guest.getByRole('link',{name:task.title,exact:true}).click();const panel=guest.getByRole('dialog',{name:ui('Chi tiết Task','Task details'),exact:true});await panel.getByRole('button',{name:ui('+ Viết bình luận','+ Write comment'),exact:true}).click();await panel.getByRole('textbox',{name:ui('Bình luận mới','New comment'),exact:true}).fill('P4a Guest draft before revocation');
  const guestMembership=(await work.guests(auths[0],project.id,{})).items.find(item=>item.userId===users[2].id);await work.revokeGuest(auths[0],project.id,users[2].id,{expectedVersion:guestMembership.version});let response=guest.waitForResponse(r=>r.url().includes('/tasks/'+task.id+'/comments')&&r.request().method()==='POST');await panel.getByRole('button',{name:ui('Gửi bình luận','Post comment'),exact:true}).click();assert.equal((await response).status(),404);await panel.locator('.comment-form [role=alert]').waitFor();assert.match(await panel.getByRole('textbox',{name:ui('Bình luận mới','New comment'),exact:true}).innerText(),/P4a Guest draft/u);assert.equal(await TaskComment.countDocuments({taskId:task.id}),0);
  const probe=await pageFor(2);await probe.goto(feOrigin+'/#task/'+task.id);await probe.locator('main [role=alert]').first().waitFor();assert.equal(await probe.getByRole('heading',{name:task.title,exact:true}).count(),0);assert.equal(await probe.locator('.comments').count(),0);
  // Checklist structure belongs to management; the assignee can tick existing items.
  await owner.goto(feOrigin+'/#task/'+task.id);await owner.getByRole('button',{name:ui('Sửa checklist','Edit checklist'),exact:true}).click();await owner.getByRole('button',{name:ui('Thêm mục checklist','Add checklist item'),exact:true}).click();await owner.getByLabel(ui('Mục checklist 1','Checklist item 1'),{exact:true}).fill('P4a first requirement');await owner.getByRole('button',{name:ui('Thêm mục checklist','Add checklist item'),exact:true}).click();await owner.getByLabel(ui('Mục checklist 2','Checklist item 2'),{exact:true}).fill('P4a second requirement');await owner.getByRole('button',{name:ui('Lưu checklist','Save checklist'),exact:true}).click();await owner.locator('.checklist-item').first().waitFor();
  await member.goto(feOrigin+'/#task/'+task.id);await member.locator('.checklist-item input').first().waitFor();assert.equal(await member.getByRole('button',{name:ui('Sửa checklist','Edit checklist'),exact:true}).count(),0);await member.locator('.checklist-item input').first().click();await member.waitForFunction(()=>document.querySelectorAll('.checklist-item input:checked').length===1);assert.equal((await work.getTask(auths[0],task.id)).task.checklist.filter(item=>item.checked).length,1);
  await owner.reload();await owner.getByLabel(ui('Trạng thái','Status'),{exact:true}).selectOption('done');let dialog=owner.locator('.system-dialog');await dialog.getByRole('button',{name:ui('Hủy','Cancel'),exact:true}).click();assert.notEqual((await Task.findById(task.id)).status,'done');await owner.getByLabel(ui('Trạng thái','Status'),{exact:true}).selectOption('done');await owner.locator('.system-dialog .primary').click();await owner.waitForFunction(()=>document.querySelector('.detail-meta-grid select')?.value==='done');
  await member.reload();await member.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();dialog=member.locator('.reopen-dialog');await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('P4a requester loses membership');await dialog.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();await dialog.waitFor({state:'hidden'});
  await owner.reload();await owner.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();dialog=owner.locator('.reopen-dialog');await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('P4a stale approval after removal');const membership=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[1].id);await workspaces.remove(auths[0],ws.id,users[1].id,{expectedVersion:membership.version});response=owner.waitForResponse(r=>r.url().endsWith('/review')&&r.request().method()==='POST');await dialog.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();const reviewed=await response;assert.equal(reviewed.status(),409);assert.equal((await reviewed.json()).error.code,'VERSION_CONFLICT');await dialog.getByRole('alert').waitFor();assert.equal((await Task.findById(task.id)).status,'done');assert.equal((await work.getTask(auths[0],task.id)).task.pendingReopenRequestId,null);assert.equal(await models.TaskReopenRequest.countDocuments({taskId:task.id,state:'cancelled'}),1);
  assert.deepEqual(errors,[]);console.log('PASS P4a '+theme+'/'+language+': revoked Guest panel rejects comment with draft preserved; fresh read redacted; management checklist/assignee tick; incomplete Done confirmation cancel/accept; requester removal cancels reopen and rejects stale approval. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1500));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
