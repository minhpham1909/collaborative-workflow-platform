# Trạng thái và bước tiếp theo

Cập nhật 04/10/2026. Yêu cầu trực tiếp của chủ dự án có ưu tiên; tài liệu cung cấp là context. [Nhật ký cũ](../archive/project/PROJECT-HISTORY-2026-10-03.md) giữ lịch sử, không dùng ghi nhận skeleton để thay trạng thái hiện hành.

## Hiện tại

Increment mới: [Stitch Kanban/Task](../ui-ux/stitch-board-task-2026-10-04/README.md), screen IDs 80a665c29de642a8899aa7af740c881f và bcb8d6af3741455ebd88c7d75de0a0de. Đã import HTML/full screenshots, review và nâng Project header/scope, Kanban columns/cards/progress, Task metadata/comments. Giữ top nav/Jakarta/API/quyền/CAS/uncertain writes; Task detail vẫn full page, drawer routing và drag/drop còn riêng. Build, 12 FE tests, Board/Task flow và network regression đạt; không overflow 1440/1280/390.

Increment mới: [Home highlights/footer/icon Project/compact filters](../ui-ux/HOME-HIGHLIGHTS-FILTERS-v0.1.md). Home có ngày VN, số Task đến hạn hôm nay/Workspace liên quan, khối ưu tiên và thông báo chưa đọc; card Workspace có active members/projects từ BE aggregates. Owner chọn/lưu icon Project qua enum/CAS. Bộ lọc của các danh sách gọn hơn, mở chi tiết khi cần; footer chung đã có. Build, 12 FE tests và các fixture flows/network regression đạt; 45 BE integration tests đạt, gồm regression aggregates/icon mới. Chưa chạy SMTP worker thật.

Nguồn visual mới do chủ dự án chọn 04/10/2026: [hai màn Stitch Home/Workspace](../ui-ux/stitch-import-2026-10-04/README.md), project `41254457511662208`. [Đã triển khai React và kiểm thử](../ui-ux/STITCH-IMPLEMENTATION-v0.1.md): top navigation/account menu, Home hero/cover cards/shortcuts, Workspace header/pill tabs/Project covers và filters đồng bộ. Giữ API/quyền/CAS/uncertain-write guards; không đưa statistics/mock controls hoặc Workspace Archived trái scope vào sản phẩm. Board/Task/Auth chưa có thiết kế riêng mới. Luồng hệ thống tiếp tục ưu tiên như dưới đây.

Ưu tiên mới của chủ dự án 04/10/2026: rà soát luồng hệ thống trước UI. [Audit lượt 1](../qa/SYSTEM-FLOWS-CHECK.md): 44 BE integration tests đạt; đã tái hiện/sửa gửi lại create sau mất phản hồi cho Workspace/Project/Task/Comment và vùng bấm Tạo Workspace. Có regression fault-injection lưu trong FE/scripts. Tiếp theo ưu tiên draft/navigation transitions, BE idempotency và các nhánh auth/email còn thiếu; chưa gửi hàng đợi mail cũ.

Increment mới nhất: [UI polish và email diagnosis](../ui-ux/UI-POLISH-v0.1.md): sidebar SVG, FilterPanel chung, My Tasks dạng dòng, email toggles/password form và illustration Home. Figma live bị quota chặn; dùng Stitch đã lưu. Đã xác định 5 email xác minh pending vì không có worker chạy; thêm `mail:status` và `dev:full`, sửa BE README. Theo lựa chọn người dùng chỉ sửa setup, chưa gửi hàng đợi cũ. Review giao diện trực tiếp và xử lý phạm vi queue trước kiểm SMTP live tiếp theo.

Increment trước: [Đăng ký/Xác minh/Khôi phục FE](../sds/FE-REGISTRATION-RECOVERY-v0.1.md) đã nối signup email local với draft policies/consent, verify/reset link scrub/explicit action, generic recovery và reset session clear. [QA](../qa/FE-REGISTRATION-RECOVERY-CHECK.md). Kiểm trực tiếp Google/SMTP để sau theo yêu cầu; chỉ chạy kiểm tự động fixtures.

Increment trước: [Cài đặt Workspace/Email riêng FE](../sds/FE-WORKSPACE-SETTINGS-v0.1.md) đã nối Owner name/rich description, own overrides/reset/effective state và guards/CAS. [QA](../qa/FE-WORKSPACE-SETTINGS-CHECK.md). Signup/verify/recovery, English và routing polish tiếp theo.

Increment trước: [Thành viên/Lời mời Workspace FE](../sds/FE-TEAM-INVITATIONS-v0.1.md) đã nối Owner invite/revoke/retry/remove/transfer, Member leave, LINK login-intent/accept và server search/time. [QA](../qa/FE-TEAM-INVITATIONS-CHECK.md). Cài đặt nhóm và Workspace email overrides tiếp theo.

Account/Personal Settings FE đã nối hồ sơ, email preferences chung, locale email, đổi mật khẩu và liên kết Google. [Thiết kế](../sds/FE-ACCOUNT-SETTINGS-v0.1.md), [QA](../qa/FE-ACCOUNT-SETTINGS-CHECK.md). Google link kiểm bằng fixture; quản lý Members/Invitations tiếp theo.

