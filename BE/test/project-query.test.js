import test from "node:test";
import assert from "node:assert/strict";
import { projectQuery } from "../src/work/project-query.js";
test("Project filters compose lifecycle, literal search and Vietnam dates", () => {
  const q = projectQuery({
    state: "all",
    q: "sang +",
    from: "2026-10-04",
    to: "2026-10-04",
  });
  assert.equal(q.state, "all");
  assert.equal(q.filters[1].$or[0].name.$regex, "\\+");
  assert.equal(
    q.filters[2].createdAt.$gte.toISOString(),
    "2026-10-03T17:00:00.000Z",
  );
  assert.equal(projectQuery({}).state, "active");
  for (const query of [
    { state: "deleted" },
    { status: "done" },
    { from: "2026-10-05", to: "2026-10-04" },
  ])
    assert.throws(() => projectQuery(query));
});
