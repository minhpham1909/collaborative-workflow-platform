# S5 — Workspace Team / an toàn truy cập

07/10/2026. Dùng bảng/row mobile, form/dialog/focus và visual Stitch của S4. Không đổi mô hình quyền hoặc chạy worker thật qua UI.

| Hành động | API / điều kiện |
| --- | --- |
| Roster | GET workspaces/:id/members q/from/to/cursor; active WS membership và Org membership hợp lệ. Role Workspace tách Org role. Row permissions remove/ban/transfer do BE projection sau current scope, bảo vệ self/Owner/Admin/Manager. |
| Thêm nội bộ | POST organizations/:orgId/workspaces/:id/members, userId + Workspace expectedVersion. Owner/Admin/Manager trong scope WS Active; picker Org active members có search/paging; không accept lại, không nâng Org role. |
| Email/link invitation | Workspace độc lập: Owner tạo khi Active; GET invitations q/time/type/state/cursor. EMAIL bound email, LINK reusable,7 ngày. URL link chỉ trả lúc tạo, copy/manual copy trước đóng. Attached WS dùng allocation/Org invite, không standalone invite. |
| Revoke/retry mail | POST invitations/:id/revoke hoặc retry-email với invitation version. Revoke là security exception ở Archived; retry mail chỉ Active và job failed. UI nói xếp hàng, không hứa email đã đến hộp thư. |
| Kick | POST members/:userId/remove với membership version. Không xóa Task/comment; bỏ assignee unfinished kể cả Archived. Kick không chặn dùng link còn hiệu lực để gia nhập lại. Manager phải được thay trước khi gỡ. |
| Leave | POST leave với current membership version; có xác nhận hậu quả. Owner/Manager không thể rời trước handoff; Org management chưa có membership không có CTA leave. |
| Standalone transfer | PATCH ownership với WS version/memberId; thêm FE typed-name confirmation. Owner cũ trở thành Member, DTO trả capabilities đã giảm ngay. Attached Workspace dùng Manager/Org ownership, không chuyển standalone Owner. |
| Ban preview | POST moderation/workspace/:id/preview, userId/cleanup none/1/3/7/30/all. Số matchedCount/cutoff/version/ticket từ server; đổi cleanup bỏ preview cũ. Không tính count từ page comments hoặc thời gian client. |
| Ban | POST moderation/workspace/:id/bans với reason/version/preview khi cleanup khác none. Chặn scope WS + descendants, không toàn tổ chức/WS khác. Cần xem trước; cleanup cần thêm FE xác nhận XÓA BÌNH LUẬN. Comment hard-delete không vào trash, Task/tài liệu/lịch sử giữ. |
| Ban Manager | Org Owner/Admin đủ quyền có thể Ban Manager; BE takeover theo policy C3. Manager/Member không tự Ban Owner/Admin/Manager được bảo vệ. |
| Unban | POST bans/:userId/unban với ban version/reason; không khôi phục membership, assignment, Guest rights; không hủy cleanup đã xếp hàng. |
| Queue/actions | GET bans/actions limit/cursor; current display names batched sau guard, không email/Comment body. Retry actions/:id/retry chỉ failed Ban cleanup, giữ original cutoff/scope/cursor. UI không chạy worker. Refresh thủ công, không gọi realtime/poll hoặc báo completed trước worker. |

Pending/uncertain guard khóa retry khi mất phản hồi; mutation error ở dialog giữ nội dung. CAS/preview expiry yêu cầu đọc/xem trước lại. Không dùng window.alert/confirm. Các security lifecycle exceptions ở Archived được giữ, không mở content editing.

BE là nguồn quyền cuối: projection chỉ quyết định trình bày. Khi GET mất scope401/403/404, roster/modal và parent Workspace context được xóa, có lỗi/tải lại; Member còn scope đọc không tự nâng management bằng role label.

Không manual purge/transfer Workspace sang Org/custom roles/upload/Org Ban UI ở cụm này. Comment cleanup đang pending là trạng thái thật, không giả dữ liệu đã bị xóa hoặc backup. Full hash/history draft protection, localization và NFR vẫn thuộc gate sau.
