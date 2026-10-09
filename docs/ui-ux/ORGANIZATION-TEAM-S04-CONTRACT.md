# S4 — Organization Team, phần 4a

07/10/2026. S4a và S4b đã triển khai trong scope Organization Team.

Route `#organization/:id/team` chỉ chấp nhận ID24hex và đúng segment team; có liên kết quay lại Workspace collection. Không thêm role Guest/Collaborator vào Organization. Guest vẫn scoped Project.

| Vùng / thao tác | Contract |
| --- | --- |
| Context | GET `/organizations/:id`, role hiện tại sau guard. Không lộ tên/roster khi mất quyền. |
| Thành viên | GET `/organizations/:id/members?limit=12&q&from&to&cursor`. Tên/avatar/role/ngày gia nhập; không thêm email công việc, chức danh, presence, 2FA, ghế hoặc Workspace assignment giả. Member tổ chức được đọc danh sách. |
| Lời mời | GET `/organizations/:id/invitations?limit=12&q&state&from&to&cursor`; chỉ Owner/Admin. Search email, state all/active/accepted/revoked/expired, ngày tạo theo VN. Total áp dụng bộ lọc trước paging. |
| Tạo lời mời | POST `/organizations/:id/invitations`, email + workspaceId tùy chọn. Member role cố định, email-bound,7 ngày. Picker chỉ WS Active thuộc Org được truy cập, có paging riêng. BE recheck parent/current role/Ban. |
| Thu hồi | POST `/organizations/:id/invitations/:invitationId/revoke`, expectedVersion; dialog ghi rõ tác động. BE thu hồi/cancel queued email. UI chỉ CTA ở invitation Active, không fake resend API. |
| Phản hồi | Toast xác nhận tạo record/đang chờ email; không tuyên bố đã gửi SMTP. Mutation unknown outcome khóa retry, đóng/readback. Lỗi quyền giữa form giữ draft, không tạo record trái quyền. |

Members total tính toàn query trước cursor, không lấy số dòng loaded làm tổng. Member search chỉ tên (DTO không công khai email); thời gian là joinedAt. Invitation thời gian là createdAt; trạng thái derive từ accepted/revoked/expiry. Member roster chỉ active. Không tự cấp role hay membership từ FE.

Table desktop chuyển từng row có label trên mobile, keyboard link/button/input chuẩn. Tái sử dụng Avatar, FormField, FilterPanel, focus stack, NotificationProvider/draft guard. Typed name không cần cho lời mời; backend validation email hiện có vẫn là quyết định cuối.

## S4b — quản trị theo phạm vi

| Thao tác | Quyền / API / xác nhận |
| --- | --- |
| Vai trò | Chỉ Org Owner, target không phải Owner. PATCH members/:userId/role, role admin/member + membership expectedVersion. Không tự nâng role Admin hoặc sửa Owner bằng role editor. |
| Phân bổ WS | Owner/Admin ở màn Org Team. POST workspaces/:workspaceId/members, userId + WS expectedVersion, WS Active. Không cần accept lại. Manager ở WS có quyền API trong scope WS; UI riêng ở S5. |
| Manager | Owner/Admin, gồm tự bổ nhiệm mình. PATCH workspaces/:workspaceId/manager, managerId + WS expectedVersion. Cho chọn Archived để khôi phục Manager hợp lệ; không tự Unarchive. BE thêm WS membership nếu thiếu, giữ Org role và quyền WS cũ theo trạng thái hiện tại. |
| Ownership | Chỉ Owner chọn active member khác. PATCH ownership, memberId + Org expectedVersion. FE thêm exact-name confirmation; đây là bảo vệ thao tác UI, không phải yêu cầu xác minh danh tính mới ở BE. Owner cũ quay về stored membership role; reload capabilities ngay. |
| Audit | Owner/Admin. GET audit limit/cursor, newest; tên actor/target từ batch lookup current User displayName, không email. IDs/action/version nghiệp vụ lịch sử vẫn giữ. Không đọc nhật ký xuyên Org hoặc sau mất management. |

Management dialog có pending/focus/Escape/draft guards. CAS/permission failure giữ lựa chọn và inline error; unknown response khóa gửi lại, đóng/reload trước thao tác tiếp. Picker WS có paging, tránh chỉ cho chọn12 mục đầu; Member mode chặn WS Archived, Manager mode cho phép để recovery. Không tự gộp role tổ chức và Workspace. Nhật ký không làm global search/exports hoặc số thống kê giả.

Kick/Ban/cleanup của WS nằm S5. Full browser history draft guard và full Vi/En rollout còn trong các gate sau.
