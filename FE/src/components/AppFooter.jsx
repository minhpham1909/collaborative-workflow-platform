import { useShellText } from '../lib/useShellText.js';
export default function AppFooter() {
  const { locale, t } = useShellText();
  return (
    <footer lang={locale} className="app-footer">
      <div>
        <img className="footer-mark" src="/brand/workflow-logo.svg" alt="" width="20" height="20" />
        © {new Date().getFullYear()} Workflow · {t('Cùng nhau biến ý tưởng thành công việc.')}
      </div>
      <nav aria-label={t('Liên kết cuối trang')}>
        <a href="#home">{t('Trang chủ')}</a>
        <a href="#mine">{t('Công việc của tôi')}</a>
        <a href="#settings">{t('Cài đặt tài khoản')}</a>
      </nav>
    </footer>
  );
}
