export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <img className="footer-mark" src="/brand/workflow-logo.svg" alt="" width="20" height="20" />
        © {new Date().getFullYear()} Workflow · Cùng nhau biến ý tưởng thành
        công việc.
      </div>
      <nav aria-label="Liên kết cuối trang">
        <a href="#home">Trang chủ</a>
        <a href="#mine">Công việc của tôi</a>
        <a href="#settings">Cài đặt tài khoản</a>
      </nav>
    </footer>
  );
}
