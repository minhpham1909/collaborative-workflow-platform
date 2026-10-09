# C4-A — Task enrichment API

05/10/2026. Nguồn EX-26–30 và lựa chọn trực tiếp: mã theo Project, `WF-A1B2C3-123`. Đây là slice BE; chưa nghiệm thu toàn C4 hoặc dựng UI mới. Reopen approval và Project statistics ở C4-B.

## Dữ liệu và quyền

- Priority `low/medium/high`, mặc định `medium`; overdue vẫn độc lập. Creator, Lead và quản lý Workspace hiện hành được sửa, Assignee đơn thuần không được sửa nội dung.
- ProjectLabel dùng chung trong Project: name tối đa 60 ký tự, nameKey NFC/lowercase unique kể cả label đã archive; màu lavender/coral/mint/blue/amber/gray. Quản lý Workspace hoặc Lead tạo/sửa/archive/khôi phục nhãn; reader kể cả Guest xem. Archive nhãn giữ liên kết Task cũ; nhãn archived không được gán mới. Task tối đa 20 nhãn, không trùng và không dùng nhãn Project khác.
- Checklist tối đa 100 mục, text tối đa 300 ký tự, id UUID do BE cấp. Editor thay cấu trúc bằng `items[{id?,text}]`, giữ checked cho id cũ; id thiếu là mục mới unchecked; không chấp nhận checked client gửi trong cấu trúc. Assignee/editor tick bằng endpoint riêng. Guest không ghi. Checklist dùng version chung của Task để chống ghi đè.
- Khi chuyển sang Done còn checklist chưa checked, trả `CHECKLIST_INCOMPLETE_CONFIRMATION_REQUIRED` (409). Gửi lại cùng version với `confirmIncompleteChecklist:true` sau khi UI xác nhận; dữ liệu/version thay đổi thì yêu cầu đọc lại.
- completedAt UTC ghi ở lần chuyển vào Done. No-op Done/sửa nội dung không đổi thời điểm. Rời Done clear thời điểm hiện tại; activity giữ các lần hoàn thành. Task Done cũ không biết thời điểm trả null và `completionTimeKnown:false`, không backfill bằng updatedAt.
- Activity append-only cùng transaction với Task, metadata action/actor/taskVersion/fields/status/createdAt; không sao chép mô tả/bình luận. Một activity trên mỗi version có thay đổi nghiệp vụ. Migration mã tăng version nhưng không bịa activity trước đây.
- Mọi endpoint áp dụng auth verified/current session, Ban, parent chain, current scoped roles, CAS và lock Workspace như nền C1–C3. Project Archived chặn mutation, vẫn đọc dữ liệu/lịch sử. Không thêm quyền kiểm duyệt cho Lead.

## API

| API | Body / kết quả |
|---|---|
| POST/PATCH Task hiện hành | thêm `priority`, `labelIds`; PATCH có expectedVersion |
| GET /projects/:id/labels | page limit/cursor; items + total |
| POST /projects/:id/labels | name, color? |
| PATCH /projects/:id/labels/:labelId | expectedVersion, name?/color?/archived? |
| PATCH /tasks/:id/checklist | expectedVersion, items[{id?,text}] |
| PATCH /tasks/:id/checklist/:itemId | expectedVersion, checked:boolean |
| GET /tasks/:id/activity | limit/cursor; items + nextCursor; scoped actor DTO không email |
| PATCH /tasks/:id/status | status, expectedVersion, confirmIncompleteChecklist? |

Task DTO thêm code, priority, labelIds, labels (kể cả archived), checklist, completedAt, completionTimeKnown và permissions.checklistStructure/checklistTick. Code/completedAt/checklist không nhận qua generic Task body.

Task/Board/MyTasks query thêm priority/labelId; search q tìm cả code. Filter trước cursor/count. Board vẫn newest-created-first.

MyTasks thêm mỗi item `deadlineGroup` và `groupCounts` toàn tập khớp filter, không phải chỉ trang hiện tại; `asOf` làm mốc phân nhóm. Nhóm completed → no_deadline → overdue (now > dueAt) → today (đến trước 00:00 ngày mai giờ Việt Nam) → upcoming. Counts không đồng nghĩa có thể suy số liệu toàn Project. Thứ tự/pagination cũ giữ tương thích; renderer U1/U2 dùng metadata để dựng nhóm.

S8 (09/10/2026): GET `/my-tasks` hỗ trợ thêm `projectId` ObjectId cùng pipeline authorized Workspace/current assignee/ban/filter, trước count/groupCounts/cursor; outsiders không được suy Task qua ID. Mỗi item bổ sung `workspaceState` và `readOnly` effective Workspace/Project Archive. Không đổi schema, index hoặc quyền ghi. UI [contract S08](../ui-ux/MY-TASKS-S08-CONTRACT.md).

## Mã và migration

- Prefix 6 ký tự hex uppercase sinh ngẫu nhiên, unique toàn hệ thống ở Project; số nguyên tăng riêng Project. Không sửa prefix/mã qua API. Trùng prefix hiếm được rollback transaction và cấp lại tối đa 4 attempts; không gộp counter với version cấu hình Project.
- Counter, Task và activity tạo trong một transaction, lock cùng Workspace; rollback không tạo Task/code mồ côi. Mã đã cấp không tái dùng khi Task soft-delete. Dữ liệu migration bao gồm Task bị xóa và Project Archived.
- Bắt buộc unique partial indexes project_task_prefix_unique và task_code_unique, vì dữ liệu cũ thiếu/null mã. Tạo additive theo plan, không sync/drop indexes.
- `pnpm db:task-codes` chỉ audit missingCodes/unknownDoneTimes/counter/parent/prefix/duplicate. `pnpm db:task-codes --apply` là migration explicit, chỉ chạy sau snapshot/backup và audit hợp lệ; batch ≤100/transaction, cấp mã cho Task thiếu, giữ updatedAt/completedAt, tăng version để form cũ không overwrite. Chạy lại không đổi mã đã có.
- Dev read-only audit: 1 Task thiếu mã, 1 Done không rõ thời điểm, không có problem; indexes mới đã tạo additive và API health ready đạt. Chưa chạy migration trên dev người dùng. Audit/migration không gửi mail, không tạo thông báo và không chạy worker.
- Sau khi prefix/code đã cấp, transfer Workspace tương lai phải giữ nguyên chúng; API transfer chưa thuộc C4-A. Không reset counter hoặc tái cấp mã khi restore.

## C4-B đã nối

Request/approve/reject/direct reopen, reason/self-review/rates/cancellation và thống kê đã có ở [contract C4-B](TASK-REOPEN-C4-API-v0.1.md). Endpoint generic status hiện chặn Creator/Assignee mở lại trực tiếp; quản lý cần reason. Full UI request/review/statistics thuộc U1/U2.
