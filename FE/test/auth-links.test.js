import test from "node:test";
import assert from "node:assert/strict";
import { consumeAuthLink, validPassword, invitationEndpoint, invitationDestination } from "../src/lib/auth-links.js";
import { readRoute } from "../src/app/routes.js";
test('Organization routes accept only a valid local id and retain existing invitation routing', () => {
  assert.deepEqual(readRoute('#organization/' + 'a'.repeat(24)), { kind: 'organization', id: 'a'.repeat(24) });
  assert.equal(readRoute('#organizations').kind, 'organizations');
  assert.equal(readRoute('#organization/not-an-id').kind, 'home');
  assert.equal(readRoute('#organization-invite').kind, 'organization-invite');
  assert.deepEqual(readRoute('#organization/' + 'a'.repeat(24) + '/team'), { kind: 'organization', id: 'a'.repeat(24), section: 'team' });
  assert.equal(readRoute('#organization/not-an-id/team').kind, 'home');
  assert.equal(readRoute('#organization/' + 'a'.repeat(24) + '/team/extra').kind, 'home');
  assert.deepEqual(readRoute('#project/' + 'a'.repeat(24) + '/manage'), { kind: 'project', id: 'a'.repeat(24), section: 'manage' });
  assert.equal(readRoute('#project/not-an-id/manage').kind, 'home');
  assert.equal(readRoute('#project/' + 'a'.repeat(24) + '/manage/extra').kind, 'home');
});
test("Auth mail links are scoped by path and scrub tokens before rendering", () => {
  for (const [pathname, kind] of [
    ["/verify-email", "verify-email"],
    ["/reset-password", "reset-password"],
    ["/invite", "invite"],
    ["/organization-invite", "organization-invite"],
    ["/project-invite", "project-invite"],
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
test("Invitation intents keep their scope and redirect only to validated resource IDs", () => {
  const id = "a".repeat(24);
  assert.equal(invitationEndpoint("organization-invite"), "/organization-invitations");
  assert.equal(invitationEndpoint("project-invite"), "/project-invitations");
  assert.equal(invitationDestination("invite", { workspace: { id } }), `workspace/${id}`);
  assert.equal(invitationDestination("organization-invite", { workspaceId: id }), `workspace/${id}`);
  assert.equal(invitationDestination("organization-invite", { organization: { id } }), "home");
  assert.equal(invitationDestination("project-invite", { projectId: id }), `project/${id}`);
  assert.equal(invitationDestination("project-invite", { projectId: "javascript:alert(1)" }), "home");
  for (const kind of ["project-invite", "organization-invite", "shared"]) assert.equal(readRoute(`#${kind}`).kind, kind);
});
test("Password checks count Unicode code points, enforce bytes and preserve spaces", () => {
  assert.equal(validPassword("a".repeat(11)), false);
  assert.equal(validPassword(" ".repeat(12)), true);
  assert.equal(validPassword("😀".repeat(128)), true);
  assert.equal(validPassword("😀".repeat(129)), false);
});
