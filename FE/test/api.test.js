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
test('password change uses fresh CSRF and installs the rotated access token without storage',async()=>{
 const seen=[];let user;const api=createApi({origin:'http://api',onSession:v=>user=v,fetcher:async(url,options)=>{seen.push({url,options});if(url.endsWith('/auth/login'))return response({accessToken:'old-access',user:{id:'own'}});if(url.endsWith('/auth/csrf'))return response({csrfToken:'fresh'});if(url.endsWith('/auth/password/change'))return response({accessToken:'new-access',user:{id:'own',version:1}});return response({ok:true});}});
 await api.login({});await api.changePassword({currentPassword:'old password test',password:'new password test'});await api.request('/users/me');
 assert.equal(user.version,1);assert.equal(seen[2].options.headers.Authorization,'Bearer old-access');assert.equal(seen[2].options.headers['X-CSRF-Token'],'fresh');assert.equal(seen[3].options.headers.Authorization,'Bearer new-access');assert.equal(seen.filter(v=>v.url.endsWith('/auth/password/change')).length,1);
});
test('queued password change cannot apply to a replaced session',async()=>{
 let release,calls=0;const api=createApi({origin:'http://api',lock:fn=>new Promise(resolve=>{release=()=>resolve(fn());}),fetcher:async(url)=>{if(url.endsWith('/auth/login'))return response({accessToken:'old',user:{id:'one'}});calls++;return response({});}});
 await api.login({});const pending=api.changePassword({});api.clear();release();await assert.rejects(pending,/SESSION_CHANGED/);assert.equal(calls,0);
});
