export function readRoute(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (
    parts.length === 2 &&
    ["workspace", "project", "task"].includes(parts[0]) &&
    /^[a-f0-9]{24}$/.test(parts[1])
  )
    return { kind: parts[0], id: parts[1] };
  return { kind: parts[0] === "mine" ? "mine" : "home" };
}
