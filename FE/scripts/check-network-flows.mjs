// Fault-injection regression: isolated Mongo/API fixtures; never uses development accounts or SMTP.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const feOrigin = process.env.WORKFLOW_FE_ORIGIN || "http://localhost:5173";
const clientApiOrigin =
  process.env.WORKFLOW_API_ORIGIN || "http://localhost:4000";
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
  const config = { ...testConfig(), webOrigin: feOrigin },
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
    executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE || undefined,
    headless: true,
  });
  async function pageFor(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.route(clientApiOrigin + "/**", async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace(clientApiOrigin, apiOrigin),
      });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto(feOrigin + "/");
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
  page.on("dialog", (d) =>
    d.type() === "prompt" ? d.accept("https://example.com") : d.accept(),
  );

  async function dropCommitted(path, mode = "abort") {
    let count = 0;
    await page.route(clientApiOrigin + path, async (route) => {
      if (route.request().method() === "POST") {
        count++;
        const response = await route.fetch({
          url: route.request().url().replace(clientApiOrigin, apiOrigin),
        });
        assert.equal(response.status(), 201);
        if (mode === "abort") await route.abort("failed");
        else
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "REQUEST_FAILED" } }),
          });
      } else await route.fallback();
    });
    return () => count;
  }
  async function blocked(button, form, count) {
    assert.equal(await button.isDisabled(), true);
    await form.evaluate((el) => el.requestSubmit());
    await page.waitForTimeout(200);
    assert.equal(count(), 1);
  }
  await page
    .getByRole("button", { name: "+ Tạo Workspace", exact: true })
    .click();
  await page.getByLabel("Tên Workspace").fill("Network committed workspace");
  const wc = await dropCommitted("/workspaces");
  await page
    .getByRole("button", { name: "Tạo Workspace", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "Chưa rõ" }).waitFor();
  await blocked(
    page.getByRole("button", { name: "Tạo Workspace", exact: true }),
    page.locator(".dialog form"),
    wc,
  );
  assert.equal(
    await mongoose.connection
      .collection("workspaces")
      .countDocuments({ name: "Network committed workspace" }),
    1,
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("heading", { name: "Network committed workspace", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Sáng Tạo Studio", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Tạo Dự án", exact: true }).click();
  await page.getByLabel("Tên Dự án").fill("Network committed project");
  const pc = await dropCommitted(
    "/workspaces/" + workspace.id + "/projects",
    "503",
  );
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Chưa rõ" }).waitFor();
  await blocked(
    page.getByRole("button", { name: "Lưu", exact: true }),
    page.locator(".dialog form"),
    pc,
  );
  assert.equal(
    await Project.countDocuments({ name: "Network committed project" }),
    1,
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("heading", { name: "Network committed project", exact: true })
    .waitFor();
  await page.goto(feOrigin + "/#project/" + project.id);
  await page.getByRole("button", { name: "+ Tạo Task", exact: true }).click();
  await page.getByLabel("Tiêu đề Task").fill("Network committed task");
  const tc = await dropCommitted("/projects/" + project.id + "/tasks");
  await page.getByRole("button", { name: "Lưu Task", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Chưa xác nhận" }).waitFor();
  assert.equal(
    await Task.countDocuments({ title: "Network committed task" }),
    1,
  );
  assert.equal(
    await page.getByLabel("Tiêu đề Task").inputValue(),
    "Network committed task",
  );
  await blocked(
    page.getByRole("button", { name: "Lưu Task", exact: true }),
    page.locator(".project-info form"),
    tc,
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .getByRole("link", { name: "Network committed task", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Network committed task", exact: true })
    .waitFor();
  const task = await Task.findOne({ title: "Network committed task" });
  await page
    .getByRole("button", { name: "+ Viết bình luận", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Bình luận mới", exact: true })
    .fill("Network committed comment");
  const cc = await dropCommitted("/tasks/" + task.id + "/comments", "503");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "Chưa rõ" }).waitFor();
  assert.equal(await TaskComment.countDocuments({ taskId: task.id }), 1);
  await blocked(
    page.getByRole("button", { name: "Gửi bình luận", exact: true }),
    page.locator(".comment-form"),
    cc,
  );
  assert.equal(
    await page
      .getByRole("textbox", { name: "Bình luận mới", exact: true })
      .textContent(),
    "Network committed comment",
  );
  await page
    .getByRole("button", { name: "Hủy bình luận", exact: true })
    .click();
  await page.getByText("Network committed comment", { exact: true }).waitFor();
  assert.equal(await TaskComment.countDocuments({ taskId: task.id }), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: committed writes with dropped/503 responses for Workspace, Project, Task and Comment; form/keyboard resubmission blocked, drafts retained, cancel reconciles data, one record each. No live SMTP/Google.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
