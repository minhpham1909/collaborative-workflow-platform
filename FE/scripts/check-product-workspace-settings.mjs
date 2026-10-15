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
const out=fileURLToPath(new URL('../../.local/product-p3a/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const owner=await pageFor(0),manager=await pageFor(3),member=await pageFor(1);
  async function settings(page){await page.goto(feOrigin+'/#workspace/'+ws.id);await page.locator('.workspace-tabs').getByRole('button',{name:ui('Cài đặt nhóm','Workspace settings'),exact:true}).click();await page.getByLabel(ui('Tên Workspace','Workspace name'),{exact:true}).waitFor();}
  const name=page=>page.getByLabel(ui('Tên Workspace','Workspace name'),{exact:true});
  const save=page=>page.getByRole('button',{name:ui('Lưu cài đặt','Save settings'),exact:true});
  await settings(owner);await name(owner).fill('P3a team metadata');await owner.getByLabel(ui('Mục tiêu ngắn','Short goal'),{exact:true}).fill('P3a clear team goal');await owner.getByLabel(ui('Màu nhận diện','Identity color'),{exact:true}).selectOption('mint');await owner.getByLabel(ui('Ảnh bìa mẫu','Cover preset'),{exact:true}).selectOption('campaign');await owner.getByRole('textbox',{name:ui('Mô tả Workspace','Workspace description'),exact:true}).fill('P3a detailed working agreement');
  let response=owner.waitForResponse(r=>r.url().endsWith('/workspaces/'+ws.id)&&r.request().method()==='PATCH');await save(owner).click();assert.equal((await response).status(),200);await owner.getByText(ui('Đã lưu cài đặt.','Settings saved.'),{exact:true}).waitFor();let current=(await workspaces.get(auths[0],ws.id)).workspace;assert.equal(current.name,'P3a team metadata');assert.equal(current.summary,'P3a clear team goal');assert.equal(current.color,'mint');assert.equal(current.coverId,'campaign');assert.equal(current.description.plainText,'P3a detailed working agreement');
  // Cancel returns to the persisted snapshot after explicit discard confirmation.
  await name(owner).fill('P3a discarded name');await owner.getByRole('button',{name:ui('Hủy thay đổi','Discard changes'),exact:true}).click();await owner.locator('.system-dialog .primary').click();await owner.waitForFunction(()=>document.querySelector('input[maxlength="200"]')?.value==='P3a team metadata');assert.equal((await workspaces.get(auths[0],ws.id)).workspace.name,'P3a team metadata');
  await member.goto(feOrigin+'/#workspace/'+ws.id);await member.locator('.workspace-tabs').waitFor();assert.equal(await member.locator('.workspace-tabs').getByRole('button',{name:ui('Cài đặt nhóm','Workspace settings'),exact:true}).count(),0);
  // Manager may edit metadata; stale version cannot overwrite the Owner's update.
  await settings(manager);await name(manager).fill('P3a stale manager draft');current=(await workspaces.get(auths[0],ws.id)).workspace;await workspaces.update(auths[0],ws.id,{expectedVersion:current.version,name:'P3a concurrent owner winner'});
  response=manager.waitForResponse(r=>r.url().endsWith('/workspaces/'+ws.id)&&r.request().method()==='PATCH');await save(manager).click();assert.equal((await response).status(),409);await manager.locator('.project-info [role=alert]').waitFor();assert.equal(await name(manager).inputValue(),'P3a stale manager draft');assert.equal((await workspaces.get(auths[0],ws.id)).workspace.name,'P3a concurrent owner winner');
  // Metadata write commits, but the browser never receives its result.
  const lost=await pageFor(0);await settings(lost);await name(lost).fill('P3a committed response lost');let writes=0;
  await lost.route('**/workspaces/'+ws.id,async route=>{if(route.request().method()!=='PATCH')return route.fallback();writes++;const result=await route.fetch({url:origin+'/workspaces/'+ws.id});assert.equal(result.status(),200);await route.abort('failed');});
  await save(lost).click();await lost.getByText(ui('Chưa xác nhận đã lưu. Tải lại cài đặt để kiểm tra trước khi gửi tiếp.','Saving is unconfirmed. Reload settings before submitting again.'),{exact:false}).waitFor();assert.ok(await save(lost).isDisabled());assert.equal(writes,1);assert.equal((await workspaces.get(auths[0],ws.id)).workspace.name,'P3a committed response lost');
  await lost.unroute('**/workspaces/'+ws.id);await lost.getByRole('button',{name:ui('Tải lại cài đặt','Reload settings'),exact:true}).click();await lost.locator('.system-dialog').getByRole('button',{name:ui('Hủy','Cancel'),exact:true}).click();assert.equal(await name(lost).inputValue(),'P3a committed response lost');assert.ok(await save(lost).isDisabled());await lost.getByRole('button',{name:ui('Tải lại cài đặt','Reload settings'),exact:true}).click();await lost.locator('.system-dialog .primary').click();await lost.waitForFunction(()=>document.querySelector('input[maxlength="200"]')?.value==='P3a committed response lost');assert.ok(await save(lost).isEnabled());assert.equal(writes,1);
  // Losing management authority while editing leaves an explicit copyable draft.
  const demoted=await pageFor(3);await settings(demoted);await name(demoted).fill('P3a retained after demotion');const membership=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[3].id);await workspaces.role(auths[0],ws.id,users[3].id,{expectedVersion:membership.version,role:'member',reason:'P3a settings demotion'});
  response=demoted.waitForResponse(r=>r.url().endsWith('/workspaces/'+ws.id)&&r.request().method()==='PATCH');await save(demoted).click();assert.equal((await response).status(),403);await demoted.locator('.workspace-blocked-draft textarea').waitFor();assert.match(await demoted.locator('.workspace-blocked-draft textarea').inputValue(),/P3a retained after demotion/u);assert.equal((await workspaces.get(auths[0],ws.id)).workspace.name,'P3a committed response lost');
  // Loading failure also has a local retry; routine refresh remains absent.
  const retryPage=await pageFor(0);await retryPage.goto(feOrigin+'/#workspace/'+ws.id);await retryPage.locator('.workspace-tabs').waitFor();
  await retryPage.route('**/workspaces/'+ws.id,route=>route.request().method()==='GET'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE'}})}):route.fallback());
  await retryPage.locator('.workspace-tabs').getByRole('button',{name:ui('Cài đặt nhóm','Workspace settings'),exact:true}).click();await retryPage.getByRole('button',{name:ui('Tải lại cài đặt','Reload settings'),exact:true}).waitFor();await retryPage.unroute('**/workspaces/'+ws.id);await retryPage.getByRole('button',{name:ui('Tải lại cài đặt','Reload settings'),exact:true}).click();await name(retryPage).waitFor();assert.equal(await name(retryPage).inputValue(),'P3a committed response lost');
  for(const page of [lost,demoted])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log('PASS P3a '+theme+'/'+language+': metadata save/cancel, Member read-only, Manager CAS draft, lost committed response reload recovery without repeat write, demotion copyable draft. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1600));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:"ignoreErrors"});await context.unrouteAll({behavior:"ignoreErrors"});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
