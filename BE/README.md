# Backend JavaScript

Node 24.x, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0. Có 27 models, gồm scoped Ban/moderation jobs, ProjectLabel và TaskActivity. [Session](../docs/sds/AUTH-SESSION-v0.1.md), [Accounts](../docs/sds/AUTH-ACCOUNTS-v0.1.md), [Organization](../docs/sds/ORGANIZATIONS-API-v0.1.md), [Org lifecycle](../docs/sds/ORGANIZATION-LIFECYCLE-API-v0.1.md), [Lead/Guest](../docs/sds/PROJECT-LEAD-GUEST-API-v0.1.md), [Moderation](../docs/sds/MODERATION-C3-API-v0.1.md), [QA](../docs/qa/AUTH-ACCOUNTS-CHECK.md).

## Local

Tại BE với Node 24.x/pnpm 11.19.0:

```powershell
pnpm install --frozen-lockfile
pnpm env:dev
pnpm test
pnpm test:integration
pnpm db:dev
```

env:dev tạo .env từ template nếu chưa có, bổ sung ba key random còn trống, giữ keys đã có, không in keys; chỉ development. db:dev chạy replica set rs0 theo WORKFLOW_MONGODB_PORT (mặc định27017; dev hiện tại27018 do Mongo standalone chiếm27017), giữ dữ liệu .local/mongodb-dev. Ctrl+C dừng; không chạy hai instances cùng cổng. Lần đầu tải MongoDB 8.0.17 vào .local/mongodb-binaries (Windows khoảng 755 MiB). DB localhost development, không authentication.

Giữ terminal DB; terminal khác tại BE:

```powershell
pnpm db:indexes
pnpm dev
```

Server 127.0.0.1:4000 kiểm keys/DB topology/unique indexes trước startup. db:indexes tạo index plans của 27 models, không xóa index cũ. Có thể cấu hình replica set khác. Integration runner dùng workflow_auth_test riêng, chạy/dừng Mongo tạm, xóa fixtures của mình.

## Auth/email

GET /auth/capabilities,/auth/me,/auth/csrf. POST login,refresh,logout,register,verify-email,verify-email/resend,password/recovery,password/reset,password/change,google/challenge,google/link/challenge,google,google/link dưới /auth. Fields/điều kiện theo Accounts contract. /health/live và /health/ready. Workspace/Invitations và Project/Task/Comment, Board/My Tasks routes đã mở.

BE/.env.example không secrets. WEB_ORIGIN chính xác; JWT_ACCESS_KEY_HEX,JWT_REFRESH_KEY_HEX,MAIL_OUTBOX_KEY_HEX riêng mỗi key 32 bytes lowercase hex. TERMS_VERSION draft chỉ dev; production cần nội dung/version thực. GOOGLE_CLIENT_ID trống làm Google unavailable; cần OAuth Web client/audience/origins để kiểm thực tế.

EMAIL_MODE=disabled mặc định: chỉ queue. capture để đọc link local: pnpm mail:once xử lý từng job, preview .local/mail chứa link nhạy cảm bị Git ignore. SMTP cần mode smtp và cấu hình TLS. Worker chạy process riêng: `pnpm dev` chỉ khởi động API và không gửi email. Capture cấm production.

## Boundaries

src/auth chứa DTO/service/JWT/Google/scoped Mongo adapters; src/mail dispatcher/provider; src/models schemas/index plan; src/content editor contract. scripts: DB local/env/indexes/integration/mail-once.

Generic query/bulk writes chặn; adapters dùng transaction/driver mutations, kiểm lại credential/quyền. Schemas không thay DTO/authorization. lean/toObject không phải public response; routes dùng mapper. Argon2id; refresh strict single-use, FE cần phối hợp giữa tabs. Profile/Settings, Workspace/Invitations và nghiệp vụ Project/Task/Comment đã có API; inbox/work-email dispatcher đã có, frontend và production operations tiếp theo. Production provider/limiter/proxy/retention còn review. Storage Upcoming.

Kiểm Google/SMTP thật khi FE chưa có: [hướng dẫn cấu hình](../docs/project/GOOGLE-SMTP-LOCAL-SETUP.md), chạy pnpm auth:test-page tại BE rồi mở http://localhost:5173. Trang development hỗ trợ signup/login/recovery/verify/reset và GIS login; có Google link với proof mật khẩu, logout và kiểm /auth/me. Không mount trang test vào server sản phẩm.

