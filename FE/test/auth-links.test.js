import test from "node:test";
import assert from "node:assert/strict";
import { consumeAuthLink, validPassword } from "../src/lib/auth-links.js";
test("Auth mail links are scoped by path and scrub tokens before rendering", () => {
  for (const [pathname, kind] of [
    ["/verify-email", "verify-email"],
    ["/reset-password", "reset-password"],
    ["/invite", "invite"],
  ]) {
    const changes = [];
    const result = consumeAuthLink(
      { pathname, hash: "#token=" + "a".repeat(64) },
      { replaceState: (...args) => changes.push(args) },
    );
    assert.deepEqual(result, { kind, token: "a".repeat(64) });
    assert.equal(changes[0][2], "/#" + kind);
    assert.ok(!changes[0][2].includes("token"));
  }
  assert.equal(consumeAuthLink({ pathname: "/", hash: "#home" }, {}), null);
  const changes = [];
  assert.deepEqual(
    consumeAuthLink(
      { pathname: "/verify-email", hash: "#token=bad" },
      { replaceState: (...args) => changes.push(args) },
    ),
    { kind: "verify-email", token: "" },
  );
  assert.equal(changes[0][2], "/#verify-email");
});
test("Password checks count Unicode code points, enforce bytes and preserve spaces", () => {
  assert.equal(validPassword("a".repeat(11)), false);
  assert.equal(validPassword(" ".repeat(12)), true);
  assert.equal(validPassword("😀".repeat(128)), true);
  assert.equal(validPassword("😀".repeat(129)), false);
});
