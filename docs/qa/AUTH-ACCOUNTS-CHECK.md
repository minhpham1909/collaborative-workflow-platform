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

Live smoke 03/10/2026: cấu hình Google Client ID và Gmail SMTP ở BE/.env (ignored). SMTP STARTTLS 587 xác thực thành công; một email kiểm thử được provider accepted. Chưa xác nhận Inbox/Spam hoặc luồng auth outbox qua email thật. Google capabilities khớp Client ID, challenge tạo thành công; chưa có user sign-in/ID token thật nên chưa nghiệm thu Google login. Client Secret không sử dụng/lưu trong luồng GIS hiện tại. Không ghi credentials vào báo cáo.

Google live progress theo kết quả chủ dự án cung cấp: ACCOUNT_LINK_REQUIRED ở trang local cho thấy credential đã qua verifier và gặp account email hiện có; chưa cấp session Google nên chưa nghiệm thu login end-to-end. Trang test đã thêm link, logout và tự gọi /auth/me. Integration HTTP (Google verifier stub, Mongo thật) đạt chuỗi link/password proof → logout (old JWT rejected) → Google login → /me 200; vẫn 8 integration tests, 0 skipped. Cần người dùng chọn Google thật để chốt GOOGLE_LOGIN_SESSION_OK.

Google live kết quả mới 03/10/2026 (thay trạng thái pending Google login phía trên): chủ dự án cung cấp response GOOGLE_LOGIN_SESSION_OK, meStatus:200, User.emailVerified:true, avatar.source:google và HTTPS Google picture; locale:null, preferences defaults đúng. Đây là kiểm thử end-to-end credential Google → BE cấp session → /auth/me cho tài khoản thực. Không lưu email/User ID/avatar URL cá nhân vào báo cáo. Không suy từ response rằng đã hoàn thành link với local account: User.version:0 và response cuối không có GOOGLE_LINKED_SESSION_OK; biến thể link live vẫn cần bằng chứng riêng nếu nghiệm thu. Automated coverage link/logout/relogin vẫn đạt ở integration với verifier stub. Inbox/Spam SMTP chưa được xác nhận. Có thể chuyển phát triển BE sang Profile/Personal Settings; không coi production/Auth mọi biến thể đã nghiệm thu.
