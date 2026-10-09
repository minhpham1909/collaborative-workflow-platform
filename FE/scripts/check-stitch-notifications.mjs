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
const {createOrganizationService}=await import('../../BE/src/organizations/service.js');
const {createMongoOrganizationStore}=await import('../../BE/src/organizations/mongo-store.js');
const {createNotificationsService}=await import('../../BE/src/notifications/service.js');
const {createMongoNotificationsStore}=await import('../../BE/src/notifications/mongo-store.js');
const {cutoffCodec}=await import('../../BE/src/notifications/input.js');
const {testConfig}=await import('../../BE/test-support/auth-store.js');
const out=fileURLToPath(new URL('../../.local/stitch-notifications/',import.meta.url));await mkdir(out,{recursive:true});
let repl,server,browser,origin;const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_fe_stitch_notifications_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:'http://localhost:5173',secureCookies:false},password='My Tasks browser fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),usersService=createUsersService({store:createMongoUsersStore()}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),organizations=createOrganizationService({store:createMongoOrganizationStore({config})});
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
  const org=(await organizations.create(auths[0],{name:'Studio Sài Gòn'})).organization;await organizations.invite(auths[0],org.id,{email:users[1].email});
  const guestProject=(await work.createProject(auths[0],inviteWs.id,{name:'Tài liệu cho khách'})).project;await work.inviteGuest(auths[0],guestProject.id,{type:'EMAIL',email:users[1].email});
  function app(){return createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,organizationService:organizations,notificationsService});}
  async function rotate(){if(server)await new Promise(resolve=>server.close(resolve));server=app().listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});let fail=false,delay=false,lost=false,writes=0;const reads=[];
  await context.route('http://localhost:4000/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/notifications'&&route.request().method()==='GET'){reads.push(url.search);if(fail)return route.abort();if(delay&&url.searchParams.get('q')==='Cập nhật')await new Promise(resolve=>setTimeout(resolve,850));}const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});if(route.request().method()==='POST'&&/\/notifications\/.+\/read$/.test(url.pathname)){writes++;if(lost){lost=false;return route.abort();}}await route.fulfill({response});});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:5173/');await page.getByLabel('Email',{exact:true}).fill(users[1].email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.locator('.studio-home').waitFor();
  async function ready(){await page.getByText('Đang tải thông báo…',{exact:true}).waitFor({state:'hidden'});await page.locator('.studio-note').first().waitFor();}
  await page.goto('http://localhost:5173/#notifications');await ready();assert.equal(await page.locator('.studio-note').count(),12);assert.equal(await page.getByText('Không thuộc inbox',{exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Bí mật không được hiển thị',exact:true}).count(),0);
  await page.getByRole('button',{name:'Tải thêm thông báo',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.studio-note').length===24);await page.locator('.notification-group[aria-label="Đã đọc trước đó"]').waitFor();
  for(const width of [1440,1280,1024,768,375]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+'/inbox-'+width+'.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Inbox overflow '+width);}await page.setViewportSize({width:1440,height:1000});
  await rotate();const first=page.locator('.studio-note.unread').filter({hasText:'Cập nhật thiết kế 0'}).first();await first.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await page.getByText('Đã đánh dấu đã đọc.',{exact:true}).waitFor();assert.ok((await Notification.findOne({eventId:'fixture-note-0'})).readAt);
  await page.getByRole('button',{name:/^Lọc nâng cao/}).click();await page.getByLabel('Loại thông báo',{exact:true}).selectOption('work');await page.getByLabel('Tìm thông báo',{exact:true}).fill('Cập nhật thiết kế');await ready();
  await page.getByRole('button',{name:'Đánh dấu tất cả đã đọc',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();await note(100,{createdAt:new Date(),readAt:null});await dialog.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await page.getByText('Đã đánh dấu 13 thông báo đã đọc.',{exact:true}).waitFor();assert.equal((await Notification.findOne({eventId:'fixture-note-100'})).readAt,null);assert.equal((await Notification.findById(masked.id)).readAt?.toISOString(),masked.readAt?.toISOString());
  await page.getByRole('button',{name:'Chưa đọc',exact:true}).click();await ready();assert.equal(await page.locator('.studio-note').count(),1);
  await page.locator('.studio-note').getByRole('link',{name:'Xem chi tiết',exact:true}).click();await page.getByRole('heading',{name:'Chi tiết thông báo',exact:true}).waitFor();await page.getByRole('link',{name:'Mở Task →',exact:true}).waitFor();await page.locator('.breadcrumbs').getByRole('link',{name:'Thông báo',exact:true}).click();await ready();assert.equal(await page.getByLabel('Tìm thông báo',{exact:true}).inputValue(),'Cập nhật thiết kế');
  await rotate();lost=true;const beforeWrites=writes;await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();await page.getByText('Chưa xác nhận kết quả. Tải lại trước khi thử tiếp.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).isDisabled(),true);assert.equal(writes,beforeWrites+1);await page.getByRole('button',{name:'Tải lại để kiểm tra',exact:true}).click();await page.getByRole('heading',{name:'Không có thông báo phù hợp',exact:true}).waitFor();
  await page.getByRole('button',{name:'Xóa bộ lọc thông báo',exact:true}).click();await ready();await page.getByRole('button',{name:/^Lọc nâng cao/}).click();await page.getByLabel('Từ ngày thông báo',{exact:true}).fill('2026-10-10');await page.getByLabel('Đến ngày thông báo',{exact:true}).fill('2026-10-01');await page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',{exact:true}).waitFor();const beforeReads=reads.length;await page.waitForTimeout(400);assert.equal(reads.length,beforeReads);assert.equal(await page.locator('.studio-note').count(),0);
  await page.getByRole('button',{name:'Xóa bộ lọc thông báo',exact:true}).click();await ready();await page.getByLabel('Tìm thông báo',{exact:true}).fill('Cập nhật');delay=true;await page.waitForTimeout(350);await page.getByLabel('Tìm thông báo',{exact:true}).fill('no-result-xyz');await page.getByRole('heading',{name:'Không có thông báo phù hợp',exact:true}).waitFor();await page.waitForTimeout(900);assert.equal(await page.locator('.studio-note').count(),0);delay=false;
  fail=true;await page.getByRole('button',{name:'Xóa bộ lọc thông báo',exact:true}).click();await page.getByRole('button',{name:'Tải lại để kiểm tra',exact:true}).waitFor();assert.equal(await page.locator('.studio-note').count(),0);fail=false;await page.getByRole('button',{name:'Tải lại để kiểm tra',exact:true}).click();await ready();
  await rotate();await WorkspaceMembership.collection.deleteOne({workspaceId:new mongoose.Types.ObjectId(ws.id),userId:users[1]._id});await page.getByRole('button',{name:'Tải lại thông báo',exact:true}).click();await ready();assert.equal(await page.getByRole('heading',{name:'Cập nhật thiết kế 100',exact:true}).count(),0);await page.getByLabel('Tìm thông báo',{exact:true}).fill('Cập nhật thiết kế');await page.getByRole('heading',{name:'Không có thông báo phù hợp',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Đánh dấu tất cả đã đọc',exact:true}).isDisabled(),true);
  await WorkspaceMembership.create({workspaceId:ws.id,userId:users[1].id,joinedAt:new Date()});await page.getByRole('button',{name:'Tải lại thông báo',exact:true}).click();await ready();await page.getByRole('heading',{name:'Cập nhật thiết kế 100',exact:true}).waitFor();assert.deepEqual(errors,[]);
  if(process.env.WORKFLOW_SKILL_PROBE==='1'){
    let source=await readFile('C:/Users/Acer/.agents/skills/ui-ux/scripts/probe.mjs','utf8');source=source.replace('chromium.launch();','chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});');
    const setup=`async function fixtureSetup(context){await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',process.env.WORKFLOW_FIXTURE_API)});await route.fulfill({response});});const response=await fetch(process.env.WORKFLOW_FIXTURE_API+'/auth/login',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({email:process.env.WORKFLOW_FIXTURE_EMAIL,password:process.env.WORKFLOW_FIXTURE_PASSWORD})});if(!response.ok)throw new Error('FIXTURE_LOGIN_FAILED');const cookie=response.headers.get('set-cookie').split(';')[0],pivot=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,pivot),value:cookie.slice(pivot+1),domain:'localhost',path:'/auth',httpOnly:true,secure:false,sameSite:'Strict'}]);}\n`;
    source=source.replace('async function probeWidth(',setup+'async function probeWidth(').replaceAll('const page = await context.newPage();','await fixtureSetup(context); const page = await context.newPage();').replaceAll('await context.close();',"await context.unrouteAll({behavior:'ignoreErrors'});await context.close();");const file=`${out}/probe-fixture.mjs`;await writeFile(file,source);
    for(const width of [375,768,1024,1280,1440]){const fixture=app().listen(0,'127.0.0.1');await once(fixture,'listening');const child=spawn(process.execPath,[file,'http://localhost:5173/#notifications','--widths',String(width),'--wait','1800','--pw','C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node','--out',`${out}/probe-mine-${width}`],{stdio:'inherit',env:{...process.env,WORKFLOW_FIXTURE_API:`http://127.0.0.1:${fixture.address().port}`,WORKFLOW_FIXTURE_EMAIL:users[1].email,WORKFLOW_FIXTURE_PASSWORD:password}});const result=await new Promise(resolve=>child.once('exit',resolve));await new Promise(resolve=>fixture.close(resolve));assert.equal(result,0);}
  }
  console.log('PASS S9a: own inbox/read groups/paging, masked targets, scoped signed read-all excluding new arrivals, single read, unknown write locked/readback, detail return, stale search, invalid dates/error retry, leave/rejoin privacy,5 widths; no providers or dev queues.');
}catch(error){console.log('Page errors:',errors);if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:`${out}/failure.png`,fullPage:true});console.log((await page.locator('main').allTextContents()).join('\n').slice(-2000));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
