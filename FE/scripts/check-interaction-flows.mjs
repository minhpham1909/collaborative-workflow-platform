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
  server = createApp({
    authService: auth,
    authConfig: config,
    workspaceService: workspaces,
    workService: work,
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
  const page = await pageFor(owner.email),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    if (d.type() !== "beforeunload")
      errors.push("Unexpected native " + d.type());
    d.accept();
  });
  await page
    .getByRole("button", { name: "+ Tạo Workspace", exact: true })
    .click();
  await page
    .getByLabel("Tên Workspace", { exact: true })
    .fill("Bản nháp chưa tạo");
  await page
    .locator(".dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await page.locator(".system-dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.locator(".system-dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page.getByLabel("Tên Workspace", { exact: true }).inputValue(),
    "Bản nháp chưa tạo",
  );
  assert.equal(await page.locator(".dialog").evaluate((n) => n.inert), false);
  assert.equal(await page.locator(".shell").evaluate((n) => n.inert), true);
  await page
    .locator(".dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.locator(".dialog").waitFor({ state: "hidden" });
  await page
    .locator(".workspace-card")
    .first()
    .click({ position: { x: 150, y: 130 } });
  await page
    .getByRole("button", { name: "Chỉnh sửa mô tả Workspace", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Mô tả Workspace", exact: true })
    .fill("Mô tả chung và nguyên tắc cộng tác");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await page.getByText("Đã lưu cài đặt.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Dự án", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Mô tả nhóm", exact: true })
    .waitFor();
  assert.ok(
    (
      await page
        .getByRole("textbox", { name: "Mô tả nhóm", exact: true })
        .innerText()
    ).includes("nguyên tắc"),
  );
  await page.getByRole("link", { name: "Xem Dự án →" }).click();
  await page
    .getByRole("heading", { name: "Bảng công việc", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Chỉnh sửa mô tả Dự án", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Mục tiêu & mô tả Dự án", exact: true })
    .fill("Mục tiêu ra mắt và phạm vi thực hiện");
  await page
    .getByRole("button", { name: "Lưu mô tả Dự án", exact: true })
    .click();
  await page
    .getByText("Đã lưu mục tiêu và mô tả Dự án.", { exact: true })
    .waitFor();
  assert.equal(
    (await Project.findById(project.id)).description.plainText,
    "Mục tiêu ra mắt và phạm vi thực hiện",
  );
  await page
    .getByRole("button", { name: "Chỉnh sửa mô tả Dự án", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Mục tiêu & mô tả Dự án", exact: true })
    .fill("Bản nháp cần giữ");
  await page.getByRole("button", { name: "Hủy mô tả", exact: true }).click();
  await page.waitForFunction(
    () => !!document.querySelector(".shell").closest("[inert]"),
  );
  assert.equal(
    await page.locator(".shell").evaluate((n) => !!n.closest("[inert]")),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("textbox", { name: "Mục tiêu & mô tả Dự án", exact: true })
      .innerText(),
    "Bản nháp cần giữ",
  );
  await page.waitForFunction(
    () => !!!document.querySelector(".shell").closest("[inert]"),
  );
  assert.equal(
    await page.locator(".shell").evaluate((n) => !!n.closest("[inert]")),
    false,
  );
  await page.getByRole("button", { name: "Hủy mô tả", exact: true }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chỉnh sửa mô tả Dự án", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "+ Tạo Task", exact: true }).click();
  await page.getByLabel("Tiêu đề Task").fill("Thiết kế landing page");
  assert.equal(
    await page
      .getByRole("button", { name: "Làm mới Dự án", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Lưu trữ Dự án", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Chỉnh sửa mô tả Dự án", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "+ Tạo Task", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByLabel("Tiêu đề Task").inputValue(),
    "Thiết kế landing page",
  );
  await page
    .getByLabel("Người thực hiện", { exact: true })
    .selectOption(member.id);
  await page.getByLabel("Deadline · Giờ Việt Nam").fill("2020-01-01T09:30");
  await page
    .getByRole("textbox", { name: "Mô tả Task", exact: true })
    .fill("Nội dung tiếng Việt 😊");
  await page.getByRole("button", { name: "H2", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Mô tả Task", exact: true })
    .press("Control+a");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page
    .getByLabel("Đường dẫn", { exact: true })
    .fill("https://example.com");
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Áp dụng", exact: true })
    .click();
  await page.getByRole("button", { name: "Lưu Task", exact: true }).click();
  await page
    .getByRole("link", { name: "Thiết kế landing page", exact: true })
    .waitFor();
  const task = await Task.findOne({ title: "Thiết kế landing page" });
  assert.equal(task.description.plainText, "Nội dung tiếng Việt 😊");
  assert.equal(task.description.document.content[0].type, "heading");
  assert.equal(
    task.description.document.content[0].content[0].marks[0].attrs.href,
    "https://example.com",
  );
  assert.equal(task.dueAt.toISOString(), "2020-01-01T02:30:00.000Z");
  await page
    .getByRole("link", { name: "Thiết kế landing page", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Thiết kế landing page", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Sửa Task" }).waitFor();
  await page
    .getByRole("textbox", { name: "Mô tả Task", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "+ Viết bình luận" }).click();
  await page
    .getByRole("textbox", { name: "Bình luận mới", exact: true })
    .fill("Bình luận của Owner 😊");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await page.getByText("Bình luận của Owner 😊", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Sửa bình luận", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Sửa bình luận", exact: true })
    .fill("Bình luận đã sửa");
  await page
    .getByRole("button", { name: "Lưu bình luận", exact: true })
    .click();
  await page.getByText("Bình luận đã sửa", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: ".local/stitch-task-" + width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Sửa Task", exact: true }).click();
  await page.getByLabel("Tiêu đề Task").fill("Draft CAS");
  await Task.collection.updateOne(
    { _id: task._id },
    { $inc: { version: 1 }, $set: { title: "Task đồng đội cập nhật" } },
  );
  await page.getByRole("button", { name: "Lưu Task" }).click();
  await page.getByRole("alert").filter({ hasText: "người khác" }).waitFor();
  assert.equal(await page.getByLabel("Tiêu đề Task").inputValue(), "Draft CAS");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.getByRole("button", { name: "Làm mới Task" }).click();
  await page.getByRole("heading", { name: "Task đồng đội cập nhật" }).waitFor();
  const memberPage = await pageFor(member.email);
  memberPage.on("dialog", (d) => d.accept());
  await memberPage
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Công việc của tôi", exact: false })
    .click();
  await memberPage
    .getByRole("link", { name: "Task đồng đội cập nhật" })
    .waitFor();
  const filtered = memberPage.waitForResponse(
    (r) => r.url().includes("/my-tasks?") && r.url().includes("workspaceId="),
  );
  await memberPage.getByRole("button", { name: /^Bộ lọc/ }).click();
  await memberPage
    .getByLabel("Workspace", { exact: true })
    .selectOption(workspace.id);
  await filtered;
  await memberPage
    .getByRole("link", { name: "Task đồng đội cập nhật" })
    .click();
  await memberPage
    .getByRole("heading", { name: "Task đồng đội cập nhật" })
    .waitFor();
  assert.equal(
    await memberPage
      .getByRole("button", { name: "Sửa Task", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await memberPage
      .getByRole("button", { name: "Xóa Task", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await memberPage
      .getByRole("button", { name: "Sửa bình luận", exact: true })
      .count(),
    0,
  );
  await memberPage.getByRole("button", { name: "+ Viết bình luận" }).click();
  await memberPage
    .getByRole("textbox", { name: "Bình luận mới" })
    .fill("Bình luận của assignee");
  await memberPage.getByRole("button", { name: "Gửi bình luận" }).click();
  await memberPage
    .getByText("Bình luận của assignee", { exact: true })
    .waitFor();
  await memberPage
    .getByLabel("Trạng thái", { exact: true })
    .selectOption("done");
  await memberPage
    .getByRole("status")
    .filter({ hasText: "Đã đổi trạng thái" })
    .waitFor();
  await memberPage
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Công việc của tôi", exact: false })
    .click();
  await memberPage
    .getByText("Không có công việc phù hợp bộ lọc.", { exact: true })
    .waitFor();
  await memberPage.getByLabel("Trạng thái Task").selectOption("done");
  await memberPage
    .getByRole("link", { name: "Task đồng đội cập nhật" })
    .waitFor();
  await page.getByRole("button", { name: "Làm mới Task" }).click();
  await page.getByText("Bình luận của assignee", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Sửa bình luận", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Xóa bình luận", exact: true })
    .click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xóa bình luận", exact: true })
    .click();
  await page
    .getByText("Bình luận đã sửa", { exact: true })
    .waitFor({ state: "hidden" });
  const completed = await Task.findById(task._id);
  await work.state(identity, project.id, {
    expectedVersion: (await Project.findById(project.id)).version,
    state: "archived",
  });
  await page.getByRole("button", { name: "Làm mới Task" }).click();
  await page
    .getByText("Dự án đã lưu trữ · Task và bình luận chỉ đọc.", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Sửa Task", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "+ Viết bình luận" }).count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Trạng thái", { exact: true }).isDisabled(),
    true,
  );
  await work.state(identity, project.id, {
    expectedVersion: (await Project.findById(project.id)).version,
    state: "active",
  });
  await page.getByRole("button", { name: "Làm mới Task" }).click();
  await page.getByRole("button", { name: "Sửa Task", exact: true }).waitFor();
  await page.getByLabel("Trạng thái", { exact: true }).selectOption("todo");
  await page
    .getByRole("status")
    .filter({ hasText: "Đã đổi trạng thái" })
    .waitFor();
  for (let i = 0; i < 14; i++)
    await work.createTask(identity, project.id, {
      title: "Trang công việc " + i,
    });
  await page.getByRole("link", { name: "Thiết kế Bloom", exact: true }).click();
  await page.locator(".board-column.todo .task-card").first().waitFor();
  assert.equal(await page.locator(".board-column.todo .task-card").count(), 12);
  await page
    .getByRole("button", { name: "Tải thêm Chưa làm", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".board-column.todo .task-card").length === 15,
  );
  await page.getByLabel("Tìm Task", { exact: true }).fill("thiet ke");
  await page
    .getByText("Không có Task phù hợp.", { exact: true })
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Xóa bộ lọc Task" }).click();
  await page.locator(".board-column.todo .task-card").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/stitch-board-1440.png",
    fullPage: true,
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: ".local/stitch-board-" + width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await page.goto("http://localhost:5173/#task/" + task.id);
  await page.getByRole("button", { name: "Xóa Task", exact: true }).waitFor();
  await page.getByRole("button", { name: "Xóa Task", exact: true }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: ".local/system-dialog-" + width + ".png",
      fullPage: true,
    });
  }
  await page.keyboard.press("Escape");
  assert.equal((await Task.findById(task.id)).deletedAt, null);
  await page.getByRole("button", { name: "Xóa Task", exact: true }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xóa Task", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Bảng công việc", exact: true })
    .waitFor();
  await page.goto("http://localhost:5173/#task/" + task.id);
  await page
    .getByRole("alert")
    .filter({ hasText: "không còn khả dụng" })
    .waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Task đồng đội cập nhật" }).count(),
    0,
  );
  assert.ok((await Task.findById(task.id)).deletedAt);
  assert.ok(
    await TaskComment.findOne({ taskId: task.id, content: { $exists: true } }),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: whole Workspace card, shared/Project descriptions, nested dialogs/Escape/draft retention, safe link input, toast, React/Express/Mongo Board/create/detail/editor/comments, author rights, assignee status/My Tasks, CAS draft, archived read-only, per-column load more, deleted unavailable, no overflow/page errors. No SMTP/provider calls.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
