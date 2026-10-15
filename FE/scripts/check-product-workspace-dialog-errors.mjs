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
const out=fileURLToPath(new URL('../../.local/product-p3d/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const manager=await pageFor(3);
  async function invitations(page){await page.goto(feOrigin+'/#workspace/'+ws.id);await page.locator('.workspace-tabs').getByRole('button',{name:ui('Lời mời','Invitations'),exact:true}).click();await page.getByRole('button',{name:ui('+ Tạo lời mời','+ Create invitation'),exact:true}).click();return page.getByRole('dialog');}
  async function closeBlocked(page,dialog){await dialog.getByRole('button',{name:ui('Đóng','Close'),exact:true}).click();await page.locator('.system-dialog .primary').click();await dialog.waitFor({state:'hidden'});}
  // A committed invitation can be followed by a gateway error; never send it twice.
  let dialog=await invitations(manager);await dialog.getByLabel(ui('Email người nhận','Recipient email'),{exact:true}).fill('p3d-recipient@example.invalid');let invitationWrites=0;
  await manager.route('**/workspaces/'+ws.id+'/invitations',async route=>{if(route.request().method()!=='POST')return route.fallback();invitationWrites++;const result=await route.fetch({url:origin+'/workspaces/'+ws.id+'/invitations'});assert.ok(result.ok());await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:{code:'BAD_GATEWAY'}})});});
  await dialog.getByRole('button',{name:ui('Tạo lời mời','Create invitation'),exact:true}).click();await dialog.getByText(ui('Chưa xác nhận được kết quả. Đóng và làm mới danh sách trước khi thao tác lại.','The outcome is unconfirmed. Close and refresh the list before trying again.'),{exact:true}).waitFor();assert.ok(await dialog.getByRole('button',{name:ui('Tạo lời mời','Create invitation'),exact:true}).isDisabled());assert.equal(invitationWrites,1);assert.equal((await workspaces.invitations(auths[0],ws.id,{})).items.filter(item=>item.email==='p3d-recipient@example.invalid').length,1);
  await manager.unroute('**/workspaces/'+ws.id+'/invitations');await closeBlocked(manager,dialog);await manager.locator('.team-table').getByText('p3d-recipient@example.invalid',{exact:true}).waitFor();assert.equal(invitationWrites,1);
  // A Manager demoted while composing cannot create another invitation.
  await manager.getByRole('button',{name:ui('+ Tạo lời mời','+ Create invitation'),exact:true}).click();dialog=manager.getByRole('dialog');await dialog.getByLabel(ui('Email người nhận','Recipient email'),{exact:true}).fill('p3d-forbidden@example.invalid');const membership=(await workspaces.members(auths[0],ws.id,{})).items.find(item=>item.userId===users[3].id);await workspaces.role(auths[0],ws.id,users[3].id,{expectedVersion:membership.version,role:'member',reason:'P3d mid-dialog permission loss'});let response=manager.waitForResponse(r=>r.url().endsWith('/invitations')&&r.request().method()==='POST');await dialog.getByRole('button',{name:ui('Tạo lời mời','Create invitation'),exact:true}).click();assert.equal((await response).status(),403);await dialog.getByRole('alert').waitFor();assert.equal((await workspaces.invitations(auths[0],ws.id,{})).items.filter(item=>item.email==='p3d-forbidden@example.invalid').length,0);assert.equal(await dialog.getByLabel(ui('Email người nhận','Recipient email'),{exact:true}).inputValue(),'p3d-forbidden@example.invalid');
  async function transfer(page,workspaceName){await page.goto(feOrigin+'/#workspace/'+ws.id);await page.locator('.workspace-tabs').getByRole('button',{name:ui('Thành viên','Member'),exact:true}).click();await page.locator('.team-table tbody tr').filter({hasText:'QA Manager'}).getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).click();const modal=page.getByRole('dialog');await modal.getByLabel(ui('Nhập tên Workspace để xác nhận','Type the workspace name to confirm'),{exact:true}).fill(workspaceName);return modal;}
  const owner=await pageFor(0);dialog=await transfer(owner,ws.name);let current=(await workspaces.get(auths[0],ws.id)).workspace;await workspaces.update(auths[0],ws.id,{expectedVersion:current.version,name:'P3d renamed during transfer'});response=owner.waitForResponse(r=>r.url().endsWith('/ownership')&&r.request().method()==='PATCH');await dialog.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).click();assert.equal((await response).status(),409);await dialog.getByRole('alert').waitFor();assert.ok(await dialog.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).isDisabled());assert.equal((await workspaces.get(auths[0],ws.id)).workspace.role,'owner');
  // Another Owner session opens fresh data; transfer commits, but its response is lost.
  const lost=await pageFor(0);dialog=await transfer(lost,'P3d renamed during transfer');let transfers=0;
  await lost.route('**/workspaces/'+ws.id+'/ownership',async route=>{transfers++;const result=await route.fetch({url:origin+'/workspaces/'+ws.id+'/ownership'});assert.ok(result.ok());await route.abort('failed');});await dialog.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).click();await dialog.getByRole('alert').waitFor();assert.ok(await dialog.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).isDisabled());assert.equal(transfers,1);assert.equal((await workspaces.get(auths[3],ws.id)).workspace.role,'owner');assert.equal((await workspaces.get(auths[0],ws.id)).workspace.role,'member');await lost.unroute('**/workspaces/'+ws.id+'/ownership');await closeBlocked(lost,dialog);await lost.waitForFunction(()=>!document.querySelector('.workspace-tabs button[aria-pressed]')||!Array.from(document.querySelectorAll('.team-member-actions button')).some(button=>/Transfer ownership|Chuyển quyền sở hữu/.test(button.textContent)));assert.equal(transfers,1);
  assert.deepEqual(errors,[]);console.log('PASS P3d '+theme+'/'+language+': invitation committed then502 reported uncertain/no duplicate/read-back; demoted Manager invitation403 retains input; ownership CAS409; committed ownership response lost blocks repeat and reconciles old Owner to Member. No SMTP/dev data.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1300));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
