import EmailVerificationActions from "../components/EmailVerificationActions.jsx";
import AppFooter from "../components/AppFooter.jsx";
import AppHeader from "../components/AppHeader.jsx";
import { useEffect, useState } from "react";
import { createApi } from "../lib/api.js";
import { messageFor } from "../lib/messages.js";
import Login from "../features/auth/Login.jsx";
import Home from "../features/workspaces/Home.jsx";
import Workspace from "../features/projects/Workspace.jsx";
import Project from "../features/projects/Project.jsx";
import TaskList from "../features/tasks/TaskList.jsx";
import TaskDetail from "../features/tasks/TaskDetail.jsx";
import { readRoute } from "./routes.js";
import Settings from "../features/settings/Settings.jsx";

import Invite from "../features/projects/Invite.jsx";
import AccountFlow from "../features/auth/AccountFlow.jsx";
import { consumeAuthLink } from "../lib/auth-links.js";
import Notifications from "../features/notifications/Notifications.jsx";
let sessionListener = () => {};
const origin = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:4000";
export const api = createApi({
  origin,
  lock: (fn) =>
    navigator.locks ? navigator.locks.request("workflow-refresh", fn) : fn(),
  onSession: (user) => sessionListener(user),
});
const channel =
  typeof BroadcastChannel === "function"
    ? new BroadcastChannel("workflow-session")
    : null;
for (const method of [
  "login",
  "google",
  "logout",
  "changePassword",
  "resetPassword",
]) {
  const original = api[method];
  api[method] = async (...args) => {
    const result = await original(...args);
    channel?.postMessage({ type: "session-changed" });
    return result;
  };
}
const initialLink = consumeAuthLink(location, history);
export default function App() {
  const [inviteToken, setInviteToken] = useState(
    initialLink?.kind === "invite" ? initialLink.token : null,
  );
  const [accountToken, setAccountToken] = useState(
    initialLink && initialLink.kind !== "invite" ? initialLink : null,
  );
  const [route, setRoute] = useState(() => readRoute(location.hash));
  useEffect(() => {
    const changed = () => {
      const link = consumeAuthLink(location, history);
      if (link?.kind === "invite") setInviteToken(link.token);
      else if (link) setAccountToken(link);
      const next = readRoute(location.hash);
      if (!["invite", "register", "recover", "login"].includes(next.kind))
        setInviteToken(null);
      if (!["verify-email", "reset-password"].includes(next.kind))
        setAccountToken(null);
      setRoute(next);
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function start() {
    setError("");
    setReady(false);
    try {
      await api.restore();
    } catch (e) {
      if (e.status !== 401) setError(messageFor(e));
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    sessionListener = setUser;
    const changed = (event) => {
      if (event.data?.type === "session-changed") {
        api.clear();
        start();
      }
    };
    channel?.addEventListener("message", changed);
    start();
    return () => {
      sessionListener = () => {};
      channel?.removeEventListener("message", changed);
    };
  }, []);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api.logout();
    } catch (e) {
      if (e.status === 401) api.clear();
      else setError("Chưa xác nhận được việc thu hồi phiên. " + messageFor(e));
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <main className="auth-page">
        <p role="status">Đang kiểm tra phiên đăng nhập…</p>
      </main>
    );
  if (
    ["register", "recover", "verify-email", "reset-password"].includes(
      route.kind,
    )
  )
    return (
      <AccountFlow
        key={route.kind}
        api={api}
        mode={route.kind}
        token={accountToken?.kind === route.kind ? accountToken.token : null}
        user={user}
        onTokenUsed={() => setAccountToken(null)}
        loginHref={inviteToken ? "#invite" : user ? "#home" : "#login"}
      />
    );
  if (!user) return <Login api={api} connectionError={error} retry={start} />;
  return (
    <div className="shell">
      <div>
        <AppHeader
          route={route}
          user={user}
          api={api}
          busy={busy}
          logout={logout}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {route.kind === "invite" ? (
          <Invite
            key={user.id + (inviteToken ?? "")}
            api={api}
            token={inviteToken}
            user={user}
            onAccepted={(id) => {
              setInviteToken(null);
              location.hash = `workspace/${id}`;
            }}
          />
        ) : route.kind === "settings" ? (
          <Settings
            key={user.id}
            api={api}
            onUser={(value) =>
              setUser((old) => (old?.id === value.id ? value : old))
            }
          />
        ) : ["notifications", "notification"].includes(route.kind) ? (
          <Notifications
            key={user.id + (route.id ?? "inbox")}
            api={api}
            id={route.id}
            user={user}
          />
        ) : !user.emailVerified ? (
          <main>
            <h1>Xác minh email để bắt đầu</h1>
            <p>
              Kiểm tra hộp thư của {user.email}. Sau khi xác minh, tải lại thông
              tin tài khoản.
            </p>
            <EmailVerificationActions api={api} />
          </main>
        ) : route.kind === "task" ? (
          <TaskDetail key={user.id + route.id} api={api} id={route.id} />
        ) : route.kind === "mine" ? (
          <main>
            <TaskList key={user.id} api={api} mine />
          </main>
        ) : route.kind === "workspace" ? (
          <Workspace key={user.id + route.id} api={api} id={route.id} />
        ) : route.kind === "project" ? (
          <Project
            key={user.id + route.id}
            api={api}
            id={route.id}
            user={user}
          />
        ) : (
          <Home key={user.id} api={api} user={user} />
        )}
        <AppFooter />
      </div>
    </div>
  );
}
