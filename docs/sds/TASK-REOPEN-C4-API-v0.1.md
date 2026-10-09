# C4-B — Mở lại Task và thống kê Project

05/10/2026. Theo EX-28/31/32/33/34, tiếp tục core BE trước UI. Contract thực thi dùng các mặc định đã nêu trong trao đổi: hủy pending khi archive/delete/mất quyền hoặc mất quan hệ Creator/Assignee; đổi Lead giữ request; thống kê current Done trên Task chưa xóa. Đây là các lựa chọn thực thi được ghi rõ để rà lại, không suy thành xác nhận riêng của người dùng cho mọi chi tiết.

## Quyền và vòng đời

| Actor hiện tại | Task chưa Done | Task Done |
|---|---|---|
| Org Owner/Admin; Workspace Owner/Manager; Project Lead | Điều phối theo quyền nền | Duyệt/từ chối hoặc mở lại trực tiếp có lý do |
| Creator/Assignee còn quyền làm việc trong scope | Đổi status theo quyền nền | Gửi yêu cầu mở lại có lý do; không dùng generic status để bypass |
| Guest | Đọc/bình luận | Đọc/bình luận; không request/review; không xem lý do/lịch sử request |
| Người đã rời hoặc bị Ban | Không kế thừa quyền từ dữ liệu lịch sử | Không tạo/duyệt hoặc dùng lại request cũ |

Quyền quản lý không thay account role; kiểm scope/current session/Ban/Org role/Lead ngay trong transaction như C1–C3. Org Admin không cần WS membership để quản trị, nhưng việc nhận Task vẫn yêu cầu membership theo EX-07.

- Một request pending mỗi Task, unique partial index. Creator/Assignee gửi targetStatus todo/in_progress + reason ≤2.000 ký tự, không cho body chèn requester/role/parent/state/time.
- Không tự approve **hoặc reject** request của mình. Nếu quản lý đang có request do chính mình gửi, generic direct reopen cũng chặn để không bypass self-review; quản lý khác xử lý. Quản lý không có request riêng được mở lại trực tiếp, không bị giới hạn số vòng đời Task.
- Reject: người gửi đợi 24h từ resolvedAt (đúng mốc được gửi). Tối đa 3 request/người/Task trong rolling 7 ngày; tạo ở đúng now−7d ra ngoài cửa sổ. Tính cả request approved/rejected/cancelled, không chỉ pending. Direct manager reopen không phải request.
- Approve kiểm request version **và** Task version hiện tại, current manager và điều kiện người gửi tại commit. Thay nội dung Task sau gửi không tự hủy request; reviewer phải đọc version mới. Thay Assignee làm người gửi không còn Creator/Assignee thì hủy; Creator còn quan hệ vẫn giữ.
- Archive Project, soft-delete Task, Org exit, Ban cancel trong transaction gốc. WS exit/revoke Guest/Admin demotion reconcile theo quyền thực tế: Admin vẫn có quyền quản trị toàn scope sau chỉ rời WS thì không coi là mất quyền. Task GET/history/queue reconcile stale pending từ dữ liệu legacy theo điều kiện hiện tại.
- Đổi Lead không đổi requester/request; Lead cũ mất quyền review và quản lý mới tiếp nhận. Unarchive/rejoin/unban không hồi sinh request cancelled. C5 Workspace archive/restore/purge phải nối cùng lifecycle; chưa claim đã có API Workspace Archive.
- Approve/direct reopen clear completedAt, kiểm lại Assignee và bỏ nếu không còn hợp lệ; lưu TaskActivity status_changed với reason/reopenRequestId, phát **event mới** theo nền work. Không phát lại notification/email cũ. Reject/cancel lưu metadata request, không giả thành thay đổi status Task.
- Mutation Request/Task/activity/event cùng transaction với guard Workspace/Org; đụng stale version trả 409. Retry cùng request đã xử lý không tạo vòng reopen/event thứ hai. Lost response phải đọc lại, không blind retry mutation.

## API

