# Backend JavaScript

Nền backend ngày 03/10/2026: Node 24.x, Express 5.2.1, Mongoose 9.10.4; dependencies được khóa bằng pnpm 11.19.0. Đã có 12 model lõi và API health; Auth/Google login và các API nghiệp vụ chưa triển khai.

## Chạy local

Từ thư mục `BE`, với Node 24.x và pnpm 11.19.0:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm test
pnpm dev
```

Sửa `MONGODB_URI` trong `.env` theo MongoDB replica set local hoặc dịch vụ đã cấu hình. Server chỉ khởi động khi kết nối thành công và topology hỗ trợ transaction. Mặc định bind `127.0.0.1:4000`. Không có MongoDB thì vẫn chạy được tests schema/HTTP bằng `pnpm test`.

| Endpoint | Kết quả |
|---|---|
| GET `/health/live` | 200 khi HTTP server đang chạy |
| GET `/health/ready` | 200 khi connection sẵn sàng, 503 khi mất kết nối/đang dừng |
| Các route nghiệp vụ | Chưa mở, trả 404 |

`pnpm db:indexes` tạo các index đã khai báo trong DB được cấu hình, không xóa index cũ. Đây là thao tác riêng, không tự chạy khi start; chưa thực hiện trong phiên này. Unique index chỉ có hiệu lực sau khi tạo thật, schema tests không chứng minh uniqueness trong MongoDB.

## Cấu trúc

```text
src/
  app.js                # Express app; không kết nối DB khi import
  server.js             # Startup/shutdown
  config.js             # Cấu hình fail closed
  database.js           # Kết nối và kiểm tra topology
  content/rich-text.js  # Hợp đồng editor và text/counters server
  models/              # Shared schemas, accounts, workspace, task, events
scripts/create-indexes.js
test/                   # Node built-in runner, không cần DB
```

## Ranh giới implementation

- JWT access + refresh đã được chủ dự án chọn; model Session lưu hash refresh token và generation. Chưa phát hành/verify JWT, rotation, cookie, CSRF hoặc Google OAuth endpoints.
- Các schema kiểm tra cấu trúc và một số invariant nội bộ document. Không thay validation DTO, authentication, authorization hoặc transaction bảo vệ quan hệ giữa collection.
- `.save()` sử dụng `version` và optimistic concurrency. Query/bulk writes đang bị chặn để tránh bypass hooks; khi triển khai repositories cần cơ chế ghi có CAS và transaction rõ ràng, gồm session rotation, cleanup membership và outbox workers. Schema hiện không cho phép các luồng này chạy.
- Không dùng `req.body` tạo model/update trực tiếp. Fields server-owned vẫn cần DTO allowlist theo từng hành động. Mongoose có casting, không phải bộ kiểm tra kiểu đầu vào HTTP nghiêm ngặt.
- JSON transform và default projections che credential/payload nội bộ; `lean()`/aggregation/`toObject()` không phải response công khai. Mỗi route phải có mapper kiểm quyền, nhất là notifications và invitation preview.
- Storage, resources và announcement extension chưa có models/routes. Không có MongoDB instance/index thật hoặc integration tests giao dịch trong phiên này.

Chi tiết lựa chọn kỹ thuật và giới hạn editor: `docs/sds/BACKEND-FOUNDATION-v0.1.md` từ root.
