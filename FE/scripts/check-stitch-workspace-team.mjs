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
const { models, User, OrganizationMembership, Workspace, WorkspaceMembership, Project, Task, TaskComment, AccessBan, ModerationAction, EmailOutbox } = await import('../../BE/src/models/index.js');
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
const { createModerationService } = await import('../../BE/src/moderation/service.js');
const { createMongoModerationStore } = await import('../../BE/src/moderation/mongo-store.js');
const out = fileURLToPath(new URL('../../.local/stitch-workspace-team/', import.meta.url)); await mkdir(out, { recursive: true });
let repl, server, browser; const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, instanceOpts: [{ launchTimeout: 30000 }], replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_workspace_team_test'));
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
  const mod = createModerationService({ store: createMongoModerationStore({ config }) });
  const assigned = (await work.createTask(auths[1], project.id, { title: 'Team safety task', assigneeId: users[1].id })).task;
  const content = { format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spam fixture' }] }] } };
  await work.createComment(auths[1], assigned.id, { content }); await work.createComment(auths[1], assigned.id, { content });
  const reusableLink = await workspaces.invite(auths[0], standalone.id, { type: 'LINK' });
  const cutoff = cutoffCodec(config.accessKeyHex);
  server = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, moderationService: mod, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(server, 'listening');
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
  const ownerPage = await pageFor(0); await ownerPage.goto(`http://localhost:5173/#workspace/${standalone.id}`); await ownerPage.getByRole('heading', { name: 'Website Bloom', exact: true }).waitFor(); await ownerPage.locator('.workspace-tabs').getByRole('button', { name: 'Thành viên', exact: true }).click(); await ownerPage.getByRole('table', { name: 'Thành viên Workspace', exact: true }).getByText('Lan', { exact: true }).waitFor();
  for(const width of [1440,1280,1024,768,375]) { await ownerPage.setViewportSize({ width, height: 1000 }); await ownerPage.screenshot({ path: `${out}/members-${width}.png`, fullPage: true }); assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `WS Team overflow ${width}`); }
  await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  const memberRow = () => ownerPage.locator('.team-table tbody tr').filter({ hasText: 'Lan' });
  await memberRow().getByRole('button', { name: 'Gỡ khỏi nhóm', exact: true }).click(); await ownerPage.getByRole('dialog').getByRole('button', { name: 'Loại thành viên', exact: true }).click(); await ownerPage.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal((await Task.collection.findOne({ _id: new mongoose.Types.ObjectId(assigned.id) })).assigneeId, null); assert.equal(await TaskComment.collection.countDocuments({ authorId: users[1]._id }), 2);
  await workspaces.accept(auths[1], { token: new URLSearchParams(new URL(reusableLink.url).hash.slice(1)).get('token') }); assert.equal((await Task.collection.findOne({ _id: new mongoose.Types.ObjectId(assigned.id) })).assigneeId, null);
  const currentWs = (await workspaces.get(auths[0], standalone.id)).workspace; await workspaces.state(auths[0], standalone.id, { expectedVersion: currentWs.version, state: 'archived', confirmName: currentWs.name, reason: 'Test security exceptions on archived parent' });
  await ownerPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click(); await memberRow().getByRole('button', { name: 'Chặn truy cập', exact: true }).click();
  const ban = ownerPage.getByRole('dialog'); await ban.getByLabel('Bình luận cần dọn', { exact: true }).selectOption('all'); await ban.getByLabel('Lý do', { exact: true }).fill('Spam tài khoản'); await ban.getByRole('button', { name: 'Xem trước tác động', exact: true }).click(); await ban.getByText(/2 bình luận thuộc phạm vi/).waitFor(); assert.equal(await ban.getByRole('button', { name: 'Chặn truy cập', exact: true }).isDisabled(), true); await ban.getByLabel('Xác nhận dọn bình luận', { exact: true }).fill('XÓA BÌNH LUẬN'); await ban.screenshot({ path: `${out}/ban-preview.png` }); await ban.getByRole('button', { name: 'Chặn truy cập', exact: true }).click(); await ban.waitFor({ state: 'hidden' });
  await ownerPage.locator('.workspace-moderation .audit-list').getByText('Lan', { exact: true }).waitFor(); await assert.rejects(workspaces.accept(auths[1], { token: new URLSearchParams(new URL(reusableLink.url).hash.slice(1)).get('token') })); assert.equal(await TaskComment.collection.countDocuments({ authorId: users[1]._id }), 2); const job = await ModerationAction.collection.findOne({ scopeId: new mongoose.Types.ObjectId(standalone.id), action: 'ban' }); assert.equal(job.state, 'pending'); assert.equal(job.matchedCount, 2);
  await ownerPage.locator('.workspace-moderation').getByRole('button', { name: 'Nhật ký xử lý', exact: true }).click(); await ownerPage.getByText(/0\/2 bình luận đã xử lý/).waitFor();
  await ModerationAction.collection.updateOne({ _id: job._id }, { $set: { state: 'failed', lastErrorCode: 'FIXTURE_FAILURE' } }); await ownerPage.locator('.workspace-moderation').getByRole('button', { name: 'Tải lại', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Xếp hàng xử lý lại', exact: true }).click(); await ownerPage.locator('.system-dialog button.primary').click(); await ownerPage.getByText(/Chờ xử lý/).waitFor(); assert.equal((await ModerationAction.collection.findOne({ _id: job._id })).state, 'pending');
  await ownerPage.locator('.workspace-moderation').getByRole('button', { name: 'Danh sách chặn', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Bỏ chặn', exact: true }).click(); const unban = ownerPage.getByRole('dialog'); await unban.getByLabel('Lý do', { exact: true }).fill('Đã xử lý bảo mật'); await unban.getByRole('button', { name: 'Bỏ chặn', exact: true }).click(); await unban.waitFor({ state: 'hidden' }); await assert.rejects(workspaces.get(auths[1], standalone.id), /WORKSPACE_UNAVAILABLE/); assert.equal((await ModerationAction.collection.findOne({ _id: job._id })).state, 'pending'); assert.equal(await TaskComment.collection.countDocuments({ authorId: users[1]._id }), 2);
  const activeWs = (await workspaces.get(auths[0], standalone.id)).workspace; await workspaces.state(auths[0], standalone.id, { expectedVersion: activeWs.version, state: 'active', confirmName: activeWs.name, reason: 'Return active after moderation test' }); await workspaces.accept(auths[1], { token: new URLSearchParams(new URL(reusableLink.url).hash.slice(1)).get('token') });
  const memberPage = await pageFor(1); await memberPage.goto(`http://localhost:5173/#workspace/${standalone.id}`); await memberPage.locator('.workspace-tabs').getByRole('button', { name: 'Thành viên', exact: true }).click(); await memberPage.getByRole('button', { name: 'Rời Workspace', exact: true }).waitFor(); assert.equal(await memberPage.getByRole('button', { name: 'Chặn truy cập', exact: true }).count(),0); assert.equal(await memberPage.getByRole('button', { name: 'Gỡ khỏi nhóm', exact: true }).count(),0); await memberPage.getByRole('button', { name: 'Rời Workspace', exact: true }).click(); await memberPage.getByRole('dialog').getByRole('button', { name: 'Rời Workspace', exact: true }).click(); await memberPage.waitForURL('**/#home');
  await memberPage.goto(`http://localhost:5173/#workspace/${first.id}`); await memberPage.locator('.workspace-tabs').getByRole('button', { name: 'Thành viên', exact: true }).click(); await memberPage.getByRole('button', { name: 'Thêm thành viên nội bộ', exact: true }).click(); const admission = memberPage.getByRole('dialog'); await admission.getByLabel('Tìm thành viên tổ chức', { exact: true }).fill('Hải'); await admission.getByLabel('Thành viên được thêm', { exact: true }).selectOption(users[2].id); await admission.getByRole('button', { name: 'Thêm vào Workspace', exact: true }).click(); await admission.waitFor({ state: 'hidden' }); assert.equal(await WorkspaceMembership.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(first.id), userId: users[2]._id, state: 'active' }), 1); assert.equal((await OrganizationMembership.collection.findOne({ organizationId: new mongoose.Types.ObjectId(org.id), userId: users[2]._id })).role, 'admin'); await memberPage.getByRole('table', { name: 'Thành viên Workspace', exact: true }).getByText('Hải', { exact: true }).waitFor(); assert.equal(await memberPage.locator('.team-table tbody tr').filter({ hasText: 'Hải' }).getByRole('button', { name: 'Chặn truy cập', exact: true }).count(), 0); assert.equal(await memberPage.getByRole('button', { name: 'Rời Workspace', exact: true }).count(), 0);
  await ownerPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click();
  await workspaces.accept(auths[3], { token: new URLSearchParams(new URL(reusableLink.url).hash.slice(1)).get('token') }); await ownerPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click(); const transferRow = ownerPage.locator('.team-table tbody tr').filter({ hasText: 'Bình' }); await transferRow.getByRole('button', { name: 'Chuyển quyền sở hữu', exact: true }).click(); const transferDialog = ownerPage.getByRole('dialog'); assert.equal(await transferDialog.getByRole('button', { name: 'Chuyển quyền sở hữu', exact: true }).isDisabled(), true); await transferDialog.getByLabel('Nhập tên Workspace để xác nhận', { exact: true }).fill(standalone.name); await transferDialog.getByRole('button', { name: 'Chuyển quyền sở hữu', exact: true }).click(); await transferDialog.waitFor({ state: 'hidden' }); await ownerPage.getByRole('button', { name: 'Rời Workspace', exact: true }).waitFor(); assert.equal(await ownerPage.locator('.workspace-moderation').count(), 0); const transferred = (await workspaces.get(auths[3], standalone.id)).workspace; await workspaces.transfer(auths[3], standalone.id, { expectedVersion: transferred.version, memberId: users[0].id });
  await ownerPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click(); await ownerPage.locator('.workspace-tabs').getByRole('button', { name: 'Lời mời', exact: true }).click(); await ownerPage.getByRole('button', { name: '+ Tạo lời mời', exact: true }).click(); let inviteDialog = ownerPage.getByRole('dialog'); await inviteDialog.getByLabel('Email người nhận', { exact: true }).fill('s5-invite@example.com'); await inviteDialog.getByRole('button', { name: 'Tạo lời mời', exact: true }).click(); await inviteDialog.getByText('Đã tạo lời mời; email đang chờ gửi.', { exact: true }).waitFor(); await inviteDialog.getByRole('button', { name: 'Đóng kết quả', exact: true }).click(); const invitationRow = ownerPage.locator('.team-table tbody tr').filter({ hasText: 's5-invite@example.com' }); await invitationRow.waitFor();
  const mail = await EmailOutbox.collection.findOne({ workspaceId: new mongoose.Types.ObjectId(standalone.id), category: 'invitation', state: 'pending' }); assert.ok(mail); await EmailOutbox.collection.updateOne({ _id: mail._id }, { $set: { state: 'failed' } }); await ownerPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click(); await invitationRow.getByRole('button', { name: 'Thử gửi lại email', exact: true }).click(); await ownerPage.getByRole('dialog').getByRole('button', { name: 'Thử gửi lại email', exact: true }).click(); await ownerPage.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal((await EmailOutbox.collection.findOne({ _id: mail._id })).state, 'pending');
  await invitationRow.getByRole('button', { name: 'Thu hồi', exact: true }).click(); await ownerPage.getByRole('dialog').getByRole('button', { name: 'Thu hồi lời mời', exact: true }).click(); await ownerPage.getByRole('dialog').waitFor({ state: 'hidden' }); await invitationRow.getByText('Đã thu hồi', { exact: true }).waitFor(); assert.equal((await EmailOutbox.collection.findOne({ _id: mail._id })).state, 'cancelled');
  await ownerPage.getByRole('button', { name: '+ Tạo lời mời', exact: true }).click(); inviteDialog = ownerPage.getByRole('dialog'); await inviteDialog.getByLabel('Cách mời', { exact: true }).selectOption('LINK'); await inviteDialog.getByRole('button', { name: 'Tạo lời mời', exact: true }).click(); await inviteDialog.getByLabel('Liên kết tham gia', { exact: true }).waitFor(); const generatedLink = new URL(await inviteDialog.getByLabel('Liên kết tham gia', { exact: true }).inputValue()); assert.equal(generatedLink.pathname, '/invite'); assert.ok(new URLSearchParams(generatedLink.hash.slice(1)).get('token')); await inviteDialog.getByRole('button', { name: 'Đóng kết quả', exact: true }).click();
  const oldManaged = (await workspaces.get(auths[0], first.id)).workspace; await organizations.manager(auths[0], org.id, first.id, { expectedVersion: oldManaged.version, managerId: users[0].id }); const revokedMember = await WorkspaceMembership.collection.findOne({ workspaceId: new mongoose.Types.ObjectId(first.id), userId: users[1]._id }); await workspaces.remove(auths[0], first.id, users[1].id, { expectedVersion: revokedMember.version }); await memberPage.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click(); await memberPage.getByText('Workspace không còn khả dụng với quyền hiện tại.', { exact: false }).waitFor(); assert.equal(await memberPage.getByRole('heading', { name: first.name, exact: true }).count(), 0); assert.equal(await memberPage.locator('.team-table tbody tr').count(), 0);
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
    source = source.replaceAll('await page.waitForTimeout(options.waitMs);', `await page.waitForTimeout(options.waitMs); if (!await page.getByRole('table', { name: 'Thành viên Workspace', exact: true }).isVisible()) { await page.keyboard.press('Escape'); await page.locator('.workspace-tabs').getByRole('button', { name: 'Thành viên', exact: true }).click(); } await page.getByRole('table', { name: 'Thành viên Workspace', exact: true }).waitFor(); await page.waitForFunction(() => document.querySelector('.team-table')?.getAttribute('aria-busy') === 'false' && !document.querySelector('.workspace-moderation .loading-state')); await page.waitForTimeout(700);`).replaceAll('await context.close();', `await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();`);
    const file = `${out}/probe-fixture.mjs`; await writeFile(file, source);
    for (const [key, url] of [['projects', `http://localhost:5173/#workspace/${standalone.id}`]]) {
      const child = spawn(process.execPath, [file, url, '--widths', '375,768,1024,1280,1440', '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe-${key}`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: origin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
      assert.equal(await new Promise(resolve => child.once('exit', resolve)), 0);
    }
  }
  console.log(`PASS S5: Kick/rejoin distinction, archived Ban preview/confirmed cleanup queue, protected tasks/history, job retry, Unban without membership/cleanup cancellation, leave, member denial, 5 widths. No dev data/providers/workers. Screens ${out}`);
} catch (error) { if (browser) for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) { await page.screenshot({ path: `${out}/failure-${index}.png`, fullPage: true }); console.log((await page.locator('main').innerText()).slice(-1800)); } throw error;
} finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }




