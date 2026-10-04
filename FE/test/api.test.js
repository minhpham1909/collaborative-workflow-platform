import test from "node:test";
import assert from "node:assert/strict";
import { createApi } from "../src/lib/api.js";
const response = (data, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
test("parallel reads share one refresh and use HttpOnly cookie transport", async () => {
  let rotations = 0;
  const calls = [];
  const api = createApi({
    origin: "http://test",
    fetcher: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/csrf")) return response({ csrfToken: "csrf" });
      if (url.endsWith("/refresh")) {
        rotations++;
        await new Promise((r) => setTimeout(r, 10));
        return response({
          accessToken: "a",
          csrfToken: "b",
          user: { id: "one" },
        });
      }
      return response({ items: [] });
    },
  });
  await Promise.all([api.request("/workspaces"), api.request("/users/me")]);
  assert.equal(rotations, 1);
  assert.equal(
    calls.every((c) => c.options.credentials === "include"),
    true,
  );
  assert.equal(calls.at(-1).options.headers.Authorization, "Bearer a");
});
test("late refresh cannot reinstate a cleared session", async () => {
  let release;
  const api = createApi({
    origin: "",
    fetcher: async (url) =>
      url.endsWith("/csrf")
        ? response({ csrfToken: "c" })
        : new Promise(
            (r) =>
              (release = () =>
                r(
                  response({
                    accessToken: "old",
                    csrfToken: "c",
                    user: { id: "old" },
                  }),
                )),
          ),
  });
  const refresh = api.restore();
  await new Promise((r) => setTimeout(r, 0));
  api.clear();
  release();
  await assert.rejects(refresh, (e) => e.code === "SESSION_CHANGED");
});
test("timeout never retries workspace creation", async () => {
  let posts = 0;
  const api = createApi({
    origin: "",
    fetcher: async (url, options) => {
      if (url === "/auth/login")
        return response({
          accessToken: "a",
          csrfToken: "c",
          user: { id: "one" },
        });
      posts++;
      throw new TypeError("network");
    },
  });
  await api.login({});
  await assert.rejects(
    api.request("/workspaces", { method: "POST", body: { name: "one" } }),
  );
  assert.equal(posts, 1);
});
test("failed logout does not falsely discard local account", async () => {
  const users = [];
  const api = createApi({
    origin: "",
    onSession: (u) => users.push(u),
    fetcher: async (url) =>
      url === "/auth/login"
        ? response({ accessToken: "a", csrfToken: "c", user: { id: "one" } })
        : url === "/auth/csrf"
          ? response({ csrfToken: "c" })
          : response({ error: { code: "INTERNAL_ERROR" } }, 500),
  });
  await api.login({});
  await assert.rejects(api.logout());
  assert.deepEqual(users, [{ id: "one" }]);
});