BE Profile/global settings đã có: GET /users/me, PATCH /users/me/profile, PATCH /users/me/preferences; Bearer, exact Origin khi PATCH, expectedVersion và DTO strict. [Hợp đồng Users](../docs/sds/PROFILE-SETTINGS-API-v0.1.md), [QA mới](../docs/qa/PROFILE-SETTINGS-CHECK.md): 33 tests thông thường/14 tích hợp đạt. Workspace overrides đã nối với membership APIs ở increment Workspace. src/http/policy.js dùng chung Origin/CORS và response lỗi cho Auth/Users.

Workspace/Invitations đã triển khai theo [API contract](../docs/sds/WORKSPACE-INVITATIONS-API-v0.1.md), [QA](../docs/qa/WORKSPACE-INVITATIONS-CHECK.md): 35 tests thường và 24 tích hợp đạt. src/workspaces chứa DTO/service/repository/routes. mail:once xử lý Auth trước, invitation nếu Auth idle. Trang local hỗ trợ /invite token fragment để preview/accept; chưa FE sản phẩm. db:indexes phải có unique membership/invitation/notification indexes trước startup.


Project/Task/Comment, Board và My Tasks đã triển khai: [API](../docs/sds/PROJECT-TASK-COMMENT-API-v0.1.md), [QA](../docs/qa/PROJECT-TASK-COMMENT-CHECK.md). src/work dùng Workspace guard chung; 37 tests thường/33 tích hợp đạt. Work events lưu atomic; mail:once đã nối work jobs ở increment Notifications; mail:worker chạy process riêng.


Notifications và work email: [API](../docs/sds/NOTIFICATIONS-EMAIL-API-v0.1.md), [QA](../docs/qa/NOTIFICATIONS-EMAIL-CHECK.md), 40 tests thường/40 tích hợp. src/notifications own inbox, unavailable masking và signed cutoff; pnpm mail:worker process riêng chạy Auth/Invitation/Work round-robin. EMAIL_MODE smtp sẽ gửi các job đủ điều kiện; chưa chạy SMTP work mail thật trong increment này.

## Chạy API và gửi email local

- `pnpm dev`: API có watch, không tự chạy worker.
- `pnpm mail:status`: kiểm số lượng/trạng thái hàng đợi, không gửi và không in địa chỉ/token.
- `pnpm mail:worker`: terminal riêng; xử lý Auth/Invitation/Work trong hàng đợi.
- `pnpm dev:full`: một terminal chạy API + worker, không watch; nếu một process dừng, process còn lại cũng dừng. DB và FE vẫn chạy riêng. Dừng API đang dùng cổng 4000 trước khi chạy.

**Bật worker là cho phép xử lý cả job cũ đủ điều kiện.** Với EMAIL_MODE=smtp, thư sẽ được gửi thật; capture lưu preview local; disabled chỉ queue. Trạng thái đăng ký 202/queued xác nhận tiếp nhận yêu cầu, chưa xác nhận SMTP đã gửi hay hộp thư đã nhận. Không đổi thành gửi SMTP đồng bộ trong request đăng ký.

Chẩn đoán ngày 2026-10-04: 5 job verify_email pending, chưa có lỗi gửi, không có worker local chạy. Theo lựa chọn người dùng, chỉ sửa setup; không chạy worker hoặc gửi hàng đợi cũ trong lần sửa này.
# Core expansion — Organization

C1 đã có `/organizations` create/list/get/update, attached Workspace, member list, Owner-only Admin role/ownership transfer, Manager replacement/internal assignment, audit và membership notification. [Contract và giới hạn](../docs/sds/ORGANIZATIONS-API-v0.1.md). Workspace độc lập giữ nguyên; legacy thiếu organizationId vẫn đọc được. `db:audit-scope` read-only chỉ local development; `db:indexes` additive trên database được chọn. C1 đã audit/index dev; chưa tự chuyển Workspace cũ hoặc chạy mail worker. Org invitations/exit/Guest/Lead thuộc C2/C3; UI Organization chưa nối.

