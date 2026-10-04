import test from "node:test";
import assert from "node:assert/strict";
import { workspaceQuery } from "../src/workspaces/list-query.js";
test("workspace search escapes regex and matches Vietnamese names and descriptions", () => {
  const page = workspaceQuery({ q: "sang tao +" });
  assert.equal(
    new RegExp(page.filters[0].$or[0].name.$regex, "i").test("Sáng Tạo"),
    true,
  );
  assert.equal(page.filters[2].$or[0].name.$regex, "\\+");
  assert.equal(
    page.filters[0].$or[1]["description.plainText"].$regex,
    page.filters[0].$or[0].name.$regex,
  );
});
test("workspace dates cover the full Vietnam day and reject invalid ranges", () => {
  const p = workspaceQuery({ from: "2026-10-04", to: "2026-10-04" });
  assert.equal(
    p.filters[0].createdAt.$gte.toISOString(),
    "2026-10-03T17:00:00.000Z",
  );
  assert.equal(
    p.filters[0].createdAt.$lt.toISOString(),
    "2026-10-04T17:00:00.000Z",
  );
  assert.throws(() => workspaceQuery({ from: "2026-02-30" }));
  assert.throws(() => workspaceQuery({ from: "2026-10-05", to: "2026-10-04" }));
  assert.throws(() => workspaceQuery({ ownerId: "unsafe" }));
});
