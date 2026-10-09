import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || 'playwright');
const { MongoMemoryReplSet } = await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const { default: mongoose } = await import('../../BE/node_modules/mongoose/index.js');
const { models, User, OrganizationMembership, Workspace, WorkspaceMembership, Project, Task, TaskReopenRequest } = await import('../../BE/src/models/index.js');
const { createApp } = await import('../../BE/src/app.js');
const { createAuthService } = await import('../../BE/src/auth/service.js');
const { createMongoAuthStore } = await import('../../BE/src/auth/mongo-store.js');
const { createUsersService } = await import('../../BE/src/users/service.js');
const { createMongoUsersStore } = await import('../../BE/src/users/mongo-store.js');
const { hashPassword } = await import('../../BE/src/auth/passwords.js');
const { createWorkspaceService } = await import('../../BE/src/workspaces/service.js');
const { createMongoWorkspaceStore } = await import('../../BE/src/workspaces/mongo-store.js');
const { createWorkService } = await import('../../BE/src/work/service.js');
const { createMongoWorkStore } = await import('../../BE/src/work/mongo-store.js');
const { createOrganizationService } = await import('../../BE/src/organizations/service.js');
const { createMongoOrganizationStore } = await import('../../BE/src/organizations/mongo-store.js');
const { createNotificationsService } = await import('../../BE/src/notifications/service.js');
const { createMongoNotificationsStore } = await import('../../BE/src/notifications/mongo-store.js');
const { cutoffCodec } = await import('../../BE/src/notifications/input.js');
const { testConfig } = await import('../../BE/test-support/auth-store.js');
const out = fileURLToPath(new URL('../../.local/stitch-task-reopen/', import.meta.url)); await mkdir(out, { recursive: true });
let repl, server, browser; const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, instanceOpts: [{ launchTimeout: 30000 }], replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_task_reopen_test'));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: 'http://localhost:5173', secureCookies: false }, password = 'Organization browser fixture password', hash = await hashPassword(password);
  const auth = await createAuthService({ store: createMongoAuthStore(), config }), organizations = createOrganizationService({ store: createMongoOrganizationStore({ config }) }), workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) }), work = createWorkService({ store: createMongoWorkStore({ config }) });
  const users = [], auths = [];
  const usersService=createUsersService({store:createMongoUsersStore()});
  for (let index = 0; index < 4; index++) { const user = new User({ email: `org-ui-${index}@example.com`, displayName: ['Minh', 'Lan', 'Hải', 'Bình'][index], passwordHash: hash, emailVerifiedAt: new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } }); await user.save(); users.push(user); auths.push(await auth.authenticate((await auth.login({ email: user.email, password })).accessToken)); }
  const org = (await organizations.create(auths[0], { name: 'Studio Sài Gòn' })).organization;
  const memberOrg = (await organizations.create(auths[3], { name: 'Hà Nội Creative Lab' })).organization;
  const privateOrg = (await organizations.create(auths[3], { name: 'Private hidden organization' })).organization;
  for (const [owner, member, target] of [[0, 1, org], [0, 2, org], [3, 0, memberOrg], [3, 1, privateOrg]]) { const invite = await organizations.invite(auths[owner], target.id, { email: users[member].email }); await organizations.acceptInvitationById(auths[member], invite.invitation.id, {}); }
  const adminMembership = await OrganizationMembership.collection.findOne({ organizationId: new mongoose.Types.ObjectId(org.id), userId: users[2]._id });
  await organizations.role(auths[0], org.id, users[2].id, { expectedVersion: adminMembership.version, role: 'admin' });
  const first = (await organizations.createWorkspace(auths[0], org.id, { name: 'Brand & Packaging Lab' })).workspace;
  const second = (await organizations.createWorkspace(auths[0], org.id, { name: 'Digital Experience' })).workspace;
  const archived = (await organizations.createWorkspace(auths[0], org.id, { name: 'Tài liệu Onboarding' })).workspace;
  await workspaces.state(auths[0], archived.id, { expectedVersion: archived.version, state: 'archived', confirmName: archived.name, reason: 'Fixture archived' });
  await organizations.addMember(auths[0], org.id, first.id, { expectedVersion: first.version, userId: users[1].id });
  await work.createProject(auths[0], first.id, { name: 'Brand project' });
  await workspaces.create(auths[0], { name: 'Standalone outside organization' });
  const standalone = (await workspaces.create(auths[0], { name: 'Sáng Tạo Studio' })).workspace;
  await WorkspaceMembership.create({ workspaceId: standalone.id, userId: users[1].id, joinedAt: new Date() });
  const description = { format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục tiêu thiết kế thương hiệu và sản phẩm số. '.repeat(25) }] }] } };
  await workspaces.update(auths[0], standalone.id, { expectedVersion: standalone.version, description });
  const project = (await work.createProject(auths[0], standalone.id, { name: 'Website Bloom', icon: 'palette' })).project;
  const oldProject = (await work.createProject(auths[0], standalone.id, { name: 'Tài liệu Onboarding', icon: 'document' })).project;
  await work.state(auths[0], oldProject.id, { expectedVersion: oldProject.version, state: 'archived' });
  for (let index = 0; index < 3; index++) await Task.create({ projectId: project.id, workspaceId: standalone.id, createdBy: users[0].id, title: `Real task ${index}`, status: index === 0 ? 'done' : 'todo' });
  await Task.create({ projectId: project.id, workspaceId: standalone.id, createdBy: users[0].id, title: 'Trash excluded', status: 'done', deletedAt: new Date(), deletedBy: users[0].id });
  const attachedMember = await Workspace.collection.findOne({ _id: new mongoose.Types.ObjectId(first.id) });
  await organizations.manager(auths[0], org.id, first.id, { expectedVersion: attachedMember.version, managerId: users[1].id });
  const label = (await work.createLabel(auths[0], project.id, { name: 'Thiết kế UI', color: 'lavender' })).label;
  let special;
  for(let index=0; index<16; index++) { const item = (await work.createTask(auths[0], project.id, { title: `Thiết kế màn ${index}`, priority: index === 15 ? 'high' : 'medium', ...(index === 15 ? { labelIds: [label.id], dueAt: '2026-01-01T00:00:00.000Z', assigneeId: users[1].id } : {}) })).task; if(index === 15) special = item; }
  let progressing = (await work.createTask(auths[0], project.id, { title: 'Chuẩn hóa design tokens', priority: 'high' })).task;
  progressing = (await work.status(auths[0], progressing.id, { status: 'in_progress', expectedVersion: progressing.version })).task;
  const checked = await work.checklist(auths[0], progressing.id, { expectedVersion: progressing.version, items: [{ text: 'Typography' }, { text: 'Spacing' }] });
  let completed = (await work.createTask(auths[0], project.id, { title: 'Bộ nhận diện đã duyệt', assigneeId: users[1].id, priority: 'low', dueAt: '2026-01-01T00:00:00.000Z' })).task;
  completed = (await work.status(auths[0], completed.id, { status: 'done', expectedVersion: completed.version })).task;
  await work.updateProject(auths[0], project.id, { expectedVersion: project.version, description });
  const invitation = await work.inviteGuest(auths[0], project.id, { type: 'LINK' }); await work.acceptGuestInvitation(auths[3], { token: new URLSearchParams(new URL(invitation.url).hash.slice(1)).get('token') });
  const before = (await work.getTask(auths[0], progressing.id)).task; await work.updateTask(auths[0], progressing.id, { expectedVersion: before.version, assigneeId: users[1].id });
  const cutoff = cutoffCodec(config.accessKeyHex);
  server = createApp({ usersService, authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(server, 'listening');
  let origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  let fail = false, delay = false, lostStateResponse = false, stateWrites = 0, lostReopenResponse = false, reopenWrites = 0;
  async function pageFor(index) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('http://localhost:4000/**', async route => {
      if (fail && route.request().url().includes(`/workspaces/${standalone.id}/projects?`)) return route.abort();
      if (delay && route.request().url().includes('/organizations?')) await new Promise(resolve => setTimeout(resolve, new URL(route.request().url()).searchParams.get('q') === 'Hà' ? 900 : 50));
      const response = await route.fetch({ url: route.request().url().replace('http://localhost:4000', origin) });
      if (route.request().method() === 'POST' && /\/reopen-requests$/.test(route.request().url())) { reopenWrites++; if(lostReopenResponse) { lostReopenResponse=false; return route.abort(); } }
      if (route.request().method() === 'PATCH' && route.request().url().endsWith('/state')) { stateWrites++; if (lostStateResponse) { lostStateResponse = false; return route.abort(); } }
      await route.fulfill({ response });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/'); await page.getByLabel('Email', { exact: true }).fill(users[index].email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.locator('.studio-home').waitFor(); await page.goto('http://localhost:5173/#organizations'); await page.locator('.organization-page').waitFor(); return page;
  }
  const memberPage = await pageFor(1); await memberPage.goto(`http://localhost:5173/#task/${completed.id}`); await memberPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); let dialog=memberPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Cần xử lý phản hồi'); await dialog.getByLabel('Trạng thái muốn mở lại',{exact:true}).selectOption('in_progress'); await dialog.screenshot({path:`${out}/request-dialog.png`}); await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal((await Task.collection.findOne({_id:new mongoose.Types.ObjectId(completed.id)})).status,'done');
  const ownerPage=await pageFor(0); await ownerPage.goto(`http://localhost:5173/#project/${project.id}/manage`); await ownerPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await ownerPage.getByRole('link',{name:'Xem và duyệt yêu cầu',exact:true}).click(); await ownerPage.getByRole('button',{name:'Duyệt mở lại',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Đồng ý nhận phản hồi');
  const changed=(await work.getTask(auths[0],completed.id)).task; await work.updateTask(auths[0],completed.id,{expectedVersion:changed.version,title:'Task thay đổi trong lúc duyệt'}); await dialog.getByRole('button',{name:'Duyệt mở lại',exact:true}).click(); await dialog.getByText('Dữ liệu đã được người khác thay đổi. Tải lại trước khi lưu tiếp.',{exact:true}).waitFor(); assert.equal(await dialog.getByLabel('Lý do',{exact:true}).inputValue(),'Đồng ý nhận phản hồi'); await dialog.getByRole('button',{name:'Đóng',exact:true}).click(); await ownerPage.locator('.system-dialog button.primary').click();
  await ownerPage.getByRole('button',{name:'Làm mới Task',exact:true}).click(); await ownerPage.getByRole('button',{name:'Duyệt mở lại',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Đồng ý sau khi đọc bản mới'); await dialog.screenshot({path:`${out}/review-dialog.png`}); await dialog.getByRole('button',{name:'Duyệt mở lại',exact:true}).click(); await dialog.waitFor({state:'hidden'}); await ownerPage.waitForFunction(()=>document.querySelector('.detail-meta-grid select')?.value==='in_progress'); let actual=await Task.collection.findOne({_id:new mongoose.Types.ObjectId(completed.id)}); assert.equal(actual.completedAt,null);
  await ownerPage.getByLabel('Trạng thái',{exact:true}).selectOption('done'); await ownerPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Owner tự gửi yêu cầu'); await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal(await ownerPage.getByRole('button',{name:'Duyệt mở lại',exact:true}).count(),0); assert.equal(await ownerPage.getByLabel('Trạng thái',{exact:true}).isDisabled(),true);
  const admission=await workspaces.invite(auths[0],standalone.id,{type:'LINK'}); await workspaces.accept(auths[2],{token:new URLSearchParams(new URL(admission.url).hash.slice(1)).get('token')}); const pNow=(await work.getProject(auths[0],project.id)).project; await work.lead(auths[0],project.id,{expectedVersion:pNow.version,leadId:users[2].id});
  const leadPage=await pageFor(2); await leadPage.goto(`http://localhost:5173/#task/${completed.id}`); await leadPage.getByRole('button',{name:'Từ chối yêu cầu',exact:true}).click(); dialog=leadPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Chưa đủ thông tin'); await dialog.getByRole('button',{name:'Từ chối yêu cầu',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal((await Task.collection.findOne({_id:new mongoose.Types.ObjectId(completed.id)})).status,'done');
  await ownerPage.getByRole('button',{name:'Làm mới Task',exact:true}).click(); await ownerPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Thử quá sớm'); await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.getByText('Yêu cầu vừa bị từ chối. Bạn có thể gửi lại sau 24 giờ kể từ lúc từ chối.',{exact:true}).waitFor(); await dialog.getByRole('button',{name:'Đóng',exact:true}).click(); await ownerPage.locator('.system-dialog button.primary').click();
  for(let i=0;i<2;i++) await TaskReopenRequest.create({workspaceId:standalone.id,projectId:project.id,taskId:completed.id,requesterId:users[1].id,reason:'Lịch sử fixture',targetStatus:'todo',state:'cancelled',resolutionReason:'task_already_open',createdAt:new Date(Date.now()-(i+1)*3600000),resolvedAt:new Date(Date.now()-1000)});
  await memberPage.getByRole('button',{name:'Làm mới Task',exact:true}).click(); await memberPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); dialog=memberPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Lần thứ tư trong tuần'); await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.getByText('Bạn đã gửi ba yêu cầu cho Task này trong bảy ngày. Hãy chờ yêu cầu cũ ra ngoài khoảng thời gian đó.',{exact:true}).waitFor(); await dialog.getByRole('button',{name:'Đóng',exact:true}).click(); await memberPage.locator('.system-dialog button.primary').click();
  await ownerPage.getByRole('button',{name:'Làm mới Task',exact:true}).click(); await ownerPage.getByRole('button',{name:'Xem yêu cầu mở lại',exact:true}).click();
  for(const width of [1440,1280,1024,768,375]) { await ownerPage.setViewportSize({width,height:1000}); await ownerPage.screenshot({path:`${out}/reopen-${width}.png`,fullPage:true}); assert.ok(await ownerPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Reopen overflow ${width}`); }
  let archiveTask=(await work.createTask(auths[0],project.id,{title:'Yêu cầu bị hủy khi lưu trữ',assigneeId:users[1].id})).task;
  archiveTask=(await work.status(auths[0],archiveTask.id,{expectedVersion:archiveTask.version,status:'done'})).task;
  await memberPage.goto(`http://localhost:5173/#task/${archiveTask.id}`); await memberPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); dialog=memberPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Cần sửa trước khi lưu trữ'); await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.waitFor({state:'hidden'});
  const beforeArchive=(await work.getProject(auths[0],project.id)).project; await work.state(auths[0],project.id,{expectedVersion:beforeArchive.version,state:'archived'});
  await memberPage.getByRole('button',{name:'Làm mới Task',exact:true}).click(); await memberPage.getByRole('button',{name:'Xem yêu cầu mở lại',exact:true}).click(); await memberPage.getByText('Đã hủy',{exact:true}).waitFor(); await memberPage.getByText('Kết quả: Project hoặc Workspace được lưu trữ',{exact:true}).waitFor(); assert.equal(await memberPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).count(),0); assert.equal(await memberPage.getByLabel('Trạng thái',{exact:true}).isDisabled(),true);
  const afterArchive=(await work.getProject(auths[0],project.id)).project; await work.state(auths[0],project.id,{expectedVersion:afterArchive.version,state:'active'});
  // A separate scenario gets a fresh default HTTP limiter, never a relaxed policy.
  await new Promise(resolve=>server.close(resolve)); server=createApp({usersService,authService:auth,authConfig:config,workspaceService:workspaces,workService:work,organizationService:organizations,notificationsService:createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff})}).listen(0,'127.0.0.1'); await once(server,'listening'); origin=`http://127.0.0.1:${server.address().port}`;
  let uncertainTask=(await work.createTask(auths[0],project.id,{title:'Kết quả yêu cầu chưa xác nhận',assigneeId:users[1].id})).task; uncertainTask=(await work.status(auths[0],uncertainTask.id,{expectedVersion:uncertainTask.version,status:'done'})).task;
  await memberPage.goto(`http://localhost:5173/#task/${uncertainTask.id}`); await memberPage.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); dialog=memberPage.getByRole('dialog'); await dialog.getByLabel('Lý do',{exact:true}).fill('Kiểm tra phản hồi bị mất'); const writesBefore=reopenWrites; lostReopenResponse=true; await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).click(); await dialog.getByText('Chưa xác nhận kết quả. Đóng và tải lại trước khi gửi tiếp.',{exact:true}).waitFor(); assert.equal(await dialog.getByRole('button',{name:'Yêu cầu mở lại',exact:true}).isDisabled(),true); assert.equal(reopenWrites,writesBefore+1); await dialog.getByRole('button',{name:'Đóng',exact:true}).click(); await memberPage.locator('.system-dialog button.primary').click(); await dialog.waitFor({state:'hidden'}); await memberPage.getByText('Chờ duyệt',{exact:true}).waitFor(); assert.equal(await TaskReopenRequest.countDocuments({taskId:uncertainTask.id}),1);
  assert.deepEqual(errors,[]);
  if (process.env.WORKFLOW_SKILL_PROBE === '1') {
    let source = await readFile('C:/Users/Acer/.agents/skills/ui-ux/scripts/probe.mjs', 'utf8');
    source = source.replace('chromium.launch();', 'chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE });');
    source = source.replace('await page.waitForTimeout(options.waitMs);', `await page.waitForTimeout(options.waitMs); const historyButton=page.getByRole('button',{name:'Xem yêu cầu mở lại',exact:true}); if(await historyButton.count()) { await historyButton.click(); await page.getByText('Đã duyệt',{exact:true}).waitFor(); await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);}); }`);
    source = source.replace('const consoleErrors = [];', `const consoleErrors = []; page.on('response',response=>{if(response.status()>=400) console.log('Probe HTTP',response.status(),new URL(response.url()).pathname);});`);
    const setup = `async function fixtureSetup(context) {
      await context.route('http://localhost:4000/**', async route => { const response = await route.fetch({ url: route.request().url().replace('http://localhost:4000', process.env.WORKFLOW_FIXTURE_API) }); await route.fulfill({ response }); });
      const response = await fetch(process.env.WORKFLOW_FIXTURE_API + '/auth/login', { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.WORKFLOW_FIXTURE_EMAIL, password: process.env.WORKFLOW_FIXTURE_PASSWORD }) });
      if (!response.ok) throw new Error('FIXTURE_LOGIN_FAILED');
      const cookie = response.headers.get('set-cookie').split(';')[0], pivot = cookie.indexOf('=');
      await context.addCookies([{ name: cookie.slice(0,pivot), value: cookie.slice(pivot+1), domain: 'localhost', path: '/auth', httpOnly: true, secure: false, sameSite: 'Strict' }]);
    }\n`;
    source = source.replace('async function probeWidth(', setup + 'async function probeWidth(').replaceAll('const page = await context.newPage();', 'await fixtureSetup(context); const page = await context.newPage();');
    source = source.replaceAll('await context.close();', `await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();`);
    const file = `${out}/probe-fixture.mjs`; await writeFile(file, source);
    for (const [key, url] of [['detail', `http://localhost:5173/#task/${completed.id}`]]) {
      for (const width of [375,768,1024,1280,1440]) {
      const probeServer = createApp({ usersService, authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(probeServer, 'listening');
      const probeOrigin = `http://127.0.0.1:${probeServer.address().port}`;
      const child = spawn(process.execPath, [file, url, '--widths', String(width), '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe-${key}-${width}`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: probeOrigin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
      const result = await new Promise(resolve => child.once('exit', resolve)); await new Promise(resolve => probeServer.close(resolve)); assert.equal(result, 0);
      }
    }
  }
  console.log(`PASS S7b: requester remains Done, Project queue, review CAS/draft, approval timestamp reset, self-review blocked, Lead rejection, 24h cooldown, 3/7d rejection, history and 5 widths. Screens ${out}; no dev/providers.`);
} catch (error) { console.log('Page errors:',errors); if (browser) for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) { await page.screenshot({ path: `${out}/failure-${index}.png`, fullPage: true }); console.log((await page.locator('main').allTextContents()).join('\n').slice(-2200)); } throw error;
} finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }










