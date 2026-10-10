const english = {
  'Không gian của bạn': 'Your space', 'Workspace & nhóm cộng tác': 'Workspaces & teams',
  'KHÔNG GIAN LÀM VIỆC': 'WORKSPACE', 'Điều hướng chính': 'Main navigation',
  'Trang chủ': 'Home', 'Tổ chức & Studio': 'Organizations & Studios', 'Tổ chức': 'Organization',
  'Công việc của tôi': 'My Tasks', 'Dự án được chia sẻ': 'Shared projects', 'Thông báo': 'Notifications',
  'Tài khoản & Cài đặt': 'Account & Settings', 'Tài khoản': 'Account', 'Dự án': 'Project', 'Công việc': 'Task',
  'Không gian làm việc': 'Workspace', 'Thanh điều hướng': 'Sidebar', 'Menu điều hướng': 'Navigation menu',
  'Đóng menu điều hướng': 'Close navigation menu', 'Mở menu điều hướng': 'Open navigation menu',
  'Một nơi cho những ý tưởng và công việc cùng tiến lên.': 'A place for ideas and work to move forward.',
  'Đi đến nội dung chính': 'Skip to main content', 'Mở thông báo': 'Open notifications',
  'Menu tài khoản của {name}': 'Account menu for {name}', 'Tài khoản cá nhân': 'Personal account',
  'Đang đăng xuất…': 'Signing out…', 'Đăng xuất': 'Sign out', 'Liên kết cuối trang': 'Footer links',
  'Cài đặt tài khoản': 'Account settings', 'Cùng nhau biến ý tưởng thành công việc.': 'Turn ideas into work together.',
  'Đóng thông báo': 'Dismiss notification', 'Thêm liên kết': 'Add link', 'Xác nhận thao tác': 'Confirm action',
  'Đường dẫn': 'URL', 'Hủy': 'Cancel', 'Áp dụng': 'Apply', 'Xác nhận': 'Confirm',
  'Ở lại': 'Stay', 'Bỏ thay đổi': 'Discard changes',
  'Chưa tải số thông báo chưa đọc': 'Unread notification count not loaded',
  '{count} thông báo chưa đọc': '{count} unread notifications',
  ', cần tải lại': ', reload required',
};
export function shellText(value, locale, values = {}) {
  const template = locale === 'en' ? (english[value] ?? value) : value;
  return template.replace(/\{(\w+)\}/gu, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
