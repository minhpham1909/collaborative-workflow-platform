import { useShellText } from '../lib/useShellText.js';
import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";


export default function AppHeader({ route, user, api, busy, logout, openMobile, mobileOpen }) {
  const { locale, t } = useShellText();
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
    <header lang={locale} className="app-header">
      <button
        type="button"
        className="skip-link"
        onClick={() => {
          const main = document.querySelector(".shell main");
          if (!main) return;
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
          main.scrollIntoView({ block: "start" });
        }}
      >
        {t('Đi đến nội dung chính')}
      </button>
      <button type="button" className="mobile-nav-toggle" aria-label={t('Mở menu điều hướng')} aria-expanded={mobileOpen} onClick={openMobile}><Icon name="menu" /></button>
      <div className="header-location"><span>Workflow</span><Icon name="chevron-right" /><strong>{t(({ home: 'Trang chủ', organizations: 'Tổ chức & Studio', organization: 'Tổ chức', mine: 'Công việc của tôi', shared: 'Dự án được chia sẻ', notifications: 'Thông báo', notification: 'Thông báo', settings: 'Tài khoản', workspace: 'Workspace', project: 'Dự án', task: 'Công việc' })[route.kind] ?? 'Không gian làm việc')}</strong></div>
      <a className="header-bell" href="#notifications" aria-label={t('Mở thông báo')} title={t('Mở thông báo')}><Icon name="bell" /></a>
      <details ref={menu} className="account-menu">
        <summary aria-label={t('Menu tài khoản của {name}', { name: user.displayName })}>
          <Avatar user={user} />
          <span>
            <strong>{user.displayName}</strong>
            <small>{t('Tài khoản cá nhân')}</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="account-dropdown">
          <a href="#settings">
            <Icon name="settings" />
            {t('Tài khoản & Cài đặt')}
          </a>
          <button disabled={busy} onClick={logout}>
            {t(busy ? 'Đang đăng xuất…' : 'Đăng xuất')}
          </button>
        </div>
      </details>
    </header>
  );
}
