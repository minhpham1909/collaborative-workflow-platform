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
const { models, User, OrganizationMembership, Workspace, WorkspaceMembership, Project, Task, ProjectLabel, ProjectGuest } = await import('../../BE/src/models/index.js');
const { createApp } = await import('../../BE/src/app.js');
const { createAuthService } = await import('../../BE/src/auth/service.js');
const { createMongoAuthStore } = await import('../../BE/src/auth/mongo-store.js');
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
const out = fileURLToPath(new URL('../../.local/stitch-project-management/', import.meta.url)); await mkdir(out, { recursive: true });
let repl, server, browser; const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, instanceOpts: [{ launchTimeout: 30000 }], replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_project_management_test'));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: 'http://localhost:5173', secureCookies: false }, password = 'Organization browser fixture password', hash = await hashPassword(password);
  const auth = await createAuthService({ store: createMongoAuthStore(), config }), organizations = createOrganizationService({ store: createMongoOrganizationStore({ config }) }), workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) }), work = createWorkService({ store: createMongoWorkStore({ config }) });
  const users = [], auths = [];
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
  const cutoff = cutoffCodec(config.accessKeyHex);
  server = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  let fail = false, delay = false, lostStateResponse = false, stateWrites = 0;
  async function pageFor(index) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('http://localhost:4000/**', async route => {
      if (fail && route.request().url().includes(`/workspaces/${standalone.id}/projects?`)) return route.abort();
      if (delay && route.request().url().includes('/organizations?')) await new Promise(resolve => setTimeout(resolve, new URL(route.request().url()).searchParams.get('q') === 'Hà' ? 900 : 50));
      const response = await route.fetch({ url: route.request().url().replace('http://localhost:4000', origin) });
      if (route.request().method() === 'PATCH' && route.request().url().endsWith('/state')) { stateWrites++; if (lostStateResponse) { lostStateResponse = false; return route.abort(); } }
      await route.fulfill({ response });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/'); await page.getByLabel('Email', { exact: true }).fill(users[index].email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.locator('.studio-home').waitFor(); await page.goto('http://localhost:5173/#organizations'); await page.locator('.organization-page').waitFor(); return page;
  }
  const ownerPage = await pageFor(0); await ownerPage.goto(`http://localhost:5173/#project/${project.id}`); await ownerPage.getByRole('button', { name: 'Quản lý Project', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Tạo nhãn', exact: true }).click(); let dialog = ownerPage.getByRole('dialog'); await dialog.getByLabel('Tên nhãn', { exact: true }).fill('Accessibility'); await dialog.getByLabel('Màu nhãn', { exact: true }).selectOption('mint'); await dialog.getByRole('button', { name: 'Tạo nhãn', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); await ownerPage.getByText('Accessibility', { exact: true }).waitFor(); const createdLabel = await ProjectLabel.collection.findOne({ projectId: new mongoose.Types.ObjectId(project.id), name: 'Accessibility' }); assert.ok(createdLabel);
  for(const width of [1440,1280,1024,768,375]) { await ownerPage.setViewportSize({ width, height: 1000 }); await ownerPage.screenshot({ path: `${out}/management-${width}.png`, fullPage: true }); assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `Management overflow ${width}`); }
  await ownerPage.setViewportSize({ width: 1440, height: 1000 }); await ownerPage.getByRole('button', { name: 'Về Board', exact: true }).click(); await ownerPage.getByRole('button', { name: '+ Tạo Task', exact: true }).click(); await ownerPage.getByLabel('Tiêu đề Task', { exact: true }).fill('Task có ưu tiên và nhãn'); await ownerPage.getByLabel('Mức ưu tiên', { exact: true }).selectOption('high'); await ownerPage.getByLabel('Accessibility', { exact: true }).check(); await ownerPage.getByRole('button', { name: 'Lưu Task', exact: true }).click(); await ownerPage.getByRole('heading', { name: 'Task có ưu tiên và nhãn', exact: true }).waitFor(); const createdTask = await Task.collection.findOne({ title: 'Task có ưu tiên và nhãn' }); assert.equal(createdTask.priority,'high'); assert.deepEqual(createdTask.labelIds.map(String),[String(createdLabel._id)]);
  await ownerPage.getByRole('button', { name: 'Quản lý Project', exact: true }).click(); await ownerPage.locator('.project-management-list li').filter({ hasText: 'Accessibility' }).getByRole('button', { name: 'Sửa nhãn', exact: true }).click(); dialog = ownerPage.getByRole('dialog'); await dialog.getByLabel('Lưu trữ nhãn', { exact: false }).check(); await dialog.getByRole('button', { name: 'Sửa nhãn', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  await ownerPage.goto(`http://localhost:5173/#task/${createdTask._id}`); await ownerPage.getByRole('button', { name: 'Sửa Task', exact: true }).click(); await ownerPage.getByLabel('Mức ưu tiên', { exact: true }).selectOption('low'); await ownerPage.getByRole('button', { name: 'Lưu Task', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Sửa Task', exact: true }).waitFor(); const edited = await Task.collection.findOne({ _id: createdTask._id }); assert.equal(edited.priority, 'low'); assert.deepEqual(edited.labelIds.map(String),[String(createdLabel._id)]);
  await ownerPage.goto(`http://localhost:5173/#project/${project.id}`); await ownerPage.getByRole('button', { name: 'Quản lý Project', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Thiết lập Lead', exact: true }).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Project Lead', { exact: true }).selectOption(users[1].id); await dialog.screenshot({ path: `${out}/lead-dialog.png` }); await dialog.getByRole('button', { name: 'Thiết lập Project Lead', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); assert.equal(String((await Project.collection.findOne({ _id:new mongoose.Types.ObjectId(project.id) })).leadId), users[1].id);
  const leadPage = await pageFor(1); await leadPage.goto(`http://localhost:5173/#project/${project.id}`); await leadPage.getByRole('button', { name: 'Quản lý Project', exact:true }).click(); await leadPage.getByRole('button', { name: 'Tạo nhãn', exact:true }).waitFor(); assert.equal(await leadPage.getByRole('button', { name: 'Guest', exact:true }).count(),0); assert.equal(await leadPage.getByRole('button', { name: 'Thiết lập Lead', exact:true }).count(),0);
  await leadPage.getByRole('button', { name: 'Tạo nhãn', exact:true }).click(); await leadPage.getByLabel('Tên nhãn', { exact:true }).fill('Denied after Lead removal'); const leadSnapshot=(await work.getProject(auths[0],project.id)).project; await work.lead(auths[0],project.id,{expectedVersion:leadSnapshot.version,leadId:null}); await leadPage.getByRole('dialog').getByRole('button',{name:'Tạo nhãn',exact:true}).click(); await leadPage.getByText('Thao tác cần quyền quản lý Project hiện tại.',{exact:true}).waitFor(); assert.equal(await leadPage.getByLabel('Tên nhãn',{exact:true}).inputValue(),'Denied after Lead removal'); assert.equal(await ProjectLabel.collection.countDocuments({name:'Denied after Lead removal'}),0); await leadPage.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click(); await leadPage.locator('.system-dialog button.primary').click();
  await ownerPage.getByRole('button',{name:'Guest',exact:true}).click(); await ownerPage.locator('.project-management-list').getByText('Bình',{exact:true}).waitFor(); const latest=(await work.getProject(auths[0],project.id)).project; await work.state(auths[0],project.id,{expectedVersion:latest.version,state:'archived'}); await ownerPage.getByRole('button',{name:'Tải lại quản lý',exact:true}).click(); await ownerPage.getByRole('button',{name:'Thu hồi quyền Guest',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByRole('button',{name:'Thu hồi quyền Guest',exact:true}).click(); await dialog.waitFor({state:'hidden'}); assert.equal(await ProjectGuest.collection.countDocuments({projectId:new mongoose.Types.ObjectId(project.id),userId:users[3]._id,state:'active'}),0); await assert.rejects(work.getProject(auths[3],project.id));
  const archivedProject=(await work.getProject(auths[0],project.id)).project; await work.state(auths[0],project.id,{expectedVersion:archivedProject.version,state:'active'}); await ownerPage.getByRole('button',{name:'Tải lại quản lý',exact:true}).click(); await ownerPage.getByRole('button',{name:'Lời mời Guest',exact:true}).click(); await ownerPage.getByRole('button',{name:'Mời Guest',exact:true}).click(); dialog=ownerPage.getByRole('dialog'); await dialog.getByLabel('Cách mời Guest',{exact:true}).selectOption('LINK'); await dialog.getByRole('button',{name:'Mời Guest',exact:true}).click(); const link = new URL(await dialog.getByLabel('Liên kết Guest',{exact:true}).inputValue()); assert.equal(link.pathname,'/project-invite'); assert.ok(new URLSearchParams(link.hash.slice(1)).get('token')); await dialog.getByRole('button',{name:'Đóng kết quả',exact:true}).click(); await ownerPage.locator('.project-management-list li').filter({hasText:'Còn hiệu lực'}).getByRole('button',{name:'Thu hồi lời mời Guest',exact:true}).first().click(); await ownerPage.getByRole('dialog').getByRole('button',{name:'Thu hồi lời mời Guest',exact:true}).click(); await ownerPage.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors, []);
  if (process.env.WORKFLOW_SKILL_PROBE === '1') {
    let source = await readFile('C:/Users/Acer/.agents/skills/ui-ux/scripts/probe.mjs', 'utf8');
    source = source.replace('chromium.launch();', 'chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE });');
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
    for (const [key, url] of [['management', `http://localhost:5173/#project/${project.id}/manage`]]) {
      for (const width of (process.env.WORKFLOW_PROBE_WIDTHS || '375,768,1024,1280,1440').split(',').map(Number)) {
      const probeServer = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(probeServer, 'listening');
      const probeOrigin = `http://127.0.0.1:${probeServer.address().port}`;
      const child = spawn(process.execPath, [file, url, '--widths', String(width), '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe-${key}-${width}`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: probeOrigin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
      const result = await new Promise(resolve => child.once('exit', resolve)); await new Promise(resolve => probeServer.close(resolve)); assert.equal(result, 0);
      }
    }
  }
  console.log(`PASS S6b: label create/archive/history-preserving Task priority edit, task creation label/priority, Lead scope and live removal denial/draft, archived Guest revoke, LINK invitation/revoke, management at 5 widths. Screens ${out}; no providers/dev data.`);
} catch (error) { if (browser) for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) { await page.screenshot({ path: `${out}/failure-${index}.png`, fullPage: true }); console.log((await page.locator('main').innerText()).slice(-1800)); } throw error;
} finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }








