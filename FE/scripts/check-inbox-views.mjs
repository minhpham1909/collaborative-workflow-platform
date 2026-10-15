import {assertReadable} from './theme-contrast.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
const {MongoMemoryReplSet}=await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const {default:mongoose}=await import('../../BE/node_modules/mongoose/index.js');
const {models,User,WorkspaceMembership,Task,Notification}=await import('../../BE/src/models/index.js');
const {createApp}=await import('../../BE/src/app.js');
const {createAuthService}=await import('../../BE/src/auth/service.js');
const {createMongoAuthStore}=await import('../../BE/src/auth/mongo-store.js');
const {createUsersService}=await import('../../BE/src/users/service.js');
const {createMongoUsersStore}=await import('../../BE/src/users/mongo-store.js');
const {hashPassword}=await import('../../BE/src/auth/passwords.js');
const {createWorkspaceService}=await import('../../BE/src/workspaces/service.js');
const {createMongoWorkspaceStore}=await import('../../BE/src/workspaces/mongo-store.js');
const {createWorkService}=await import('../../BE/src/work/service.js');
const {createMongoWorkStore}=await import('../../BE/src/work/mongo-store.js');
const {createNotificationsService}=await import('../../BE/src/notifications/service.js');
const {createMongoNotificationsStore}=await import('../../BE/src/notifications/mongo-store.js');
const {cutoffCodec}=await import('../../BE/src/notifications/input.js');
const {testConfig}=await import('../../BE/test-support/auth-store.js');
const out=fileURLToPath(new URL('../../.local/inbox-views/',import.meta.url));await mkdir(out,{recursive:true});
let repl,server,browser,origin;const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_fe_stitch_notifications_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:'http://localhost:5173',secureCookies:false},password='My Tasks browser fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),usersService=createUsersService({store:createMongoUsersStore()}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<3;i++){const user=new User({email:`mine-ui-${i}@example.com`,displayName:['Minh','Lan','Hải'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'test',acceptedAt:new Date()}});await user.save();users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const ws=(await workspaces.create(auths[0],{name:'Sáng Tạo Studio'})).workspace;
  await WorkspaceMembership.create({workspaceId:ws.id,userId:users[1].id,joinedAt:new Date()});
  const project=(await work.createProject(auths[0],ws.id,{name:'Website Bloom'})).project;
  const task=(await work.createTask(auths[0],project.id,{title:'Thiết kế đang hoạt động',assigneeId:users[1].id})).task;
  const missing=(await work.createTask(auths[0],project.id,{title:'Bí mật không được hiển thị'})).task;
  await work.deleteTask(auths[0],missing.id,{expectedVersion:missing.version});
  await Notification.collection.deleteMany({});
  const base=Date.now();
  async function note(index,options={}) {return Notification.create({eventId:'fixture-note-'+index,recipientId:users[1].id,category:'work',workspaceId:ws.id,taskId:task.id,actorId:users[0].id,changes:[index%2?'comment':'assignment'],payload:{taskTitle:'Cập nhật thiết kế '+index,workspaceName:ws.name,actorDisplayName:'Minh'},createdAt:new Date(base-index*3600000),readAt:index>=14?new Date(base):null,...options});}
  for(let i=0;i<20;i++)await note(i);
  const masked=await note(21,{taskId:missing.id,payload:{taskTitle:'Bí mật không được hiển thị',workspaceName:ws.name,actorDisplayName:'Minh'},createdAt:new Date(base)});
  await note(22,{recipientId:users[2].id,payload:{taskTitle:'Không thuộc inbox',workspaceName:ws.name,actorDisplayName:'Minh'}});
  const inviteWs=(await workspaces.create(auths[0],{name:'Nhóm Marketing'})).workspace;const wsInvitation=await workspaces.invite(auths[0],inviteWs.id,{type:'EMAIL',email:users[1].email});await Notification.create({eventId:'fixture-delivered-invitation',recipientId:users[1].id,category:'invitation',workspaceId:inviteWs.id,invitationId:wsInvitation.invitation.id,payload:{workspaceName:inviteWs.name,actorDisplayName:'Minh'}});
  const guestProject=(await work.createProject(auths[0],inviteWs.id,{name:'Tài liệu cho khách'})).project;await work.inviteGuest(auths[0],guestProject.id,{type:'EMAIL',email:users[1].email});
  function app(){return createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,notificationsService});}
  async function rotate(){if(server)await new Promise(resolve=>server.close(resolve));server=app().listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:process.env.WORKFLOW_VIEW_THEME==='dark'?'dark':'light'});let fail=false,delay=false,lost=false,writes=0;const reads=[];
  await context.route('http://localhost:4000/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/notifications'&&route.request().method()==='GET'){reads.push(url.search);if(fail)return route.abort();if(delay&&url.searchParams.get('q')==='Cập nhật')await new Promise(resolve=>setTimeout(resolve,850));}const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});if(route.request().method()==='POST'&&/\/notifications\/.+\/read$/.test(url.pathname)){writes++;if(lost){lost=false;return route.abort();}}await route.fulfill({response});});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:5173/');await page.getByLabel('Email',{exact:true}).fill(users[1].email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.locator('.studio-home').waitFor();
  async function ready(){await page.getByText('Đang tải thông báo…',{exact:true}).waitFor({state:'hidden'});await page.locator('.studio-note').first().waitFor();}
  await page.goto('http://localhost:5173/#notifications?category=organization_invitation');await ready();assert.equal(await page.locator('option[value=organization_invitation]').count(),0);assert.equal(await page.locator('select').filter({has:page.locator('option[value=work]')}).inputValue(),'all');assert.ok(!reads.at(-1).includes('organization_invitation'));
  const initialIds=await page.locator('.studio-note').evaluateAll(els=>els.map(el=>el.dataset.noteId));const beforeReads=reads.length,beforeWrites=writes;
  const detailedHeight=(await page.locator('.studio-note').last().boundingBox()).height;
  await page.getByRole('button',{name:'Thu gọn',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Thu gọn',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(await page.locator('.studio-note').evaluateAll(els=>els.map(el=>el.dataset.noteId)),initialIds);assert.ok((await page.locator('.studio-note').last().boundingBox()).height<detailedHeight);
  await page.waitForTimeout(400);assert.equal(reads.length,beforeReads);assert.equal(writes,beforeWrites);
  await page.getByRole('button',{name:'Tải thêm thông báo',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.studio-note').length===23);
  const anchor=page.locator('.studio-note').filter({hasText:'Cập nhật thiết kế 18'});await anchor.scrollIntoViewIfNeeded();const offset=(await anchor.boundingBox()).y;
  await anchor.getByRole('link',{name:'Mở Task →',exact:true}).click();await page.locator('.studio-task-detail').waitFor();await page.getByRole('link',{name:'Thông báo',exact:true}).click();await ready();await page.waitForFunction(()=>document.querySelectorAll('.studio-note').length===23);await page.waitForTimeout(250);
  assert.ok(Math.abs((await anchor.boundingBox()).y-offset)<3,'Task return position');assert.equal(await page.getByRole('button',{name:'Thu gọn',exact:true}).getAttribute('aria-pressed'),'true');
  await anchor.getByRole('link',{name:'Xem chi tiết',exact:true}).click();await page.getByRole('heading',{name:'Chi tiết thông báo',exact:true}).waitFor();assert.equal(await page.locator('.notification-view-compact').count(),0);await page.getByRole('link',{name:'Thông báo',exact:true}).click();await ready();await page.waitForFunction(()=>document.querySelectorAll('.studio-note').length===23);
  await page.reload();await ready();assert.equal(await page.getByRole('button',{name:'Thu gọn',exact:true}).getAttribute('aria-pressed'),'true');
  await rotate();await page.evaluate(()=>localStorage.setItem('workflow.auth.locale','en'));await page.reload();await page.getByRole('button',{name:'Compact',exact:true}).waitFor();await ready();
  for(const mode of ['Detailed','Compact']){await page.getByRole('button',{name:mode,exact:true}).click();await page.waitForTimeout(250);for(const width of [375,768,1024,1280,1440]){await page.setViewportSize({width,height:1000});await assertReadable(page,'.studio-note p,.studio-note h3,.collection-view button');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/'+mode+'-'+width+'.png',fullPage:true});}}
  await page.evaluate(()=>{const original=localStorage.setItem.bind(localStorage);Storage.prototype.setItem=function(key,value){if(key.startsWith('workflow.view.'))throw Error('Blocked preference write');return original(key,value);};});await page.getByRole('button',{name:'Detailed',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Detailed',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);console.log('PASS M3a '+(process.env.WORKFLOW_VIEW_THEME??'light')+': view density/persistence/no read or cursor mutation; Task/detail return fresh 2-page position; full detail; 2 modes/5 widths EN; blocked storage remains usable. Isolated fixtures only.');
}catch(error){if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('main').innerText({timeout:500}).catch(()=>page.locator('body').innerText({timeout:500}).catch(()=>''))).slice(-1400));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
