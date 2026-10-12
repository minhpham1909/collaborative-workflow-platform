# W2d1 — Task list/detail contract hiện hành

12/10/2026. Implement Task payload split; Home overview/priority, Workspace/Project list metadata và Organization cutover vẫn ngoài patch.

## Endpoints

- `GET /projects/:id/tasks`, `GET /projects/:id/board` columns, `GET /my-tasks`, `GET /my-calendar/tasks`: **TaskListItem**. Query/sort/cursor/totals/group/calendar scope hiện có giữ nguyên.
- `GET /tasks/:id` và Task mutation responses: **TaskDetail** canonical, giữ rich description/checklist/Creator. Panel/full page fetch detail như hiện có.
- Project trash endpoint **vẫn full DTO** vì UI dialog dùng mô tả/checklist trên row đã tải; chưa claim mọi danh sách toàn hệ thống lean.

## TaskListItem

Giữ id/workspaceId/projectId/createdBy/assigneeId/title/code/status/priority/labelIds/labels/assignee/assigneeLeft/dueAt/completedAt/completionTimeKnown/overdue/version/createdAt/updatedAt/pendingReopenRequestId/permissions. Assignee là minimal identity, createdBy chỉ ID; không creator object.

| Field mới/thay thế | Định nghĩa |
| --- | --- |
| descriptionExcerpt | Plain text, tối đa240 Unicode code points, empty string nếu không nội dung. Không rich document hoặc toàn plainText; không hứa cắt theo grapheme |
| checklistSummary | `{total,checked}`, integers≥0; absent legacy checklist thành0/0. Không IDs/text/check timestamps từng mục |
| commentCount | Bình luận còn tồn tại trên đúng taskId/workspaceId, full count độc lập list limit; không count lịch sử đã xóa |
| readOnly/readOnlyReason | Effective parent lifecycle; reason workspace_archived ưu tiên project_archived, Active null |

MyTasks thêm deadlineGroup/workspaceName/projectName/projectState/workspaceState; Calendar day thêm workspaceName/projectName, cùng scope như month query. Board có Project context ngoài items nên không lặp tên Workspace/Project trong mọi card.

List **không description/checklist/creator**. Consumer cần excerpt/summary hoặc fetch detail, không tìm rich document trên list rồi giả empty. FE Board chuyển excerpt và checklistSummary; MyTasks chuyển checklistSummary; Calendar đang chỉ cần title/status/time nên không đổi cấu trúc đọc.

## Read model và quyền

Mongo computed projection trước response: substring plain text, checklist counts tại DB, không chuyển full Task rich document/checklist qua driver cho các list endpoints. Task search vẫn dùng full searchText ở query; tìm text ngoài excerpt vẫn ra kết quả.

Batch people/memberships/Org memberships (transitional)/Bans/labels/comment counts/pending request metadata cho page/column. Cache context chỉ trong transaction, mỗi distinct Project kiểm quyền một lần; không cache quyền xuyên account/request. Labels kiểm lại Project+Workspace, comment counts kiểm task+Workspace, pending metadata không trả cho Guest.

Pending reopen reconciliation còn đọc/kiểm từng request phù hợp lifecycle hiện có. Vì vậy không claim toàn endpoint số queries cố định hoặc hệ thống đã không N+1 mọi nơi; giảm queries metadata theo Task trong list, giữ reconciliation/Project guards có scope. Board hiện batch theo từng column, chưa hợp tất cả3columns thành một batch.

Permissions là cùng helper với detail, giữ Creator/Assignee/Owner/Manager/Guest, Archived và pending reopen guards. Assignee current dùng membership/Ban và Org membership nếu attached; Done departed identity vẫn giữ, không cấp quyền từ assignee hiển thị.

Không đổi schema/index/data hoặc chạy backfill/workers. Đây là coordinated BE+FE contract change; deploy phải có consumers mới đồng bộ, không coi client cũ đọc checklist.length là tương thích.

[QA W2d1](../qa/WORKSPACE-ONLY-TASK-DATA-W2D1-CHECK.md).
