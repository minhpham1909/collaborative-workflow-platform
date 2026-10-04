# Project, Task, Comment API — increment BE

Cập nhật Task FE 04/10/2026: Task trả thêm creator/assignee {id, displayName, avatar}, Comment thêm author cùng allowlist. Lookup chỉ identities được tham chiếu sau parent/session/membership guard, giữ tên người đã rời và không lộ email/password. Board/Task/Comments/My Tasks FE đã nối; [thiết kế](FE-TASKS-v0.1.md), [QA](../qa/FE-TASKS-CHECK.md).

Cập nhật 04/10/2026: Project list nhận thêm q/from/to theo ngày tạo Việt Nam, literal search không dấu trên name/description.plainText, cùng semantics Workspace filters. Scope/state/search/date áp dụng trước cursor và total. FE Workspace/Project đã nối; Board/Task FE chưa nối. [Thiết kế FE](FE-WORKSPACE-PROJECT-v0.1.md), [QA](../qa/FE-WORKSPACE-PROJECT-CHECK.md).

Ngày 03/10/2026. JS/Express/Mongoose, nối với [Workspace API](WORKSPACE-INVITATIONS-API-v0.1.md), [DB v0.2](DATABASE-DESIGN-v0.2.md) và [quyền đã chốt](../srs/TASK-COMMENT-PERMISSIONS.md). Đây là hợp đồng triển khai lõi; frontend sản phẩm và worker email công việc chưa thuộc increment này.

## Transport và phạm vi

Bearer access JWT, account verified, session được kiểm lại trong transaction. GET/POST/PATCH, CORS theo WEB_ORIGIN; mutation JSON và Origin hợp lệ, body tối đa 256 KiB. DTO từ chối trường thừa, IDs chỉ 24 hex lowercase. Response lỗi theo envelope chung; ngoài membership hoặc đối tượng đã xóa trả RESOURCE_UNAVAILABLE/404 không có nội dung đối tượng.

Mỗi mutation dùng User guard rồi Workspace mutationRevision guard, cùng cơ chế với transfer/leave/remove/invitations. Project archive, thay Owner và cleanup assignee được tuần tự hóa với mọi thao tác con. expectedVersion là version đối tượng đang sửa/xóa, không phải Workspace version. Stale trả VERSION_CONFLICT/409; no-op giữ version/timestamps và không sinh event. Không tự gộp dữ liệu.

## Routes

| Method | Route | Quyền và input |
|---|---|---|
| GET/POST | /workspaces/:workspaceId/projects | Member xem; Owner tạo {name, description?} |
| GET/PATCH | /projects/:projectId | Member xem; Owner sửa Active {expectedVersion, name?, icon?, description?}; Creator còn membership chỉ sửa description |
| PATCH | /projects/:projectId/state | Owner {expectedVersion, state: active/archived}; cho mở lại |
| GET/POST | /projects/:projectId/tasks | Member xem; Member tạo trong Active {title, description?, assigneeId?, dueAt?} |
| GET | /projects/:projectId/board | Member; ba columns todo/in_progress/done, items/total/nextCursor riêng |
| GET | /my-tasks | Chỉ Task assigned-to-me trong Workspace còn membership |
| GET/PATCH | /tasks/:taskId | Member xem; Owner/Creator sửa Active {expectedVersion, title?, description?, assigneeId?, dueAt?} |
| PATCH | /tasks/:taskId/status | Owner/Creator/Assignee hiện tại, Active {expectedVersion, status} |
| POST | /tasks/:taskId/delete | Owner/Creator, Active {expectedVersion} |
| GET/POST | /tasks/:taskId/comments | Member xem; Member tạo Active {content} |
| PATCH | /tasks/:taskId/comments/:commentId | Author còn membership, Active {expectedVersion, content} |
| POST | /tasks/:taskId/comments/:commentId/delete | Author còn membership, Active {expectedVersion} |

Project Archived chỉ đọc, kể cả Owner; chỉ endpoint state cho mở lại. Owner không sửa/xóa Comment người khác. Parent Task/Workspace phải khớp khi truy cập Comment. Không có quyền Project riêng, move Task, Project delete hoặc restore Task ở bản đầu.

## Nội dung và deadline

Description dùng editor chung prosemirror-json/schemaVersion 1; BE tính plainText/searchText, không tin dữ liệu dẫn xuất gửi lên. Comment bắt buộc có nội dung hiển thị. Guardrails hiện tại: name Project 200 UTF-16, title Task 300 UTF-16; mô tả Project/Task 10.000 graphemes, Comment 5.000 graphemes và giới hạn cấu trúc theo editor validator. Đây là giới hạn kỹ thuật hiện hành của schema, chưa thay trạng thái review NFR/quota sản phẩm.

