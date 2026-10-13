import { workspaceText } from './workspace-text.js';
const english = {
  "Owner và Manager của Workspace đang hoạt động được mời Member.": "Owners and Managers of an active workspace can invite Members.",
  "Bổ nhiệm Manager": "Appoint Manager",
  "Hạ xuống Member": "Demote to Member",
  "Bỏ lý do thay đổi vai trò chưa gửi?": "Discard the unsent role-change reason?",
  "Nhập lý do một dòng, tối đa 2.000 ký tự.": "Enter a one-line reason, up to 2,000 characters.",
  "Đã cập nhật vai trò Workspace.": "Workspace role updated.",
  "Chưa xác nhận kết quả. Đóng và tải lại danh sách trước khi gửi tiếp.": "The result is unconfirmed. Close and reload the list before trying again.",
  "Manager quản lý Workspace này và mời Member; không sở hữu nhóm hoặc bổ nhiệm Manager khác.": "A Manager manages this workspace and invites Members; they do not own the group or appoint other Managers.",
  "Người này giữ tư cách thành viên nhưng mất quyền quản lý Workspace. Task và dữ liệu không bị xóa.": "This person remains a Member but loses workspace management access. Tasks and data are retained.",
  "Lý do thay đổi vai trò": "Role-change reason",
  "Một dòng, tối đa 2.000 ký tự. Lý do được ghi vào nhật ký.": "One line, up to 2,000 characters. The reason is recorded in the audit log.",
  "Thành viên không còn khả dụng. Đóng và tải lại danh sách.": "The member is no longer available. Close and reload the list.",
  "Nhật ký bổ nhiệm & chuyển quyền": "Appointments and ownership history",
  "Chỉ ghi thay đổi vai trò trực tiếp và chuyển Owner; không bao gồm rời nhóm hoặc Ban.": "This log records direct role changes and ownership transfers; it does not include departures or bans.",
  "Tìm tên hoặc lý do": "Search names or reasons",
  "Đang tải nhật ký…": "Loading history…",
  "Chưa có thay đổi vai trò phù hợp.": "No matching role changes.",
  "Nhật ký vai trò Workspace": "Workspace role history",
  "Thay đổi": "Change",
  "{count} thay đổi": "{count} changes",
  "Owner và Manager của Workspace độc lập đang hoạt động được mời Member. Workspace thuộc tổ chức dùng luồng phân bổ thành viên của tổ chức.": "Owners and Managers of an active independent workspace can invite Members. Organization workspaces use organization admission.",
  "Owner cần chuyển quyền sở hữu trước khi rời Workspace.": "The Owner must transfer ownership before leaving the workspace.",

};
export function workspaceRoleText(value, locale, values = {}) {
  return workspaceText(locale === 'en' ? (english[value] ?? value) : value, locale, values);
}
