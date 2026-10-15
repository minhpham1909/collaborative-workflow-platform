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
const out=fileURLToPath(new URL('../../.local/product-p5b/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const project=(await work.createProject(auths[0],ws.id,{name:'P5b calendar and inbox'})).project;
  const task=(await work.createTask(auths[0],project.id,{title:'P5b scheduled task',assigneeId:users[1].id,dueAt:'2030-01-02T02:30:00.000Z'})).task;
  const note=await Notification.findOne({recipientId:users[1].id,taskId:task.id});assert.ok(note,'Assignment service must create a real notification');
  const page=await pageFor(1);await page.goto(feOrigin+'/#calendar?month=2030-01&day=2030-01-02&status=all');await page.locator('.calendar-card[aria-busy=false]').waitFor();await page.locator('.calendar-agenda .calendar-task').first().waitFor();const selected=page.locator('[data-calendar-day="2030-01-02"]');assert.equal(await selected.getAttribute('aria-pressed'),'true');const badgeCount=await page.locator('.calendar-day-count').count();await selected.click();assert.equal(await page.locator('.calendar-day-count').count(),badgeCount);
  await page.locator('.calendar-task').getByRole('button',{name:task.title,exact:true}).click();const panel=page.getByRole('dialog',{name:ui('Chi tiết Task','Task details'),exact:true});await panel.locator('.detail-meta-grid').waitFor();await panel.getByRole('link',{name:ui('Toàn trang ↗','Full page ↗'),exact:true}).click();await panel.waitFor({state:'hidden'});await page.locator('.breadcrumbs').getByRole('link',{name:ui('Lịch công việc','Work calendar'),exact:true}).click();await page.locator('.calendar-card[aria-busy=false]').waitFor();assert.equal(await selected.getAttribute('aria-pressed'),'true');await page.locator('.calendar-agenda').getByRole('button',{name:task.title,exact:true}).waitFor();assert.equal(new URLSearchParams(page.url().split('?')[1]).get('month'),'2030-01');
  // Deleting the target redacts the notification, while read acknowledgment remains possible.
  await work.deleteTask(auths[0],task.id,{expectedVersion:task.version});await page.goto(feOrigin+'/#notification/'+note.id);await page.getByRole('heading',{name:ui('Nội dung không còn khả dụng','Content unavailable'),exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:ui('Mở Task →','Open task →'),exact:true}).count(),0);assert.equal(await page.getByText(task.title,{exact:true}).count(),0);await page.getByRole('button',{name:ui('Đánh dấu đã đọc','Mark as read'),exact:true}).click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(button=>/Đánh dấu đã đọc|Mark as read/.test(button.textContent)));assert.ok((await Notification.findById(note.id)).readAt);
  const other=(await work.createTask(auths[0],project.id,{title:'P5b membership private task',assigneeId:users[1].id})).task;const otherNote=await Notification.findOne({recipientId:users[1].id,taskId:other.id});const membership=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[1].id);await workspaces.remove(auths[0],ws.id,users[1].id,{expectedVersion:membership.version});await page.goto(feOrigin+'/#notification/'+otherNote.id);await page.getByRole('heading',{name:ui('Nội dung không còn khả dụng','Content unavailable'),exact:true}).waitFor();assert.equal(await page.getByText(other.title,{exact:true}).count(),0);assert.equal(await page.getByRole('link',{name:ui('Mở Task →','Open task →'),exact:true}).count(),0);assert.equal((await notificationsService.get(auths[1],String(otherNote.id))).notification.available,false);
  assert.deepEqual(errors,[]);console.log('PASS P5b '+theme+'/'+language+': Calendar selected day/month survive panel→full Task→return; repeated day retains badges; deleted or access-lost notification targets are redacted with no Task CTA; unavailable notification can be acknowledged. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1300));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
