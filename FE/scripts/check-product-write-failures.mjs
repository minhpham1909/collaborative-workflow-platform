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
const out=fileURLToPath(new URL('../../.local/product-p1b/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const project=(await work.createProject(auths[0],ws.id,{name:'P1b isolated project'})).project;
  const task=(await work.createTask(auths[0],project.id,{title:'P1b original'})).task;
  const owner=await pageFor(0),manager=await pageFor(3);
  async function edit(page){await page.goto(feOrigin+'/#task/'+task.id);await page.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).click();await page.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true}).waitFor();}
  const title=page=>page.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true});
  const save=page=>page.getByRole('button',{name:ui('Lưu Task','Save task'),exact:true});
  // Another session commits after the editor was opened: reject stale write, retain draft.
  await edit(owner);await title(owner).fill('P1b local conflict draft');
  await work.updateTask(auths[0],task.id,{expectedVersion:task.version,title:'P1b remote winner'});
  const conflict=owner.waitForResponse(response=>response.url().endsWith('/tasks/'+task.id)&&response.request().method()==='PATCH');await save(owner).click();assert.equal((await conflict).status(),409);await owner.locator('form [role=alert]').waitFor();
  assert.equal(await title(owner).inputValue(),'P1b local conflict draft');assert.equal((await Task.findById(task.id)).title,'P1b remote winner');
  // Fresh context avoids discarding the deliberately retained conflict draft.
  const lost=await pageFor(0);await edit(lost);await title(lost).fill('P1b committed response lost');let writes=0;
  await lost.route('**/tasks/'+task.id,async route=>{if(route.request().method()!=='PATCH')return route.fallback();writes++;const response=await route.fetch({url:origin+'/tasks/'+task.id});assert.equal(response.status(),200);await route.abort('failed');});
  await save(lost).click();await lost.getByText(ui('Chưa xác nhận kết quả. Kiểm tra dữ liệu trước khi gửi lại.','The outcome is unconfirmed. Check the data before submitting again.'),{exact:true}).waitFor();
  assert.equal((await Task.findById(task.id)).title,'P1b committed response lost');assert.equal(await title(lost).inputValue(),'P1b committed response lost');assert.ok(await save(lost).isDisabled());assert.ok(await title(lost).isDisabled());assert.equal(await lost.getByRole('textbox',{name:ui('Mô tả Task','Task description'),exact:true}).getAttribute('contenteditable'),'false');assert.equal(writes,1);
  await lost.unroute('**/tasks/'+task.id);await lost.getByRole('button',{name:ui('Hủy','Cancel'),exact:true}).click();await lost.locator('.system-dialog .primary').click();await lost.getByRole('heading',{name:'P1b committed response lost',exact:true}).waitFor();assert.equal(writes,1,'Recovery must read back, not repeat write');
  // Manager loses authority while the form remains open; API rejects and preserves draft.
  await edit(manager);await title(manager).fill('P1b forbidden draft');
  const roster=await workspaces.members(auths[0],ws.id,{}),membership=roster.items.find(item=>item.userId===users[3].id);
  await workspaces.role(auths[0],ws.id,users[3].id,{expectedVersion:membership.version,role:'member',reason:'P1b mid-form authority revocation'});
  const rejected=manager.waitForResponse(response=>response.url().endsWith('/tasks/'+task.id)&&response.request().method()==='PATCH');await save(manager).click();assert.equal((await rejected).status(),403);
  assert.equal(await title(manager).inputValue(),'P1b forbidden draft');assert.equal((await Task.findById(task.id)).title,'P1b committed response lost');
  const reopening=(await work.createTask(auths[0],project.id,{title:'P1b reopening',assigneeId:users[1].id})).task;
  await work.status(auths[0],reopening.id,{expectedVersion:reopening.version,status:'done'});
  const member=await pageFor(1),reviewer=await pageFor(0);
  await member.goto(feOrigin+'/#task/'+reopening.id);await member.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();
  let reopenDialog=member.locator('.reopen-dialog');await reopenDialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('Need another revision');await reopenDialog.getByRole('button',{name:ui('Yêu cầu mở lại','Request reopening'),exact:true}).click();await reopenDialog.waitFor({state:'hidden'});
  const pendingTask=await Task.findById(reopening.id);assert.equal(pendingTask.status,'done');assert.ok((await work.getTask(auths[0],reopening.id)).task.pendingReopenRequestId);
  // Promotion does not allow the requester to approve their own pending request.
  const memberRow=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[1].id);
  await workspaces.role(auths[0],ws.id,users[1].id,{expectedVersion:memberRow.version,role:'manager',reason:'P1b self review prohibition'});
  await member.reload();await member.locator('.reopen-list li').waitFor();assert.equal(await member.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).count(),0);
  await reviewer.goto(feOrigin+'/#task/'+reopening.id);await reviewer.locator('.reopen-list li').waitFor();assert.ok(await reviewer.getByLabel(ui('Trạng thái','Status'),{exact:true}).isDisabled());
  await reviewer.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();reopenDialog=reviewer.locator('.reopen-dialog');await reopenDialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('Approved additional work');await reopenDialog.getByRole('button',{name:ui('Duyệt mở lại','Approve reopening'),exact:true}).click();await reopenDialog.waitFor({state:'hidden'});
  assert.equal((await Task.findById(reopening.id)).status,'todo');assert.equal((await Task.findById(reopening.id)).completedAt,null);
  // Owner can reopen directly with a reason when no request is pending.
  const latest=await Task.findById(reopening.id);await work.status(auths[0],reopening.id,{expectedVersion:latest.version,status:'done'});await reviewer.reload();await reviewer.getByLabel(ui('Trạng thái','Status'),{exact:true}).selectOption('in_progress');
  const reason=reviewer.locator('.system-dialog');await reason.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('Owner direct reopening');await reason.getByRole('button',{name:ui('Mở lại Task','Reopen task'),exact:true}).click();await reason.waitFor({state:'hidden'});await reviewer.waitForFunction(()=>document.querySelector('.detail-meta-grid select')?.value==='in_progress');assert.equal((await Task.findById(reopening.id)).status,'in_progress');
  assert.deepEqual(errors,[]);console.log('PASS P1b1 '+theme+'/'+language+': real CAS rejection retains draft; committed PATCH response lost blocks repeat; Manager demoted mid-form gets403 with draft retained; Member reopening stays Done, promoted requester cannot self-review, Owner approval and direct reopen with reason. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/p1b-failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1500));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
