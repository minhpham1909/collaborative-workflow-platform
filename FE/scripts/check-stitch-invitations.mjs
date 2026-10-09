// Isolated real API/browser fixture. No SMTP worker and no user database writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || "playwright");
const { MongoMemoryReplSet } = await import("../../BE/node_modules/mongodb-memory-server-core/lib/index.js");
const { default: mongoose } = await import("../../BE/node_modules/mongoose/index.js");
const { models, User, WorkspaceMembership, OrganizationMembership, ProjectGuest, TaskComment, EmailOutbox, OrganizationInvitation } = await import("../../BE/src/models/index.js");
const { createApp } = await import("../../BE/src/app.js");
const { createAuthService } = await import("../../BE/src/auth/service.js");
const { createMongoAuthStore } = await import("../../BE/src/auth/mongo-store.js");
const { createUsersService } = await import("../../BE/src/users/service.js");
const { createMongoUsersStore } = await import("../../BE/src/users/mongo-store.js");
const { hashPassword } = await import("../../BE/src/auth/passwords.js");
const { createWorkspaceService } = await import("../../BE/src/workspaces/service.js");
const { createMongoWorkspaceStore } = await import("../../BE/src/workspaces/mongo-store.js");
const { createWorkService } = await import("../../BE/src/work/service.js");
const { createMongoWorkStore } = await import("../../BE/src/work/mongo-store.js");
const { createOrganizationService } = await import("../../BE/src/organizations/service.js");
const { createMongoOrganizationStore } = await import("../../BE/src/organizations/mongo-store.js");
const { createNotificationsService } = await import("../../BE/src/notifications/service.js");
const { createMongoNotificationsStore } = await import("../../BE/src/notifications/mongo-store.js");
const { cutoffCodec } = await import("../../BE/src/notifications/input.js");
const { createDeliveryCrypto } = await import("../../BE/src/auth/delivery-crypto.js");
const { testConfig } = await import("../../BE/test-support/auth-store.js");
let repl, browser, server;
const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: "8.0.17", downloadDir: fileURLToPath(new URL("../../.local/mongodb-binaries/", import.meta.url)) }, replSet: { count: 1, storageEngine: "wiredTiger", ip: "127.0.0.1" } });
  await mongoose.connect(repl.getUri("workflow_fe_stitch_invitation_test"));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: "http://localhost:5173" }, password = "Workflow fixture password 123";
  const users = [];
  const passwordHash = await hashPassword(password);
  for (const [email, name, verified] of [["owner-c2@example.com", "Owner C2", true], ["guest-c2@example.com", "Guest C2", true], ["verify-c2@example.com", "Verify C2", false], ["uncertain-c2@example.com", "Uncertain C2", true]]) {
    const user = new User({ email, displayName: name, passwordHash, emailVerifiedAt: verified ? new Date() : null, termsAcceptance: { version: "fixture", acceptedAt: new Date() } });
    await user.save(); users.push(user);
  }
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const ownerAuth = await auth.authenticate((await auth.login({ email: users[0].email, password })).accessToken);
  const workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const work = createWorkService({ store: createMongoWorkStore({ config }) });
  const usersService = createUsersService({ store:createMongoUsersStore() });
  const orgs = createOrganizationService({ store: createMongoOrganizationStore({ config }) });
  const cutoff = cutoffCodec(config.accessKeyHex);
  const notifications = createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff });
  const workspace = (await workspaces.create(ownerAuth, { name: "Shared fixture Workspace" })).workspace;
  const project = (await work.createProject(ownerAuth, workspace.id, { name: "Guest Project fixture" })).project;
  const privateProject = (await work.createProject(ownerAuth, workspace.id, { name: "Private Project fixture" })).project;
  const task = (await work.createTask(ownerAuth, project.id, { title: "Guest Task fixture" })).task;
  const link = await work.inviteGuest(ownerAuth, project.id, { type: "LINK" });
  const org = (await orgs.create(ownerAuth, { name: "Organization C2 fixture" })).organization;
  const orgWorkspace = (await orgs.createWorkspace(ownerAuth, org.id, { name: "Org Target fixture" })).workspace;
  const orgInvite = await orgs.invite(ownerAuth, org.id, { email: users[2].email, workspaceId: orgWorkspace.id });
  const emailInvite = await work.inviteGuest(ownerAuth, project.id, { type: "EMAIL", email: users[1].email });
  const crypto = createDeliveryCrypto(config.mailKeyHex);
  const rawEmailToken = async field => {
    const job = await EmailOutbox.collection.findOne(field);
    return crypto.open(job.encryptedDeliveryData, job.eventId).token;
  };
  const orgToken = await rawEmailToken({ organizationInvitationId: new mongoose.Types.ObjectId(orgInvite.invitation.id) });
  const guestToken = await rawEmailToken({ projectInvitationId: new mongoose.Types.ObjectId(emailInvite.invitation.id) });
  server = createApp({ usersService, authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: orgs, notificationsService: notifications }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const apiOrigin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  const requests = [];
  async function pageFor(url, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let loseAccept = options.loseAccept ?? false;
    let failPreview = options.failPreview ?? false;
    await context.route("http://localhost:4000/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      requests.push({ path, method: request.method() });
      if (options.delayAccept && path.endsWith('/accept')) await new Promise(resolve=>setTimeout(resolve,900));
      if (failPreview && path.endsWith('/preview')) { failPreview=false; return route.abort(); }
      const response = await route.fetch({ url: request.url().replace("http://localhost:4000", apiOrigin) });
      if (loseAccept && path === "/project-invitations/accept") {
        loseAccept = false;
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR" } }) });
      }
      await route.fulfill({ response });
    });
    const page = await context.newPage(); page.on("pageerror", e => { errors.push(e.stack ?? e.message); console.info("Browser error:", e.stack ?? e.message); });
    await page.goto(url); return page;
  }
  async function login(page, index) {
    await page.getByLabel("Email", { exact: true }).fill(users[index].email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.locator(".app-header").waitFor();
  }
  const page = await pageFor(link.url);
  await page.getByRole("heading", { name: project.name, exact: true }).waitFor();
  assert.ok(page.url().endsWith("#project-invite")); assert.ok(!page.url().includes("token="));
  assert.equal(requests.filter(r => r.path === "/project-invitations/accept").length, 0);
  await page.getByRole("link", { name: "Tạo tài khoản thử nghiệm" }).click();
  await page.getByRole("link", { name: "Về đăng nhập" }).click();
  await page.getByRole("heading", { name: project.name, exact: true }).waitFor();
  await login(page, 1);
  assert.equal(await ProjectGuest.collection.countDocuments({ userId: users[1]._id }), 0);
  await page.getByRole("button", { name: "Chấp nhận quyền Guest", exact: true }).click();
  await page.getByRole("heading", { name: project.name, exact: true }).waitFor();
  await page.getByRole("link", { name: task.title, exact: true }).waitFor();
  assert.ok(page.url().endsWith(`#project/${project.id}`));
  assert.equal(await page.getByRole("button", { name: "+ Tạo Task", exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Lưu trữ Dự án", exact: true }).count(), 0);
  assert.equal(requests.filter(r => r.path === `/workspaces/${workspace.id}` && r.method === "GET").length, 0);
  await page.getByRole("link", { name: task.title, exact: true }).click();
  await page.getByRole("heading", { name: task.title, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Xóa Task", exact: true }).count(), 0);
  await page.getByRole("button", { name: "+ Viết bình luận", exact: true }).click();
  await page.locator('.comment-form [contenteditable="true"]').fill("Guest browser feedback");
  await page.getByRole("button", { name: "Gửi bình luận", exact: true }).click();
  await page.locator('.comment-form').waitFor({ state: 'hidden' });
  await page.getByText("Guest browser feedback", { exact: true }).waitFor();
  assert.equal(await TaskComment.collection.countDocuments({ authorId: users[1]._id }), 1);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await mkdir(fileURLToPath(new URL("../../.local/qa-c2/", import.meta.url)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("../../.local/qa-c2/guest-task-mobile.png", import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: fileURLToPath(new URL("../../.local/qa-c2/guest-task-desktop.png", import.meta.url)), fullPage: true });
  assert.equal(await WorkspaceMembership.collection.countDocuments({ userId: users[1]._id }), 0);
  const grant = await ProjectGuest.collection.findOne({ projectId: new mongoose.Types.ObjectId(project.id), userId: users[1]._id });
  await work.revokeGuest(ownerAuth, project.id, users[1].id, { expectedVersion: grant.version });
  await page.getByRole("button", { name: "Làm mới Task", exact: true }).click();
  await page.getByText("Nội dung không còn khả dụng với quyền hiện tại.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "+ Viết bình luận", exact: true }).count(), 0);
  if (await page.getByRole('button', { name:'Đóng chi tiết Task', exact:true }).count()) await page.getByRole('button', { name:'Đóng chi tiết Task', exact:true }).click();
  await page.getByRole('navigation', { name:'Điều hướng chính' }).getByRole("link", { name: "Dự án được chia sẻ", exact: true }).click();
  await page.getByText(/Không có Project được chia sẻ phù hợp/).waitFor();

  const orgPage = await pageFor(`http://localhost:5173/organization-invite#token=${orgToken}`);
  await orgPage.getByRole("heading", { name: org.name, exact: true }).waitFor();
  await login(orgPage, 2);
  await orgPage.getByRole("button", { name: "Đã xác minh · Tải lại", exact: true }).waitFor();
  assert.equal(await OrganizationMembership.collection.countDocuments({ userId: users[2]._id }), 0);
  await User.collection.updateOne({ _id: users[2]._id }, { $set: { emailVerifiedAt: new Date() } });
  await orgPage.getByRole("button", { name: "Đã xác minh · Tải lại", exact: true }).click();
  await orgPage.getByRole("button", { name: "Tham gia tổ chức", exact: true }).click();
  await orgPage.getByRole("heading", { name: orgWorkspace.name, exact: true }).waitFor();
  assert.ok(orgPage.url().endsWith(`#workspace/${orgWorkspace.id}`));

  const mismatch = await pageFor(`http://localhost:5173/project-invite#token=${guestToken}`);
  await login(mismatch, 0);
  await mismatch.getByRole("button", { name: "Chấp nhận quyền Guest", exact: true }).click();
  await mismatch.getByText("Lời mời này dành cho tài khoản có email khác.", { exact: true }).waitFor();
  assert.equal(await ProjectGuest.collection.countDocuments({ userId: users[0]._id }), 0);
  await mismatch.getByRole("button", { name:"Đổi tài khoản", exact:true }).click();
  await login(mismatch, 1);
  await mismatch.getByRole("button", { name: "Chấp nhận quyền Guest", exact: true }).click();
  await mismatch.getByRole("heading", { name: project.name, exact: true }).waitFor();

  const uncertain = await pageFor(link.url, { loseAccept: true });
  await login(uncertain, 3);
  await uncertain.getByRole("button", { name: "Chấp nhận quyền Guest", exact: true }).click();
  await uncertain.getByText(/Chưa xác nhận gia nhập/).waitFor();
  assert.equal(await uncertain.getByRole("button", { name: "Chấp nhận quyền Guest", exact: true }).isDisabled(), true);
  await uncertain.getByRole("link", { name: "Dự án được chia sẻ", exact: true }).first().click();
  await uncertain.getByRole("link", { name: project.name, exact: true }).waitFor();
  await uncertain.getByRole("link", { name: project.name, exact: true }).click();
  await uncertain.getByRole("heading", { name: project.name, exact: true }).waitFor();
  await uncertain.goto(`http://localhost:5173/#project/${privateProject.id}`);
  await uncertain.getByText(/Nội dung không còn khả dụng với quyền hiện tại/).waitFor();
  await work.state(ownerAuth, project.id, { state: "archived", expectedVersion: 0 });
  await uncertain.goto(`http://localhost:5173/#task/${task.id}`);
  await uncertain.getByRole("heading", { name: task.title, exact: true }).waitFor();
  assert.equal(await uncertain.getByRole("button", { name: "+ Viết bình luận", exact: true }).count(), 0);
  await uncertain.getByRole("link", { name: "Dự án được chia sẻ", exact: true }).first().click();
  await uncertain.getByLabel("Trạng thái Dự án", { exact: true }).selectOption("archived");
  await uncertain.getByRole("link", { name: project.name, exact: true }).waitFor();

  const refreshed = await pageFor(link.url);
  await refreshed.getByRole("heading", { name: project.name, exact: true }).waitFor();
  await refreshed.reload();
  await refreshed.getByText(/Mở lại liên kết lời mời gốc/).waitFor();
  const stored = await refreshed.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].join(" "));
  assert.ok(!stored.includes(new URLSearchParams(new URL(link.url).hash.slice(1)).get("token")));
  const out=fileURLToPath(new URL('../../.local/stitch-invitations/',import.meta.url));await mkdir(out,{recursive:true});
  const visualWs=(await workspaces.create(ownerAuth,{name:'Studio cộng tác thiết kế — không gian chia sẻ dành cho sản phẩm và nhận diện thương hiệu của nhóm sáng tạo'})).workspace;
  const visualLink=(await workspaces.invite(ownerAuth,visualWs.id,{type:'LINK'})).url;
  const visualProject=(await work.createProject(ownerAuth,visualWs.id,{name:'Project cộng tác với khách hàng'})).project;
  const visualGuest=(await work.inviteGuest(ownerAuth,visualProject.id,{type:'LINK'})).url;
  const visualOrg=await orgs.invite(ownerAuth,org.id,{email:users[1].email,workspaceId:orgWorkspace.id});
  const visualOrgToken=await rawEmailToken({organizationInvitationId:new mongoose.Types.ObjectId(visualOrg.invitation.id)});
  for(const [scope,url,name] of [['workspace',visualLink,visualWs.name],['project',visualGuest,visualProject.name],['organization','http://localhost:5173/organization-invite#token='+visualOrgToken,org.name]]) {
    const visual=await pageFor(url);await visual.getByRole('heading',{name,exact:true}).waitFor();await visual.getByRole('button',{name:'Đăng nhập',exact:true}).waitFor();assert.ok(!visual.url().includes('token='));
    for(const width of [1440,1280,1024,768,375]){await visual.setViewportSize({width,height:1000});await visual.screenshot({path:out+'/'+scope+'-'+width+'.png',fullPage:true});assert.ok(await visual.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Invite overflow '+scope+'/'+width);}
  }
  const retry=await pageFor(visualLink,{failPreview:true});await retry.getByRole('button',{name:'Tải lại lời mời',exact:true}).click();await retry.getByRole('heading',{name:visualWs.name,exact:true}).waitFor();
  const joining=await pageFor(visualLink,{delayAccept:true});await login(joining,1);await joining.getByRole('button',{name:'Tham gia Workspace',exact:true}).click();await joining.getByRole('link',{name:'Về Trang chủ',exact:true}).click();assert.equal(new URL(joining.url()).hash,'#invite');await joining.waitForURL('**/#workspace/'+visualWs.id);assert.equal(await WorkspaceMembership.collection.countDocuments({workspaceId:new mongoose.Types.ObjectId(visualWs.id),userId:users[1]._id,state:'active'}),1);
  const revoked=await work.inviteGuest(ownerAuth,visualProject.id,{type:'LINK'});const revokePage=await pageFor(revoked.url);await login(revokePage,3);await revokePage.getByRole('button',{name:'Chấp nhận quyền Guest',exact:true}).waitFor();await work.revokeGuestInvitation(ownerAuth,visualProject.id,revoked.invitation.id,{expectedVersion:revoked.invitation.version});await revokePage.getByRole('button',{name:'Chấp nhận quyền Guest',exact:true}).click();await revokePage.getByRole('heading',{name:'Lời mời không còn khả dụng',exact:true}).waitFor();assert.equal(await revokePage.getByRole('button',{name:'Chấp nhận quyền Guest',exact:true}).count(),0);assert.equal(await revokePage.getByRole('heading',{name:visualProject.name,exact:true}).count(),0);
  await OrganizationInvitation.collection.updateOne({_id:new mongoose.Types.ObjectId(visualOrg.invitation.id)},{$set:{expiresAt:new Date(Date.now()-60000)}});
  const expired=await pageFor('http://localhost:5173/organization-invite#token='+visualOrgToken);await expired.getByRole('heading',{name:'Lời mời không còn khả dụng',exact:true}).waitFor();assert.equal(await expired.getByRole('button',{name:'Tham gia tổ chức',exact:true}).count(),0);await expired.screenshot({path:out+'/expired.png',fullPage:true});
  if(process.env.WORKFLOW_SKILL_PROBE==='1'){
    let source=await readFile('C:/Users/Acer/.agents/skills/ui-ux/scripts/probe.mjs','utf8');source=source.replace('chromium.launch();','chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});');
    // These are writes/account changes, never overlay opener buttons.
    source=source.replace('const actionLabelSource = "', 'const actionLabelSource = "đổi tài khoản|tham gia|chấp nhận|');
    const setup="async function fixtureSetup(context){await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',process.env.WORKFLOW_FIXTURE_API)});await route.fulfill({response});});const response=await fetch(process.env.WORKFLOW_FIXTURE_API+'/auth/login',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({email:process.env.WORKFLOW_FIXTURE_EMAIL,password:process.env.WORKFLOW_FIXTURE_PASSWORD})});if(!response.ok)throw new Error('FIXTURE_LOGIN_FAILED');const cookie=response.headers.get('set-cookie').split(';')[0],pivot=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,pivot),value:cookie.slice(pivot+1),domain:'localhost',path:'/auth',httpOnly:true,secure:false,sameSite:'Strict'}]);}\n";
    source=source.replace('async function probeWidth(',setup+'async function probeWidth(').replaceAll('const page = await context.newPage();','await fixtureSetup(context); const page = await context.newPage();').replaceAll('await context.close();',"await context.unrouteAll({behavior:'ignoreErrors'});await context.close();");const file=out+'/probe-fixture.mjs';await writeFile(file,source);
    for(const width of [375,768,1024,1280,1440]){const fixture=createApp({usersService,authService:auth,authConfig:config,workspaceService:workspaces,workService:work,organizationService:orgs,notificationsService:notifications}).listen(0,'127.0.0.1');await once(fixture,'listening');const child=spawn(process.execPath,[file,visualLink,'--widths',String(width),'--wait','1800','--pw','C:/Users/Acer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node','--out',out+'/probe-invite-'+width],{stdio:'inherit',env:{...process.env,WORKFLOW_FIXTURE_API:'http://127.0.0.1:'+fixture.address().port,WORKFLOW_FIXTURE_EMAIL:users[0].email,WORKFLOW_FIXTURE_PASSWORD:password}});const result=await new Promise(resolve=>child.once('exit',resolve));await new Promise(resolve=>fixture.close(resolve));assert.equal(result,0);}
  }
  assert.deepEqual(errors, []);
  console.info("S9b browser fixtures passed: public3 scopes/5 widths, switch account, preview retry, pending navigation guard, revoke-after-preview/no stale CTA, expired, and C2: Guest login/register intent, scoped Project/Task/comment/revoke, Org verified gate, email mismatch/account switch, uncertain accept, missing token/reload; no page errors or page overflow at 1440/390.");
} catch (error) {
  console.info("Page errors:", errors);
  if (browser) {
    const pages = browser.contexts().flatMap(context => context.pages());
    for (const page of pages) console.info((await page.locator('body').innerText()).slice(-4000));
  }
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
}
