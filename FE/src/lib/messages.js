const messages = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  INVALID_INPUT: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  EMAIL_VERIFICATION_REQUIRED: "Bạn cần xác minh email trước khi làm việc.",
  ACCOUNT_LINK_REQUIRED:
    "Email này đã có tài khoản. Đăng nhập bằng mật khẩu rồi liên kết Google trong phần tài khoản.",
  TERMS_REQUIRED:
    "Tài khoản Google mới cần đồng ý điều khoản trước khi tiếp tục.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  WORKSPACE_UNAVAILABLE: "Workspace không còn khả dụng với quyền hiện tại.",
  RESOURCE_UNAVAILABLE: "Nội dung không còn khả dụng với quyền hiện tại.",
  OWNER_REQUIRED: "Thao tác này chỉ dành cho chủ sở hữu Workspace.",
  TASK_EDIT_FORBIDDEN: "Bạn không có quyền sửa hoặc xóa Task này.",
  TASK_STATUS_FORBIDDEN: "Bạn không có quyền đổi trạng thái Task này.",
  COMMENT_AUTHOR_REQUIRED: "Chỉ tác giả được sửa hoặc xóa bình luận.",
  ASSIGNEE_NOT_MEMBER:
    "Người được giao không còn trong Workspace. Tải lại trước khi phân công.",
  PROJECT_ARCHIVED:
    "Dự án đã được lưu trữ. Tải lại để xem trạng thái hiện tại.",
  VERSION_CONFLICT:
    "Dữ liệu đã được người khác thay đổi. Tải lại trước khi lưu tiếp.",
  UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn.",
  SESSION_CHANGED: "Phiên vừa thay đổi. Vui lòng đăng nhập lại.",
  ORIGIN_REJECTED: "Địa chỉ ứng dụng chưa được BE cho phép.",
  GOOGLE_NOT_CONFIGURED: "Đăng nhập Google chưa được cấu hình.",
};
export const messageFor = (error) =>
  messages[error?.code] ?? "Chưa kết nối được hệ thống. Vui lòng thử lại.";
