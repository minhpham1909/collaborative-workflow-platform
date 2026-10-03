# Auth accounts check

Ngày 03/10/2026, Windows, Node 24.19.0 / pnpm 11.19.0. [Hợp đồng](../sds/AUTH-ACCOUNTS-v0.1.md).

- pnpm test: 31 đạt, 2 Mongo tests skipped khi không có TEST_MONGODB_URI.
- pnpm test:integration: 8 đạt, 0 skipped trên MongoDB 8.0.17 replica set local. Hai parent tests và sáu subtests; không cộng tests trùng với unit suite.
- Signup/Terms, duplicate rollback, encrypted outbox, resend revoke, concurrent consume chỉ một thành công, change password giữ phiên hiện tại/revoke phiên khác, reset revoke tất cả, sai purpose/expiry/replay.
- Google email-only link bị từ chối, link có proof mật khẩu, nonce đúng intent/một lần/hết hạn, external email chưa verified, Google-only recovery không tạo password. Google SDK signature verification chưa kiểm bằng token thật; unit stub kiểm claims/authority.
- Mail sender giả lập: stale cancelled, lease chống concurrent claim, retry/lỗi redact, payload cleared khi sent. Chưa SMTP delivery thật.
- HTTP accounts: Origin, DTO, password CSRF, Google nonce cookie, response không lộ refresh/passwordHash. Session test kiểm unique email/rotation/replay revocation commit.
- Local smoke: tạo 13 collection/index plans; server startup, /health/ready trả ready; capabilities trả draft Terms, Google null. .env/binary/data ignored.
- pnpm audit --prod: không phát hiện vulnerability đã biết tại thời điểm kiểm tra; không thay security review.

Frontend, Google Web client, SMTP thật, workspace permissions, multi-instance limiter và production NFR chưa nghiệm thu. Các báo cáo foundation/session là mốc lịch sử; dùng báo cáo này cho trạng thái mới.

Bổ sung công cụ test local: auth:test-page phục vụ HTML/JS tại localhost:5173, /verify-email và /reset-password; HTTP smoke 200 và JavaScript syntax checks đạt. Browser tool không khởi tạo được ở môi trường này; chưa kiểm UI qua browser hoặc OAuth/SMTP thật. Dev page không mount trong server sản phẩm.
