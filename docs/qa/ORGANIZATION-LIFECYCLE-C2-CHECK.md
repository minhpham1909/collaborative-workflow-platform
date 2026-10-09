# C2 increment 1 QA

05/10/2026 — Organization EMAIL invitations, acceptance, leave/remove. Contract: [API](../sds/ORGANIZATION-LIFECYCLE-API-v0.1.md).

## Bằng chứng

- BE unit: 49 pass, 8 dedicated Mongo suites skipped riêng lượt unit.
- Mongo integration toàn BE: 64 pass, 0 fail/skip; dedicated lifecycle suite 9/9 (suite cha + 8 nhóm assertion).
- FE: 12 unit pass, build 113 modules. Chỉ thêm Inbox Org invitation renderer/filter/accept; không redesign.
- Email được capture bằng test send function trên test database; không SMTP thật/không dev queue.

Kiểm: no premature membership/role injection; exact email verified; cross-org Workspace rejected; public preview minimal/token private; unique membership/concurrent accept; accepted invite replay không tạo membership trùng; revoked/expired/stale denied; current Admin role không bị downgrade khi chỉ thêm Workspace. Inbox invitation recipient scoped, masked sau accept.

Worker: Organization template nhận Org/Workspace, đúng encrypted delivery context; revoked/expired cancelled; failure lastErrorCode không chứa token/recipient; parallel dispatch một lease/send.

Exit: owner transfer gate/admin protection/Manager replacement; membership cascade + email override reset; unfinished assignee cleanup cả Archived; Done/creator/comment preserved; work outbox cancel; independent Workspace unaffected; rejoin không giao lại/không phục hồi Admin. Concurrent remove/Task edit consistent, post-exit edit denied. Accept/revoke race không vừa accepted vừa revoked. HTTP Origin/auth/DTO/ID recipient scope đạt.

Audit local dev + additive indexes: valid (0 organizations/1 legacy standalone); không backfill/không tạo data thử trong DB dev.

## Giới hạn

C2 còn Đang làm: Lead/Guest scopes và Guest invitations chưa triển khai; Guest cleanup chưa có; admission/org settings màn mới và public `/organization-invite` intent/page chưa nối. Chưa live providers hoặc full browser E2E. Member lists/invitations search/filter nâng cao riêng chưa đồng đều; invite list hiện limit/cursor. Manual resend sau sent/failed chưa có API (auto retry worker có); Ban/kick cleanup batch C3; không mở ra production như module hoàn chỉnh.
