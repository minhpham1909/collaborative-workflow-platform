# C3 — scoped Kick/Ban, Comment moderation, profile

05/10/2026. Core implementation; không là full administration UI hoặc production readiness.

## Ban / Kick / Unban

Kick giữ các API remove/leave/revoke Guest của C1/C2: thu hồi quan hệ hiện tại, không tạo Ban. Link hợp lệ có thể cấp lại quyền. Ban có record scopeType+scopeId+userId unique, override quyền Creator/Assignee/Lead/Member/Guest và quản trị được cấp ở phạm vi đó. Scope Organization bao phủ descendants; Workspace bao phủ Project; Project chỉ Project đó. Không khóa account hoặc organization/Workspace độc lập khác.

Owner không bị loại/Ban bởi cấp dưới, không self-Ban; Admin không Ban Admin khác; Manager không Ban quản trị tổ chức. Org Owner/Admin có thể Ban Manager và tự tiếp quản các Workspace cần thay Manager trong transaction, thêm membership thực hiện nếu cần, giữ Org role riêng. Project Ban không đổi Workspace Manager slot; chỉ clear Project Lead/assignees/Guest grants trong Project. Unban không phục hồi memberships/roles/assignee/Manager, không phục hồi Comment đã xóa; cấp lại qua invitation hoặc internal assignment hợp lệ.

Ban còn thu hồi invitations chưa consumed do target tạo hoặc email-targeted trong phạm vi và hủy outbox liên quan. Link người khác phát hành vẫn tồn tại nhưng banned account không accept được. Ban check nằm ở direct read/write, assignment/Lead, list/count/search, Inbox và mail eligibility; Guest fallback không vượt Ban. Email đã gửi hoặc đang qua khoảng cách check/send không recall được.

## API dưới /moderation/:type/:scopeId

type = organization/workspace/project; actor phải là quản trị đúng scope, verified session được recheck trong transaction.

| Method/path | Input | Kết quả |
|---|---|---|
| POST /preview | userId, cleanup none/1/3/7/30/all | scope/target, count, cutoff, expectedVersion parent, signed preview nếu có cleanup |
| POST /bans | userId, reason, expectedVersion parent, cleanup (default none), preview nếu cleanup | Ban + cascade + action/job atomic; không xóa Comment ngay trong request |
| GET /bans | limit/cursor | Lịch sử Ban trong scope, không mở cho Member/Guest |
| POST /bans/:userId/unban | reason, expectedVersion Ban | Bỏ Ban, audit; không tự gia nhập lại |
| GET /actions | limit/cursor | Actor/target/reason/progress/metadata; không copy Comment body |
| POST /actions/:id/retry | expectedVersion action | Chỉ failed cleanup, tiếp tục cursor và criteria cũ |

Review token HMAC domain riêng bind actor/scope/target/cleanup/parent version, hết hạn 10 phút (implementation-selected). Cutoff được chốt tại bước xem trước và giữ nguyên khi confirm; 1/3/7/30 là rolling UTC days theo createdAt, không updatedAt. Count có thể giảm nếu moderator khác xóa trước confirm, không mở rộng mốc thời gian. Không trust workspaceIds/from/cutoff/count do client gửi. Với none không cần preview, không xóa nội dung. All-time cần UI xác nhận rõ tính không phục hồi; full Ban-management UI sẽ nối ở U1/U2, không tự mở CLI job trên dữ liệu thật để demo.

AccessBan active trả ACCESS_BANNED ở direct API; list loại banned scope trước pagination/count. Metadata scope version có thể tăng nhiều bước do Manager/Lead cleanup; luôn tải version hiện tại trước hành động tiếp theo. Existing active Ban không queue cleanup lại khi bấm lặp.

## Cleanup worker

ModerationAction queue pending/processing/completed/failed. Batch mặc định 128, cap 500; lease 60s, `_id` cursor, fixed author/scope/time. Per-batch deletion + cursor/count update trong transaction; failure rollback batch, không rollback Ban. Success reset failure attempts; 5 failed attempts → failed, privileged retry giữ cursor/criteria. Không xóa Task hoặc tài liệu, không xóa Comment người khác hoặc ngoài scope/time.

`pnpm moderation:once` chạy một batch; `pnpm moderation:worker` poll queue, không gửi email. Đây là thao tác destructive đối với **jobs đã được xác nhận**, không tự chạy cùng API hoặc mail worker. Ban lập tức chặn quyền dù worker chưa được khởi động; Comment cleanup pending phải có worker để hoàn thành. Worker được test trên DB riêng; chưa khởi động trên dev queue thật. Job đã xác nhận không bị hủy vì Unban; không phục hồi deletion đã xảy ra. Scope hiện tại của Workspace vẫn kiểm khi dọn để không chuyển deletion sang tổ chức khác.

## Xóa Comment trực tiếp

API cũ `POST /tasks/:taskId/comments/:id/delete` nhận expectedVersion và optional reason. Author xóa own Comment trong Active; Workspace Owner/Manager hoặc Org Owner/Admin kiểm duyệt có reason bắt buộc, kể cả Archived. Không sửa lời người khác; Lead chỉ có Author quyền với Comment của mình. Xóa physical + ModerationAction metadata trong transaction; no restore/body copy. Schema soft-delete fields legacy giữ để đọc dữ liệu cũ, chưa purge/backfill historical hidden rows hàng loạt.

DTO Comment có edit/delete/moderate flags. FE yêu cầu lý do khi moderate và confirm xóa hẳn; Archived không hiển thị Composer nhưng có delete CTA cho moderator.

## Context profile

GET /projects/:id/people/:userId/profile: reader Project; Guest chỉ target liên quan Task/Comment/Creator/Lead đang được xem, không enumerate roster. Name/avatar, role/status current scope và departedAt; không email/security/organization khác. blocked chỉ trả cho Workspace management, không reason. Thẻ FE dùng native popover hover/focus/click, Escape/outside/close; re-open và resize giữ trong viewport. Không sửa displayName bằng suffix đã rời.

## Deploy / giới hạn

22 models; AccessBan unique index và ModerationAction scope/job indices additive. Dev scope audit + index creation đạt, không chạy worker hoặc xóa data dev. C3 Ban-management full UI/design Stitch còn U1/U2; C4 activity/checklist/reopen, C5 trash/purge và C6 restore/backup/large dataset benchmark chưa nghiệm thu. Không coi soft-delete Task hay audit log là backup.