dueAt null hoặc UTC ISO chính xác dạng 2026-10-03T10:30:00.000Z, đến phút; FE chuyển từ giờ Việt Nam. Chấp nhận hạn quá khứ; response overdue giúp FE hiển thị cảnh báo trước khi lưu. overdue = now > dueAt và status khác done, kể cả Archived. Bỏ deadline hết overdue; reopen giữ deadline cũ. Task Done giữ assignee lịch sử khi sửa nội dung; reopen bỏ assignee đã rời, giữ nếu còn membership. assigneeLeft tính theo membership hiện tại nên tái gia nhập bỏ nhãn, không tự khôi phục Task đã bị cleanup.

Task response có permissions {edit, delete, status}, derived overdue/assigneeLeft, không trả searchText. Permissions chỉ hỗ trợ UI; BE luôn kiểm lại khi mutation. My Tasks thêm workspaceName/projectName/projectState. Comment trả edit/delete theo Author và lifecycle.

## Query và pagination

Project list: state active mặc định, archived/all tùy chọn. Task list/Board: status all mặc định, hoặc todo/in_progress/done/open. My Tasks: state active và status open mặc định; state archived/all, status done/all, workspaceId tùy chọn. Comments sort createdAt desc/_id desc; UI có thể trình bày hội thoại phù hợp khi tích lũy trang.

Task list/Board/My Tasks dùng cùng q, timeField createdAt/dueAt, from/to YYYY-MM-DD và overdue true/false. q tối đa 200 UTF-16/20 từ, normalize Unicode/case/dấu/đ; mọi từ phải có trong title/description, không tìm Comments hoặc URL hyperlink ẩn. Regex ký tự người dùng được escape; mở rộng nhóm dấu Việt trên searchText NFC hiện có, không cần migration. Đây là literal substring AND, chưa nghiệm thu hiệu năng cho bộ dữ liệu NFR.

from bao gồm 00:00 ngày đầu, to bao gồm toàn ngày cuối bằng điều kiện < 00:00 ngày sau, giờ Asia/Ho_Chi_Minh UTC+7. Cho thiếu một đầu; ngày sai hoặc from > to bị từ chối. Task không deadline bị loại khi có khoảng dueAt thực tế. Preset hôm nay/7/30 ngày và debounce 300 ms do FE chuyển thành query này; chưa có FE xử lý response cũ.

limit mặc định 20/tối đa 100 là guardrail kỹ thuật. Cursor base64url {at,id}, sort createdAt desc/_id desc; cập nhật không đổi thời gian tạo. Filter trước count/limit trên toàn tập có quyền; total không phụ thuộc cursor. Board tải trang đầu mỗi cột; tải thêm cột qua /projects/:id/tasks?status=...&cursor=... cùng filters. My Tasks join Project và lọc lifecycle trước limit. Thay query/filter phải bỏ cursor. Cursor không cam kết snapshot nhiều requests hoặc realtime.

## Xóa và sự kiện

Task/Comment soft delete bằng deletedAt/deletedBy và tăng version; không có thùng rác. Xóa Task làm mọi Comments không truy cập ngay qua parent gate, không cần cascade vật lý. Retention/purge/backup chưa chốt, không chạy purge tự động.

Assignment thực sự đổi gửi Creator/assignee cũ/mới hợp lệ; content/deadline/status gửi Creator/assignee hiện tại; Comment mới gửi Creator/assignee. Loại actor, dedupe recipient/event, bỏ người không còn membership. Cùng lần lưu một Notification mỗi người, changes gộp theo người. Chỉ queue email eventTypes đang bật theo global/override; không sao chép địa chỉ email vào payload. Notification/EmailOutbox lưu cùng transaction; rollback validation/CAS không để lại event. Sửa/xóa Comment và no-op không sinh event; cleanup Workspace không phát hàng loạt assignment.

Đã có durable work events, chưa API inbox hoặc work-email dispatcher. mail:once hiện chỉ Auth/Invitation; không gửi work jobs. Increment Notifications kế tiếp phải kiểm lại membership, Task availability, settings trước gửi và che payload khi đọc sau mất quyền/xóa Task. Không công bố đã hoàn thiện delivery hoặc reminders. Tạo Task/Comment hiện không có idempotency key; đề xuất chống duplicate retry ở nhóm 6 cần thiết kế riêng, không tự suy từ transaction.

[QA](../qa/PROJECT-TASK-COMMENT-CHECK.md) ghi bằng chứng và giới hạn kiểm thử.


Cập nhật increment tiếp theo 03/10/2026: [Notifications/email API](NOTIFICATIONS-EMAIL-API-v0.1.md) đã nối inbox/work-email dispatcher và mail:worker. Những câu chưa có inbox/dispatcher ở trên mô tả ranh giới lúc triển khai Work, không phải trạng thái mới nhất.
