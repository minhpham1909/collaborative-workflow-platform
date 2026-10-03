# QA Project / Task / Comment

Ngày 03/10/2026; MongoDB 8.0.17 replica set tạm, database workflow_auth_test riêng. Fixtures được xóa theo IDs riêng, không dùng tài khoản/dữ liệu dev hoặc SMTP thật.

- Suite thường: 37 pass, 0 fail, 5 integration parents skip khi không có TEST_MONGODB_URI.
- Suite tích hợp: 33 pass, 0 fail, 0 skip; module mới có parent + 8 subtests.
- Kiểm Owner-only Project, Active/Archived/reopen, Member tạo Task/Comment, verified gate và không ảnh hưởng Auth/Profile của tài khoản chưa verified.
- Owner/Creator vs Assignee vs Member trên Task; Comment chỉ Author, kể cả Owner không can thiệp Comment người khác; DTO chống sửa creator/scope, Origin/JSON/preflight.
- CAS/no-op, hai Task saves cùng version một lần thành công; race archive/write và leave/write; recheck phiên bị thu hồi trong repository.
- Cleanup unfinished, Done giữ assignee cũ khi sửa, reopen bỏ assignee đã rời và giữ người còn membership, rejoin không tự phân công lại.
- Soft-delete parent làm Comment unavailable; lookup child sai Task bị từ chối; fail injection Notification.save làm Comment rollback.
- Dedupe recipients/self exclusion/old-new assignment/content grouping; Workspace override chọn email types; no-op/stale không có event mới.
- Board/My Tasks AND search không dấu/case, regex literal, title/description cập nhật search; full-set counts, cursor mới trước, context Workspace → Project, default Active/open và xem Done/Archived.
- Biên deadline ngày Việt Nam: đúng đầu ngày/16:59 UTC/17:00 UTC; Task null deadline không xuất hiện trong khoảng dueAt thiếu đầu; past due chấp nhận, Done không overdue.

Chưa nghiệm thu UI, debounce/race responses FE, hiệu năng workload NFR, idempotency tạo, worker/email công việc, inbox che dữ liệu, reminders, retention/purge hoặc backup restore. Xem [contract](../sds/PROJECT-TASK-COMMENT-API-v0.1.md).
