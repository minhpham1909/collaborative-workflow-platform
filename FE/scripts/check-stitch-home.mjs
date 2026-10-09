// Real API/browser fixtures only; no user DB, live mail or cleanup queue.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || 'playwright');
const { MongoMemoryReplSet } = await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const { default: mongoose } = await import('../../BE/node_modules/mongoose/index.js');
const { models, User, WorkspaceMembership, Organization, OrganizationMembership, Workspace } = await import('../../BE/src/models/index.js');
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
const out = fileURLToPath(new URL('../../.local/stitch-home/', import.meta.url));
await mkdir(out, { recursive: true });
let repl, server, browser;
const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_home_test'));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: 'http://localhost:5173', secureCookies: false }, password = 'Stitch Home fixture password';
  const hash = await hashPassword(password), users = [], auths = [];
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  for (const [email, displayName] of [['stitch-home@example.com', 'Minh'], ['stitch-team@example.com', 'Lan']]) {
    const user = new User({ email, displayName, passwordHash: hash, emailVerifiedAt: new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } }); await user.save(); users.push(user);
    auths.push(await auth.authenticate((await auth.login({ email, password })).accessToken));
  }
  const workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) }), work = createWorkService({ store: createMongoWorkStore({ config }) });
  const owned = (await workspaces.create(auths[0], { name: 'Sáng Tạo Studio' })).workspace;
  const team = (await workspaces.create(auths[1], { name: 'Sản Phẩm & Kỹ Thuật' })).workspace;
  const marketing = (await workspaces.create(auths[0], { name: 'Marketing & Tăng Trưởng' })).workspace;
  const archived = (await workspaces.create(auths[0], { name: 'Tài liệu lưu trữ' })).workspace;
  await WorkspaceMembership.create({ workspaceId: owned.id, userId: users[1].id, joinedAt: new Date() });
  await WorkspaceMembership.create({ workspaceId: team.id, userId: users[0].id, joinedAt: new Date() });
  await workspaces.create(auths[1], { name: 'Private hidden workspace' });
  for (const [ws, text, actor] of [[owned, 'Đội ngũ thiết kế thương hiệu, giao diện sản phẩm và nội dung truyền thông đa kênh.', 0], [team, 'Phát triển sản phẩm, tối ưu hiệu năng và kiến trúc hệ thống.', 1], [marketing, 'Kế hoạch ra mắt sản phẩm và chiến dịch truyền thông cộng đồng.', 0]]) {
    await workspaces.update(auths[actor], ws.id, { expectedVersion: ws.version, description: { format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } } });
    await work.createProject(auths[actor], ws.id, { name: `${ws.name} Project` });
  }
  await workspaces.state(auths[0], archived.id, { expectedVersion: archived.version, state: 'archived', confirmName: archived.name, reason: 'Fixture archive' });
  const org = new Organization({ ownerId: users[1].id, name: 'Fixture organization' }); await org.save();
  for (const [index, role] of [[0, 'admin'], [1, 'member']]) await new OrganizationMembership({ organizationId: org.id, userId: users[index].id, role, joinedAt: new Date() }).save();
  const attached = new Workspace({ name: 'Nhóm sản phẩm của tổ chức', ownerId: null, organizationId: org.id, managerId: users[1].id }); await attached.save();
  await WorkspaceMembership.create({ workspaceId: attached.id, userId: users[1].id, joinedAt: new Date() });
  const project = (await work.createProject(auths[0], owned.id, { name: 'Thiết kế Website Bloom' })).project;
  const minute = new Date(Math.floor(Date.now() / 60_000) * 60_000);
  await work.createTask(auths[1], project.id, { title: 'Hoàn thiện giao diện trang chủ', assigneeId: users[0].id, dueAt: new Date(minute.getTime() - 60_000).toISOString() });
  await work.createTask(auths[1], project.id, { title: 'Kiểm tra luồng đăng nhập', assigneeId: users[0].id, dueAt: new Date(minute.getTime() + 60_000).toISOString() });
  const cutoff = cutoffCodec(config.accessKeyHex);
  server = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }).listen(0, '127.0.0.1'); await once(server, 'listening');
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let fail = false, delay = false;
  await context.route('http://localhost:4000/**', async route => {
    if (fail && route.request().url().includes('/workspaces?')) return route.abort();
    if (delay && route.request().url().includes('/workspaces?')) await new Promise(resolve => setTimeout(resolve, 400));
    const response = await route.fetch({ url: route.request().url().replace('http://localhost:4000', apiOrigin) }); await route.fulfill({ response });
  });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173/'); await page.getByLabel('Email', { exact: true }).fill(users[0].email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const cards = page.locator('.home-workspace-card'); await page.getByRole('heading', { name: 'Sáng Tạo Studio', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 5);
  assert.equal(await page.getByText('Private hidden workspace').count(), 0); assert.equal(await page.getByText('Quản trị tổ chức', { exact: true }).count(), 1);
  for (const width of [1440, 1280, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Home overflow ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: /Tôi quản lý/ }).click(); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 4);
  await page.getByLabel('Trạng thái Workspace').selectOption('active'); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 3);
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click(); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 5);
  await page.getByRole('button', { name: 'Xem Workspace dạng danh sách' }).click(); assert.ok(await page.locator('.view-list').count()); await page.screenshot({ path: `${out}/home-list.png`, fullPage: true });
  await page.getByRole('button', { name: 'Xem Workspace dạng thẻ' }).click();
  await page.keyboard.press('Control+k'); assert.equal(await page.locator('#home-search').evaluate(node => node === document.activeElement), true);
  await page.locator('#home-search').fill('Không có kết quả'); await page.getByRole('heading', { name: 'Không có Workspace phù hợp' }).waitFor();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click(); await page.getByRole('heading', { name: 'Sáng Tạo Studio', exact: true }).waitFor();
  await page.getByRole('button', { name: /Thời gian/ }).click(); await page.getByLabel('Từ ngày tạo').fill('2026-10-10'); await page.getByLabel('Đến ngày tạo').fill('2026-10-01'); await page.getByText('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.').waitFor(); assert.equal(await cards.count(), 0);
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click(); await page.getByRole('heading', { name: 'Sáng Tạo Studio', exact: true }).waitFor();
  await page.setViewportSize({ width: 375, height: 812 }); await page.getByRole('button', { name: 'Mở menu điều hướng' }).click(); await page.getByRole('dialog', { name: 'Menu điều hướng' }).waitFor(); await page.keyboard.press('Escape'); await page.getByRole('dialog', { name: 'Menu điều hướng' }).waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('button', { name: 'Mở menu điều hướng' }).evaluate(node => node === document.activeElement), true);
  await page.getByRole('button', { name: 'Mở menu điều hướng' }).click(); await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('dialog', { name: 'Menu điều hướng' }).waitFor({ state: 'hidden' });
  await page.locator('#home-search').fill('Sáng Tạo'); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 1);
  await page.getByRole('button', { name: 'Tạo Workspace', exact: true }).first().click(); await page.getByRole('dialog', { name: 'Tạo Workspace' }).waitFor(); await page.getByLabel('Tên Workspace', { exact: true }).fill('Nhóm mới từ Home'); await page.getByRole('dialog').getByRole('button', { name: 'Tạo Workspace', exact: true }).click(); await page.getByRole('heading', { name: 'Nhóm mới từ Home' }).waitFor();
  assert.equal(await page.locator('#home-search').inputValue(), '');
  // Mouse event hits the card's stretched real anchor over its media.
  await cards.filter({ hasText: 'Sáng Tạo Studio' }).locator('.home-card-media').click({ force: true }); await page.waitForURL(`**/#workspace/${owned.id}`); await page.goBack(); await page.locator('.studio-home').waitFor();
  fail = true; await page.getByRole('button', { name: 'Làm mới', exact: true }).click(); await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); fail = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('heading', { name: 'Sáng Tạo Studio', exact: true }).waitFor();
  delay = true; await page.locator('#home-search').fill('Tài liệu'); await page.locator('#home-search').fill('Marketing'); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 1); assert.equal(await cards.first().getByRole('heading').innerText(), 'Marketing & Tăng Trưởng'); delay = false;
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click(); await page.getByRole('heading', { name: 'Sáng Tạo Studio', exact: true }).waitFor();
  for (let index = 0; index < 14; index++) await workspaces.create(auths[0], { name: `Pagination fixture ${index}` });
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.home-count')?.textContent === '20'); assert.equal(await cards.count(), 12);
  await page.getByRole('button', { name: 'Tải thêm', exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll('.home-workspace-card').length === 20);
  assert.equal(new Set(await cards.getByRole('heading').allTextContents()).size, 20);
  assert.deepEqual(errors, []);
  // Run the installed skill's probe, adapting only browser launch and fixture
  // authentication/routing. Measurement code remains unchanged; no real login.
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
    const probeFile = `${out}/probe-fixture.mjs`; await writeFile(probeFile, source);
    const child = spawn(process.execPath, [probeFile, 'http://localhost:5173/#home', '--widths', '375,768,1024,1280,1440', '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: apiOrigin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
    assert.equal(await new Promise(resolve => child.once('exit', resolve)), 0);
  }
  console.log(`PASS S1: scoped role/state/counts, card navigation, grid/list, time/search races, empty/network error/retry, create, pagination20, mobile keyboard/resize and no overflow at 1440/1280/1024/768/375. Screens: ${out}. No dev/provider calls.`);
} finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }
