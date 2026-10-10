import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import useDialogFocus from './useDialogFocus.js';
import { InboxBadge } from '../features/notifications/Notifications.jsx';
import { useShellText } from '../lib/useShellText.js';

export default function AppSidebar({ route, user, api, mobileOpen, closeMobile }) {
  const { locale, t } = useShellText();
  const panel = useRef(null);
  useDialogFocus(panel, closeMobile, mobileOpen);
  useEffect(() => { closeMobile(); }, [route.kind, route.id]);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1100px)');
    const change = () => { if (query.matches) closeMobile(); };
    query.addEventListener('change', change); return () => query.removeEventListener('change', change);
  }, [closeMobile]);
  const content = <>
    <a className="sidebar-brand" href="#home"><img className="workflow-mark" src="/brand/workflow-logo.svg" alt="" width="36" height="36" />Workflow</a>
    <a className="sidebar-context" href="#home"><span className="context-symbol"><Icon name="people" /></span><span><strong>{t('Không gian của bạn')}</strong><small>{t('Workspace & nhóm cộng tác')}</small></span><Icon name="chevron-right" /></a>
    <p className="sidebar-label">{t('KHÔNG GIAN LÀM VIỆC')}</p>
    <nav className="app-navigation" aria-label={t('Điều hướng chính')}>
      {[['home', t('Trang chủ'), 'home'], ['organizations', t('Tổ chức & Studio'), 'people'], ['mine', t('Công việc của tôi'), 'tasks'], ['shared', t('Dự án được chia sẻ'), 'folder'], ['notifications', t('Thông báo'), 'bell']].map(([kind, label, icon]) => {
        const active = route.kind === kind || (kind === 'organizations' && route.kind === 'organization') || (kind === 'home' && ['workspace', 'project', 'task'].includes(route.kind)) || (kind === 'notifications' && route.kind === 'notification');
        return <a key={kind} href={'#' + kind} className={active ? 'active' : ''} aria-current={active ? (route.kind === kind ? 'page' : 'location') : undefined}><Icon name={icon} /><span>{label}</span>{kind === 'notifications' && <InboxBadge key={user.id} api={api} userId={user.id} />}</a>;
      })}
    </nav>
    <div className="sidebar-bottom"><a href="#settings" className={route.kind === 'settings' ? 'active' : ''}><Icon name="settings" /><span>{t('Tài khoản & Cài đặt')}</span></a><p>{t('Một nơi cho những ý tưởng và công việc cùng tiến lên.')}</p></div>
  </>;
  return <>
    <aside lang={locale} className="app-sidebar" aria-label={t('Thanh điều hướng')}>{content}</aside>
    {mobileOpen && createPortal(<div className="overlay sidebar-overlay"><section ref={panel} role="dialog" aria-modal="true" aria-label={t('Menu điều hướng')} tabIndex={-1} lang={locale} className="mobile-sidebar"><button type="button" className="sidebar-close" aria-label={t('Đóng menu điều hướng')} onClick={closeMobile}><Icon name="close" /></button>{content}</section></div>, document.body)}
  </>;
}
