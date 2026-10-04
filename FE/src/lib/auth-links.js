export function consumeAuthLink(location, history) {
  if (!location.hash.startsWith("#token=")) return null;
  const kind =
    location.pathname === "/verify-email"
      ? "verify-email"
      : location.pathname === "/reset-password"
        ? "reset-password"
        : location.pathname === "/invite" || location.pathname === "/"
          ? "invite"
          : null;
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  history.replaceState(null, "", "/#" + (kind ?? "login"));
  return { kind, token: /^[a-f0-9]{64}$/.test(token ?? "") ? token : "" };
}
export const validPassword = (value) =>
  [...value].length >= 12 &&
  [...value].length <= 128 &&
  new TextEncoder().encode(value).length <= 512;
