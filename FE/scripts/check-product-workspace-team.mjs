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
const out=fileURLToPath(new URL('../../.local/product-p3b/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const owner=await pageFor(0),manager=await pageFor(3);
  async function team(page){await page.goto(feOrigin+'/#workspace/'+ws.id);await page.locator('.workspace-tabs').getByRole('button',{name:ui('Thành viên','Member'),exact:true}).click();await page.locator('.team-table tbody tr').first().waitFor();}
  await team(owner);let row=owner.locator('.team-table tbody tr').filter({hasText:'QA Member'});await row.getByRole('button',{name:ui('Bổ nhiệm Manager','Appoint Manager'),exact:true}).click();let dialog=owner.getByRole('dialog');await dialog.getByLabel(ui('Lý do thay đổi vai trò','Role-change reason'),{exact:true}).fill('P3b appoint second Manager');await dialog.getByRole('button',{name:ui('Bổ nhiệm Manager','Appoint Manager'),exact:true}).click();await dialog.waitFor({state:'hidden'});await row.getByRole('button',{name:ui('Hạ xuống Member','Demote to Member'),exact:true}).waitFor();assert.equal((await workspaces.members(auths[0],ws.id,{})).items.filter(person=>person.role==='manager').length,2);
  await team(manager);assert.equal(await manager.getByRole('button',{name:ui('Bổ nhiệm Manager','Appoint Manager'),exact:true}).count(),0);assert.equal(await manager.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).count(),0);
  await manager.locator('.workspace-tabs').getByRole('button',{name:ui('Lời mời','Invitations'),exact:true}).click();await manager.getByRole('button',{name:ui('+ Tạo lời mời','+ Create invitation'),exact:true}).click();dialog=manager.getByRole('dialog');await dialog.locator('select').selectOption('LINK');await dialog.getByRole('button',{name:ui('Tạo lời mời','Create invitation'),exact:true}).click();const link=await dialog.getByLabel(ui('Liên kết tham gia','Invitation link'),{exact:true}).inputValue();const token=new URLSearchParams(new URL(link).hash.slice(1)).get('token');assert.ok(token);await dialog.getByRole('button',{name:ui('Đóng kết quả','Close result'),exact:true}).click();
  await workspaces.accept(auths[2],{token});assert.equal((await workspaces.get(auths[2],ws.id)).workspace.role,'member');
  // The link can be revoked without removing the Member who already accepted it.
  const invitations=(await workspaces.invitations(auths[0],ws.id,{})).items;const linkInvitation=invitations.find(item=>item.type==='LINK'&&item.createdBy===users[3].id)??invitations.find(item=>item.type==='LINK'&&item.id!==admission.invitation.id);assert.ok(linkInvitation);
  await workspaces.revoke(auths[0],ws.id,linkInvitation.id,{expectedVersion:linkInvitation.version});await assert.rejects(workspaces.preview({token}),/INVITATION_UNAVAILABLE/u);assert.equal((await workspaces.get(auths[2],ws.id)).workspace.role,'member');
  // Owner transfer is protected by explicit confirmation before the request can be sent.
  row=owner.locator('.team-table tbody tr').filter({hasText:'QA Manager'});await row.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true}).click();dialog=owner.getByRole('dialog');const transfer=dialog.getByRole('button',{name:ui('Chuyển quyền sở hữu','Transfer ownership'),exact:true});assert.ok(await transfer.isDisabled());await dialog.getByLabel(ui('Nhập tên Workspace để xác nhận','Type the workspace name to confirm'),{exact:true}).fill(ws.name);await transfer.click();await dialog.waitFor({state:'hidden'});assert.equal((await workspaces.get(auths[3],ws.id)).workspace.role,'owner');assert.equal((await workspaces.get(auths[0],ws.id)).workspace.role,'member');
  const audit=await workspaces.roleAudit(auths[3],ws.id,{});assert.ok(audit.items.length>=3,'Appointment and ownership changes must be recorded');
  await manager.reload();await manager.locator('.workspace-tabs').waitFor();assert.ok(await manager.getByRole('button',{name:ui('Lưu trữ Workspace','Archive workspace'),exact:true}).isVisible());
  // Removing a Member through Team revokes access without deleting their account.
  await manager.locator('.workspace-tabs').getByRole('button',{name:ui('Thành viên','Member'),exact:true}).click();const removedRow=manager.locator('.team-table tbody tr').filter({hasText:'QA Guest'});await removedRow.getByRole('button',{name:ui('Gỡ khỏi nhóm','Remove from workspace'),exact:true}).click();dialog=manager.getByRole('dialog');await dialog.locator('button.primary').click();await dialog.waitFor({state:'hidden'});await assert.rejects(workspaces.get(auths[2],ws.id),/WORKSPACE_UNAVAILABLE|RESOURCE_UNAVAILABLE/u);assert.ok(await User.findById(users[2].id));
  const activeProject=(await work.createProject(auths[3],ws.id,{name:'P3b active project'})).project;
  let archivedProject=(await work.createProject(auths[3],ws.id,{name:'P3b independently archived'})).project;archivedProject=(await work.state(auths[3],archivedProject.id,{expectedVersion:archivedProject.version,state:'archived'})).project;
  const task=(await work.createTask(auths[3],activeProject.id,{title:'P3b lifecycle task'})).task;
  await manager.reload();await manager.getByRole('button',{name:ui('Lưu trữ Workspace','Archive workspace'),exact:true}).click();dialog=manager.locator('.workspace-state-dialog');let stateButton=dialog.getByRole('button',{name:ui('Lưu trữ Workspace','Archive workspace'),exact:true});assert.ok(await stateButton.isDisabled());await dialog.getByLabel(ui('Nhập lại tên Workspace','Type the workspace name again'),{exact:true}).fill(ws.name);await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('P3b archive acceptance');await stateButton.click();await dialog.waitFor({state:'hidden'});assert.equal((await workspaces.get(auths[3],ws.id)).workspace.state,'archived');assert.equal((await work.getTask(auths[3],task.id)).task.permissions.edit,false);
  await manager.getByRole('button',{name:ui('Mở lại Workspace','Reopen workspace'),exact:true}).click();dialog=manager.locator('.workspace-state-dialog');await dialog.getByLabel(ui('Nhập lại tên Workspace','Type the workspace name again'),{exact:true}).fill(ws.name);await dialog.getByLabel(ui('Lý do','Reason'),{exact:true}).fill('P3b reopen acceptance');await dialog.getByRole('button',{name:ui('Mở lại Workspace','Reopen workspace'),exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal((await workspaces.get(auths[3],ws.id)).workspace.state,'active');assert.equal((await work.getProject(auths[3],activeProject.id)).project.state,'active');assert.equal((await work.getProject(auths[3],archivedProject.id)).project.state,'archived');assert.equal((await work.getTask(auths[3],task.id)).task.permissions.edit,true);
  await manager.locator('.workspace-tabs').getByRole('button',{name:ui('Thành viên','Member'),exact:true}).click();
  const history=manager.locator('.workspace-role-audit:not(.workspace-management-audit)');await history.locator('summary').click();await history.locator('tbody tr').first().waitFor();assert.ok(await history.locator('tbody tr').count()>=3);await history.getByText('P3b appoint second Manager',{exact:true}).waitFor();for(const page of [owner,manager])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);console.log('PASS P3b '+theme+'/'+language+': Owner appoints multiple Managers; Manager cannot appoint/transfer; Manager creates link, admission Member, revocation preserves accepted Member; confirmed transfer demotes prior Owner and records history; UI removes Member; archive makes Task readonly and reopen retains individual Project states. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1400));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
