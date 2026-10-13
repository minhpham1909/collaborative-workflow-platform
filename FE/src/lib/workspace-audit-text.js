import { workspaceRoleText } from './workspace-role-text.js';
const actions = {
  created: ['Tạo Workspace', 'Workspace created'], metadata_updated: ['Cập nhật thông tin', 'Details updated'],
  invitation_created: ['Tạo lời mời', 'Invitation created'], invitation_revoked: ['Thu hồi lời mời', 'Invitation revoked'],
  member_joined: ['Gia nhập nhóm', 'Member joined'], member_left: ['Rời nhóm', 'Member left'], member_removed: ['Xóa khỏi nhóm', 'Member removed'],
  role_changed: ['Đổi vai trò', 'Role changed'], ownership_transferred: ['Chuyển quyền sở hữu', 'Ownership transferred'],
  archived: ['Lưu trữ Workspace', 'Workspace archived'], unarchived: ['Mở lại Workspace', 'Workspace reopened'],
};
const fields = { name: ['Tên Workspace','Workspace name'], description: ['Mô tả','Description'], summary: ['Mục tiêu ngắn','Short goal'], icon: ['Biểu tượng','Icon'], color: ['Màu nhận diện','Color'], coverId: ['Ảnh bìa mẫu','Cover image'] };
const english = {
  'Nhật ký quản lý Workspace': 'Workspace management history',
  'Ghi thay đổi từ bản nâng cấp nhật ký. Không bao gồm lịch sử cũ, Ban hoặc hoạt động của Project/Task.': 'Changes recorded since the audit upgrade. Earlier history, bans and Project/Task activity are not included.',
  'Loại thao tác': 'Action type', 'Tất cả thao tác': 'All actions', 'Thao tác': 'Action', 'Người liên quan': 'Person involved', 'Chi tiết': 'Details',
  'Chưa có thao tác phù hợp được ghi từ bản nâng cấp nhật ký.': 'No matching actions recorded since the audit upgrade.',
  'Nhật ký này không bao gồm Ban. Xem nhật ký bảo mật riêng trong khu vực quản lý thành viên.': 'Bans are recorded separately in member security management.',
  'Thông tin thay đổi': 'Changed information', 'Lời mời qua email': 'Email invitation', 'Lời mời qua liên kết': 'Link invitation',
};
export const workspaceAuditActions = Object.keys(actions);
export const workspaceAuditActionLabel = (action, locale) => actions[action]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Workspace change' : 'Thay đổi Workspace');
export const workspaceAuditFieldLabel = (field, locale) => fields[field]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Information' : 'Thông tin');
export function workspaceAuditText(text, locale, values) { return workspaceRoleText(locale === 'en' ? (english[text] ?? text) : text, locale, values); }
