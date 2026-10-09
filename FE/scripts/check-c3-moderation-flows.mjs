// Isolated C3 browser/API fixture. No real DB, SMTP or pending cleanup queue.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || "playwright");
const { MongoMemoryReplSet } = await import("../../BE/node_modules/mongodb-memory-server-core/lib/index.js");
const { default: mongoose } = await import("../../BE/node_modules/mongoose/index.js");
const { models, User, TaskComment, ModerationAction } = await import("../../BE/src/models/index.js");
const { createApp } = await import("../../BE/src/app.js");
const { createAuthService } = await import("../../BE/src/auth/service.js");
const { createMongoAuthStore } = await import("../../BE/src/auth/mongo-store.js");
const { hashPassword } = await import("../../BE/src/auth/passwords.js");
const { createWorkspaceService } = await import("../../BE/src/workspaces/service.js");
const { createMongoWorkspaceStore } = await import("../../BE/src/workspaces/mongo-store.js");
const { createWorkService } = await import("../../BE/src/work/service.js");
const { createMongoWorkStore } = await import("../../BE/src/work/mongo-store.js");
const { createModerationService } = await import("../../BE/src/moderation/service.js");
const { createMongoModerationStore } = await import("../../BE/src/moderation/mongo-store.js");
const { createNotificationsService } = await import("../../BE/src/notifications/service.js");
const { createMongoNotificationsStore } = await import("../../BE/src/notifications/mongo-store.js");
const { cutoffCodec } = await import("../../BE/src/notifications/input.js");
const { testConfig } = await import("../../BE/test-support/auth-store.js");
let repl, browser, server;
const errors = [];
try {
  repl = await MongoMemoryReplSet.create({ binary: { version: "8.0.17", downloadDir: fileURLToPath(new URL("../../.local/mongodb-binaries/", import.meta.url)) }, replSet: { count: 1, storageEngine: "wiredTiger", ip: "127.0.0.1" } });
  await mongoose.connect(repl.getUri("workflow_fe_c3_test"));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: "http://localhost:5173" }, password = "Workflow fixture password 123";
  const users = [];
  const passwordHash = await hashPassword(password);
  for (const [email, displayName] of [["owner-c3@example.com", "Owner C3"], ["member-c3@example.com", "Member C3"], ["guest-c3@example.com", "Guest C3"]]) {
    const user = new User({ email, displayName, passwordHash, emailVerifiedAt: new Date(), termsAcceptance: { version: "fixture", acceptedAt: new Date() } }); await user.save(); users.push(user);
  }
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const auths = [];
  for (const user of users) auths.push(await auth.authenticate((await auth.login({ email: user.email, password })).accessToken));
  const ws = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const work = createWorkService({ store: createMongoWorkStore({ config }) });
  const mod = createModerationService({ store: createMongoModerationStore({ config }) });
  const cutoff = cutoffCodec(config.accessKeyHex);
  const notifications = createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff });
  const workspace = (await ws.create(auths[0], { name: "C3 Workspace" })).workspace;
  const link = await ws.invite(auths[0], workspace.id, { type: "LINK" });
  await ws.accept(auths[1], { token: new URLSearchParams(new URL(link.url).hash.slice(1)).get("token") });
  const project = (await work.createProject(auths[0], workspace.id, { name: "C3 Project" })).project;
  let task = (await work.createTask(auths[1], project.id, { title: "C3 Task", assigneeId: users[1].id })).task;
  task = (await work.status(auths[1], task.id, { status: "done", expectedVersion: 0 })).task;
  const content = { format: "prosemirror-json", schemaVersion: 1, document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "C3 spam fixture" }] }] } };
  const comment = (await work.createComment(auths[1], task.id, { content })).comment;
  const guestLink = await work.inviteGuest(auths[0], project.id, { type: "LINK" });
  await work.acceptGuestInvitation(auths[2], { token: new URLSearchParams(new URL(guestLink.url).hash.slice(1)).get("token") });
  await work.state(auths[0], project.id, { state: "archived", expectedVersion: 0 });
  await mod.ban(auths[0], "workspace", workspace.id, { userId: users[1].id, reason: "Account spam", expectedVersion: 0 });
  server = createApp({ authService: auth, authConfig: config, workspaceService: ws, workService: work, moderationService: mod, notificationsService: notifications }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true });
  async function pageFor(index) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route("http://localhost:4000/**", async route => route.fulfill({ response: await route.fetch({ url: route.request().url().replace("http://localhost:4000", origin) }) }));
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://localhost:5173/#task/${task.id}`);
    await page.getByLabel("Email", { exact: true }).fill(users[index].email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    return page;
  }
  const owner = await pageFor(0);
  await owner.getByRole("heading", { name: task.title, exact: true }).waitFor();
  await owner.getByText("C3 spam fixture", { exact: true }).waitFor();
  await owner.getByRole("button", { name: "Hồ sơ của Member C3", exact: true }).first().hover();
  const ownerProfile = owner.getByRole("region", { name: "Thông tin của Member C3", exact: true }).first();
  await ownerProfile.getByText("Đã rời Workspace", { exact: true }).waitFor({ timeout: 5000 });
  await ownerProfile.getByText("Bị chặn trong phạm vi này", { exact: true }).waitFor();
  assert.ok(!(await ownerProfile.innerText()).includes(users[1].email));
  await ownerProfile.getByRole("button", { name: "Đóng hồ sơ" }).click();
  await ownerProfile.waitFor({ state: "hidden" });
  await owner.getByRole("button", { name: "Hồ sơ của Member C3", exact: true }).first().click();
  await ownerProfile.getByText("Đã rời Workspace", { exact: true }).waitFor();
  await owner.keyboard.press("Escape");
  await ownerProfile.waitFor({ state: "hidden" });
  const guest = await pageFor(2);
  await guest.getByRole("heading", { name: task.title, exact: true }).waitFor();
  await guest.getByRole("button", { name: "Hồ sơ của Member C3", exact: true }).first().click();
  const guestProfile = guest.getByRole("region", { name: "Thông tin của Member C3", exact: true }).first();
  await guestProfile.getByText("Đã rời Workspace", { exact: true }).waitFor();
  assert.equal(await guestProfile.getByText("Bị chặn trong phạm vi này", { exact: true }).count(), 0);
  assert.equal(await guest.getByRole("button", { name: "Xóa bình luận", exact: true }).count(), 0);
  for (const width of [1440, 390]) {
    await guest.setViewportSize({ width, height: 1000 });
    await guestProfile.getByRole("button", { name: "Đóng hồ sơ" }).click();
    await guest.getByRole("button", { name: "Hồ sơ của Member C3", exact: true }).first().click();
    await guestProfile.getByText("Đã rời Workspace", { exact: true }).waitFor();
    const box = await guestProfile.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    assert.ok(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await owner.locator(".comment").getByRole("button", { name: "Xóa bình luận", exact: true }).click();
  await owner.getByRole("dialog").locator("input").fill("Spam violation fixture");
  await owner.getByRole("dialog").getByRole("button", { name: "Áp dụng", exact: true }).click();
  await owner.getByRole("dialog").getByRole("button", { name: "Xóa bình luận", exact: true }).click();
  await owner.getByText("Chưa có bình luận.", { exact: true }).waitFor();
  assert.equal(await TaskComment.collection.countDocuments({ _id: new mongoose.Types.ObjectId(comment.id) }), 0);
  assert.equal(await ModerationAction.collection.countDocuments({ commentId: new mongoose.Types.ObjectId(comment.id), action: "comment_deleted" }), 1);
  const banned = await pageFor(1);
  await banned.getByText(/Tài khoản của bạn đang bị chặn trong phạm vi này/).waitFor();
  assert.deepEqual(errors, []);
  console.info("C3 browser passed: profile hover/click/Escape/reopen, scoped privacy, popover 1440/390, Archived moderator reason/confirm hard delete, banned account denial; no page errors/providers.");
} catch (error) {
  console.info("Page errors:", errors);
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) {
    console.info((await page.locator("body").innerText()).slice(-3000));
    console.info(await page.locator(".person-profile-card").evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, hidden: node.hidden, open: node.matches(":popover-open") }))));
    console.info(await page.locator(".person-profile-trigger").evaluateAll(nodes => nodes.map(node => ({ expanded: node.getAttribute("aria-expanded"), hovered: node.matches(":hover"), rect: node.getBoundingClientRect().toJSON() }))));
  }
  throw error;
} finally {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); if (repl) await repl.stop();
}
