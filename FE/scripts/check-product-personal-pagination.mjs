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
const out=fileURLToPath(new URL('../../.local/product-p5c/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const project=(await work.createProject(auths[0],ws.id,{name:'P5c pagination'})).project;
  for(let i=0;i<64;i++)await work.createTask(auths[0],project.id,{title:'P5c scheduled '+i,assigneeId:users[1].id,dueAt:'2030-01-02T02:30:00.000Z'});
  for(const kind of ['mine','calendar']){
    const page=await pageFor(1),selector=kind==='mine'?'.my-task-row':'.calendar-task';await page.goto(feOrigin+'/'+(kind==='mine'?'#mine':'#calendar?month=2030-01&day=2030-01-02&status=all'));await page.waitForFunction(sel=>document.querySelectorAll(sel).length===12,selector);
    for(const count of [24,36,48]){await page.locator('.collection-load-more').scrollIntoViewIfNeeded();await page.waitForFunction(({sel,count})=>document.querySelectorAll(sel).length===count,{sel:selector,count});}
    await page.getByText(ui('Đã dừng tự tải sau 3 trang. Dùng Tải thêm để tiếp tục.','Automatic loading paused after 3 pages. Use Load more to continue.'),{exact:true}).waitFor();await page.waitForTimeout(250);assert.equal(await page.locator(selector).count(),48);
    const more=page.getByRole('button',{name:ui('Tải thêm công việc','Load more tasks'),exact:true});await more.click();await page.waitForFunction(sel=>document.querySelectorAll(sel).length===60,selector);assert.equal(new Set(await page.locator(selector).evaluateAll(els=>els.map(el=>el.dataset.taskId))).size,60);
    if(kind==='mine'){
      let release,started;const gate=new Promise(resolve=>release=resolve),begun=new Promise(resolve=>started=resolve);await page.route('**/my-tasks?*',async route=>{const url=new URL(route.request().url());if(!url.searchParams.has('cursor'))return route.fallback();const result=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});started();await gate;await route.fulfill({response:result});});
      const oldResponse=page.waitForResponse(r=>r.url().includes('/my-tasks?')&&new URL(r.url()).searchParams.has('cursor'));await more.click();await begun;await page.getByLabel(ui('Tìm Task','Search tasks'),{exact:true}).fill('P5c no matches');await page.locator('.my-task-groups .empty').waitFor();release();await oldResponse;await page.waitForTimeout(100);assert.equal(await page.locator(selector).count(),0);await page.unroute('**/my-tasks?*');
    }else{
      await page.getByLabel(ui('Tự tải khi cuộn','Load automatically when scrolling'),{exact:true}).uncheck();await page.evaluate(()=>{window.IntersectionObserver=undefined;});let anchor=page.locator(selector).nth(54);const id=await anchor.getAttribute('data-task-id');await anchor.scrollIntoViewIfNeeded();await anchor.getByRole('button').click();const panel=page.getByRole('dialog',{name:ui('Chi tiết Task','Task details'),exact:true});await panel.locator('.detail-meta-grid').waitFor();const offset=(await anchor.boundingBox()).y;await panel.getByRole('link',{name:ui('Toàn trang ↗','Full page ↗'),exact:true}).click();await panel.waitFor({state:'hidden'});const current=(await work.getTask(auths[0],id)).task;await work.updateTask(auths[0],id,{expectedVersion:current.version,title:'P5c fresh calendar return'});await page.locator('.breadcrumbs').getByRole('link',{name:ui('Lịch công việc','Work calendar'),exact:true}).click();await page.waitForFunction(sel=>document.querySelectorAll(sel).length===60,selector);anchor=page.locator('.calendar-task[data-task-id="'+id+'"]');await anchor.getByRole('button',{name:'P5c fresh calendar return',exact:true}).waitFor();await page.waitForTimeout(150);assert.ok(Math.abs((await anchor.boundingBox()).y-offset)<4,'Calendar5-page anchor restoration expected '+offset+' got '+(await anchor.boundingBox()).y);assert.equal(await page.locator('[data-calendar-day="2030-01-02"]').getAttribute('aria-pressed'),'true');
    }
  }
  assert.deepEqual(errors,[]);console.log('PASS P5c '+theme+'/'+language+': My Tasks/Calendar auto3-page cap and manual continuation/dedup; stale My Tasks cursor cannot overwrite new filter; Calendar restores5 fresh pages/day/anchor after full Task. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1300));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
