import { InlineMessage, LoadingState } from "../components/Feedback.jsx";
import EmailVerificationActions from "../components/EmailVerificationActions.jsx";
import {AuthLanguageSwitch,localizeAuth,useAuthLocale} from '../features/auth/AuthLocale.jsx';
import {translateAuthText} from '../features/auth/auth-translations.js';
import AppFooter from "../components/AppFooter.jsx";
import AppHeader from "../components/AppHeader.jsx";
import AppSidebar from "../components/AppSidebar.jsx";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createApi } from "../lib/api.js";
import { messageFor } from "../lib/messages.js";
import Login from "../features/auth/Login.jsx";
import Home from "../features/workspaces/Home.jsx";
import Organizations from "../features/organizations/Organizations.jsx";
import Organization from "../features/organizations/Organization.jsx";
import Workspace from "../features/projects/Workspace.jsx";
import OrganizationTeam from "../features/organizations/OrganizationTeam.jsx";
import Project from "../features/projects/Project.jsx";
import MyTasks from "../features/tasks/MyTasks.jsx";
import TaskDetail from "../features/tasks/TaskDetail.jsx";
import SharedProjects from "../features/projects/SharedProjects.jsx";
import { notify } from "../components/NotificationProvider.jsx";
import { readRoute } from "./routes.js";
const Settings=lazy(()=>import('../features/settings/Settings.jsx'));
import {
  installDraftNavigation,
  mayLeaveDrafts,
  useDraftGuard,
} from "../lib/draft-navigation.js";

import Invite from "../features/projects/Invite.jsx";
import AccountFlow from "../features/auth/AccountFlow.jsx";
import { consumeAuthLink, isInvitationKind, invitationDestination } from "../lib/auth-links.js";
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
  const {locale}=useAuthLocale();const t=value=>translateAuthText(value,locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const [inviteIntent, setInviteIntent] = useState(
    isInvitationKind(initialLink?.kind) ? initialLink : null,
  );
  const [accountToken, setAccountToken] = useState(
    initialLink && !isInvitationKind(initialLink.kind) ? initialLink : null,
  );
  const [route, setRoute] = useState(() => readRoute(location.hash));
  useEffect(() => {
    const changed = () => {
      const link = consumeAuthLink(location, history);
      if (isInvitationKind(link?.kind)) setInviteIntent(link);
      else if (link) setAccountToken(link);
      const next = readRoute(location.hash);
      if (!isInvitationKind(next.kind) && !["register", "recover", "login", "verify-email", "reset-password"].includes(next.kind))
        setInviteIntent(null);
      if (!["verify-email", "reset-password"].includes(next.kind))
        setAccountToken(null);
      setRoute(next);
    };
    return installDraftNavigation(changed);
  }, []);
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const logoutPending = useRef(false);
  function acceptedInvitation(result) {
    const kind = inviteIntent?.kind ?? route.kind;
    const destination = invitationDestination(kind, result);
    setInviteIntent(null);
    notify(kind === "project-invite" ? "Đã tham gia Project với quyền Guest." : kind === "organization-invite" ? "Đã tham gia tổ chức." : "Đã tham gia Workspace.");
    location.hash = destination;
  }
  useDraftGuard({ dirty: false, busy, busyMessage:t('Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.') });
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
    if (logoutPending.current) return;
    logoutPending.current = true;
    if (!(await mayLeaveDrafts())) {
      logoutPending.current = false;
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.logout();
    } catch (e) {
      if (e.status === 401) api.clear();
      else setError("Chưa xác nhận được việc thu hồi phiên. " + messageFor(e));
    } finally {
      logoutPending.current = false;
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <main className="auth-page">
        <LoadingState>Đang kiểm tra phiên đăng nhập…</LoadingState>
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
        loginHref={inviteIntent ? `#${inviteIntent.kind}` : user ? "#home" : "#login"}
      />
    );
  if (!user) {
    if (isInvitationKind(route.kind)) return <Invite kind={route.kind} api={api} token={inviteIntent?.kind === route.kind ? inviteIntent.token : null} user={null}
      onAccepted={acceptedInvitation} authPanel={<Login api={api} connectionError={error} retry={start} embedded />} />;
    if (inviteIntent && route.kind === "login") return <Invite kind={inviteIntent.kind} api={api} token={inviteIntent.token} user={null}
      onAccepted={acceptedInvitation} authPanel={<Login api={api} connectionError={error} retry={start} embedded />} />;
    return <Login api={api} connectionError={error} retry={start} />;
  }
  return (
    <div className="shell">
      <AppSidebar route={route} user={user} api={api} mobileOpen={mobileOpen} closeMobile={closeMobile} />
      <div>
        <AppHeader
          route={route}
          user={user}
          api={api}
          busy={busy}
          logout={logout}
          openMobile={() => setMobileOpen(true)}
          mobileOpen={mobileOpen}
        />
        {error && <InlineMessage>{error}</InlineMessage>}
        {isInvitationKind(route.kind) || (route.kind === "login" && inviteIntent) ? (
          <Invite
            key={user.id + (inviteIntent?.kind ?? route.kind)}
            api={api}
            kind={inviteIntent?.kind ?? route.kind}
            token={inviteIntent?.kind === route.kind || route.kind === "login" ? inviteIntent?.token : null}
            user={user}
            onAccepted={acceptedInvitation}
            onSwitchAccount={logout}
            accountBusy={busy}
          />
        ) : route.kind === "settings" ? (
          <Suspense fallback={<main><LoadingState>Đang tải cài đặt…</LoadingState></main>}><Settings
            key={user.id}
            api={api}
            onUser={(value) =>
              setUser((old) => (old?.id === value.id ? value : old))
            }
          /></Suspense>
        ) : ["notifications", "notification"].includes(route.kind) ? (
          <Notifications
            key={user.id + (route.id ?? "inbox")}
            api={api}
            id={route.id}
            user={user}
          />
        ) : !user.emailVerified ? (
          localizeAuth(<main lang={locale}>
            <h1>Xác minh email để bắt đầu</h1>
            <p>
              Kiểm tra hộp thư của <span translate="no">{user.email}</span>. Sau khi xác minh, tải lại thông
              tin tài khoản.
            </p>
            <AuthLanguageSwitch/>
            <EmailVerificationActions api={api} />
          </main>,locale)
        ) : route.kind === "organizations" ? (
          <Organizations key={user.id} api={api} />
        ) : route.kind === "organization" ? (
          route.section === 'team' ? <OrganizationTeam key={user.id + route.id} api={api} id={route.id} user={user} /> : <Organization key={user.id + route.id} api={api} id={route.id} />
        ) : route.kind === "shared" ? (
          <SharedProjects key={user.id} api={api} />
        ) : route.kind === "task" ? (
          <TaskDetail key={user.id + route.id} api={api} id={route.id} />
        ) : route.kind === "mine" ? (
          <MyTasks key={user.id} api={api} />
        ) : route.kind === "workspace" ? (
          <Workspace key={user.id + route.id} api={api} id={route.id} />
        ) : route.kind === "project" ? (
          <Project
            key={user.id + route.id}
            api={api}
            id={route.id}
            user={user}
            section={route.section}
          />
        ) : (
          <Home key={user.id} api={api} user={user} />
        )}
        <AppFooter />
      </div>
    </div>
  );
}
