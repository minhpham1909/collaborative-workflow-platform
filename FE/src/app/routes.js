export function readRoute(hash) {
  const parts = hash.split('?')[0].replace(/^#\/?/, "").split("/");
  if (parts.length === 3 && parts[0] === 'project' && /^[a-f0-9]{24}$/.test(parts[1]) && ['manage', 'trash'].includes(parts[2])) return { kind: 'project', id: parts[1], section: parts[2] };
  if (parts.length === 3 && parts[0] === 'organization' && /^[a-f0-9]{24}$/.test(parts[1]) && parts[2] === 'team') return { kind: 'organization', id: parts[1], section: 'team' };
  if (
    parts.length === 2 &&
    ["workspace", "project", "task", "notification", "organization"].includes(parts[0]) &&
    /^[a-f0-9]{24}$/.test(parts[1])
  )
    return { kind: parts[0], id: parts[1] };
  return {
    kind: [
      "mine",
      "organizations",
      "notifications",
      "settings",
      "invite",
      "organization-invite",
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