Increment trước: [Notifications FE](../sds/FE-NOTIFICATIONS-v0.1.md) đã nối inbox/detail/badge, search/time/read/read-all và EMAIL invitation accept; [QA](../qa/FE-NOTIFICATIONS-CHECK.md). Quản lý Members/Invitations tiếp theo. Notification search correctness đã kiểm, performance scan tập lớn còn NFR.

Increment trước 04/10/2026: [Board/Task/Comments/My Tasks FE](../sds/FE-TASKS-v0.1.md) đã nối API thật, shared editor Tiptap, identity DTO và quyền/CAS. [QA](../qa/FE-TASKS-CHECK.md). Các ghi nhận chưa Board bên dưới là mốc Workspace trước increment này.

- Repo private minhpham1909/collaborative-workflow-platform, phát triển trên dev; main giữ mốc nền.
- BE Node 24.x, JS ESM/Express/Mongoose; Auth/JWT/Google, Profile/Settings, Workspace/Invitations, Project/Task/Comment, Board/My Tasks và Notifications/work-email đã có API. Mongo local replica set/indexes phục vụ dev; secrets/data/binaries ignored.
- FE React JS/JSX + Vite đã chạy. Login và Home dùng API thật: restore/logout, verified gate, list/create Workspace, server search tên/mô tả và ngày tạo, cursor/load more. Xem [FE README](../../FE/README.md), [thiết kế](../sds/FE-FOUNDATION-v0.1.md), [QA mới](../qa/FE-AUTH-HOME-CHECK.md).
- FE Home đã mở Workspace→Project: list Dự án search/ngày/trạng thái server, Member list chỉ đọc, Owner tạo/đổi tên/archive/reopen Project. [Thiết kế](../sds/FE-WORKSPACE-PROJECT-v0.1.md), [QA](../qa/FE-WORKSPACE-PROJECT-CHECK.md). Project hiện tổng quan, chưa Board; không coi prototype Task/comment là implementation React. Google control FE mới chưa kiểm live; Google login BE thật đã từng có /auth/me 200 do chủ dự án kiểm. SMTP từng accepted email thử, Inbox/Spam chưa xác nhận; không chạy worker SMTP trong increment FE này.
- Visual hiện hành kem/tím theo [Stitch review](../ui-ux/FIGMA-STITCH-REVIEW-v0.1.md), [prototype](../ui-ux/stitch-review/README.md). Figma đã có foundations/components/navigation/Home trên trang mới; Starter quota chặn ba màn còn lại. Tiếp tục từ ledger khi có lượt gọi, không tạo duplicate; chưa visual QA toàn canvas.

## Thứ tự triển khai tiếp

1. Workspace/Project/Board/Task/Comment/My Tasks đã nối, kiểm quyền/CAS. Tiếp tục routing/panel và phục hồi filters khi back, draft transitions trước release.
2. Identity DTO G02 đã có creator/assignee/author kể cả lịch sử trong scope; G03 server search Members đã có; picker Task vẫn cần nối search. Editor chung Task/Comment đã chọn Tiptap 3.31.4; Workspace đã dùng editor chung; Project description tiếp theo.
3. Account/Settings và Notifications đã nối. Members/Invitations đã nối. Cài đặt nhóm/Workspace email overrides đã nối. Signup email/verify-link/recovery đã nối cho local. Tiếp tục policy thật/Google signup, English và routing polish. G01 capabilities đã có; không tự link Google trùng email. Terms/Privacy nội dung thật trước mở đăng ký/public release.
4. Bổ sung English UI, shared error/validation mapping và server filters các danh sách còn thiếu theo [gap log](../ui-ux/UI-API-GAPS-v0.1.md). Workspace/Project filters đã có; Member/Invitation/Notification đã có query; time theo expiresAt Invitation còn đề xuất riêng.
5. Google GIS mới và SMTP/outbox tới Inbox/Spam kiểm live riêng; production secrets/rotation, HTTPS/cookie topology, shared limiter/proxy, retention/purge/backup và NFR. Local replica set không thay production.

Storage/resources vẫn Upcoming; announcements là phase riêng. Không tự mở upload/payment/roles mới vì layout. Idempotency keys cho create chưa có: chặn double submit/no auto retry ở FE.

## Tài liệu và contracts

[Docs index](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md), [DB](../sds/DATABASE-DESIGN-v0.2.md), [BE setup](../../BE/README.md), [Git workflow](../decisions/GIT-WORKFLOW.md), [file hygiene](REPOSITORY-HYGIENE.md).

[Auth/accounts](../sds/AUTH-ACCOUNTS-v0.1.md), [session](../sds/AUTH-SESSION-v0.1.md), [Profile](../sds/PROFILE-SETTINGS-API-v0.1.md), [Workspace/Invitations](../sds/WORKSPACE-INVITATIONS-API-v0.1.md), [Project/Task/Comment](../sds/PROJECT-TASK-COMMENT-API-v0.1.md), [Notifications/email](../sds/NOTIFICATIONS-EMAIL-API-v0.1.md). QA lịch sử giữ scope và số liệu tại từng increment, không tổng hợp thành nghiệm thu toàn sản phẩm.

[Screen spec](../ui-ux/SCREEN-SPEC-v0.2.md), [flows](../ui-ux/SCREEN-FLOWS-v0.2.md), [account/link review](../ui-ux/ACCOUNT-REGISTRATION-LINK-REVIEW.md), [Google/SMTP local setup](GOOGLE-SMTP-LOCAL-SETUP.md).