C2 increment 1 có Org EMAIL invitation/optional Workspace, preview/accept-by-token/ID/revoke và leave/remove cascade. [Contract](../docs/sds/ORGANIZATION-LIFECYCLE-API-v0.1.md), [QA](../docs/qa/ORGANIZATION-LIFECYCLE-C2-CHECK.md). Inbox hỗ trợ chấp nhận người dùng đã có account; public `/organization-invite` FE entry/intent chưa nối nên chưa nghiệm thu email-link cho người dùng mới. Không chạy mail worker hoặc queue cũ chỉ để test; Lead/Guest/Ban còn mốc sau.

Hiện hành: C2 core đã có Lead/Guest và public `/organization-invite` / `/project-invite` FE entry, memory-only intent, Shared Projects/Guest views. [QA core](../docs/qa/C2-ENTRY-GUEST-UI-CHECK.md). Không live SMTP/Google; full administration/redesign và production SPA fallback phải xử lý trước release; C3 Ban/hard Comment moderation tiếp theo.

C3 core: [API/worker/profile](../docs/sds/MODERATION-C3-API-v0.1.md), [QA](../docs/qa/C3-MODERATION-CHECK.md). Ban chặn ngay; `pnpm moderation:once` chạy một batch, `pnpm moderation:worker` poll **confirmed** cleanup jobs và xóa hẳn Comment. Không tự chạy worker trên queue/dev data để thử; worker không gửi email. Pending cleanup cần worker riêng, API-only start không tự dọn. All-time là irreversible; UI panel đầy đủ còn U1/U2.

## C4-A Task enrichment

[Contract](../docs/sds/TASK-ENRICHMENT-C4-API-v0.1.md), [QA](../docs/qa/C4-TASK-ENRICHMENT-CHECK.md). Priority, Project labels, checklist CAS, completedAt/activity, mã Task unique và nhóm deadline/counts MyTasks ở BE. C4-B đã nối ở contract bên dưới; UI request/review đầy đủ chưa dựng. `pnpm db:task-codes` chỉ audit; `pnpm db:task-codes --apply` cấp mã Task cũ theo batch sau backup/audit, không đổi thời gian nghiệp vụ hoặc gửi mail. Chưa chạy apply trên dev thật.

## C4-B reopen/statistics

[Contract](../docs/sds/TASK-REOPEN-C4-API-v0.1.md), [QA](../docs/qa/C4-REOPEN-STATS-CHECK.md). Model TaskReopenRequest (25 models total); unique pending index + limits/request history. Direct Done→open quản lý có reason, Creator/Assignee gửi request; review có request/Task CAS và independent reviewer. Project statistics whole_project/current nondeleted, Guest scoped. Không tự khởi chạy SMTP hoặc backfill.

## C5-A Archive/Trash

[Contract](../docs/sds/ARCHIVE-TRASH-C5-API-v0.1.md), [QA](../docs/qa/C5-ARCHIVE-TRASH-CHECK.md). Workspace lifecycle archive confirmation; Task trash/restore/30d retention. `pnpm db:audit-retention` chỉ đọc counts. `pnpm retention:once` và `pnpm retention:worker` là destructive background cleanup, process riêng; chưa khởi chạy dev và không có manual purge API. Không tự backfill legacy deleted Tasks thiếu purgeAt; Workspace/Project chỉ Archive.

Dev DB launcher giữ thư mục `.local/mongodb-dev`, dùng mongod đã cache và cập nhật host của single-member rs0 nếu đổi cổng. `.env` hiện dùng WORKFLOW_MONGODB_PORT=27018/MONGODB_URI cổng27018; `db:dev` đọc .env. Không dừng Mongo standalone27017, không xóa data/khởi worker.

## C6-A core e2e

[QA](../docs/qa/CORE-C6-HTTP-E2E-CHECK.md). `pnpm test:integration` gồm core-e2e-mongo.test.js: HTTP thật với hai Org + standalone + Guest, scoped work/lifecycle/retention và legacy code rehearsal trong workflow_auth_test tạm. Không live SMTP/Google/dev-data mutation. Đây chưa là production/NFR/backup acceptance.

## C6-B operations rehearsal

`pnpm check:operations` tự dựng source/restore replica fixture, mã hóa snapshot và kiểm BSON/index/API/rollback; đo100/1000/3000 Task và batch retention, không đọc .env hoặc nhận URI/đụng dev. [QA](../docs/qa/CORE-C6-OPERATIONS-CHECK.md), [runbook](../docs/operations/CORE-OPERATIONS-RUNBOOK.md). Artifact/keys fixture không là production backup service; key chỉ memory. Task chronological index additive và MyTasks count-only facet đã có regression.
