# C5-A — Workspace Archive và Task Trash/Retention

05/10/2026. Chủ dự án đã chọn: Workspace/Project chỉ Archive, Task có thùng rác 30 ngày; mở lại Workspace giữ state riêng của Project. Quyền purge thủ công chưa có lựa chọn nên **không mở endpoint đó**. Transfer Workspace vào tổ chức vẫn EX-25 mở. API dưới là slice đã rõ, không nghiệm thu toàn C5/U1/U2.

## Workspace lifecycle

PATCH /workspaces/:id/state: expectedVersion, state active/archived, confirmName đúng tên hiện tại, reason single-line 1–2000. Verified/current session, scope quản lý (Owner standalone; Org Owner/Admin/Manager attached), Ban và CAS. Confirm sai → WORKSPACE_CONFIRMATION_MISMATCH; stale → VERSION_CONFLICT. No-op giữ version/audit.

- state/archivedAt/archivedBy trên Workspace. Legacy thiếu state là active. Không đổi state/status/timestamps của Project/Task bên trong, không xóa dữ liệu.
- Mở lại attached Workspace cần Manager có Org/WS membership thực hiện hợp lệ; quản lý có thể sửa người phụ trách qua cơ chế C1 để phục hồi điều kiện. Manager thiếu quyền → WORKSPACE_MANAGER_UNAVAILABLE. Ownership/role ở User không đổi.
- Archived chặn nội dung WS/Project/Task/Comment, đổi Project state/Lead/labels/checklist/reopen, tạo Project, lời mời WS/Project/Org có WS đích và accept vào WS. Read/list/statistics vẫn được kiểm scope và xem. Ordinary author không xóa Comment trong parent Archived; scope moderator vẫn xóa hẳn với reason.
- Rời/kick/Ban/unban/revoke invitations/Guest, transfer ownership và thay Manager phục hồi quản trị, personal email preferences vẫn có thể xử lý; đây là quản lý quyền/an toàn và setting cá nhân, không mở khóa nội dung.
- Archive hủy pending reopen + outbox pending/processing/failed liên quan WS. Unarchive không phát lại/cấp lại. Mail eligibility kiểm lại WS state; provider đang gửi ở ngoài transaction không thể thu hồi email đã gửi, như giới hạn mail nền.
- WorkspaceLifecycleAudit metadata reason/actor/states/resourceVersion, không snapshot nội dung. Multi-step UI dự kiến review → nhập tên/lý do → xác nhận; API kiểm các thông tin tại commit, không claim có màn quản lý Archive hoàn chỉnh.
- Project DTO giữ state thật của Project, thêm workspaceState/readOnly và capabilities dựa effective readonly. Task/Comment capabilities tương tự. MyTasks active loại WS Archived; archived gồm Project Archived hoặc WS Archived. Home activeProjectCount của WS Archived bằng 0; không bịa đổi state Project.

## Task Trash

- POST /tasks/:id/delete (nền): quyền editor hiện tại, parent active/CAS; deletedAt/by + purgeAt = deletedAt+30×24h UTC, activity deleted, hủy reopen/outbox chờ ngay trong transaction. Task/comments ẩn khỏi các API thường. Không xóa Comment riêng thành soft-delete.
- GET /projects/:id/trash?limit&cursor: sort deletedAt newest; quyền management/Lead xem cả Project, Member chỉ Task mình tạo; Guest bị chặn. Filter quyền trước count/pagination. DTO chứa dữ liệu Task/code/checklist/labels/completion, deletedAt/by/purgeAt/retentionScheduled; chỉ permissions.restore, không cho thao tác nội dung Task trong rác.
- POST /tasks/:id/restore {expectedVersion}: Creator còn quyền, scope management hoặc Lead; parent WS/Project active; chưa hết purgeAt; Task hiện đang trashed. Giữ mã/status/priority/checklist/description/history/completedAt. NonDone Assignee không còn membership/quyền/Ban thì bỏ; Done giữ attribution lịch sử như nền, reopen sẽ kiểm lại.
- Restore clear deletedAt/by/purgeAt, tăng version và activity restored; không tạo work event/email/notification mới, không hồi sinh pending reopen hay outbox đã cancel. Bình luận còn lưu do cha trashed hiện lại; Comment đã bị xóa hẳn không hồi sinh.
- TASK_RETENTION_EXPIRED khi now>=purgeAt dù worker chưa chạy. Parent Archived không cho restore; đọc trash vẫn được. Task cũ thiếu purgeAt trả retentionScheduled:false và chưa tự suy hạn/purge; cần migration retention có backup/audit riêng trước áp dụng trên dữ liệu cũ.

## Retention worker

`pnpm retention:once` một batch ≤20 mặc định (tối đa100); `pnpm retention:worker` process riêng mỗi5s, cursor đi qua các hàng lỗi/orphan để không chặn hàng sau, vòng sau retry. Không được khởi chạy từ API hoặc dev:full mặc định.

- Chỉ Task deletedAt Date/purgeAt Date đã đến hạn **đúng 30 ngày**; không purge Task active hoặc legacy không lịch. Parent WS/Project phải tồn tại đúng chain; orphan/invalid deadline skip, không cố xóa theo client-supplied scope.
- Mỗi Task một transaction lock cùng Workspace/Org như live write; recheck version/deletedAt/deadline sau guard. Restore thắng thì worker stale skip; purge thắng thì Task không còn để restore. Không TTL root hay reset Project counter.
- Xóa Task cùng scoped Comment, Activity, ReopenRequest, Notification và EmailOutbox liên quan; không đụng Project labels/Task khác. TaskPurgeAudit chỉ code/IDs/deletedAt/purgedAt/mode, không title/body. Audit fail rollback cả delete children/Task. Hai workers chỉ một purge/audit commit; mã không tái dùng.
- Task Archived parent nhưng đã trashed vẫn hết hạn bình thường; Archive tự nó không tạo lịch xóa.
- Worker không thay backup policy/quota. Legacy backfill, orphan repair, vận hành production/NFR/retention audit access UI chưa nghiệm thu. **Không chạy worker trên dev thật trong slice này.**

## Còn lại

Purge thủ công cần quyết định quyền và contract destructive confirm riêng; transfer Workspace chưa chốt. Full Archive/trash UI thuộc U1/U2. Core C5-A có scope bảo mật, lifecycle và worker callable; chưa đánh dấu toàn C5 xong.
