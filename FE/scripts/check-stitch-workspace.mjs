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
const { models, User, OrganizationMembership, Workspace, WorkspaceMembership, Project, Task } = await import('../../BE/src/models/index.js');
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
const out = fileURLToPath(new URL('../../.local/stitch-workspace/', import.meta.url)); await mkdir(out, { recursive: true });
let repl, server, browser; const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_workspace_test'));
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
  const ownerPage = await pageFor(0);
  await ownerPage.goto(`http://localhost:5173/#workspace/${standalone.id}`);
  await ownerPage.getByRole('heading', { name: 'Website Bloom', exact: true }).waitFor();
  await ownerPage.getByText('1/3 Task hoàn thành', { exact: true }).waitFor();
  await ownerPage.getByRole('button', { name: 'Đọc toàn bộ mô tả', exact: true }).click();
  await ownerPage.getByRole('region', { name: 'Mô tả nhóm — nội dung đầy đủ' }).waitFor();
  await ownerPage.getByRole('button', { name: 'Thu gọn mô tả', exact: true }).click();
  for (const width of [1440,1280,1024,768,375]) { await ownerPage.setViewportSize({ width, height: 1000 }); await ownerPage.screenshot({ path: `${out}/projects-${width}.png`, fullPage: true }); assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Workspace overflow ${width}`); }
  await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  await ownerPage.getByRole('button', { name: 'Chỉnh sửa mô tả Workspace', exact: true }).click();
  await ownerPage.getByLabel('Tên Workspace', { exact: true }).fill('Studio đã cập nhật');
  await ownerPage.getByRole('button', { name: 'Lưu cài đặt', exact: true }).click();
  await ownerPage.getByRole('heading', { name: 'Studio đã cập nhật', exact: true }).waitFor();
  await ownerPage.getByRole('button', { name: 'Dự án', exact: true }).click();
  await ownerPage.getByRole('heading', { name: 'Website Bloom', exact: true }).waitFor();
  await ownerPage.getByRole('button', { name: 'Sửa tên và biểu tượng Website Bloom', exact: true }).click();
  await ownerPage.getByLabel('Tên Dự án', { exact: true }).fill('Bloom Website V2');
  await ownerPage.getByRole('dialog').getByRole('button', { name: 'Kỹ thuật', exact: true }).click();
  await ownerPage.getByRole('dialog').getByRole('button', { name: 'Lưu', exact: true }).click();
  await ownerPage.getByRole('heading', { name: 'Bloom Website V2', exact: true }).waitFor();
  assert.equal((await Project.collection.findOne({ _id: new mongoose.Types.ObjectId(project.id) })).icon, 'code');
  await ownerPage.getByLabel('Tìm theo tên hoặc mô tả Dự án', { exact: true }).fill('Bloom');
  await ownerPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).click();
  await ownerPage.getByLabel('Tên Dự án', { exact: true }).fill('Design System V2');
  await ownerPage.getByRole('dialog').getByRole('button', { name: 'Tạo Dự án', exact: true }).click();
  await ownerPage.getByRole('heading', { name: 'Design System V2', exact: true }).waitFor();
  assert.equal(await ownerPage.getByLabel('Tìm theo tên hoặc mô tả Dự án', { exact: true }).inputValue(), '');
  async function changeState(page, name, action) {
    await page.getByRole('button', { name: action, exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.getByLabel('Nhập lại tên Workspace', { exact: true }).fill('Wrong'); await dialog.getByLabel('Lý do', { exact: true }).fill('Browser fixture confirmation');
    assert.equal(await dialog.getByRole('button', { name: action, exact: true }).isDisabled(), true);
    await dialog.getByLabel('Nhập lại tên Workspace', { exact: true }).fill(name);
    await dialog.screenshot({ path: `${out}/${action.startsWith('Mở') ? 'unarchive' : 'archive'}-dialog.png` });
    await dialog.getByRole('button', { name: action, exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  }
  await changeState(ownerPage, 'Studio đã cập nhật', 'Lưu trữ Workspace');
  await ownerPage.getByRole('button', { name: 'Mở lại Workspace', exact: true }).waitFor();
  assert.equal(await ownerPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).count(), 0);
  await ownerPage.getByText('Workspace lưu trữ · Chỉ đọc', { exact: true }).first().waitFor();
  await ownerPage.getByRole('button', { name: 'Cài đặt nhóm', exact: true }).click();
  await ownerPage.getByText('Workspace đang lưu trữ. Mở lại trước khi sửa tên hoặc mô tả.', { exact: true }).waitFor();
  assert.equal(await ownerPage.getByRole('button', { name: 'Lưu cài đặt', exact: true }).count(), 0);
  await ownerPage.getByRole('button', { name: 'Dự án', exact: true }).click();
  await changeState(ownerPage, 'Studio đã cập nhật', 'Mở lại Workspace');
  await ownerPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).waitFor();
  assert.equal((await Project.collection.findOne({ _id: new mongoose.Types.ObjectId(oldProject.id) })).state, 'archived');
  await ownerPage.getByLabel('Trạng thái Dự án', { exact: true }).selectOption('all');
  await ownerPage.getByRole('heading', { name: 'Tài liệu Onboarding', exact: true }).waitFor();
  assert.equal(await ownerPage.getByText('Dự án lưu trữ · Chỉ đọc', { exact: true }).count(), 1);
  // Escape/focus and CAS denial must preserve the confirmation draft.
  const archiveButton = ownerPage.getByRole('button', { name: 'Lưu trữ Workspace', exact: true });
  await archiveButton.click(); await ownerPage.keyboard.press('Escape'); await ownerPage.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(await archiveButton.evaluate(button => button === document.activeElement), true);
  await archiveButton.click(); let stateDialog = ownerPage.getByRole('dialog');
  await stateDialog.getByLabel('Nhập lại tên Workspace', { exact: true }).fill('Studio đã cập nhật'); await stateDialog.getByLabel('Lý do', { exact: true }).fill('CAS draft');
  const current = (await workspaces.get(auths[0], standalone.id)).workspace; await workspaces.update(auths[0], standalone.id, { expectedVersion: current.version, description: { format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thay đổi đồng thời' }] }] } } });
  await stateDialog.getByRole('button', { name: 'Lưu trữ Workspace', exact: true }).click(); await stateDialog.getByText('Dữ liệu đã được người khác thay đổi. Tải lại trước khi lưu tiếp.', { exact: true }).waitFor(); assert.equal(await stateDialog.getByLabel('Lý do', { exact: true }).inputValue(), 'CAS draft');
  await stateDialog.getByRole('button', { name: 'Hủy', exact: true }).click(); await ownerPage.locator('.system-dialog button.primary').click();
  await ownerPage.getByRole('button', { name: 'Làm mới', exact: true }).click(); await ownerPage.getByRole('heading', { name: 'Bloom Website V2', exact: true }).waitFor();
  // Lost response after a committed write: do not offer blind retry.
  await archiveButton.click(); stateDialog = ownerPage.getByRole('dialog'); await stateDialog.getByLabel('Nhập lại tên Workspace', { exact: true }).fill('Studio đã cập nhật'); await stateDialog.getByLabel('Lý do', { exact: true }).fill('Uncertain committed write');
  lostStateResponse = true; const beforeWrites = stateWrites; await stateDialog.getByRole('button', { name: 'Lưu trữ Workspace', exact: true }).click(); await stateDialog.getByText('Chưa rõ trạng thái đã được cập nhật. Đóng hộp thoại và tải lại để kiểm tra trước khi gửi tiếp.', { exact: true }).waitFor(); assert.equal(await stateDialog.getByRole('button', { name: 'Lưu trữ Workspace', exact: true }).isDisabled(), true); assert.equal(stateWrites, beforeWrites + 1);
  await stateDialog.getByRole('button', { name: 'Hủy', exact: true }).click(); await ownerPage.locator('.system-dialog button.primary').click(); await ownerPage.getByRole('button', { name: 'Mở lại Workspace', exact: true }).waitFor(); await changeState(ownerPage, 'Studio đã cập nhật', 'Mở lại Workspace');
  // Read failure clears content; retry restores scope instead of showing old cards.
  await ownerPage.waitForFunction(() => { const button = [...document.querySelectorAll('.workspace-actions button')].find(button => button.textContent.includes('Làm mới')); return button && !button.disabled; });
  fail = true; await ownerPage.getByRole('button', { name: 'Làm mới', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Tải lại', exact: true }).waitFor(); assert.equal(await ownerPage.locator('.project-card').count(), 0); fail = false; await ownerPage.getByRole('button', { name: 'Tải lại', exact: true }).click(); await ownerPage.getByRole('heading', { name: 'Bloom Website V2', exact: true }).waitFor();
  const memberPage = await pageFor(1); await memberPage.goto(`http://localhost:5173/#workspace/${standalone.id}`);
  await memberPage.getByRole('heading', { name: 'Bloom Website V2', exact: true }).waitFor();
  for (const name of ['Tạo Dự án','Lưu trữ Workspace','Cài đặt nhóm']) assert.equal(await memberPage.getByRole('button', { name, exact: true }).count(), 0);
  await memberPage.goto(`http://localhost:5173/#workspace/${first.id}`);
  await memberPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).waitFor(); await memberPage.getByText('Quản lý Workspace', { exact: true }).waitFor();
  const adminPage = await pageFor(2); await adminPage.goto(`http://localhost:5173/#workspace/${second.id}`);
  await adminPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).waitFor(); assert.equal(await adminPage.getByRole('button', { name: 'Email của tôi trong nhóm', exact: true }).count(), 0);
  await adminPage.getByRole('button', { name: 'Tạo Dự án', exact: true }).click(); await adminPage.getByLabel('Tên Dự án', { exact: true }).fill('Denied stale role');
  const admin = await OrganizationMembership.collection.findOne({ organizationId: new mongoose.Types.ObjectId(org.id), userId: users[2]._id }); await organizations.role(auths[0], org.id, users[2].id, { expectedVersion: admin.version, role: 'member' });
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Tạo Dự án', exact: true }).click();
  await adminPage.getByText('Nội dung không còn khả dụng với quyền hiện tại.', { exact: true }).waitFor(); assert.equal(await adminPage.getByLabel('Tên Dự án', { exact: true }).inputValue(), 'Denied stale role'); assert.equal(await Project.collection.countDocuments({ name: 'Denied stale role' }), 0);
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click(); await adminPage.locator('.system-dialog button.primary').click();
  for(let index = 0; index < 12; index++) await work.createProject(auths[0], standalone.id, { name: `Page project ${index}` });
  await ownerPage.getByRole('button', { name: 'Làm mới', exact: true }).click(); await ownerPage.getByText('15 kết quả', { exact: true }).waitFor(); assert.equal(await ownerPage.locator('.project-card').count(), 12);
  await ownerPage.getByRole('button', { name: 'Tải thêm', exact: true }).click(); await ownerPage.waitForFunction(() => document.querySelectorAll('.project-card').length === 15);
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
    const file = `${out}/probe-fixture.mjs`; await writeFile(file, source);
    for (const [key, url] of [['projects', `http://localhost:5173/#workspace/${standalone.id}`]]) {
      const child = spawn(process.execPath, [file, url, '--widths', '375,768,1024,1280,1440', '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe-${key}`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: origin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
      assert.equal(await new Promise(resolve => child.once('exit', resolve)), 0);
    }
  }
  console.log(`PASS S3: standalone/attached management, member readonly, scoped statistics excluding trash, metadata/Project edits, create, stale-role denial with draft, archive confirmation and independent Project state, pagination, long description and 5 widths. Screens: ${out}. No dev/providers.`);
} catch (error) { if (browser) for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) { await page.screenshot({ path: `${out}/failure-${index}.png`, fullPage: true }); console.log((await page.locator('main').innerText()).slice(-1800)); } throw error;
} finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }




