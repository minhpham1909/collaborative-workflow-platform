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

  const { mkdirSync } = await import("node:fs");
  mkdirSync(".local/design-review", { recursive: true });
  const description = {
    format: "prosemirror-json",
    schemaVersion: 1,
    document: {
      type: "doc",
      content: Array.from({ length: 8 }, (_, i) => ({
        type: "paragraph",
        content: [
          {
            type: "text",
            text:
              "Mục tiêu " +
              (i + 1) +
              ": Xây dựng trải nghiệm cộng tác rõ ràng, dễ sử dụng và nhất quán cho đội ngũ sáng tạo.",
          },
        ],
      })),
    },
  };
  const longLink = "https://example.com/" + "tai-nguyen-dai-".repeat(70);
  description.document.content.push({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Tiếng Việt có dấu ✨ — kế hoạch sáng tạo\nDòng tiếp theo: ",
      },
      {
        type: "text",
        text: longLink,
        marks: [{ type: "link", attrs: { href: longLink } }],
      },
    ],
  });
  await workspaces.update(identity, workspace.id, {
    expectedVersion: workspace.version,
    description,
  });
  await work.updateProject(identity, project.id, {
    expectedVersion: project.version,
    description,
  });
  const task = (
    await work.createTask(identity, project.id, {
      title: "Hoàn thiện luồng cộng tác",
      assigneeId: owner.id,
    })
  ).task;
  const page = await pageFor(owner.email);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const beforeSkip = page.url();
  await page
    .getByRole("button", { name: "Đi đến nội dung chính", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "MAIN",
  );
  assert.equal(page.url(), beforeSkip);
  await page.locator(".workspace-card h2 a").first().focus();
  await page.keyboard.press("Enter");
  await page.locator(".project-card").waitFor();
  const projectCTA = page.locator(".project-card .pill-link").first();
  await projectCTA.scrollIntoViewIfNeeded();
  assert.equal(
    await projectCTA.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return node.contains(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
      );
    }),
    true,
  );
  await page.locator(".project-card h2 a").first().focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("heading", { name: "Bảng công việc", exact: true })
    .waitFor();
  await page.locator(".board-task h3 a").first().focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: task.title, exact: true }).waitFor();
  await page.goto("http://localhost:5173/#workspace/" + workspace.id);
  await page.locator(".project-card").waitFor();
  await page.locator(".project-card").click({ position: { x: 20, y: 20 } });
  await page
    .getByRole("heading", { name: "Bảng công việc", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Đọc toàn bộ mô tả", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thu gọn mô tả", exact: true })
    .waitFor();
  await page
    .getByText("Mục tiêu 8:", { exact: false })
    .waitFor({ state: "visible" });
  await page
    .getByRole("button", { name: "Thu gọn mô tả", exact: true })
    .click();
  await page.locator(".board-task").click({ position: { x: 10, y: 10 } });
  await page.getByRole("heading", { name: task.title, exact: true }).waitFor();
  // Inbox must distinguish a pending/failed read from a genuine empty result.
  let releaseInbox, startedInbox;
  const inboxGate = new Promise((r) => (releaseInbox = r));
  const inboxStarted = new Promise((r) => (startedInbox = r));
  await page.route("http://localhost:4000/notifications?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("limit") !== "12")
      return route.fallback();
    startedInbox();
    await inboxGate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "TEST_UNAVAILABLE" }),
    });
  });
  await page.goto("http://localhost:5173/#notifications");
  await inboxStarted;
  await page.getByText("Đang tải thông báo…", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Tải lại thông báo", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByText("Không có thông báo phù hợp", { exact: true }).count(),
    0,
  );
  releaseInbox();
  await page.locator('main .feedback[role="alert"]').waitFor();
  assert.equal(
    await page.getByText("Không có thông báo phù hợp", { exact: true }).count(),
    0,
  );
  await page.unroute("http://localhost:4000/notifications?*");
  await page
    .getByRole("button", { name: "Tải lại thông báo", exact: true })
    .click();
  await page.getByText("Không có thông báo phù hợp", { exact: true }).waitFor();
  for (const [name, hash, ready] of [
    ["home", "#home", ".workspace-card"],
    ["workspace", "#workspace/" + workspace.id, ".project-card"],
    ["board", "#project/" + project.id, ".board-task"],
    ["task", "#task/" + task.id, ".detail-meta-grid"],
    ["mine", "#mine", ".task-row"],
    ["settings", "#settings", ".settings-card"],
    ["inbox", "#notifications", ".empty"],
  ]) {
    await page.goto("http://localhost:5173/" + hash);
    await page.locator(ready).first().waitFor();
    for (const width of [1440, 1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (
        width === 390 &&
        (await page.locator('input[type="search"]').count())
      ) {
        const searchBox = await page
          .locator('input[type="search"]')
          .first()
          .boundingBox();
        assert.ok(
          searchBox.width >= 250,
          name + " search field remains usable",
        );
      }
      if (name === "workspace" || name === "board") {
        const expand = page.getByRole("button", {
          name: "Đọc toàn bộ mô tả",
          exact: true,
        });
        await expand.click();
        const region = page.locator('.description-full[role="region"]');
        await region.waitFor();
        assert.ok(
          await region.evaluate(
            (node) =>
              node.scrollHeight > node.clientHeight && node.clientHeight <= 361,
          ),
        );
        await region.focus();
        await page.keyboard.press("End");
        await page.waitForFunction(
          () => document.querySelector(".description-full").scrollTop > 0,
        );
        assert.equal(await region.locator("a").getAttribute("href"), longLink);
        await page.screenshot({
          path: `.local/design-review/${name}-expanded-${width}.png`,
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "Thu gọn mô tả", exact: true })
          .click();
        assert.equal(await region.count(), 0);
        if (name === "board")
          assert.equal(
            await page
              .getByRole("button", {
                name: "Chỉnh sửa mô tả Dự án",
                exact: true,
              })
              .isVisible(),
            true,
          );
        else
          assert.equal(
            await page
              .getByRole("button", {
                name: "Chỉnh sửa mô tả Workspace",
                exact: true,
              })
              .isVisible(),
            true,
          );
      }
      await page.screenshot({
        path: ".local/design-review/" + name + "-" + width + ".png",
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        name + " overflow " + width,
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mouse/keyboard card navigation, CTA hit test, skip-to-main without route change, bounded long descriptions/keyboard scroll/long links/Vietnamese; inbox states; 7 screens at 1440/1280/390px without overflow/page errors. Isolated data; no SMTP/provider calls.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
