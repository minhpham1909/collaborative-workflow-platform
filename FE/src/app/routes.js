export function readRoute(hash) {
  const parts = hash.split('?')[0].replace(/^#\/?/, "").split("/");
  if (parts.length === 3 && parts[0] === 'project' && /^[a-f0-9]{24}$/.test(parts[1]) && ['manage', 'trash'].includes(parts[2])) return { kind: 'project', id: parts[1], section: parts[2] };
  if (['organization','organizations','organization-invite','retired-organization'].includes(parts[0])) return {kind:'home'};
  if (
    parts.length === 2 &&
    ["workspace", "project", "task", "notification"].includes(parts[0]) &&
    /^[a-f0-9]{24}$/.test(parts[1])
  )
    return { kind: parts[0], id: parts[1] };
  return {
    kind: [
      "mine",
      "calendar",
      "notifications",
      "settings",
      "invite",
      "project-invite",
      "shared",
      "register",
      "recover",
      "login",
      "verify-email",
      "reset-password",
    ].includes(parts[0])
      ? parts[0]
      : "home",
  };
}
