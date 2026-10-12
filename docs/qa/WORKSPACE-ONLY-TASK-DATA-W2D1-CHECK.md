# Workspace-only W2d1 — Task list/detail data gate

12/10/2026. [Contract hiện hành](../sds/TASK-LIST-DETAIL-W2D-API-v0.1.md).

## Đã kiểm

- BE full integration125PASS,0FAIL/skip, replica set cô lập. Guest/current scope, Archive/trash, labels/checklist, reopen/history, pins, Calendar và auth suites giữ kết quả.
- Unit invocation97PASS gồm BE71 +FE26;16integrationSKIP vì invocation unit không DB;0FAIL.
- Case mới trên Mongo: list không description/checklist/creator, excerpt≤240 code points, checklist2/1, comment count không gồm deleted comment, foreign-Project label metadata không lọt, detail full content/checklist giữ, list/detail permissions bằng nhau, Board/MyTasks/Calendar cùng trả row đúng. Fixture list serialized nhỏ hơn1/2detail; không suy đây là benchmark mọi workload.
- FE build/budgetPASS: initial422103bytes,largest395860bytes; không nới budget.
- Browser BoardS6aPASS:3columns/cursors/full-vs-filter totals, checklist summary, labels/search/create/Guest/Archived,5width.
- Browser MyTasksS8PASS: assigned/full counts/groups/pagination, filters/stale search/error/Archive/panel/fullpage return/access loss,5width.
- Calendar browser M4LightVI PASS:full day20/page12/loadmore, keyboard/noDeadline/panel/fullpage, stale month, error/empty/Archive và5width. ERR_FAILED trong harness là abort-network scenario chủ động. Chưa claim tất cả theme/locale của Calendar ở patch này.

Task card giữ excerpt và checklist counts; chưa thêm UI comment-count badge chỉ vì DTO đã có. Project/Workspace list và Trash còn DTO cũ; Home metrics/priority chưa implement. W2d toàn bộ chưa đóng, chỉ W2d1 Task data gate.

Không live data writes, schema/index migration, dev queues/SMTP/purge hoặc deploy. Browser dùng fixture API/DB riêng; raw foreign-label test chỉ trên DB tạm. Source checks/document links/diff được kiểm trước commit.

Tiếp W2d2 Home personal overview/count scopes và priority slice; tiếp nối metadata/create/settings/Team UI theo cụm, Org removal cần inventory/mapping/rehearsal riêng.
