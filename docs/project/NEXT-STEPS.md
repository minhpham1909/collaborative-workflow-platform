# Trạng thái và bước tiếp theo

Cập nhật 04/10/2026. Yêu cầu trực tiếp của chủ dự án có ưu tiên; tài liệu cung cấp là context. [Nhật ký cũ](../archive/project/PROJECT-HISTORY-2026-10-03.md) giữ lịch sử, không dùng ghi nhận skeleton để thay trạng thái hiện hành.

## Hiện tại

Increment mới nhất 04/10/2026: [Board/Task/Comments/My Tasks FE](../sds/FE-TASKS-v0.1.md) đã nối API thật, shared editor Tiptap, identity DTO và quyền/CAS. [QA](../qa/FE-TASKS-CHECK.md). Các ghi nhận chưa Board bên dưới là mốc Workspace trước increment này.

- Repo private minhpham1909/collaborative-workflow-platform, phát triển trên dev; main giữ mốc nền.
- BE Node 24.x, JS ESM/Express/Mongoose; Auth/JWT/Google, Profile/Settings, Workspace/Invitations, Project/Task/Comment, Board/My Tasks và Notifications/work-email đã có API. Mongo local replica set/indexes phục vụ dev; secrets/data/binaries ignored.
- FE React JS/JSX + Vite đã chạy. Login và Home dùng API thật: restore/logout, verified gate, list/create Workspace, server search tên/mô tả và ngày tạo, cursor/load more. Xem [FE README](../../FE/README.md), [thiết kế](../sds/FE-FOUNDATION-v0.1.md), [QA mới](../qa/FE-AUTH-HOME-CHECK.md).
- FE Home đã mở Workspace→Project: list Dự án search/ngày/trạng thái server, Member list chỉ đọc, Owner tạo/đổi tên/archive/reopen Project. [Thiết kế](../sds/FE-WORKSPACE-PROJECT-v0.1.md), [QA](../qa/FE-WORKSPACE-PROJECT-CHECK.md). Project hiện tổng quan, chưa Board; không coi prototype Task/comment là implementation React. Google control FE mới chưa kiểm live; Google login BE thật đã từng có /auth/me 200 do chủ dự án kiểm. SMTP từng accepted email thử, Inbox/Spam chưa xác nhận; không chạy worker SMTP trong increment FE này.
- Visual hiện hành kem/tím theo [Stitch review](../ui-ux/FIGMA-STITCH-REVIEW-v0.1.md), [prototype](../ui-ux/stitch-review/README.md). Figma đã có foundations/components/navigation/Home trên trang mới; Starter quota chặn ba màn còn lại. Tiếp tục từ ledger khi có lượt gọi, không tạo duplicate; chưa visual QA toàn canvas.

## Thứ tự triển khai tiếp

1. Workspace/Project/Board/Task/Comment/My Tasks đã nối, kiểm quyền/CAS. Tiếp tục routing/panel và phục hồi filters khi back, draft transitions trước release.
2. Identity DTO G02 đã có creator/assignee/author kể cả lịch sử trong scope; G03 member picker hiện load more, cần server search. Editor chung Task/Comment đã chọn Tiptap 3.31.4; mở rộng Workspace/Project sau.
3. Hoàn thiện signup/verify-link/recovery, Account/link/Settings/Invitations và Notifications. G01 credential capabilities cần trước phân nhánh Account UI; không tự link Google trùng email. Terms/Privacy nội dung thật trước mở đăng ký/public release.
4. Bổ sung English UI, shared error/validation mapping và server filters các danh sách còn thiếu theo [gap log](../ui-ux/UI-API-GAPS-v0.1.md). Workspace/Project filters đã có; Member/Invitation/Notification trong G04 vẫn mở.
5. Google GIS mới và SMTP/outbox tới Inbox/Spam kiểm live riêng; production secrets/rotation, HTTPS/cookie topology, shared limiter/proxy, retention/purge/backup và NFR. Local replica set không thay production.

Storage/resources vẫn Upcoming; announcements là phase riêng. Không tự mở upload/payment/roles mới vì layout. Idempotency keys cho create chưa có: chặn double submit/no auto retry ở FE.

## Tài liệu và contracts

[Docs index](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md), [DB](../sds/DATABASE-DESIGN-v0.2.md), [BE setup](../../BE/README.md), [Git workflow](../decisions/GIT-WORKFLOW.md), [file hygiene](REPOSITORY-HYGIENE.md).

[Auth/accounts](../sds/AUTH-ACCOUNTS-v0.1.md), [session](../sds/AUTH-SESSION-v0.1.md), [Profile](../sds/PROFILE-SETTINGS-API-v0.1.md), [Workspace/Invitations](../sds/WORKSPACE-INVITATIONS-API-v0.1.md), [Project/Task/Comment](../sds/PROJECT-TASK-COMMENT-API-v0.1.md), [Notifications/email](../sds/NOTIFICATIONS-EMAIL-API-v0.1.md). QA lịch sử giữ scope và số liệu tại từng increment, không tổng hợp thành nghiệm thu toàn sản phẩm.

[Screen spec](../ui-ux/SCREEN-SPEC-v0.2.md), [flows](../ui-ux/SCREEN-FLOWS-v0.2.md), [account/link review](../ui-ux/ACCOUNT-REGISTRATION-LINK-REVIEW.md), [Google/SMTP local setup](GOOGLE-SMTP-LOCAL-SETUP.md).
