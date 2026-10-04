export function readRoute(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (
    parts.length === 2 &&
    ["workspace", "project", "task", "notification"].includes(parts[0]) &&
    /^[a-f0-9]{24}$/.test(parts[1])
  )
    return { kind: parts[0], id: parts[1] };
  return {
    kind: [
      "mine",
      "notifications",
      "settings",
      "invite",
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
