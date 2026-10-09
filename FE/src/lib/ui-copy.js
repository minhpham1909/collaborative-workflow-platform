// First UI dictionary slice. UI remains vi until the full-language rollout;
// User.locale currently controls work email, so don't silently reuse it here.
export const homeCopy = {
  vi: { home: 'Trang chủ', mine: 'Công việc của tôi', shared: 'Dự án được chia sẻ', notifications: 'Thông báo', settings: 'Tài khoản & Cài đặt',
    greeting: 'Chào {name}, hôm nay mình cùng làm gì?', create: 'Tạo Workspace', workspaces: 'Workspace của bạn', search: 'Tìm theo tên hoặc mô tả Workspace',
    all: 'Tất cả', managed: 'Tôi quản lý', member: 'Thành viên', active: 'Đang hoạt động', archived: 'Đã lưu trữ' },
  en: { home: 'Home', mine: 'My tasks', shared: 'Shared projects', notifications: 'Notifications', settings: 'Account & settings',
    greeting: 'Hello {name}, what shall we work on today?', create: 'Create workspace', workspaces: 'Your workspaces', search: 'Search workspace names or descriptions',
    all: 'All', managed: 'Managed by me', member: 'Member', active: 'Active', archived: 'Archived' },
};
const roleLabels = {
  vi: { owner: 'Chủ sở hữu', manager: 'Quản lý Workspace', organization_owner: 'Chủ tổ chức', organization_admin: 'Quản trị tổ chức', member: 'Thành viên' },
  en: { owner: 'Owner', manager: 'Workspace manager', organization_owner: 'Organization owner', organization_admin: 'Organization admin', member: 'Member' },
};
export const workspaceRoleLabel = (role, locale = 'vi') => (roleLabels[locale] ?? roleLabels.vi)[role] ?? (locale === 'en' ? 'Access granted' : 'Có quyền truy cập');