| Route | Body / kết quả |
|---|---|
| POST /tasks/:id/reopen-requests | expectedVersion của Task, targetStatus, reason → 201 {request,task} |
| GET /tasks/:id/reopen-requests | limit/cursor → history; chỉ reader không phải Guest |
| GET /projects/:id/reopen-requests | limit/cursor → queue pending + total; quản lý/Lead, kèm code/title/current Task version |
| POST /tasks/:id/reopen-requests/:requestId/review | expectedVersion của request, expectedTaskVersion, decision approve/reject, reason → {request,task} |
| PATCH /tasks/:id/status | Giữ status/expectedVersion; Done→open cần management + reason; không dùng thay endpoint request |
| GET /projects/:id/statistics | from/to optional YYYY-MM-DD, Việt Nam → số liệu toàn Project |

Request DTO: id/taskId/projectId, requester scoped name/avatar, reason/targetStatus/state/version/createdAt, resolvedAt/resolvedBy/resolutionReason, permissions.review. Không email/security/role ngoài scope. Task DTO thêm pendingReopenRequestId (Guest null), permissions.requestReopen/manageReopen; permissions.status của Done chỉ true cho quản lý không có pending riêng.

Review reconcile phát hiện request không còn hợp lệ có thể trả 200 `{code:REOPEN_REQUEST_CANCELLED,request}` để commit cancellation; không mở Task. Các cancellation do lifecycle gốc đã đổi version thì form cũ trả VERSION_CONFLICT. UI phải đọc code + state, không coi mọi HTTP 200 là approved.

Errors: REOPEN_APPROVAL_REQUIRED, REOPEN_REQUEST_FORBIDDEN, REOPEN_SELF_REVIEW_FORBIDDEN (403); REOPEN_REASON_REQUIRED (400); TASK_NOT_DONE, REOPEN_REQUEST_PENDING, REOPEN_REQUEST_RESOLVED, VERSION_CONFLICT (409); REOPEN_REQUEST_COOLDOWN/REOPEN_REQUEST_RATE_LIMIT (429). Parent/Ban/session errors theo nền.

## Thống kê

- `scope:whole_project`; total = tất cả Task nondeleted thật trong Project/WS; todo/inProgress/done theo trạng thái hiện tại; progressPercent = done/total×100, làm tròn 2 chữ số; empty Project = 0.
- completedInPeriod = Task **hiện Done**, completedAt biết rõ và trong [from,toExclusive). From/to ngày Việt Nam; to inclusive ở UI được BE đổi sang 00:00 ngày kế tiếp. Không có from/to thì đếm current Done biết thời điểm trên toàn kỳ.
- unknownCompletionTime đếm current Done chưa biết completedAt; không lấy updatedAt để bịa thời điểm. Reopen loại khỏi done/completedInPeriod, giữ lịch sử trong activity.
- overdue chỉ nonDone có deadline Date và now>dueAt; Archived vẫn xem được. Guest chỉ statistics Project được cấp; không totals tổ chức hoặc Workspace khác.
- Đây là thống kê toàn Project, tách rõ với số kết quả filter Board/MyTasks. Không đồng nghĩa năng suất nhân viên/khối lượng effort hoặc Sprint.

## UI và vận hành

FE nền được nối inputDialog nhập lý do direct reopen, checkbox-incomplete confirmation và thông điệp lỗi; dùng component hệ thống, không window.alert/prompt. Input dialog hỗ trợ options riêng nhưng giữ default link-editor cũ. Request/review queue và dashboard thống kê hoàn chỉnh thuộc U1/U2, chưa claim UI đó đã dựng.

Không gửi mail khi tạo request/reject; quản lý đọc queue API hiện tại. Chưa có notification category riêng cho approval inbox; thiết kế UI notifications riêng phải mapping rõ trước khi thêm. Approval/direct reopen tạo event work mới theo preferences nền, không khởi chạy SMTP.

task_reopen_requests là model thứ 25. Unique pending/rate-history/Project queue indexes additive; không purge history bằng TTL. C5 Task purge phải dọn Request/Activity/Comment liên quan nhưng giữ Project counter/mã đã cấp không tái dùng. NFR tải lớn, full UI và production migration/provider live vẫn là gate riêng C6/U1/U2.
