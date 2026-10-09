const messages = {
  ACCESS_BANNED: "Tài khoản của bạn đang bị chặn trong phạm vi này. Liên hệ người quản trị nếu cần xem xét lại.",
  MODERATION_REASON_REQUIRED: "Cần nhập lý do khi quản trị viên xóa bình luận.",
  MODERATION_PREVIEW_INVALID: "Thông tin xem trước đã thay đổi hoặc hết hạn. Xem trước lại trước khi xác nhận.",
  MODERATION_SETUP_REQUIRED: "Chức năng chặn chưa được cấu hình đầy đủ. Liên hệ quản trị hệ thống.",
  CANNOT_MODERATE_SELF: "Bạn không thể chặn chính mình. Dùng thao tác rời Workspace nếu cần.",
  BAN_ALREADY_ACTIVE: "Người này đang bị chặn. Tải lại danh sách để kiểm tra.",
  MODERATION_RETRY_UNAVAILABLE: "Job không còn ở trạng thái được xếp hàng lại. Tải lại trạng thái.",
  MANAGER_REPLACEMENT_REQUIRED: "Cần thay Manager hợp lệ trước khi người này rời hoặc bị gỡ khỏi Workspace.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  ACCOUNT_UNAVAILABLE:
    "Không thể đăng ký với thông tin này. Bạn có thể đăng nhập hoặc yêu cầu khôi phục mật khẩu.",
  INVALID_TOKEN:
    "Liên kết không còn hợp lệ, đã dùng hoặc đã hết hạn. Yêu cầu liên kết mới.",
  INVALID_INPUT: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  EMAIL_VERIFICATION_REQUIRED: "Bạn cần xác minh email trước khi làm việc.",
  ACCOUNT_LINK_REQUIRED:
    "Email này đã có tài khoản. Đăng nhập bằng mật khẩu rồi liên kết Google trong phần tài khoản.",
  TERMS_REQUIRED:
    "Tài khoản Google mới cần đồng ý điều khoản trước khi tiếp tục.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  WORKSPACE_UNAVAILABLE: "Workspace không còn khả dụng với quyền hiện tại.",
  ORGANIZATION_UNAVAILABLE: "Tổ chức không còn khả dụng với quyền hiện tại.",
  ORGANIZATION_OWNER_REQUIRED: "Thao tác này cần quyền Chủ sở hữu tổ chức hiện tại.",
  ORGANIZATION_ADMIN_REQUIRED: "Thao tác này cần quyền Chủ sở hữu hoặc Quản trị viên tổ chức hiện tại. Tải lại để kiểm tra quyền.",
  WORKSPACE_ARCHIVED: "Workspace đang lưu trữ và chỉ đọc. Quản lý cần mở lại trước khi thay đổi dữ liệu.",
  WORKSPACE_CONFIRMATION_MISMATCH: "Tên xác nhận chưa khớp tên Workspace hiện tại.",
  WORKSPACE_MANAGER_UNAVAILABLE: "Cần bổ nhiệm Manager còn quyền hợp lệ trước khi mở lại Workspace.",
  TASK_RETENTION_EXPIRED: "Task đã hết thời gian phục hồi 30 ngày.",
  TRASH_ACCESS_FORBIDDEN: "Quyền hiện tại không cho phép xem thùng rác Project.",
  NOTIFICATION_UNAVAILABLE: "Thông báo không còn khả dụng.",
  INVITATION_UNAVAILABLE: "Lời mời không còn khả dụng hoặc đã hết hạn.",
  RESOURCE_UNAVAILABLE: "Nội dung không còn khả dụng với quyền hiện tại.",
  OWNER_REQUIRED: "Thao tác này cần quyền quản lý Workspace hiện tại. Tải lại để kiểm tra quyền.",
  TASK_EDIT_FORBIDDEN: "Bạn không có quyền sửa hoặc xóa Task này.",
  TASK_STATUS_FORBIDDEN: "Bạn không có quyền đổi trạng thái Task này.",
  REOPEN_APPROVAL_REQUIRED: "Task đã hoàn thành cần được quản lý duyệt mở lại.",
  REOPEN_REASON_REQUIRED: "Nhập lý do trước khi mở lại Task.",
  REOPEN_SELF_REVIEW_FORBIDDEN: "Bạn không thể tự duyệt yêu cầu mở lại của mình. Nhờ quản lý khác xử lý.",
  REOPEN_REQUEST_PENDING: "Task đã có yêu cầu mở lại đang chờ xử lý. Tải lại để xem.",
  REOPEN_REQUEST_COOLDOWN: "Yêu cầu vừa bị từ chối. Bạn có thể gửi lại sau 24 giờ kể từ lúc từ chối.",
  REOPEN_REQUEST_RATE_LIMIT: "Bạn đã gửi ba yêu cầu cho Task này trong bảy ngày. Hãy chờ yêu cầu cũ ra ngoài khoảng thời gian đó.",
  REOPEN_REQUEST_FORBIDDEN: "Chỉ người tạo hoặc người được giao Task còn quyền truy cập mới được yêu cầu mở lại.",
  REOPEN_REQUEST_RESOLVED: "Yêu cầu này đã được xử lý. Tải lại trước khi tiếp tục.",
  REOPEN_HISTORY_FORBIDDEN: "Quyền Guest không cho phép xem lịch sử yêu cầu mở lại.",
  TASK_NOT_DONE: "Task đang mở nên không cần gửi yêu cầu mở lại.",
  CHECKLIST_INCOMPLETE_CONFIRMATION_REQUIRED: "Checklist còn mục chưa hoàn thành. Tải lại và xác nhận trước khi chuyển Done.",
  PROJECT_MANAGEMENT_REQUIRED: "Thao tác cần quyền quản lý Project hiện tại.",
  LABEL_NAME_CONFLICT: "Tên nhãn đã tồn tại trong Project. Hãy chọn tên khác.",
  LABEL_NOT_AVAILABLE: "Có nhãn đã lưu trữ hoặc không còn thuộc Project. Tải lại nhãn và bỏ nhãn không còn dùng trước khi thay bộ nhãn.",
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
  GOOGLE_EMAIL_MISMATCH:
    "Google account phải cùng email với tài khoản hiện tại.",
  GOOGLE_IDENTITY_IN_USE: "Google account đã được liên kết với tài khoản khác.",
  GOOGLE_CHALLENGE_INVALID:
    "Phiên liên kết Google đã hết hạn. Bắt đầu lại thao tác.",
  LOCAL_PASSWORD_UNAVAILABLE: "Tài khoản này không có mật khẩu hệ thống.",
  TRANSFER_REQUIRED: "Cần chuyển quyền sở hữu trước khi rời Workspace.",
  TRANSFER_TARGET_INVALID:
    "Người nhận quyền không còn là thành viên hợp lệ. Tải lại danh sách.",
  CANNOT_REMOVE_OWNER: "Không thể loại chủ sở hữu Workspace.",
  EMAIL_RETRY_UNAVAILABLE:
    "Không thể gửi lại email này. Tải lại để kiểm tra trạng thái.",
  INVITATION_EMAIL_MISMATCH: "Lời mời này dành cho tài khoản có email khác.",
};
export const messageFor = (error) =>
  messages[error?.code] ?? "Chưa kết nối được hệ thống. Vui lòng thử lại.";
