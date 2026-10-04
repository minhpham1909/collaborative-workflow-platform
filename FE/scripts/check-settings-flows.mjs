// Isolated Settings/GIS fixtures; no live Google or mail provider.
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
const { models, User, Project, WorkspaceMembership } = await import(
  "../../BE/src/models/index.js"
);
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
  const accounts = createAccountsService({
    store: createMongoAccountStore(),
    config,
    verifyGoogle: async (credential) => ({
      subject:
        credential === "google-only"
          ? "fixture-google-only"
          : "fixture-google-link",
      email:
        credential === "google-only"
          ? "google-only@example.com"
          : credential === "different-email"
            ? member.email
            : owner.email,
      authoritativeEmail: true,
      displayName: "Google fixture",
      picture: null,
    }),
  });
  server = createApp({
    authService: auth,
    authConfig: config,
    accountsService: accounts,
    usersService: createUsersService({ store: createMongoUsersStore() }),
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
  page.on("dialog", (d) => d.accept());
  await page.locator(".account-menu summary").click();
  await page.getByRole("link", { name: /Tài khoản & Cài đặt/ }).click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Minh mới");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã lưu cài đặt." })
    .waitFor();
  assert.equal(
    await page.locator(".account-menu strong").textContent(),
    "Minh mới",
  );
  await page
    .getByRole("button", { name: "Tùy chọn email", exact: true })
    .click();
  await page.getByLabel("Bình luận mới", { exact: true }).check();
  await page.getByLabel("Ngôn ngữ ưu tiên", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "Lưu tùy chọn email" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã lưu cài đặt." })
    .waitFor();
  assert.equal((await User.findById(owner.id)).emailPreferences.comment, true);
  assert.equal((await User.findById(owner.id)).locale, "en");
  await page.getByRole("button", { name: "Hồ sơ", exact: true }).click();
  await page.getByLabel("Tên hiển thị").fill("Draft CAS");
  await User.collection.updateOne(
    { _id: owner._id },
    { $inc: { version: 1 }, $set: { displayName: "Tên đồng thời" } },
  );
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await page.getByRole("alert").filter({ hasText: "người khác" }).waitFor();
  assert.equal(await page.getByLabel("Tên hiển thị").inputValue(), "Draft CAS");
  await page.getByRole("button", { name: "Tải lại tài khoản" }).click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("main input")?.value === "Tên đồng thời",
  );
  let profileCalls = 0;
  await page
    .context()
    .route("http://localhost:4000/users/me/profile", async (route) => {
      profileCalls++;
      const response = await route.fetch({
        url: apiOrigin + "/users/me/profile",
      });
      assert.equal(response.status(), 200);
      await route.fulfill({
        response,
        status: 503,
        json: { error: { code: "SERVER_ERROR" } },
      });
    });
  await page
    .getByLabel("Tên hiển thị", { exact: true })
    .fill("Tên lưu mất phản hồi");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Chưa rõ thay đổi đã lưu chưa" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Lưu hồ sơ", exact: true })
      .isDisabled(),
    true,
  );
  await page.locator("main form").evaluate((form) => form.requestSubmit());
  assert.equal(profileCalls, 1);
  assert.equal(
    (await User.findById(owner.id)).displayName,
    "Tên lưu mất phản hồi",
  );
  await page
    .getByRole("button", { name: "Tải lại tài khoản", exact: true })
    .click();
  await page
    .locator(".system-dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("main input")?.value === "Tên lưu mất phản hồi",
  );
  await page.context().unroute("http://localhost:4000/users/me/profile");
  await page.getByRole("button", { name: "Bảo mật & Google" }).click();
  await page.getByText("Google: Chưa liên kết", { exact: true }).waitFor();
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: true })
    .fill("wrong password test");
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("Changed password test 456");
  await page
    .getByLabel("Xác nhận mật khẩu mới", { exact: true })
    .fill("Changed password test 456");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "không đúng" }).waitFor();
  await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã đổi mật khẩu" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Mật khẩu hiện tại", { exact: true }).inputValue(),
    "",
  );
  await page.reload();
  await page.getByRole("button", { name: "Bảo mật & Google" }).click();
  await page.getByText("Google: Chưa liên kết", { exact: true }).waitFor();
  await page
    .context()
    .route("https://accounts.google.com/gsi/client", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.google={accounts:{id:{initialize(config){window.fixtureCallback=config.callback;},renderButton(target){target.innerHTML='';const b=document.createElement('button');b.textContent='Fixture Google';b.onclick=()=>window.fixtureCallback({credential:window.fixtureCredential||'different-email'});target.append(b);}}}};`,
      }),
    );
  await page
    .getByLabel("Mật khẩu xác nhận liên kết", { exact: true })
    .fill("Changed password test 456");
  await page.getByRole("button", { name: "Xác nhận & Chọn Google" }).click();
  await page.getByRole("button", { name: "Fixture Google" }).click();
  await page.getByRole("alert").filter({ hasText: "cùng email" }).waitFor();
  await page.evaluate(() => (window.fixtureCredential = "same-email"));
  await page.getByRole("button", { name: "Xác nhận & Chọn Google" }).click();
  await page.getByRole("button", { name: "Fixture Google" }).last().click();
  await page.getByRole("button", { name: "Bảo mật & Google" }).click();
  await page.getByText("Google: Đã liên kết", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Xác nhận & Chọn Google" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Hồ sơ", exact: true }).click();
  await page.getByLabel("Tên hiển thị").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ".local/fe-settings.png", fullPage: true });
  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  const challenge = await accounts.googleChallenge({ intent: "login" });
  const only = await accounts.googleLogin(challenge.nonce, {
    credential: "google-only",
    termsAccepted: true,
    termsVersion: config.termsVersion,
  });
  const context = await browser.newContext();
  await context.route("http://localhost:4000/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:4000", apiOrigin),
    });
    await route.fulfill({ response });
  });
  await context.addCookies([
    {
      name: "workflow_refresh",
      value: only.refreshToken,
      domain: "localhost",
      path: "/auth",
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);
  const onlyPage = await context.newPage();
  await onlyPage.goto("http://localhost:5173/#settings");
  await onlyPage.getByRole("button", { name: "Bảo mật & Google" }).click();
  await onlyPage
    .getByText("Tài khoản Google-only · Không có mật khẩu riêng", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await onlyPage
      .getByRole("button", { name: "Đổi mật khẩu", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await onlyPage
      .getByRole("button", { name: "Xác nhận & Chọn Google" })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS real React/Express/Mongo profile/preferences/CAS/503-after-commit, password CSRF rotation/reload, Google wrong-email/link/Google-only with GIS+verifier fixtures, no live Google/SMTP, responsive.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await repl?.stop();
}
