# Backend JavaScript

Backend ngày 03/10/2026: Node 24.x, Express 5.2.1, Mongoose 9.10.4; pnpm 11.19.0. Có 12 models, health và lát cắt Auth đăng nhập mật khẩu/JWT/refresh/logout/me. Google/signup/verification/reset/change-password và APIs công việc chưa triển khai. Hợp đồng tại [Auth/session](../docs/sds/AUTH-SESSION-v0.1.md).

## Chạy local

Từ thư mục `BE`, với Node 24.x và pnpm 11.19.0:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm test
pnpm dev
```

Chỉ copy template khi chưa có `.env`. Cấu hình MONGODB_URI replica set, WEB_ORIGIN và hai JWT key khác nhau (32 bytes ngẫu nhiên, lowercase hex); template để trống key để startup fail closed. Server khởi động khi config/DB hợp lệ. Mặc định bind 127.0.0.1:4000. Tests unit/schema/HTTP không cần MongoDB; live integration chỉ bật khi TEST_MONGODB_URI trỏ database riêng workflow_auth_test.

| Endpoint | Kết quả |
|---|---|
| GET `/health/live` | 200 khi HTTP server đang chạy |
| GET `/health/ready` | 200 khi connection sẵn sàng, 503 khi mất kết nối/đang dừng |
| POST /auth/login, /auth/refresh, /auth/logout | Lát cắt session theo Auth/session contract |
| GET /auth/csrf, /auth/me | CSRF cho refresh cookie và hồ sơ User hiện tại |
| Signup/Google/email/reset/workspace/task routes | Chưa mở, trả 404 |

`pnpm db:indexes` tạo các index đã khai báo trong DB được cấu hình, không xóa index cũ. Đây là thao tác riêng, không tự chạy khi start; chưa thực hiện trong phiên này. Unique index chỉ có hiệu lực sau khi tạo thật, schema tests không chứng minh uniqueness trong MongoDB.

## Cấu trúc

```text
src/
  app.js                # Express app; không kết nối DB khi import
  server.js             # Startup/shutdown
  config.js             # Cấu hình fail closed
  database.js           # Kết nối và kiểm tra topology
  content/rich-text.js  # Hợp đồng editor và text/counters server
  auth/                # Password/JWT/service, scoped Mongo adapter, middleware/router
  models/              # Shared schemas, accounts, workspace, task, events
scripts/create-indexes.js
test/                   # Node built-in runner, không cần DB
```

## Ranh giới implementation

- JWT access + refresh đã có signing/verification/rotation, cookie/CSRF và session revocation; jose 6.2.12, Argon2id qua @node-rs/argon2 2.2.1. Chưa Google/signup/reset endpoints hoặc kiểm chứng live DB/FE.
- Các schema kiểm tra cấu trúc và một số invariant nội bộ document. Không thay validation DTO, authentication, authorization hoặc transaction bảo vệ quan hệ giữa collection.
- `.save()` dùng version/optimistic concurrency; generic query/bulk writes vẫn chặn. Auth Mongo adapter dùng scoped driver writes và User guard trong transaction cho session issuance/rotation/revocation. Cleanup membership/outbox cần repositories riêng; không mở generic bypass.
- Không dùng `req.body` tạo model/update trực tiếp. Fields server-owned vẫn cần DTO allowlist theo từng hành động. Mongoose có casting, không phải bộ kiểm tra kiểu đầu vào HTTP nghiêm ngặt.
- JSON transform và default projections che credential/payload nội bộ; `lean()`/aggregation/`toObject()` không phải response công khai. Mỗi route phải có mapper kiểm quyền, nhất là notifications và invitation preview.
- Storage, resources và announcement extension chưa có models/routes. Không có MongoDB instance/index thật hoặc integration tests giao dịch trong phiên này.

Chi tiết lựa chọn kỹ thuật và giới hạn editor: `docs/sds/BACKEND-FOUNDATION-v0.1.md` từ root.
