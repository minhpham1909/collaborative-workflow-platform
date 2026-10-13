import { workspaceRoleText } from './workspace-role-text.js';
const actions = {
  created: ['Tạo Workspace', 'Workspace created'], metadata_updated: ['Cập nhật thông tin', 'Details updated'],
  invitation_created: ['Tạo lời mời', 'Invitation created'], invitation_revoked: ['Thu hồi lời mời', 'Invitation revoked'],
  member_joined: ['Gia nhập nhóm', 'Member joined'], member_left: ['Rời nhóm', 'Member left'], member_removed: ['Xóa khỏi nhóm', 'Member removed'],
  role_changed: ['Đổi vai trò', 'Role changed'], ownership_transferred: ['Chuyển quyền sở hữu', 'Ownership transferred'],
  archived: ['Lưu trữ Workspace', 'Workspace archived'], unarchived: ['Mở lại Workspace', 'Workspace reopened'],
  ban: ['Chặn truy cập', 'Access banned'], unban: ['Bỏ chặn truy cập', 'Access ban removed'],
};
const fields = { name: ['Tên Workspace','Workspace name'], description: ['Mô tả','Description'], summary: ['Mục tiêu ngắn','Short goal'], icon: ['Biểu tượng','Icon'], color: ['Màu nhận diện','Color'], coverId: ['Ảnh bìa mẫu','Cover image'] };
const english = {
  'Nhật ký quản lý Workspace': 'Workspace management history',
  'Tổng hợp các bản ghi quản lý, phân quyền, lưu trữ và Ban hiện có. Không phải lịch sử đầy đủ từ khi tạo Workspace; không bao gồm hoạt động Task hoặc tổ chức.': 'Available management, role, archive and ban records. This is not a complete history since workspace creation; task and organization activity are not included.',
  'Loại thao tác': 'Action type', 'Tất cả thao tác': 'All actions', 'Thao tác': 'Action', 'Người liên quan': 'Person involved', 'Chi tiết': 'Details',
  'Chưa có bản ghi phù hợp trong các nguồn nhật ký hiện có.': 'No matching records in the available history sources.',
  'Phạm vi Workspace': 'Workspace scope', 'Phạm vi Project': 'Project scope',
  'Nhật ký này không bao gồm Ban. Xem nhật ký bảo mật riêng trong khu vực quản lý thành viên.': 'Bans are recorded separately in member security management.',
  'Thông tin thay đổi': 'Changed information', 'Lời mời qua email': 'Email invitation', 'Lời mời qua liên kết': 'Link invitation',
};
export const workspaceAuditActions = Object.keys(actions);
export const workspaceAuditActionLabel = (action, locale) => actions[action]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Workspace change' : 'Thay đổi Workspace');
export const workspaceAuditFieldLabel = (field, locale) => fields[field]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Information' : 'Thông tin');
export function workspaceAuditText(text, locale, values) { return workspaceRoleText(locale === 'en' ? (english[text] ?? text) : text, locale, values); }

export function workspaceAuditCleanupLabel(value, locale) {
  if (!value) return '';
  if (value.mode === 'none') return locale === 'en' ? 'Comments retained' : 'Giữ bình luận';
  const states = { pending: ['Chờ xử lý','Queued'], processing: ['Đang xử lý','Processing'], completed: ['Đã hoàn tất','Completed'], failed: ['Xử lý thất bại','Failed'] };
  const range = value.mode === 'all' ? (locale === 'en' ? 'All comments before the ban' : 'Toàn bộ bình luận trước thời điểm chặn') : (locale === 'en' ? `${value.mode} days before the ban` : `${value.mode} ngày trước thời điểm chặn`);
  const state = states[value.state]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Unavailable state' : 'Chưa rõ trạng thái');
  return `${range} · ${state} · ${value.deletedCount}/${value.matchedCount} ${locale === 'en' ? 'comments removed' : 'bình luận đã gỡ'}`;
}
