# Backend JavaScript

Node 24.x, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0. Có 13 models, editor validation, health, JWT sessions và account flows. [Session](../docs/sds/AUTH-SESSION-v0.1.md), [Accounts](../docs/sds/AUTH-ACCOUNTS-v0.1.md), [QA](../docs/qa/AUTH-ACCOUNTS-CHECK.md).

## Local

Tại BE với Node 24.x/pnpm 11.19.0:

```powershell
pnpm install --frozen-lockfile
pnpm env:dev
pnpm test
pnpm test:integration
pnpm db:dev
```

env:dev tạo .env từ template nếu chưa có, bổ sung ba key random còn trống, giữ keys đã có, không in keys; chỉ development. db:dev chạy replica set rs0 tại 127.0.0.1:27017, giữ dữ liệu .local/mongodb-dev. Ctrl+C dừng; không chạy hai instances cùng cổng. Lần đầu tải MongoDB 8.0.17 vào .local/mongodb-binaries (Windows khoảng 755 MiB). DB localhost development, không authentication.

Giữ terminal DB; terminal khác tại BE:

```powershell
pnpm db:indexes
pnpm dev
```

Server 127.0.0.1:4000 kiểm keys/DB topology/unique indexes trước startup. db:indexes tạo index plans của 13 models, không xóa index cũ. Có thể cấu hình replica set khác. Integration runner dùng workflow_auth_test riêng, chạy/dừng Mongo tạm, xóa fixtures của mình.

## Auth/email

GET /auth/capabilities,/auth/me,/auth/csrf. POST login,refresh,logout,register,verify-email,verify-email/resend,password/recovery,password/reset,password/change,google/challenge,google/link/challenge,google,google/link dưới /auth. Fields/điều kiện theo Accounts contract. /health/live và /health/ready. Workspace/Invitations và Project/Task/Comment, Board/My Tasks routes đã mở.

BE/.env.example không secrets. WEB_ORIGIN chính xác; JWT_ACCESS_KEY_HEX,JWT_REFRESH_KEY_HEX,MAIL_OUTBOX_KEY_HEX riêng mỗi key 32 bytes lowercase hex. TERMS_VERSION draft chỉ dev; production cần nội dung/version thực. GOOGLE_CLIENT_ID trống làm Google unavailable; cần OAuth Web client/audience/origins để kiểm thực tế.

EMAIL_MODE=disabled mặc định: chỉ queue. capture để đọc link local: pnpm mail:once xử lý từng job, preview .local/mail chứa link nhạy cảm bị Git ignore. SMTP cần mode smtp và cấu hình TLS. Chưa worker nền, SMTP/Google live validation. Capture cấm production.

## Boundaries

src/auth chứa DTO/service/JWT/Google/scoped Mongo adapters; src/mail dispatcher/provider; src/models schemas/index plan; src/content editor contract. scripts: DB local/env/indexes/integration/mail-once.

Generic query/bulk writes chặn; adapters dùng transaction/driver mutations, kiểm lại credential/quyền. Schemas không thay DTO/authorization. lean/toObject không phải public response; routes dùng mapper. Argon2id; refresh strict single-use, FE cần phối hợp giữa tabs. Profile/Settings, Workspace/Invitations và nghiệp vụ Project/Task/Comment đã có API; inbox/work-email dispatcher đã có, frontend và production operations tiếp theo. Production provider/limiter/proxy/retention còn review. Storage Upcoming.

Kiểm Google/SMTP thật khi FE chưa có: [hướng dẫn cấu hình](../docs/project/GOOGLE-SMTP-LOCAL-SETUP.md), chạy pnpm auth:test-page tại BE rồi mở http://localhost:5173. Trang development hỗ trợ signup/login/recovery/verify/reset và GIS login; có Google link với proof mật khẩu, logout và kiểm /auth/me. Không mount trang test vào server sản phẩm.

BE Profile/global settings đã có: GET /users/me, PATCH /users/me/profile, PATCH /users/me/preferences; Bearer, exact Origin khi PATCH, expectedVersion và DTO strict. [Hợp đồng Users](../docs/sds/PROFILE-SETTINGS-API-v0.1.md), [QA mới](../docs/qa/PROFILE-SETTINGS-CHECK.md): 33 tests thông thường/14 tích hợp đạt. Workspace overrides đã nối với membership APIs ở increment Workspace. src/http/policy.js dùng chung Origin/CORS và response lỗi cho Auth/Users.

Workspace/Invitations đã triển khai theo [API contract](../docs/sds/WORKSPACE-INVITATIONS-API-v0.1.md), [QA](../docs/qa/WORKSPACE-INVITATIONS-CHECK.md): 35 tests thường và 24 tích hợp đạt. src/workspaces chứa DTO/service/repository/routes. mail:once xử lý Auth trước, invitation nếu Auth idle. Trang local hỗ trợ /invite token fragment để preview/accept; chưa FE sản phẩm. db:indexes phải có unique membership/invitation/notification indexes trước startup.


Project/Task/Comment, Board và My Tasks đã triển khai: [API](../docs/sds/PROJECT-TASK-COMMENT-API-v0.1.md), [QA](../docs/qa/PROJECT-TASK-COMMENT-CHECK.md). src/work dùng Workspace guard chung; 37 tests thường/33 tích hợp đạt. Work events lưu atomic; mail:once đã nối work jobs ở increment Notifications; mail:worker chạy process riêng.


Notifications và work email: [API](../docs/sds/NOTIFICATIONS-EMAIL-API-v0.1.md), [QA](../docs/qa/NOTIFICATIONS-EMAIL-CHECK.md), 40 tests thường/40 tích hợp. src/notifications own inbox, unavailable masking và signed cutoff; pnpm mail:worker process riêng chạy Auth/Invitation/Work round-robin. EMAIL_MODE smtp sẽ gửi các job đủ điều kiện; chưa chạy SMTP work mail thật trong increment này.
