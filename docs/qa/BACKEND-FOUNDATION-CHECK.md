# Kiểm tra backend foundation

Ngày 03/10/2026. Môi trường Windows local, Node v24.19.0 chạy từ runtime đi kèm Codex; pnpm 11.19.0. Không thay đổi Node/PATH toàn máy. Dependencies: Express 5.2.1, Mongoose 9.10.4; lockfile BE/pnpm-lock.yaml.

## Kết quả

`pnpm test` / Node built-in test runner: **16 tests, 16 passed, 0 failed/skipped**. Test cuối sau sửa lỗi assertion về nested StrictModeError. Các bài kiểm tra bao gồm:

- Fixtures hợp lệ cho 12 models; Google-only password nullable, Terms bắt buộc, email preferences/overrides mặc định.
- Type/enum/integer/ObjectId, unknown fields, lifecycle/archive/deletion metadata, hash shape.
- Search text do server tạo, deadline đến phút và hạn quá khứ, Comment không blank.
- Private JSON serialization/default projections; explicit payload allowlist; bounded events và lease metadata.
- Query/bulk writes bị từ chối khi chưa có scoped repositories/CAS/transactions.
- Index plan/reference/version declarations khớp DB layout, không chứng minh live uniqueness.
- Editor Vietnamese/emoji graphemes, marks/list/heading/quote/link, hidden URL không vào search; dangerous schemes/HTML/unknown attrs bị chặn; byte/node/depth/visible limits.
- HTTP server thật trên cổng local ngẫu nhiên: liveness 200, readiness 503/200 theo dependency injection, route nghiệp vụ 404, không lộ server identity/database details. Không có DB thật trong readiness test.
- Configuration từ chối URI thiếu, PORT/NODE_ENV sai.

`pnpm audit --prod`: **No known vulnerabilities found** tại thời điểm chạy. Đây là kết quả advisory registry hiện tại, không phải chứng nhận hệ thống an toàn toàn diện.

## Chưa kiểm chứng

Không có MongoDB replica set được cấu hình cho phiên này; không tìm thấy `mongod`/`docker` trong PATH. Chưa connect/provision DB, createIndexes, unique collision tests, save concurrency, đa-document transaction hoặc failure/retry/cleanup races.

Chưa triển khai JWT signing/verification/rotation, password hashing/login/reset, Google OAuth, CSRF/rate limit hoặc authorized business routes. Tests không chứng minh các AC auth/quyền/SRS đã hoàn thành. Chưa có FE editor để thử IME/mobile/paste/a11y.

## Kiểm tra lại

Từ BE với Node 24.x và pnpm 11.19.0:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm audit --prod
```

Với DB replica set dành riêng cho development, cấu hình .env rồi chạy server hoặc script index theo BE/README.md. Chỉ thực hiện live DB tests khi đã có DB test riêng; không dùng dữ liệu cá nhân thật làm fixture.
