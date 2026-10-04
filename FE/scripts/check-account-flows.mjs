// Isolated account fixture; no live email or Google calls.
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
const { models, User, Project, WorkspaceMembership, EmailOutbox, AuthToken } =
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
const { createAccountsService } = await import(
  "../../BE/src/auth/accounts-service.js"
);
const { createMongoAccountStore } = await import(
  "../../BE/src/auth/mongo-accounts.js"
);
const { createDeliveryCrypto } = await import(
  "../../BE/src/auth/delivery-crypto.js"
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
  const accounts = createAccountsService({
    store: createMongoAccountStore(),
    config,
    verifyGoogle: async () => {
      throw new Error("Provider not used in this harness");
    },
  });
  server = createApp({
    authService: auth,
    authConfig: config,
    accountsService: accounts,
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
    let loginCalls = 0,
      releaseLogin,
      loginStarted;
    const loginGate = new Promise((resolve) => {
      releaseLogin = resolve;
    });
    const startedLogin = new Promise((resolve) => {
      loginStarted = resolve;
    });
    await context.route("http://localhost:4000/auth/login", async (route) => {
      loginCalls++;
      const response = await route.fetch({ url: apiOrigin + "/auth/login" });
      loginStarted();
      await loginGate;
      await route.fulfill({ response });
    });
    await page.goto("http://localhost:5173/");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await startedLogin;
    await page.locator(".auth-form form").evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    await page
      .getByRole("link", { name: "Quên mật khẩu?", exact: true })
      .click();
    await page.waitForTimeout(100);
    assert.equal(loginCalls, 1);
    assert.equal(
      await page
        .getByRole("heading", { name: "Chào bạn trở lại ✨", exact: true })
        .count(),
      1,
    );
    releaseLogin();
    await page.getByRole("heading", { name: "Sáng Tạo Studio" }).waitFor();
    await context.unroute("http://localhost:4000/auth/login");
    return page;
  }
  const loginProbe = await pageFor(owner.email);
  await loginProbe.context().close();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.route("http://localhost:4000/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4000", apiOrigin),
    });
    await route.fulfill({ response });
  });
  const page = await ctx.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/#register");
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Người đăng ký");
  await page
    .getByLabel("Email", { exact: true })
    .fill("signup-fixture@example.com");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Hiện mật khẩu mới", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Mật khẩu mới", { exact: true }).getAttribute("type"),
    "text",
  );
  assert.equal(
    await page.getByLabel("Mật khẩu mới", { exact: true }).inputValue(),
    password,
  );
  assert.equal(
    await page
      .getByLabel("Xác nhận mật khẩu", { exact: true })
      .getAttribute("type"),
    "password",
  );
  await page
    .getByRole("button", { name: "Ẩn mật khẩu mới", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Mật khẩu mới", { exact: true }).getAttribute("type"),
    "password",
  );
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("   ");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo tài khoản thử nghiệm", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("Tên hiển thị", { exact: true })
      .getAttribute("aria-invalid"),
    "true",
  );
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Người đăng ký");
  await page.getByRole("checkbox").uncheck();
  assert.equal(
    await page
      .getByLabel("Tên hiển thị", { exact: true })
      .getAttribute("aria-invalid"),
    "false",
  );
  assert.equal(await page.getByRole("checkbox").isChecked(), false);
  await page
    .getByRole("button", { name: "Tạo tài khoản thử nghiệm", exact: true })
    .click();
  assert.equal(
    await User.countDocuments({ email: "signup-fixture@example.com" }),
    0,
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo tài khoản thử nghiệm", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã tiếp nhận đăng ký" })
    .waitFor();
  const registered = await User.findOne({
    email: "signup-fixture@example.com",
  });
  assert.equal(registered.emailVerifiedAt, null);
  await page.getByRole("link", { name: "Về đăng nhập →", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(registered.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page
    .getByRole("heading", { name: "Xác minh email để bắt đầu" })
    .waitFor();
  async function fixtureToken(purpose) {
    const job = await EmailOutbox.findOne({
      userId: registered._id,
      templateKey: purpose,
      state: "pending",
    })
      .sort({ createdAt: -1 })
      .select("+encryptedDeliveryData")
      .lean();
    return createDeliveryCrypto(config.mailKeyHex).open(
      job.encryptedDeliveryData,
      job.eventId,
    ).token;
  }
  const verify = await fixtureToken("verify_email");
  await page.goto("http://localhost:5173/verify-email#token=" + verify);
  await page
    .getByRole("button", { name: "Xác minh email", exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).hash, "#verify-email");
  assert.equal((await User.findById(registered.id)).emailVerifiedAt, null);
  await page
    .getByRole("button", { name: "Xác minh email", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "đã được xác minh" })
    .waitFor();
  await page
    .getByRole("link", { name: "Tiếp tục làm việc →", exact: true })
    .click();
  await page.getByRole("heading", { name: /Chào/ }).waitFor();
  assert.ok((await User.findById(registered.id)).emailVerifiedAt);
  await page.locator(".account-menu summary").click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.getByRole("link", { name: "Quên mật khẩu?", exact: true }).click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("missing-fixture@example.com");
  await page
    .getByRole("button", { name: "Yêu cầu khôi phục", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Nếu email có tài khoản" })
    .waitFor();
  const generic = await page.getByRole("status").innerText();
  await page.getByRole("link", { name: "Về đăng nhập →", exact: true }).click();
  await page.getByRole("link", { name: "Quên mật khẩu?", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(registered.email);
  await page
    .getByRole("button", { name: "Yêu cầu khôi phục", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Nếu email có tài khoản" })
    .waitFor();
  assert.equal(await page.getByRole("status").innerText(), generic);
  const reset = await fixtureToken("reset_password");
  await page.goto("http://localhost:5173/reset-password#token=" + reset);
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("Reset fixture password 456");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("Wrong confirmation");
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Xác nhận mật khẩu phải khớp" })
    .waitFor();
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("Reset fixture password 456");
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã đặt lại mật khẩu" })
    .waitFor();
  assert.equal(new URL(page.url()).hash, "#reset-password");
  await page.getByRole("link", { name: "Về đăng nhập →", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(registered.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Reset fixture password 456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("heading", { name: /Chào/ }).waitFor();
  await page.goto("http://localhost:5173/reset-password#token=" + reset);
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("Another fixture password");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("Another fixture password");
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Liên kết không còn hợp lệ" })
    .waitFor();
  await page.reload();
  await page
    .getByRole("alert")
    .filter({ hasText: "Mở lại liên kết gốc" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Mật khẩu mới", { exact: true }).count(),
    0,
  );
  await page.goto("http://localhost:5173/#register");
  await page.getByLabel("Tên hiển thị", { exact: true }).waitFor();
  let registerCalls = 0;
  await ctx.route("http://localhost:4000/auth/register", async (route) => {
    registerCalls++;
    const response = await route.fetch({ url: apiOrigin + "/auth/register" });
    assert.equal(response.status(), 202);
    await route.fulfill({
      response,
      status: 503,
      json: { error: { code: "SERVER_ERROR" } },
    });
  });
  await page
    .getByLabel("Tên hiển thị", { exact: true })
    .fill("Lost signup response");
  await page
    .getByLabel("Email", { exact: true })
    .fill("lost-signup@example.com");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo tài khoản thử nghiệm", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Chưa xác nhận được kết quả" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Tạo tài khoản thử nghiệm", exact: true })
      .isDisabled(),
    true,
  );
  await page.locator("form").evaluate((form) => form.requestSubmit());
  assert.equal(registerCalls, 1);
  assert.equal(
    await User.countDocuments({ email: "lost-signup@example.com" }),
    1,
  );
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS automated React/Express/Mongo fixture Auth: explicit terms, signup/verified gate, token scrub/manual verify, generic recovery, reset confirmation/login, replay/reload and responsive. No live SMTP/Google.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
