import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { InboxBadge } from "../features/notifications/Notifications.jsx";

export default function AppHeader({ route, user, api, busy, logout }) {
  const menu = useRef(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [route.kind, route.id]);
  useEffect(() => {
    const close = (event) => {
      if (!menu.current?.open) return;
      if (event.type === "keydown" && event.key === "Escape") {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      } else if (
        event.type === "pointerdown" &&
        !menu.current.contains(event.target)
      ) {
        menu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <header className="app-header">
      <a className="brand" href="#home">
        <span>W</span>Workflow
      </a>
      <nav className="app-navigation" aria-label="Điều hướng chính">
        {[
          ["home", "Trang chủ", "home"],
          ["mine", "Công việc của tôi", "tasks"],
          ["notifications", "Thông báo", "bell"],
        ].map(([value, label, icon]) => {
          const active =
            route.kind === value ||
            (value === "home" &&
              ["workspace", "project", "task"].includes(route.kind)) ||
            (value === "notifications" && route.kind === "notification");
          return (
            <a
              key={value}
              href={"#" + value}
              className={active ? "active" : ""}
              aria-current={
                active
                  ? route.kind === value
                    ? "page"
                    : "location"
                  : undefined
              }
            >
              <Icon name={icon} />
              <span>{label}</span>
              {value === "notifications" && (
                <InboxBadge key={user.id} api={api} userId={user.id} />
              )}
            </a>
          );
        })}
      </nav>
      <details ref={menu} className="account-menu">
        <summary aria-label={`Menu tài khoản của ${user.displayName}`}>
          <Avatar user={user} />
          <span>
            <strong>{user.displayName}</strong>
            <small>Tài khoản cá nhân</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="account-dropdown">
          <a href="#settings">
            <Icon name="settings" />
            Tài khoản & Cài đặt
          </a>
          <button disabled={busy} onClick={logout}>
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </details>
    </header>
  );
}
