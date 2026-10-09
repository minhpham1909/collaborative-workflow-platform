# S9 — Notifications QA

09/10/2026: **S9a và S9b đạt trong phạm vi S9**. [Contract](../ui-ux/NOTIFICATIONS-S09-CONTRACT.md).

- UI áp dụng Stitch local header/tabs/unread emphasis/tinted read rows/type icons/clear actions. Giữ shared FilterPanel/feedback/confirm/busy guard. Không mock portraits/counts/presence hoặc copy unsupported controls.
- FE16 unit/build147 PASS; thêm inbox filter/deep return whitelist test. BE notifications8 integration PASS: recipient privacy, revoked/deleted/rejoin, filtered search/date/paging, signed cutoff/category/new records; worker tests chỉ providers/DB fixture, không SMTP dev.
- `FE/scripts/check-stitch-notifications.mjs` real React/Express/temp Mongo PASS:24 initial own records,12 then24 paged, recipient khác không hiển thị; available/Unavailable work +3 invitation types; single read; filtered read-all13 đúng scope và không đọc note đến khi confirm đang mở; masked unrelated note giữ readAt; unknown write chỉ1 POST, khóa write/readback; detail return giữ filters; invalid dates/no stale rows, delayed search, error retry, leave/rejoin privacy,5width no overflow/pageerrors.
- Fixture dùng Workspace invitation row giả lập delivery trên invitation thật ở DB tạm, không chạy mail worker để tạo nó. Org/Guest notifications từ service thật. Không dùng fixture cleanup trên dev database.
- `check-c2-invite-flows.mjs` regression PASS: auth/register/verify/invitation intent, Guest scope/comments/revoke, Org gate/mismatch/switch, unknown accept/missing token;1440/390 no errors/overflow. Script điều chỉnh đóng S7 drawer trước mở sidebar Shared, không bỏ quyền/privacy assertions.
- Images `.local/stitch-notifications/inbox-{1440,1280,1024,768,375}.png`; installed skill probe `.local/stitch-notifications/probe-mine-{width}/report.json` (adapter filename giữ từ S8). Probe0 Hỏng, console sạch, smallTap0, no overflow/no placeholder clipping. Mobile orphan email preference tab đã tách thành paragraph riêng. Hero/control/long invitation copy được soi trên ảnh.
- Gu exceptions có ghi nhận: native date/select dùng component hiện tại; focus giữ theo yêu cầu accessibility; warm borders/header/overlay-shadow theo brand. Invitation rich rows nhiều dòng có reason/scope/expiry cần giữ, không phải sidebar list-pane nên không cắt thông tin để làm đẹp số đo. Không claim mọi heuristic clean.
- API4000 readiness ready; S9a chỉ FE, không restart DB hoặc chỉnh collections dev, không SMTP/purge/moderation/retention/backfill/queues. Scoped fixture mới cho từng probe width giữ default HTTP limiter, không nới policy.

## S9b

- `FE/scripts/check-stitch-invitations.mjs` PASS trên React/Express/Mongo tạm: full C2 regression + Workspace/Org/Project public views1440/1280/1024/768/375, long resource name, scrub token, preview retry, explicit Đổi tài khoản, verified/register intent, pending navigation guard, revoked-after-preview xóa stale title/CTA, expired Org, unknown accept/readback và refresh mất token. Guest comments/access/revoke và Org verified gate giữ đúng.
- FE16 unit/build148 PASS. Không đổi API/schema nên dùng real HTTP browser fixture đã kiểm BE scope/lifecycle; không chạy lại toàn bộ backend vì thay CSS. Không fake accept responses để nhận success; lost response fixture vẫn thực hiện transaction rồi trả503 như C2 để kiểm readback.
- Public images `.local/stitch-invitations/{workspace,organization,project}-{width}.png` và `expired.png`; authenticated skill probe `.local/stitch-invitations/probe-invite-{width}/report.json`:0 Hỏng/console sạch/smallTap0/no overflow. Public screenshots/flows kiểm riêng, anonymous auth refresh401 là transport gate bình thường, không coi là React pageerror. Role description/expiry/email/CTA được soi trực tiếp.
- Mobile steps từng rớt bước cuối đã chuyển3 cột, hero xung đột global header styles đã sửa thành section có bố cục scoped. Focus/native control/warm border/overlay-shadow Gu exceptions giữ theo brand/accessibility.
- Probe adapter mở rộng skip-action labels cho Đổi tài khoản/Tham gia/Chấp nhận: đây là mutation/account action, không phải overlay opener. Không chỉnh skill gốc hoặc bỏ số đo giao diện. Fresh fixture app/auth/default limiter mỗi width; không worker hoặc dữ liệu dev.

Tiếp S10a Tài khoản & Cài đặt. S9 đạt không đồng nghĩa toàn auth/localization/history hoặc sản phẩm production đã nghiệm thu.
