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
const { createOrganizationService } = await import('../../BE/test-support/organizations/service.js');
const { createMongoOrganizationStore } = await import('../../BE/test-support/organizations/mongo-store.js');
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
const out=fileURLToPath(new URL('../../.local/calendar/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_pin_browser_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),organizations=createOrganizationService({store:createMongoOrganizationStore({config})}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),usersService=createUsersService({store:createMongoUsersStore()});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<3;i++){const user=await User.create({email:`journey-${i}@example.com`,displayName:['QA Owner','QA Member','QA Guest'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const org=(await organizations.create(auths[0],{name:'QA Studio'})).organization;
  const invite=await organizations.invite(auths[0],org.id,{email:users[1].email});await organizations.acceptInvitationById(auths[1],invite.invitation.id,{});
  const ws=(await organizations.createWorkspace(auths[0],org.id,{name:'QA Workspace'})).workspace;
  await organizations.addMember(auths[0],org.id,ws.id,{expectedVersion:ws.version,userId:users[1].id});
  const app=()=>createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,organizationService:organizations,notificationsService});
  async function rotate(){const previous=server;server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;if(previous)await new Promise(resolve=>previous.close(resolve));}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  async function pageFor(index){const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});const page=await context.newPage();await page.addInitScript(value=>localStorage.setItem('workflow.auth.locale',value),language);await page.addInitScript(value=>localStorage.setItem('workflow.theme',value),theme);page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/status of (401|404)/.test(message.text()))console.log('Browser diagnostic:',message.text().slice(0,1200));});page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/src/')||new URL(request.url()).pathname.startsWith('/assets/'))console.log('Asset request failure:',new URL(request.url()).pathname,request.failure()?.errorText);});await page.goto(feOrigin+'/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel(ui('Mật khẩu','Password'),{exact:true}).fill(password);await page.getByRole('button',{name:ui('Đăng nhập','Sign in'),exact:true}).click();await page.locator('.studio-home').waitFor();return page;}
  async function navigate(page,name){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();const menu=page.getByRole('dialog',{name:ui('Menu điều hướng','Navigation menu'),exact:true});await menu.getByRole('link',{name,exact:true}).click();await menu.waitFor({state:'hidden'});}else await page.getByRole('link',{name,exact:true}).first().click();}
  const project=(await work.createProject(auths[0],ws.id,{name:'Calendar Project'})).project,tasks=[];
  for(let i=0;i<20;i++)tasks.push((await work.createTask(auths[0],project.id,{title:'Calendar task '+i,assigneeId:users[0].id,dueAt:'2026-09-30T17:00:00.000Z'})).task);
  const none=(await work.createTask(auths[0],project.id,{title:'Calendar no deadline',assigneeId:users[0].id})).task;
  const owner=await pageFor(0);let fail=false,slow=false;
  await owner.context().route('**/my-calendar**',async route=>{if(fail)return route.abort();const url=new URL(route.request().url());if(slow&&url.searchParams.get('month')==='2026-11')await new Promise(resolve=>setTimeout(resolve,800));const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});
  async function ready(){await owner.locator('.calendar-task').first().waitFor();await owner.getByText(ui('Đang tải lịch…','Loading calendar…'),{exact:true}).waitFor({state:'hidden'});}
  await owner.goto(feOrigin+'/#calendar?month=2026-10&day=2026-10-01&status=all');await ready();assert.equal(await owner.locator('.calendar-task').count(),12);
  const first=owner.locator('[data-calendar-day="2026-10-01"]');assert.ok((await first.getAttribute('aria-label')).includes('20'));await owner.getByRole('button',{name:ui('Tải thêm công việc','Load more tasks'),exact:true}).click();await owner.waitForFunction(()=>document.querySelectorAll('.calendar-task').length===20);
  await first.focus();await first.press('ArrowRight');assert.equal(await owner.evaluate(()=>document.activeElement.dataset.calendarDay),'2026-10-02');await owner.locator('[data-calendar-day="2026-10-02"]').press('Enter');await owner.getByText(ui('Chưa có công việc phù hợp.','No matching tasks.'),{exact:true}).waitFor();
  await owner.getByRole('button',{name:new RegExp(ui('Không có deadline','No deadline'))}).click();await owner.getByRole('button',{name:'Calendar no deadline',exact:false}).waitFor();
  await owner.locator('.calendar-task > button').first().click();const panel=owner.getByRole('dialog');await panel.getByRole('heading',{name:'Calendar no deadline',exact:true}).waitFor();await panel.getByRole('link',{name:ui('Toàn trang ↗','Full page ↗'),exact:true}).click();await owner.locator('.studio-task-detail').waitFor();await owner.locator('main').getByRole('link',{name:ui('Lịch công việc','Work calendar'),exact:true}).click();await ready();assert.ok(owner.url().includes('day=none'));
  await rotate();slow=true;await owner.getByLabel(ui('Tháng','Month'),{exact:true}).fill('2026-11');await owner.waitForTimeout(350);await owner.getByLabel(ui('Tháng','Month'),{exact:true}).fill('2026-10');await ready();await owner.waitForTimeout(900);assert.equal(await owner.getByLabel(ui('Tháng','Month'),{exact:true}).inputValue(),'2026-10');assert.equal(await owner.locator('.calendar-task').count(),12);slow=false;
  for(const w of [375,768,1024,1280,1440]){await owner.setViewportSize({width:w,height:1000});await assertReadable(owner,'.calendar-heading p,.calendar-agenda h2,.calendar-task p');assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const size=await first.boundingBox();assert.ok(size.width>=44&&size.height>=44,'Calendar day hit target');await owner.screenshot({path:out+'/'+theme+'-'+language+'-'+w+'.png',fullPage:true});}
  await rotate();fail=true;await owner.getByRole('button',{name:ui('Làm mới','Refresh'),exact:true}).click();await owner.getByRole('button',{name:ui('Thử lại','Retry'),exact:true}).last().waitFor();assert.equal(await owner.locator('.calendar-task').count(),0);fail=false;await owner.getByRole('button',{name:ui('Thử lại','Retry'),exact:true}).last().click();await ready();
  const latest=(await work.getProject(auths[0],project.id)).project;await work.state(auths[0],project.id,{state:'archived',expectedVersion:latest.version});await rotate();await owner.locator('.compact-filter-bar > button[aria-expanded]').click();await owner.getByLabel(ui('Phạm vi','Scope'),{exact:true}).selectOption('all');await ready();await owner.locator('.calendar-task > button').first().click();await owner.getByRole('dialog').getByLabel(ui('Trạng thái','Status'),{exact:true}).waitFor();assert.equal(await owner.getByRole('dialog').getByLabel(ui('Trạng thái','Status'),{exact:true}).isDisabled(),true);await owner.getByRole('button',{name:ui('Đóng chi tiết Task','Close task details'),exact:true}).click();await ready();
  assert.deepEqual(errors,[]);console.log('PASS M4 '+theme+'/'+language+': full day counts20 versus page12, load20, keyboard selection, no deadline, panel/fullpage return, stale month race, empty/error retry, Archive readonly,5 widths44px/contrast/overflow; private fixtures only.');
}catch(error){if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('main').innerText()).slice(-1300));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
