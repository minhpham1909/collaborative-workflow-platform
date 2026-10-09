# C3 gate core QA

05/10/2026. [Contract](../sds/MODERATION-C3-API-v0.1.md).

## Kết quả

- 55 BE unit pass, 10 dedicated Mongo suites skipped riêng lượt unit; 82 integration pass, 0 fail/skip. C3 targeted 9/9 sau bổ sung 5-failure/privileged retry assertions.
- 13 FE unit pass, build 115 modules.
- Browser `check-c3-moderation-flows.mjs`: real React/Express/Auth/Work/Moderation, isolated `workflow_fe_c3_test`, headless Edge. Profile hover/click/close/Escape/reopen, blocked privacy khác Owner/Guest, popup/root không overflow 1440/390, Archived moderator reason+confirm physical delete, banned account denial; no page errors/providers.
- Browser C2 regression pass. Interaction regression pass sau đổi locator xóa Comment theo row tác giả: Owner nay có thêm moderation delete CTA hợp lệ; Author edit restriction vẫn kiểm.
- Scope audit dev valid: 0 Organization/1 legacy standalone, no issues. New indexes additive; không seed/ban/xóa user data hoặc xử lý SMTP queue cũ. Native profile reopen/light-dismiss và resize bugs đã tái hiện/sửa trên browser; Archived Composer/delete gating được sửa đúng capability.

## Coverage BE

- Actor/self/Owner/Admin hierarchy, signed preview tamper/scope/expiry/parent CAS; fixed author/createdAt window count.
- Project Guest Ban read/accept/shared list blocked; batch only 2 recent comments, edited old Comment/other author/Project giữ. Failure atomic, 5 attempts failed, wrong-role/stale retry rejected, privileged retry + parallel lease/cursor chính xác; audit không body.
- Project Member Ban thắng Creator/Assignee/Lead; root Workspace/Project khác giữ; Lead/uncompleted assignee clear, Done giữ ID; lists/My Tasks/counts/assignment chặn scope.
- Workspace Manager Ban auto takeover, Org Admin role giữ, issued malicious link revoke; Organization Ban cascade cả Archived, giữ other Org and comment history. Unban không restore membership, sibling Ban vẫn hiệu lực.
- Kick dùng link gia nhập lại được; Ban chặn đến Unban; valid new accept mới cấp quyền.
- Author physical delete và moderator reason delete Archived, edit người khác denied, missing reason denied, metadata no content. Profile Guest không blocked reason/email/roster unrelated.
- HTTP Origin/auth/strict DTO; old Auth/Accounts/Profile/Workspace/Work/Notifications/Org/Guest integration regression đạt.

## Giới hạn

Gate chỉ core API/worker/profile và Comment moderation UI. Full Ban administration panel và all-time confirmation UX thuộc U1/U2; chưa live Google/SMTP, production deployment/worker restart, large-scale cleanup/latency, snapshot backup/restore hoặc C5 purge. Worker chưa chạy trên dev thật; pending confirmed cleanup cần worker config riêng. Không tự gửi mail hoặc tự xóa queue/data cũ.
