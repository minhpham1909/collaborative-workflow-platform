import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
const {MongoMemoryReplSet}=await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const {default:mongoose}=await import('../../BE/node_modules/mongoose/index.js');
const {models,User,WorkspaceMembership,Task}=await import('../../BE/src/models/index.js');
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
const out=fileURLToPath(new URL('../../.local/stitch-my-tasks/',import.meta.url));await mkdir(out,{recursive:true});
let repl,server,browser,origin;const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_fe_stitch_my_tasks_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:'http://localhost:5173',secureCookies:false},password='My Tasks browser fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),usersService=createUsersService({store:createMongoUsersStore()}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),organizations=createOrganizationService({store:createMongoOrganizationStore({config})});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<3;i++){const user=new User({email:`mine-ui-${i}@example.com`,displayName:['Minh','Lan','Hải'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'test',acceptedAt:new Date()}});await user.save();users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const ws=(await workspaces.create(auths[0],{name:'Sáng Tạo Studio'})).workspace,other=(await workspaces.create(auths[0],{name:'Sản phẩm & Kỹ thuật'})).workspace;
  for(const workspace of [ws,other])await WorkspaceMembership.create({workspaceId:workspace.id,userId:users[1].id,joinedAt:new Date()});
  const project=(await work.createProject(auths[0],ws.id,{name:'Website Bloom',icon:'palette'})).project,second=(await work.createProject(auths[0],other.id,{name:'Workflow Design System',icon:'code'})).project;
  const label=(await work.createLabel(auths[0],project.id,{name:'Thiết kế',color:'lavender'})).label;
  const now=new Date();now.setSeconds(0,0);const future=new Date(now.getTime()+2*86400_000).toISOString(),today=new Date(now.getTime()+30*60_000).toISOString(),past=new Date(now.getTime()-2*86400_000).toISOString();
  for(let i=0;i<14;i++)await work.createTask(auths[0],project.id,{title:'Tài liệu không deadline '+i,assigneeId:users[1].id,priority:'low'});
  const upcoming=(await work.createTask(auths[0],second.id,{title:'Rà soát Design Tokens và chuẩn hóa các trạng thái tương tác cho toàn bộ giao diện',assigneeId:users[1].id,dueAt:future,priority:'medium'})).task;
  const dueToday=(await work.createTask(auths[0],project.id,{title:'Hoàn thiện wireframe',assigneeId:users[1].id,dueAt:today,priority:'medium',labelIds:[label.id]})).task;
  const overdue=(await work.createTask(auths[0],project.id,{title:'Soạn tài liệu phản hồi thiết kế',assigneeId:users[1].id,dueAt:past,priority:'high',labelIds:[label.id]})).task;
  let done=(await work.createTask(auths[0],project.id,{title:'Bộ nhận diện hoàn thành',assigneeId:users[1].id,dueAt:past})).task;done=(await work.status(auths[0],done.id,{expectedVersion:done.version,status:'done'})).task;
  await work.createTask(auths[0],project.id,{title:'Hidden unassigned'});await work.createTask(auths[0],project.id,{title:'Hidden other assignee',assigneeId:users[0].id});
  const archivedProject=(await work.createProject(auths[0],ws.id,{name:'Tài liệu cũ'})).project;await work.createTask(auths[0],archivedProject.id,{title:'Công việc trong dự án lưu trữ',assigneeId:users[1].id});await work.state(auths[0],archivedProject.id,{state:'archived',expectedVersion:archivedProject.version});
  function app(){return createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,organizationService:organizations,notificationsService});}
  async function rotate(){if(server)await new Promise(resolve=>server.close(resolve));server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});let fail=false,delay=false;const reads=[];
  await context.route('http://localhost:4000/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/my-tasks'){reads.push(url.search);if(fail)return route.abort();if(delay&&url.searchParams.get('q')==='Hoàn')await new Promise(resolve=>setTimeout(resolve,850));}const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:5173/');await page.getByLabel('Email',{exact:true}).fill(users[1].email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.locator('.studio-home').waitFor();
  await page.goto('http://localhost:5173/#mine');await page.locator('.my-task-groups[aria-busy=false]').waitFor();
  assert.equal(await page.locator('.my-task-row').count(),12);await page.getByText('17 công việc phù hợp · 2 Workspace',{exact:false}).waitFor();assert.equal(await page.getByRole('link',{name:'Hidden unassigned',exact:true}).count(),0);
  await page.getByRole('button',{name:'Tải thêm công việc',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.my-task-row').length===17);assert.equal(await page.locator('.group-no_deadline .my-task-row').count(),14);
  await page.getByRole('button',{name:'Tất cả',exact:true}).click();await page.getByRole('link',{name:done.title,exact:true}).waitFor();assert.equal(await page.locator('.group-completed').count(),1);assert.equal(await page.locator('.group-overdue .my-task-row').count(),1);
  for(const width of [1440,1280,1024,768,375]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${out}/mine-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width}`);}await page.setViewportSize({width:1440,height:1000});
  await rotate();await page.getByRole('button',{name:/^Lọc nâng cao/}).click();await page.getByLabel('Workspace',{exact:true}).selectOption(ws.id);await page.getByLabel('Project',{exact:true}).selectOption(project.id);await page.getByLabel('Nhãn',{exact:true}).selectOption(label.id);await page.getByLabel('Ưu tiên',{exact:true}).selectOption('high');await page.locator('.my-task-groups[aria-busy=false]').waitFor();assert.equal(await page.locator('.my-task-row').count(),1);await page.getByRole('link',{name:overdue.title,exact:true}).waitFor();
  await page.getByRole('button',{name:'Xóa bộ lọc Task',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();await page.getByLabel('Tìm Task',{exact:true}).fill('Hoàn');delay=true;await page.waitForTimeout(350);await page.getByLabel('Tìm Task',{exact:true}).fill('Soạn');await page.locator('.my-task-groups[aria-busy=false]').waitFor();await page.waitForTimeout(900);assert.equal(await page.locator('.my-task-row').count(),1);assert.equal(await page.locator('.my-task-row h3').innerText(),overdue.title);delay=false;
  await page.getByRole('link',{name:overdue.title,exact:true}).click();await page.getByRole('dialog',{name:'Chi tiết Task',exact:true}).waitFor();await page.getByRole('button',{name:'Đóng chi tiết Task',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();assert.equal(await page.getByLabel('Tìm Task',{exact:true}).inputValue(),'Soạn');
  await page.getByRole('link',{name:'Mở toàn trang '+overdue.title,exact:true}).click();await page.locator('main.studio-task-detail').waitFor();await page.locator('.breadcrumbs').getByRole('link',{name:'Công việc của tôi',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();assert.equal(await page.getByLabel('Tìm Task',{exact:true}).inputValue(),'Soạn');
  await rotate();await page.getByRole('button',{name:/^Lọc nâng cao/}).click();await page.getByLabel('Từ ngày',{exact:true}).fill('2026-10-10');await page.getByLabel('Đến ngày',{exact:true}).fill('2026-10-01');await page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.',{exact:true}).waitFor();const before=reads.length;await page.waitForTimeout(450);assert.equal(reads.length,before);assert.equal(await page.locator('.my-task-row').count(),0);
  await page.getByRole('button',{name:'Xóa bộ lọc Task',exact:true}).click();await page.getByLabel('Phạm vi lưu trữ',{exact:true}).selectOption('archived');await page.getByRole('link',{name:'Công việc trong dự án lưu trữ',exact:true}).waitFor();await page.getByText('Chỉ đọc · Đã lưu trữ',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Xóa bộ lọc Task',exact:true}).click();await page.getByLabel('Tìm Task',{exact:true}).fill('not-found-xyz');await page.getByText('Không có công việc phù hợp bộ lọc. Thử đổi từ khóa hoặc xóa bộ lọc.',{exact:true}).waitFor();
  fail=true;await page.getByRole('button',{name:'Xóa bộ lọc Task',exact:true}).click();await page.getByRole('button',{name:'Thử lại công việc',exact:true}).waitFor();assert.equal(await page.locator('.my-task-row').count(),0);fail=false;await page.getByRole('button',{name:'Thử lại công việc',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();
  await rotate();await WorkspaceMembership.collection.deleteOne({workspaceId:new mongoose.Types.ObjectId(ws.id),userId:users[1]._id});await page.getByRole('button',{name:'Làm mới công việc',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();assert.equal(await page.getByRole('link',{name:overdue.title,exact:true}).count(),0);assert.equal(await page.locator('.my-task-row').count(),1);
  await WorkspaceMembership.create({workspaceId:ws.id,userId:users[1].id,joinedAt:new Date()});await page.getByRole('button',{name:'Làm mới công việc',exact:true}).click();await page.locator('.my-task-groups[aria-busy=false]').waitFor();assert.deepEqual(errors,[]);
  if(process.env.WORKFLOW_SKILL_PROBE==='1'){
    let source=await readFile('C:/Users/Acer/.agents/skills/ui-ux/scripts/probe.mjs','utf8');source=source.replace('chromium.launch();','chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});');
    const setup=`async function fixtureSetup(context){await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',process.env.WORKFLOW_FIXTURE_API)});await route.fulfill({response});});const response=await fetch(process.env.WORKFLOW_FIXTURE_API+'/auth/login',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({email:process.env.WORKFLOW_FIXTURE_EMAIL,password:process.env.WORKFLOW_FIXTURE_PASSWORD})});if(!response.ok)throw new Error('FIXTURE_LOGIN_FAILED');const cookie=response.headers.get('set-cookie').split(';')[0],pivot=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,pivot),value:cookie.slice(pivot+1),domain:'localhost',path:'/auth',httpOnly:true,secure:false,sameSite:'Strict'}]);}\n`;
    source=source.replace('async function probeWidth(',setup+'async function probeWidth(').replaceAll('const page = await context.newPage();','await fixtureSetup(context); const page = await context.newPage();').replaceAll('await context.close();',"await context.unrouteAll({behavior:'ignoreErrors'});await context.close();");const file=`${out}/probe-fixture.mjs`;await writeFile(file,source);
    for(const width of [375,768,1024,1280,1440]){const fixture=app().listen(0,'127.0.0.1');await once(fixture,'listening');const child=spawn(process.execPath,[file,'http://localhost:5173/#mine?status=all','--widths',String(width),'--wait','1800','--pw','C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node','--out',`${out}/probe-mine-${width}`],{stdio:'inherit',env:{...process.env,WORKFLOW_FIXTURE_API:`http://127.0.0.1:${fixture.address().port}`,WORKFLOW_FIXTURE_EMAIL:users[1].email,WORKFLOW_FIXTURE_PASSWORD:password}});const result=await new Promise(resolve=>child.once('exit',resolve));await new Promise(resolve=>fixture.close(resolve));assert.equal(result,0);}
  }
  console.log('PASS S8: authorized assignment/counts/groups/pagination, Workspace/Project/label/priority, stale search, invalid dates, empty/error retry, Archived readonly, panel/fullpage return filters, revoked membership,5 widths; no providers or dev data.');
}catch(error){console.log('Page errors:',errors);if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:`${out}/failure.png`,fullPage:true});console.log((await page.locator('main').allTextContents()).join('\n').slice(-2000));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
