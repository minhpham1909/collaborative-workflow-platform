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
  const page = await pageFor(owner.email);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 21; i++) {
    await workspaces.create(identity, { name: `Scope ${i}` });
    const user = await User.create({
      email: `picker-${i}@example.com`,
      displayName: `Người ${i}`,
      passwordHash: owner.passwordHash,
      emailVerifiedAt: new Date(),
      termsAcceptance: { version: "test-only", acceptedAt: new Date() },
    });
    await WorkspaceMembership.create({
      workspaceId: workspace.id,
      userId: user.id,
      joinedAt: new Date(),
    });
  }
  await work.createTask(identity, project.id, {
    title: "Task cho chủ nhóm",
    assigneeId: owner.id,
  });
  await page.goto("http://localhost:5173/#project/" + project.id);
  await page.getByRole("button", { name: "+ Tạo Task", exact: true }).click();
  await page
    .getByRole("button", { name: "Tải thêm thành viên", exact: true })
    .waitFor();
  assert.equal(await page.locator(".member-picker option").count(), 21);
  await page
    .getByRole("button", { name: "Tải thêm thành viên", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".member-picker option").length === 24,
  );
  await page.getByLabel("Tìm thành viên", { exact: true }).fill("Lan");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".member-picker option").length === 2 &&
      !document.querySelector(".member-picker select").disabled,
  );
  await page
    .getByLabel("Người thực hiện", { exact: true })
    .selectOption(member.id);
  await page
    .getByLabel("Tìm thành viên", { exact: true })
    .fill("không có người này");
  await page
    .getByText("Không có thành viên phù hợp. Thử tên khác hoặc xóa tìm kiếm.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.getByLabel("Người thực hiện", { exact: true }).inputValue(),
    member.id,
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.goto("http://localhost:5173/#mine");
  await page
    .getByRole("link", { name: "Task cho chủ nhóm", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  await page
    .getByRole("button", { name: "Tìm Workspace", exact: true })
    .click();
  const search = page.getByLabel("Tìm Workspace", { exact: true });
  const select = page.getByLabel("Workspace", { exact: true });
  await page
    .getByRole("button", { name: "Tải thêm Workspace", exact: true })
    .waitFor();
  assert.equal(await page.locator(".workspace-picker option").count(), 21);
  await page
    .getByRole("button", { name: "Tải thêm Workspace", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".workspace-picker option").length === 23,
  );
  await search.fill("Sáng Tạo");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".workspace-picker option").length === 2 &&
      !document.querySelector(".workspace-picker select").disabled,
  );
  await select.selectOption(workspace.id);
  await page.getByRole("button", { name: "Bộ lọc (1)", exact: true }).waitFor();
  await page.getByRole("link", { name: "Task cho chủ nhóm", exact: true }).waitFor();
  await search.fill("không có workspace này");
  await page
    .getByText("Không có Workspace phù hợp. Thử tên khác hoặc xóa tìm kiếm.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await select.inputValue(), workspace.id);
  assert.equal(
    await page
      .getByRole("link", { name: "Task cho chủ nhóm", exact: true })
      .count(),
    1,
  );
  let fail = true;
  await page.route("http://localhost:4000/workspaces?*", async (route) => {
    if (!fail) return route.fallback();
    fail = false;
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4000", apiOrigin),
    });
    await route.fulfill({
      response,
      status: 503,
      json: { error: { code: "SERVER_ERROR" } },
    });
  });
  await search.fill("Scope");
  await page
    .getByRole("button", { name: "Thử tải Workspace lại", exact: true })
    .waitFor();
  assert.equal(await select.inputValue(), workspace.id);
  assert.equal(
    await page
      .getByRole("link", { name: "Task cho chủ nhóm", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Thử tải Workspace lại", exact: true })
    .click();
  await page.waitForFunction(
    () => !document.querySelector(".workspace-picker select").disabled,
  );
  await page.unroute("http://localhost:4000/workspaces?*");
  let release, started, finished;
  const gate = new Promise((r) => (release = r)),
    start = new Promise((r) => (started = r)),
    finish = new Promise((r) => (finished = r));
  await page.route("http://localhost:4000/workspaces?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") !== "Sáng")
      return route.fallback();
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4000", apiOrigin),
    });
    started();
    await gate;
    await route.fulfill({ response });
    finished();
  });
  await search.fill("Sáng");
  await start;
  await search.fill("Scope 20");
  await page.waitForFunction(
    () => !document.querySelector(".workspace-picker select").disabled,
  );
  release();
  await finish;
  await page.waitForTimeout(100);
  assert.ok(
    (await page.locator(".workspace-picker option").allTextContents()).includes(
      "Scope 20",
    ),
  );
  await page.unroute("http://localhost:4000/workspaces?*");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".local/p2-components", { recursive: true });
  const measured = [];
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (process.env.WORKFLOW_UI_PROBE_MODULE) {
      const { measureInPage } = await import(
        process.env.WORKFLOW_UI_PROBE_MODULE
      );
      measured.push({
        width,
        ...(await page.evaluate(measureInPage, {
          minTapSize: 32,
          isMobile: width < 640,
        })),
      });
    }
    await page.screenshot({
      path: `.local/p2-components/workspace-picker-${width}.png`,
      fullPage: true,
    });
  }
  if (measured.length) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      ".local/p2-components/workspace-probe.json",
      JSON.stringify(measured, null, 2),
    );
  }
  await page
    .getByRole("button", { name: "Xóa bộ lọc Task", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".workspace-picker input").value === "" &&
      document.querySelector(".workspace-picker select").value === "",
  );
  assert.equal(
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).count(),
    1,
  );
  assert.equal(await search.isVisible(), false);
  await page.waitForFunction(() => !document.querySelector('.workspace-picker select').disabled);
  await page.getByRole("link", { name: "Task cho chủ nhóm", exact: true }).waitFor();
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `.local/p2-components/workspace-filter-compact-${width}.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Members >20 pagination/search/selection; Workspace >20 pagination/server search/error/retry/stale/selection/reset/filter count/responsive. Isolated DB/API; no SMTP/Google.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
