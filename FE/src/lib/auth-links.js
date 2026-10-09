export function consumeAuthLink(location, history) {
  if (!location.hash.startsWith("#token=")) return null;
  const kind = ({
    "/verify-email": "verify-email",
    "/reset-password": "reset-password",
    "/invite": "invite",
    "/": "invite",
    "/organization-invite": "organization-invite",
    "/project-invite": "project-invite",
  })[location.pathname] ?? null;
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  history.replaceState(null, "", "/#" + (kind ?? "login"));
  return { kind, token: /^[a-f0-9]{64}$/.test(token ?? "") ? token : "" };
}
export const isInvitationKind = kind => ["invite", "organization-invite", "project-invite"].includes(kind);
export const invitationEndpoint = kind => ({ invite: "/invitations", "organization-invite": "/organization-invitations", "project-invite": "/project-invitations" })[kind];
export function invitationDestination(kind, result) {
  const validId = value => /^[a-f0-9]{24}$/.test(value ?? "");
  if (kind === "project-invite" && validId(result.projectId)) return `project/${result.projectId}`;
  const workspaceId = kind === "invite" ? result.workspace?.id : result.workspaceId;
  if (validId(workspaceId)) return `workspace/${workspaceId}`;
  return "home";
}
export const validPassword = (value) =>
  [...value].length >= 12 &&
  [...value].length <= 128 &&
  new TextEncoder().encode(value).length <= 512;
