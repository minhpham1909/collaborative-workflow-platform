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
const { models, User, OrganizationMembership, Workspace, WorkspaceMembership, OrganizationInvitation } = await import('../../BE/src/models/index.js');
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
const out = fileURLToPath(new URL('../../.local/stitch-team/', import.meta.url)); await mkdir(out, { recursive: true });
let repl, server, browser, releaseRevoke, seeRevoke, closing=false; const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url)) }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  await mongoose.connect(repl.getUri('workflow_fe_stitch_team_test'));
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
  const cutoff = cutoffCodec(config.accessKeyHex);
  const fixtureApp = () => createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, notificationsService: createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff }) }); server=fixtureApp().listen(0,'127.0.0.1'); await once(server, 'listening');
  let origin = `http://127.0.0.1:${server.address().port}`;
  async function rotateFixture(){const previous=server;server=fixtureApp().listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;await new Promise(resolve=>previous.close(resolve));}
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  let fail = false, delay = false, lostInviteResponse = false;
  async function pageFor(index) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('http://localhost:4000/**', async route => {
      if (fail && route.request().url().includes(`/organizations/${org.id}/members?`)) return route.abort();
      if (delay && route.request().url().includes(`/organizations/${org.id}/members?`)) await new Promise(resolve => setTimeout(resolve, new URL(route.request().url()).searchParams.get('q') === 'Lan' ? 900 : 50));
      const relay=origin;let response;try{response=await route.fetch({url:route.request().url().replace('http://localhost:4000',relay)});}catch{if(closing||relay!==origin)return route.abort().catch(()=>{});throw new Error('Fixture relay failed: '+new URL(route.request().url()).pathname);}
      if (lostInviteResponse && route.request().method() === 'POST' && route.request().url().endsWith('/invitations')) { lostInviteResponse = false; return route.abort(); }
      await route.fulfill({ response });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:5173/'); await page.getByLabel('Email', { exact: true }).fill(users[index].email); await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.locator('.studio-home').waitFor(); await page.goto('http://localhost:5173/#organizations'); await page.locator('.organization-page').waitFor(); return page;
  }
  const ownerPage = await pageFor(0);
  await ownerPage.goto(`http://localhost:5173/#organization/${org.id}/team`);
  await ownerPage.getByRole('table', { name: 'Thành viên tổ chức', exact: true }).getByText('Minh', { exact: true }).waitFor();
  assert.equal(await ownerPage.locator('.team-table tbody tr').count(), 3);
  await ownerPage.getByLabel('Tìm thành viên', { exact: true }).fill('Lan'); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 1); assert.equal(await ownerPage.locator('.team-list-heading h2 span').innerText(), '1');
  await ownerPage.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click(); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 3);
  for (const width of [1440,1280,1024,768,375]) { await ownerPage.setViewportSize({ width, height: 1000 }); await ownerPage.screenshot({ path: `${out}/members-${width}.png`, fullPage: true }); assert.ok(await ownerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Team overflow ${width}`); }
  await ownerPage.setViewportSize({ width: 1440, height: 1000 });
  await ownerPage.getByRole('button', { name: 'Mời thành viên', exact: true }).click();
  await ownerPage.getByLabel('Email người nhận', { exact: true }).fill('alpha-new@example.com');
  await ownerPage.getByLabel('Workspace đích (không bắt buộc)', { exact: true }).selectOption(first.id);
  await ownerPage.getByRole('dialog').screenshot({ path: `${out}/invite-dialog.png` });
  await ownerPage.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).click();
  await ownerPage.getByRole('table', { name: 'Lời mời tổ chức', exact: true }).getByText('alpha-new@example.com', { exact: true }).waitFor();
  const invitation = await OrganizationInvitation.collection.findOne({ email: 'alpha-new@example.com', organizationId: new mongoose.Types.ObjectId(org.id) }); assert.equal(String(invitation.workspaceId), first.id);
  await ownerPage.getByLabel('Trạng thái lời mời', { exact: true }).selectOption('active'); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 1);
  await ownerPage.getByRole('button', { name: 'Thu hồi', exact: true }).click(); await ownerPage.locator('.system-dialog button.primary').click(); await ownerPage.getByRole('heading', { name: 'Chưa có lời mời phù hợp', exact: true }).waitFor();
  assert.ok((await OrganizationInvitation.collection.findOne({ _id: invitation._id })).revokedAt);
  await ownerPage.getByLabel('Trạng thái lời mời', { exact: true }).selectOption('revoked'); await ownerPage.getByText('alpha-new@example.com', { exact: true }).waitFor();
  const memberPage = await pageFor(1); await memberPage.goto(`http://localhost:5173/#organization/${org.id}/team`); await memberPage.locator('.team-table tbody tr').first().waitFor(); assert.equal(await memberPage.getByRole('button', { name: 'Mời thành viên', exact: true }).count(), 0); assert.equal(await memberPage.getByRole('button', { name: 'Lời mời', exact: true }).count(), 0); await assert.rejects(organizations.invitations(auths[1], org.id, {}), /ORGANIZATION_ADMIN_REQUIRED/);
  const adminPage = await pageFor(2); await adminPage.goto(`http://localhost:5173/#organization/${org.id}/team`); await adminPage.getByRole('button', { name: 'Mời thành viên', exact: true }).click(); await adminPage.getByLabel('Email người nhận', { exact: true }).fill('denied-stale@example.com');
  const admin = await OrganizationMembership.collection.findOne({ organizationId: new mongoose.Types.ObjectId(org.id), userId: users[2]._id }); await organizations.role(auths[0], org.id, users[2].id, { expectedVersion: admin.version, role: 'member' });
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).click(); await adminPage.getByText('Thao tác này cần quyền Chủ sở hữu hoặc Quản trị viên tổ chức hiện tại. Tải lại để kiểm tra quyền.', { exact: true }).waitFor(); assert.equal(await adminPage.getByLabel('Email người nhận', { exact: true }).inputValue(), 'denied-stale@example.com'); assert.equal(await OrganizationInvitation.collection.countDocuments({ email: 'denied-stale@example.com' }), 0);
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click(); await adminPage.locator('.system-dialog button.primary').click(); await adminPage.getByRole('button', { name: 'Làm mới', exact: true }).click(); await adminPage.waitForFunction(() => !document.querySelector('.organization-hero button'));
  await ownerPage.goto(`http://localhost:5173/#organization/${privateOrg.id}/team`); await ownerPage.getByText('Tổ chức không còn khả dụng với quyền hiện tại.').waitFor(); assert.equal(await ownerPage.getByText('Private hidden organization', { exact: true }).count(), 0); assert.equal(await ownerPage.locator('.team-table tbody tr').count(), 0);
  for (let index=0; index<13; index++) { const added = await User.create({ email: `directory-${index}@example.com`, displayName: `Thành viên ${index}`, passwordHash: hash, emailVerifiedAt: new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } }); await OrganizationMembership.create({ organizationId: org.id, userId: added.id, joinedAt: new Date() }); }
  await ownerPage.goto(`http://localhost:5173/#organization/${org.id}/team`); await ownerPage.getByText('16', { exact: true }).waitFor(); assert.equal(await ownerPage.locator('.team-table tbody tr').count(), 12); await ownerPage.getByRole('button', { name: 'Tải thêm thành viên', exact: true }).click(); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 16);
  fail = true; await ownerPage.getByRole('button', { name: 'Làm mới', exact: true }).click(); await ownerPage.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); assert.equal(await ownerPage.locator('.team-table tbody tr').count(), 0); fail = false; await ownerPage.getByRole('button', { name: 'Thử lại', exact: true }).click(); await ownerPage.getByText('16', { exact: true }).waitFor();
  delay = true; const oldQuery = ownerPage.waitForRequest(request => request.url().includes('/members?') && new URL(request.url()).searchParams.get('q') === 'Lan'); await ownerPage.getByLabel('Tìm thành viên', { exact: true }).fill('Lan'); await oldQuery; await ownerPage.getByLabel('Tìm thành viên', { exact: true }).fill('Minh'); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 1 && document.querySelector('.team-table tbody')?.textContent.includes('Minh')); await ownerPage.waitForTimeout(800); assert.ok((await ownerPage.locator('.team-table tbody').innerText()).includes('Minh')); delay = false;
  for(let index=0; index<13; index++) await organizations.invite(auths[0], org.id, { email: `pending-${index}@example.com` });
  await ownerPage.getByRole('button', { name: 'Lời mời', exact: true }).click(); await ownerPage.getByText('16', { exact: true }).waitFor(); assert.equal(await ownerPage.locator('.team-table tbody tr').count(), 12); await ownerPage.getByRole('button', { name: 'Tải thêm lời mời', exact: true }).click(); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 16);
  await ownerPage.getByLabel('Tìm email được mời', { exact: true }).fill('alpha-new'); await ownerPage.waitForFunction(() => document.querySelectorAll('.team-table tbody tr').length === 1); assert.equal(await ownerPage.locator('.team-list-heading h2 span').innerText(), '1');
  await ownerPage.getByRole('button', { name: 'Mời thành viên', exact: true }).click(); await ownerPage.getByLabel('Email người nhận', { exact: true }).fill('uncertain-created@example.com'); lostInviteResponse = true; await ownerPage.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).click(); await ownerPage.getByText('Chưa rõ lời mời đã được tạo. Đóng form và tải lại danh sách trước khi gửi tiếp.', { exact: true }).waitFor(); assert.equal(await ownerPage.getByRole('dialog').getByRole('button', { name: 'Tạo lời mời', exact: true }).isDisabled(), true); assert.equal(await OrganizationInvitation.collection.countDocuments({ email: 'uncertain-created@example.com' }), 1); await ownerPage.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click(); await ownerPage.locator('.system-dialog button.primary').click(); await ownerPage.getByText('uncertain-created@example.com', { exact: true }).waitFor();
  await rotateFixture();await ownerPage.evaluate(()=>localStorage.setItem('workflow.auth.locale','en'));await ownerPage.reload();await ownerPage.getByRole('table',{name:'Organization members',exact:true}).waitFor();await ownerPage.getByRole('button',{name:'Member',exact:true}).click();await ownerPage.locator('.team-table[aria-busy="false"] tbody tr').first().waitFor();await ownerPage.getByLabel('Search members').fill('Lan');await ownerPage.getByText('Lan',{exact:true}).waitFor();assert.equal(await ownerPage.locator('main').getAttribute('lang'),'en');
  for(const width of [375,768,1024,1280,1440]){await ownerPage.setViewportSize({width,height:1000});await ownerPage.screenshot({path:out+'/members-en-'+width+'.png',fullPage:true});assert.ok(await ownerPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'EN members overflow '+width);}
  await ownerPage.getByRole('button',{name:'Invite member',exact:true}).click();await ownerPage.getByLabel('Recipient email',{exact:true}).fill('english-invite@example.com');await ownerPage.getByLabel('Target workspace (optional)',{exact:true}).selectOption(first.id);await ownerPage.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await ownerPage.getByRole('dialog',{name:'Confirm action',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await ownerPage.getByLabel('Recipient email',{exact:true}).inputValue(),'english-invite@example.com');await ownerPage.getByRole('dialog',{name:'Invite to organization',exact:true}).getByRole('button',{name:'Create invitation',exact:true}).click();await ownerPage.getByText('english-invite@example.com',{exact:true}).waitFor();const englishInvite=await OrganizationInvitation.findOne({email:'english-invite@example.com'});assert.equal(String(englishInvite.workspaceId),first.id);
  for(const width of [375,768,1024,1280,1440]){await ownerPage.setViewportSize({width,height:1000});await ownerPage.screenshot({path:out+'/invites-en-'+width+'.png',fullPage:true});assert.ok(await ownerPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'EN invitations overflow '+width);}
  await rotateFixture();
  // Create same-document history before testing the in-flight revoke guard.
  await ownerPage.evaluate(id=>{location.hash='organization/'+id;},org.id);await ownerPage.getByRole('heading',{name:org.name,exact:true}).waitFor();await ownerPage.getByRole('link',{name:'Members & permissions',exact:true}).click();await ownerPage.getByRole('button',{name:'Invitations',exact:true}).click();await ownerPage.getByText('english-invite@example.com',{exact:true}).waitFor();
  let revokeWrites=0;const started=new Promise(resolve=>{seeRevoke=resolve;});await ownerPage.context().route('**/invitations/'+englishInvite.id+'/revoke',async route=>{revokeWrites++;const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});seeRevoke();await new Promise(resolve=>{releaseRevoke=resolve;});await route.fulfill({response});});
  await ownerPage.locator('.team-table tbody tr').filter({hasText:'english-invite@example.com'}).getByRole('button',{name:'Revoke',exact:true}).click();await ownerPage.getByRole('dialog',{name:'Revoke invitation',exact:true}).getByRole('button',{name:'Revoke',exact:true}).click();await started;await ownerPage.goBack();await ownerPage.getByText('A request is being processed. Wait for the outcome before leaving.',{exact:false}).waitFor();await ownerPage.waitForURL('**/#organization/'+org.id+'/team');releaseRevoke();await ownerPage.locator('.team-table tbody tr').filter({hasText:'english-invite@example.com'}).getByText('Revoked',{exact:true}).waitFor();assert.equal(revokeWrites,1);
  await rotateFixture();await memberPage.evaluate(()=>localStorage.setItem('workflow.auth.locale','en'));await memberPage.reload();await memberPage.getByRole('table',{name:'Organization members',exact:true}).waitFor();assert.equal(await memberPage.getByRole('button',{name:'Invite member',exact:true}).count(),0);assert.equal(await memberPage.getByRole('button',{name:'Invitations',exact:true}).count(),0);
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
    for (const [key, url] of [['members', `http://localhost:5173/#organization/${org.id}/team`]]) {
      const child = spawn(process.execPath, [file, url, '--widths', '375,768,1024,1280,1440', '--wait', '1800', '--pw', 'C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node', '--out', `${out}/probe-${key}`], { stdio: 'inherit', env: { ...process.env, WORKFLOW_FIXTURE_API: origin, WORKFLOW_FIXTURE_EMAIL: users[0].email, WORKFLOW_FIXTURE_PASSWORD: password } });
      assert.equal(await new Promise(resolve => child.once('exit', resolve)), 0);
    }
  }
  console.log(`PASS Team members/invitations Vi-En and busy-revoke Back guard; S4a: member table/search/total/cursor, role scope, email invitation/optional Workspace/revoke, filters/pagination, demotion denies create and preserves draft, private organization isolation, 5 widths. Screens: ${out}. No live DB or SMTP.`);
} catch(error){console.log('Page errors:',errors);if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png'});console.log((await page.locator('main').innerText().catch(()=>'' )).slice(-800));}throw error;} finally { closing=true; releaseRevoke?.(); await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await repl?.stop(); }
