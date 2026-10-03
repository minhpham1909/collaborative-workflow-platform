# Trạng thái và bước tiếp theo

Cập nhật 03/10/2026. [Nhật ký cũ](../archive/project/PROJECT-HISTORY-2026-10-03.md) là lịch sử, yêu cầu trực tiếp mới của chủ dự án có ưu tiên.

## Hiện tại

- Repo GitHub private minhpham1909/collaborative-workflow-platform; main giữ mốc nền, phát triển trên dev.
- BE: Node 24.x, JavaScript ESM, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0, lockfile; 13 models, editor validation, health.
- JWT access/refresh, Argon2id login, rotation/reuse revocation, logout/me và verified middleware. Đã có signup/Terms, verify/resend, reset/change password, Google login/link và encrypted email outbox. [Accounts contract](../sds/AUTH-ACCOUNTS-v0.1.md), [session contract](../sds/AUTH-SESSION-v0.1.md).
- 37 unit/schema/HTTP tests đạt; 33 integration tests đạt, 0 skipped trên MongoDB 8.0.17 replica set local. Automated tests dùng Google verifier stub/outbox sender giả lập; kiểm thử Google thật do chủ dự án thực hiện đã trả GOOGLE_LOGIN_SESSION_OK, /auth/me 200, emailVerified:true và avatar Google. SMTP transport live đã xác thực và accepted một email thử; Inbox/Spam chưa xác nhận. [QA](../qa/AUTH-ACCOUNTS-CHECK.md).
- MongoDB dev local đã chạy smoke, tạo index 13 collections; env:dev/db:dev/test:integration hỗ trợ setup. .env/binaries/data/mail previews ignored; không đẩy credentials/data lên Git.
- FE còn skeleton React JS/JSX; chưa màn hình Auth. Storage/resources Upcoming, announcements phase riêng. NFR/retention/product limits còn review.

## Tiếp theo

1. Theo yêu cầu chủ dự án: bám requirement, triển khai BE theo module và kiểm API/quyền/transactions trước; Profile/Personal Settings và Workspace/Invitations đã triển khai; Project/Task/Comment, Board/My Tasks đã triển khai; tiếp theo Notifications/work-email dispatcher.
2. Google login thật đã đạt cho tài khoản kiểm thử. Tiếp tục kiểm email auth outbox tới Inbox/Spam, hoàn thiện Terms và worker nền; [hướng dẫn local](GOOGLE-SMTP-LOCAL-SETUP.md).
3. Giữ screen inventory, navigation và design system chung; sau BE/contracts rõ, thiết kế FE theo module (khuyến nghị) hoặc gom toàn bộ màn. Mỗi module cần trạng thái loading/empty/error/mất quyền/conflict, Việt/English và editor chung; rồi triển khai FE.
4. Review production provider/secrets/rotation, shared limiter/proxy/cookie topology, retention/purge/backup và NFR. Local DB không thay production.

## Tài liệu

[Docs index](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md), [DB](../sds/DATABASE-DESIGN-v0.2.md), [BE setup](../../BE/README.md), [Git workflow](../decisions/GIT-WORKFLOW.md), [file hygiene](REPOSITORY-HYGIENE.md).

Đã triển khai [Profile/Settings API](../sds/PROFILE-SETTINGS-API-v0.1.md). Google login end-to-end đã đạt theo response thực tế chủ dự án cung cấp ngày 03/10/2026; Profile/Personal Settings BE đã có và kiểm HTTP/Mongo; Workspace/Invitations đã triển khai và kiểm tích hợp; Project/Task/Comment đã triển khai, chuyển ưu tiên sang Notifications. Response cuối không chứng minh độc lập thao tác link đã diễn ra; không suy thành mọi biến thể Google đã nghiệm thu.

API Users: GET /users/me, PATCH /users/me/profile, PATCH /users/me/preferences; global settings và Workspace overrides đã có, mỗi loại inherit/on/off và reset/leave/rejoin về kế thừa. [QA Profile/Settings](../qa/PROFILE-SETTINGS-CHECK.md).

Increment Workspace/Invitations đã có: ownership/membership lifecycle, LINK/EMAIL invites, preview/accept, encrypted outbox/dispatcher và invitation in-app khi gửi. [API](../sds/WORKSPACE-INVITATIONS-API-v0.1.md), [QA](../qa/WORKSPACE-INVITATIONS-CHECK.md). Task cleanup đã có; Project/Task API cần cùng Workspace guard để giữ invariant. FE và inbox notification API còn tiếp theo.


Increment [Project/Task/Comment API](../sds/PROJECT-TASK-COMMENT-API-v0.1.md) và [QA](../qa/PROJECT-TASK-COMMENT-CHECK.md): quyền, CAS, archive/reopen, soft delete, Board/My Tasks search/thời gian/pagination, durable work events đã có. Chưa inbox/work-email dispatcher hoặc FE; không xem durable queue là đã gửi email công việc.
