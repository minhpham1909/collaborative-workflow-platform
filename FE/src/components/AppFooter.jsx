export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <span className="footer-mark" aria-hidden="true">
          W
        </span>
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
