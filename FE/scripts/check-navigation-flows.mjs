// Isolated UI/API/database regression; no development accounts or SMTP/provider calls.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.WORKFLOW_PLAYWRIGHT_MODULE || "playwright",
);
const { MongoMemoryReplSet } = await import(
  "../../BE/node_modules/mongodb-memory-server-core/lib/index.js"
);
const { default: mongoose } = await import(
  "../../BE/node_modules/mongoose/index.js"
);
const { models, User, Project, Task, TaskComment, WorkspaceMembership } =
  await import("../../BE/src/models/index.js");
const { createApp } = await import("../../BE/src/app.js");
const { createAuthService } = await import("../../BE/src/auth/service.js");
const { createMongoAuthStore } = await import(
  "../../BE/src/auth/mongo-store.js"
);
const { hashPassword } = await import("../../BE/src/auth/passwords.js");
const { createWorkspaceService } = await import(
  "../../BE/src/workspaces/service.js"
);
const { createMongoWorkspaceStore } = await import(
  "../../BE/src/workspaces/mongo-store.js"
);
const { createWorkService } = await import("../../BE/src/work/service.js");
const { createMongoWorkStore } = await import(
  "../../BE/src/work/mongo-store.js"
);
const { testConfig } = await import("../../BE/test-support/auth-store.js");
const { createUsersService } = await import("../../BE/src/users/service.js");
const { createMongoUsersStore } = await import(
  "../../BE/src/users/mongo-store.js"
);
const { createNotificationsService } = await import(
  "../../BE/src/notifications/service.js"
);
const { createMongoNotificationsStore } = await import(
  "../../BE/src/notifications/mongo-store.js"
);
const { cutoffCodec } = await import("../../BE/src/notifications/input.js");
const { createAccountsService } = await import(
  "../../BE/src/auth/accounts-service.js"
);
const { createMongoAccountStore } = await import(
  "../../BE/src/auth/mongo-accounts.js"
);
let repl, browser, server;
try {
  repl = await MongoMemoryReplSet.create({
    binary: {
      version: "8.0.17",
      downloadDir: fileURLToPath(
        new URL("../../.local/mongodb-binaries/", import.meta.url),
      ),
    },
    replSet: { count: 1, storageEngine: "wiredTiger", ip: "127.0.0.1" },
  });
  await mongoose.connect(repl.getUri("workflow_fe_projects_test"));
  for (const model of Object.values(models)) await model.createIndexes();
  const config = { ...testConfig(), webOrigin: "http://localhost:5173" },
    password = "Workflow test password 123";
  const owner = await User.create({
    email: "owner-projects@example.com",
    displayName: "Minh kiểm thử",
    passwordHash: await hashPassword(password),
    emailVerifiedAt: new Date(),
    termsAcceptance: { version: "test-only", acceptedAt: new Date() },
  });
  const member = await User.create({
    email: "member-projects@example.com",
    displayName: "Lan kiểm thử",
    passwordHash: await hashPassword(password),
    emailVerifiedAt: new Date(),
    termsAcceptance: { version: "test-only", acceptedAt: new Date() },
  });
  const auth = await createAuthService({
      store: createMongoAuthStore(),
      config,
    }),
    workspaces = createWorkspaceService({
      store: createMongoWorkspaceStore({ config }),
    }),
    work = createWorkService({ store: createMongoWorkStore() });
  const identity = await auth.authenticate(
    (await auth.login({ email: owner.email, password })).accessToken,
  );
  const workspace = (
    await workspaces.create(identity, { name: "Sáng Tạo Studio" })
  ).workspace;
  await WorkspaceMembership.create({
    workspaceId: workspace.id,
    userId: member.id,
    joinedAt: new Date(),
  });
  const cutoff = cutoffCodec(config.accessKeyHex);
  server = createApp({
    authService: auth,
    authConfig: config,
    workspaceService: workspaces,
    workService: work,
    usersService: createUsersService({ store: createMongoUsersStore() }),
    notificationsService: createNotificationsService({
      store: createMongoNotificationsStore({ cutoff }),
      cutoff,
    }),
    accountsService: createAccountsService({
      store: createMongoAccountStore(),
      config,
      verifyGoogle: async () => {
        throw new Error("Not used");
      },
    }),
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const apiOrigin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE,
    headless: true,
  });
  async function pageFor(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.route("http://localhost:4000/**", async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace("http://localhost:4000", apiOrigin),
      });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto("http://localhost:5173/");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByRole("heading", { name: "Sáng Tạo Studio" }).waitFor();
    return page;
  }
  const project = (
    await work.createProject(identity, workspace.id, { name: "Thiết kế Bloom" })
  ).project;

  const page = await pageFor(owner.email);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const root = "http://localhost:5173/";
  async function open(hash, locator) {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, hash);
    await locator.waitFor();
  }
  const heading = (name) => page.getByRole("heading", { name, exact: true });
  const readDraft = (field) =>
    field.evaluate((node) =>
      node.type === "checkbox"
        ? String(node.checked)
        : node.isContentEditable
          ? node.innerText
          : node.value,
    );
  async function discardTo(hash, ready) {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, hash);
    await page
      .getByRole("button", { name: "Bỏ thay đổi", exact: true })
      .click();
    await ready.waitFor();
  }
  async function stay(action, field, value) {
    const url = page.url();
    await action();
    await page.locator(".system-dialog").waitFor();
    assert.equal(await readDraft(field), value);
    await page.getByRole("button", { name: "Ở lại", exact: true }).click();
    await page.waitForURL(url);
    assert.equal(await readDraft(field), value);
  }
  await open("project/" + project.id, heading("Bảng công việc"));
  await open("mine", heading("Công việc của tôi"));
  await page.goBack();
  await heading("Bảng công việc").waitFor();
  await page.getByRole("button", { name: "+ Tạo Task", exact: true }).click();
  const title = page.getByLabel("Tiêu đề Task", { exact: true });
  await title.fill("Bản nháp giữ nguyên");
  await stay(() => page.goBack(), title, "Bản nháp giữ nguyên");
  await stay(() => page.goForward(), title, "Bản nháp giữ nguyên");
  await stay(
    () =>
      page.evaluate(() => {
        location.hash = "home";
      }),
    title,
    "Bản nháp giữ nguyên",
  );
  await stay(
    () =>
      page
        .locator(".app-navigation")
        .getByRole("link", { name: "Công việc của tôi", exact: true })
        .click(),
    title,
    "Bản nháp giữ nguyên",
  );
  await page.goBack();
  await page.locator(".system-dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.waitForURL(root + "#project/" + project.id);
  assert.equal(await title.inputValue(), "Bản nháp giữ nguyên");
  const unloadDialog = page.waitForEvent("dialog");
  const reloadAttempt = page.reload().catch(() => null);
  const unload = await unloadDialog;
  assert.equal(unload.type(), "beforeunload");
  await unload.dismiss();
  await reloadAttempt;
  assert.equal(await title.inputValue(), "Bản nháp giữ nguyên");
  await page.goBack();
  await page.locator(".system-dialog").waitFor();
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await heading("Sáng Tạo Studio").waitFor();
  assert.equal(await title.count(), 0);
  await page.goForward();
  await heading("Bảng công việc").waitFor();
  assert.equal(await title.count(), 0);

  // Each editor keeps its owning React tree while browser history is pending.
  await page.getByRole("button", { name: "Đổi tên", exact: true }).click();
  const name = page.getByLabel("Tên Dự án", { exact: true });
  await name.fill("Tên chưa lưu");
  await stay(() => page.goBack(), name, "Tên chưa lưu");
  await page
    .locator(".dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chỉnh sửa mô tả Dự án", exact: true })
    .click();
  const description = page.getByRole("textbox", {
    name: "Mục tiêu & mô tả Dự án",
    exact: true,
  });
  await description.fill("Mục tiêu chưa lưu");
  const url = page.url();
  await page.goBack();
  await page.locator(".system-dialog").waitFor();
  await page.getByRole("button", { name: "Ở lại", exact: true }).click();
  await page.waitForURL(url);
  assert.equal(await description.innerText(), "Mục tiêu chưa lưu");
  await page.getByRole("button", { name: "Hủy mô tả", exact: true }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();

  await open("settings", heading("Hồ sơ của bạn"));
  const display = page.getByLabel("Tên hiển thị", { exact: true });
  await display.fill("Hồ sơ chưa lưu");
  await stay(() => page.goBack(), display, "Hồ sơ chưa lưu");
  await page.locator(".account-menu summary").click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.getByRole("button", { name: "Ở lại", exact: true }).click();
  assert.equal(await display.inputValue(), "Hồ sơ chưa lưu");
  await page.locator(".account-menu summary").click();
  await page
    .locator(".app-navigation")
    .getByRole("link", { name: "Trang chủ", exact: true })
    .click();
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await heading("Sáng Tạo Studio").waitFor();
  await page
    .getByRole("button", { name: "+ Tạo Workspace", exact: true })
    .click();
  const workspaceName = page.getByLabel("Tên Workspace", { exact: true });
  await workspaceName.fill("Workspace chưa tạo");
  await stay(() => page.goBack(), workspaceName, "Workspace chưa tạo");
  await page
    .locator(".dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();

  await open("workspace/" + workspace.id, heading("Sáng Tạo Studio"));
  await page.getByRole("button", { name: "Cài đặt nhóm", exact: true }).click();
  const groupName = page.getByLabel("Tên Workspace", { exact: true });
  await groupName.fill("Nhóm chưa lưu");
  await stay(() => page.goBack(), groupName, "Nhóm chưa lưu");
  const groupDescription = page.getByRole("textbox", {
    name: "Mô tả Workspace",
    exact: true,
  });
  await groupDescription.fill("Mô tả nhóm chưa lưu");
  await stay(() => page.goBack(), groupDescription, "Mô tả nhóm chưa lưu");
  await discardTo("home", heading("Sáng Tạo Studio"));

  // Token-page guards keep entered passwords in memory without submitting or
  // retaining a token in the visible URL or browser history state.
  const resetPage = await page.context().newPage();
  await resetPage.goto(root + "reset-password#token=" + "a".repeat(64));
  const resetPassword = resetPage.getByLabel("Mật khẩu mới", { exact: true });
  await resetPassword.fill("Fixture reset password 123");
  assert.equal(resetPage.url().includes("token="), false);
  await resetPage.locator(".brand").click();
  await resetPage.getByRole("button", { name: "Ở lại", exact: true }).click();
  assert.equal(await resetPassword.inputValue(), "Fixture reset password 123");
  await resetPage.close({ runBeforeUnload: false });
  await open("workspace/" + workspace.id, heading("Sáng Tạo Studio"));
  await page
    .getByRole("button", { name: "Email của tôi trong nhóm", exact: true })
    .click();
  const override = page.locator(".email-override select").first();
  await override.selectOption("off");
  await stay(() => page.goBack(), override, "off");
  await discardTo("home", heading("Sáng Tạo Studio"));

  await open("settings", heading("Hồ sơ của bạn"));
  await page
    .getByRole("button", { name: "Tùy chọn email", exact: true })
    .click();
  const commentPreference = page.getByLabel("Bình luận mới", { exact: true });
  await commentPreference.check();
  await stay(() => page.goBack(), commentPreference, "true");
  await discardTo("home", heading("Sáng Tạo Studio"));
  await open("settings", heading("Hồ sơ của bạn"));
  await page
    .getByRole("button", { name: "Bảo mật & Google", exact: true })
    .click();
  const currentPassword = page.getByLabel("Mật khẩu hiện tại", { exact: true });
  await currentPassword.fill(password);
  await stay(() => page.goBack(), currentPassword, password);
  await discardTo("home", heading("Sáng Tạo Studio"));

  const testTask = (
    await work.createTask(identity, project.id, { title: "Task giữ bản nháp" })
  ).task;
  await open("task/" + testTask.id, heading(testTask.title));
  await page.getByRole("button", { name: "Sửa Task", exact: true }).click();
  await title.fill("Task sửa chưa lưu");
  await stay(() => page.goBack(), title, "Task sửa chưa lưu");
  await discardTo("home", heading("Sáng Tạo Studio"));
  await open("task/" + testTask.id, heading(testTask.title));
  await page
    .getByRole("button", { name: "+ Viết bình luận", exact: true })
    .click();
  const comment = page.getByRole("textbox", {
    name: "Bình luận mới",
    exact: true,
  });
  await comment.fill("Bình luận chưa gửi");
  await stay(() => page.goBack(), comment, "Bình luận chưa gửi");
  await discardTo("home", heading("Sáng Tạo Studio"));
  const content = {
    format: "prosemirror-json",
    schemaVersion: 1,
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bình luận đã lưu" }],
        },
      ],
    },
  };
  await work.createComment(identity, testTask.id, { content });
  await open("task/" + testTask.id, heading(testTask.title));
  await page
    .getByRole("button", { name: "Sửa bình luận", exact: true })
    .click();
  const editComment = page.getByRole("textbox", {
    name: "Sửa bình luận",
    exact: true,
  });
  await editComment.fill("Bình luận sửa chưa lưu");
  await stay(() => page.goBack(), editComment, "Bình luận sửa chưa lưu");
  await discardTo("home", heading("Sáng Tạo Studio"));

  await open("workspace/" + workspace.id, heading("Sáng Tạo Studio"));
  await page.getByRole("button", { name: "Lời mời", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Tạo lời mời", exact: true })
    .click();
  const inviteEmail = page.getByLabel("Email người nhận", { exact: true });
  await inviteEmail.fill("draft@example.com");
  await stay(() => page.goBack(), inviteEmail, "draft@example.com");
  await stay(
    () => page.keyboard.press("Escape"),
    inviteEmail,
    "draft@example.com",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Tạo lời mời", exact: true })
      .count(),
    1,
  );
  await discardTo("home", heading("Sáng Tạo Studio"));
  await open("register", heading("Bắt đầu cùng Workflow ✨"));
  const registrationName = page.getByLabel("Tên hiển thị", { exact: true });
  await registrationName.fill("Tài khoản chưa đăng ký");
  await stay(() => page.goBack(), registrationName, "Tài khoản chưa đăng ký");
  await discardTo("home", heading("Sáng Tạo Studio"));
  await open("recover", heading("Quên mật khẩu?"));
  const recoveryEmail = page.getByLabel("Email", { exact: true });
  await recoveryEmail.fill("recover@example.com");
  await stay(() => page.goBack(), recoveryEmail, "recover@example.com");
  await discardTo("home", heading("Sáng Tạo Studio"));

  // A write already committed but held in transport must finish before leaving.
  await open("project/" + project.id, heading("Bảng công việc"));
  await page.getByRole("button", { name: "+ Tạo Task", exact: true }).click();
  await title.fill("Lưu đang chạy");
  let release, seen;
  const gate = new Promise((r) => (release = r)),
    started = new Promise((r) => (seen = r));
  await page
    .context()
    .route(
      "http://localhost:4000/projects/" + project.id + "/tasks",
      async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        const response = await route.fetch({
          url: route
            .request()
            .url()
            .replace("http://localhost:4000", apiOrigin),
        });
        seen();
        await gate;
        await route.fulfill({ response });
      },
    );
  await page.getByRole("button", { name: "Lưu Task", exact: true }).click();
  await started;
  await page.goBack();
  await page.waitForURL(root + "#project/" + project.id);
  await page
    .getByText(
      "Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.",
      { exact: true },
    )
    .waitFor();
  assert.equal(await title.inputValue(), "Lưu đang chạy");
  assert.equal(await page.locator(".system-dialog").count(), 0);
  release();
  await page
    .getByRole("link", { name: "Lưu đang chạy", exact: true })
    .waitFor();
  assert.equal(await Task.countDocuments({ title: "Lưu đang chạy" }), 1);
  for (const fallback of [false, true]) {
    const earlier = await page.context().newPage();
    earlier.on("pageerror", (e) => errors.push(e.message));
    await earlier.addInitScript(
      ({ projectId, fallback }) => {
        if (fallback)
          Object.defineProperty(window, "navigation", {
            value: undefined,
            configurable: true,
          });
        history.replaceState(null, "", "#home");
        history.pushState(null, "", "#project/" + projectId);
      },
      { projectId: project.id, fallback },
    );
    await earlier.goto(root);
    await earlier
      .getByRole("heading", { name: "Bảng công việc", exact: true })
      .waitFor();
    await earlier
      .getByRole("button", { name: "+ Tạo Task", exact: true })
      .click();
    const earlierTitle = earlier.getByLabel("Tiêu đề Task", { exact: true });
    await earlierTitle.fill("Bản nháp với lịch sử cũ");
    await earlier.goBack();
    await earlier.getByRole("button", { name: "Ở lại", exact: true }).click();
    await earlier.waitForURL(root + "#project/" + project.id);
    assert.equal(await earlierTitle.inputValue(), "Bản nháp với lịch sử cũ");
    if (!fallback) {
      // Changing the URL again while confirming can dispose the original
      // forward entry; the replacement fallback must still keep the draft.
      await earlier.goBack();
      await earlier.locator(".system-dialog").waitFor();
      await earlier.evaluate(() => {
        location.hash = "mine";
      });
      await earlier.getByRole("button", { name: "Ở lại", exact: true }).click();
      await earlier.waitForURL(root + "#project/" + project.id);
      assert.equal(await earlierTitle.inputValue(), "Bản nháp với lịch sử cũ");
    }
    await earlier.close({ runBeforeUnload: false });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Back/Forward/hash/link/refresh/logout guards; Task create/edit, Comments create/edit, Project name/description, Home, Workspace settings/overrides, profile/email/security, invite/register/recovery/reset drafts retained; in-flight write retained; isolated API/DB, no mail/provider.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
