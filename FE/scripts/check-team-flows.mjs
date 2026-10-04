// Isolated Team lifecycle regression; does not run an email worker or provider.
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
const {
  models,
  User,
  Project,
  WorkspaceMembership,
  WorkspaceInvitation,
  EmailOutbox,
} = await import("../../BE/src/models/index.js");
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
  const page = await pageFor(owner.email),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("link", { name: "Sáng Tạo Studio", exact: true })
    .click();
  await page.getByRole("button", { name: "Thành viên", exact: true }).click();
  await page.getByRole("heading", { name: member.displayName }).waitFor();
  await page.getByLabel("Tìm tên thành viên").fill("lan");
  await page.getByRole("heading", { name: member.displayName }).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: owner.displayName }).count(),
    0,
  );
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.getByRole("button", { name: "Lời mời", exact: true }).click();
  await page.getByRole("button", { name: "+ Tạo lời mời" }).waitFor();
  await page.getByRole("button", { name: "+ Tạo lời mời" }).click();
  await page
    .getByLabel("Email người nhận", { exact: true })
    .fill("new-team@example.com");
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByText("Đã tạo lời mời; email đang chờ gửi.").waitFor();
  await page.getByRole("button", { name: "Đóng kết quả" }).click();
  await page.getByRole("heading", { name: "new-team@example.com" }).waitFor();
  const invitation = await WorkspaceInvitation.findOne({
    email: "new-team@example.com",
  });
  await EmailOutbox.collection.updateOne(
    { invitationId: invitation._id },
    { $set: { state: "failed" } },
  );
  await page.getByRole("button", { name: "Làm mới danh sách" }).click();
  await page
    .getByRole("button", { name: "Thử gửi lại email", exact: true })
    .click();
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByText("Email: Chờ gửi").waitFor();
  await page.getByRole("button", { name: "+ Tạo lời mời" }).click();
  await page.getByLabel("Cách mời").selectOption("LINK");
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByLabel("Liên kết tham gia").waitFor();
  const url = await page.getByLabel("Liên kết tham gia").inputValue();
  assert.equal(await page.locator(".shell").evaluate((n) => n.inert), true);
  await page.getByRole("button", { name: "Đóng kết quả" }).click();
  assert.equal(await page.getByLabel("Liên kết tham gia").count(), 0);
  const newcomer = await User.create({
    email: "new-team@example.com",
    displayName: "Người mới",
    passwordHash: await hashPassword(password),
    emailVerifiedAt: new Date(),
    termsAcceptance: { version: "test-only", acceptedAt: new Date() },
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.route("http://localhost:4000/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4000", apiOrigin),
    });
    await route.fulfill({ response });
  });
  const joined = await ctx.newPage();
  joined.on("pageerror", (e) => errors.push(e.message));
  await joined.goto(url);
  await joined.getByLabel("Email", { exact: true }).fill(newcomer.email);
  await joined.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await joined.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await joined
    .getByRole("button", { name: "Tham gia Workspace", exact: true })
    .waitFor();
  assert.equal(new URL(joined.url()).hash, "#invite");
  await joined
    .getByRole("button", { name: "Tham gia Workspace", exact: true })
    .click();
  await joined
    .getByRole("button", { name: "Thành viên", exact: true })
    .waitFor();
  assert.equal(
    await WorkspaceMembership.countDocuments({
      workspaceId: workspace.id,
      userId: newcomer.id,
      state: "active",
    }),
    1,
  );
  await page.getByLabel("Tìm email người nhận").fill("new-team");
  await page.getByRole("heading", { name: "new-team@example.com" }).waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Liên kết tham gia", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page
    .getByRole("heading", { name: "Liên kết tham gia", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ".local/fe-invitations.png", fullPage: true });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Thành viên", exact: true }).click();
  await page.getByRole("heading", { name: "Người mới", exact: true }).waitFor();
  const row = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "Người mới", exact: true }),
    });
  await row.getByRole("button", { name: "Loại khỏi nhóm" }).click();
  await WorkspaceMembership.collection.updateOne(
    {
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      userId: newcomer._id,
    },
    { $inc: { version: 1 } },
  );
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByRole("alert").filter({ hasText: "người khác" }).waitFor();
  assert.equal(
    await WorkspaceMembership.countDocuments({
      workspaceId: workspace.id,
      userId: newcomer.id,
      state: "active",
    }),
    1,
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("heading", { name: "Người mới", exact: true }).waitFor();
  await row.getByRole("button", { name: "Loại khỏi nhóm" }).click();
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Người mới", exact: true })
    .waitFor({ state: "hidden" });
  const lan = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: member.displayName }) });
  await lan.getByRole("button", { name: "Chuyển quyền sở hữu" }).click();
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page
    .getByRole("button", { name: "Rời Workspace", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Lời mời", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Loại khỏi nhóm" }).count(),
    0,
  );
  const newOwner = await pageFor(member.email);
  await newOwner
    .getByRole("link", { name: "Sáng Tạo Studio", exact: true })
    .click();
  await newOwner.getByRole("button", { name: "Lời mời", exact: true }).click();
  await newOwner
    .getByRole("heading", { name: "Liên kết tham gia", exact: true })
    .waitFor();
  const linkRow = newOwner
    .locator("article")
    .filter({
      has: newOwner.getByRole("heading", {
        name: "Liên kết tham gia",
        exact: true,
      }),
    });
  await linkRow.getByRole("button", { name: "Thu hồi", exact: true }).click();
  await newOwner
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await linkRow.getByText("Đã thu hồi", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Rời Workspace", exact: true })
    .click();
  await page
    .locator(".dialog")
    .getByRole("button", {
      name: /^(Tạo lời mời|Thử gửi lại email|Loại thành viên|Chuyển quyền sở hữu|Thu hồi lời mời|Rời Workspace)$/,
    })
    .click();
  await page.getByRole("heading", { name: /Chào/ }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Sáng Tạo Studio", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS React/Express/Mongo Team: server search, EMAIL queue/retry, one-time LINK, login intent/accept, membership CAS/remove, transfer owner UI, revoke, leave and responsive. No live SMTP/Google.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
