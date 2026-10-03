# Auth/session v0.1 — lát cắt đăng nhập

Ngày 03/10/2026. Triển khai trên dev sau khi main nhận commit sắp xếp tài liệu. Phạm vi: đăng nhập mật khẩu cho account đã tồn tại, cấp/verify JWT, refresh rotation, logout, /me và middleware verified gate. Increment accounts đã có signup/Google/verification/reset/change-password; xem [Auth/accounts](AUTH-ACCOUNTS-v0.1.md). Profile/Settings còn tiếp theo. Không coi toàn bộ Auth/User đã hoàn thành.

## Hợp đồng HTTP

| Method/path | Input | Output / điều kiện |
|---|---|---|
| POST /auth/login | JSON {email,password}; Origin đúng WEB_ORIGIN | accessToken, csrfToken, user; refresh chỉ trong cookie |
| GET /auth/csrf | Cookie refresh; Origin đúng | csrfToken để khôi phục phiên sau reload |
| POST /auth/refresh | JSON {}; Cookie; X-CSRF-Token; Origin đúng | Token/cookie/CSRF mới, giữ hạn phiên tuyệt đối |
| POST /auth/logout | JSON {}; Cookie; X-CSRF-Token; Origin đúng | 204, revoke server session và clear cookie |
| GET /auth/me | Authorization: Bearer accessToken | user mapper tối thiểu, không cần verified |

Unknown fields/types, Mongo operators thay email, password thiếu/sai độ dài, body sai JSON/quá 16 KiB bị từ chối. Lỗi chỉ trả `{error:{code}}`; 400 INVALID_INPUT, 401 INVALID_CREDENTIALS/UNAUTHENTICATED/REFRESH_REUSED, 403 ORIGIN_REJECTED/CSRF_REJECTED/EMAIL_VERIFICATION_REQUIRED, 415 JSON_REQUIRED, 429 RATE_LIMITED. Unexpected errors không lộ DB/stack.

Cookie workflow_refresh: host-only, HttpOnly, SameSite Strict, Path=/auth, Secure khi NODE_ENV=production; development HTTP chỉ dùng local. Origin/CORS allowlist là một origin chính xác, không wildcard. Topology production hiện yêu cầu FE/BE cùng site để SameSite Strict hoạt động; chưa hỗ trợ cross-site cookie deployment. Access token chỉ giữ memory phía FE khi FE được triển khai.

GET csrf cần Origin đúng và refresh còn hiệu lực, trả CSRF HMAC gắn với refresh hiện tại. POST refresh/logout yêu cầu token đó. CSRF trả qua response body, không lấy refresh cookie bằng JavaScript. /me hết hạn access trả 401 nhưng không xóa cookie refresh còn hạn. Logout/session revoke chặn JWT access vẫn còn hạn trên request tiếp theo.

## Các lựa chọn kỹ thuật triển khai

JWT dùng jose 6.2.12, HS256 và hai key riêng 32 bytes ngẫu nhiên dưới dạng lowercase hex; không có key mặc định. Access/refresh khác key, typ, audience và purpose. Verify allowlist algorithm, chữ ký, issuer/audience, expiry, iat, sub/sid dạng ObjectId, authVersion và generation. Payload không có password, role hay quyền Workspace.

Access TTL 15 phút; refresh/session TTL tuyệt đối 7 ngày, rotation không kéo dài phiên. Đây là thông số implementation-selected cần review vận hành, không phải chủ dự án duyệt từng con số. Refresh là JWT được ký có jti ngẫu nhiên 32 bytes, DB chỉ lưu SHA-256 hash của toàn token. Signed refresh cho phép xác nhận token cũ là do server cấp trước khi xử lý reuse; token giả không được phép revoke phiên khác.

Policy refresh hiện tại là strict single use: hai request cùng credential → một rotate, request stale revoke session. Không grace window hoặc trả lại token mới cho retry. Frontend sau này cần single-flight/coordination giữa tabs; mất response refresh có thể buộc đăng nhập lại. Tradeoff này được ghi rõ, chưa suy thành UX đa tab đã nghiệm thu.

Password dùng Argon2id qua @node-rs/argon2 2.2.1, memory 19 MiB, iterations 2, parallelism 1, random salt. Giới hạn 12–128 Unicode code points và tối đa 512 UTF-8 bytes; không trim/normalize hoặc áp composition rules. User không tồn tại/Google-only vẫn chạy dummy hash verification và trả cùng INVALID_CREDENTIALS. Google-only login đã nối trong increment accounts.

Rate limits triển khai tạm: login 10/phút/IP, toàn auth 60/phút/IP, tối đa 10.000 entries; trust proxy tắt. Store limiter theo process, chưa giải quyết nhiều replica/shared limit. Trước deploy reverse proxy phải xác định topology, proxy trust chính xác và shared limiter. Securityheaders/request logs/observability production còn phải hoàn thiện.

## Repository và giao dịch

Scoped mongo-store sử dụng User.authMutationRevision trong transaction để serialize auth lifecycle. Login verify hash trước transaction rồi recheck passwordHash/authVersion sau guard, tránh cấp session theo credential đã đổi. Session tạo qua validated document save; rotate/revoke dùng driver update có field/filter allowlist. Generic Mongoose query/bulk writes vẫn bị chặn; không mở bypass rộng trên tất cả models.

Refresh check user/session generation, expiry/revocation, current token hash trước rotate. Reuse trả error result khỏi callback transaction rồi AuthService throw sau commit, để revocation không bị rollback. Logout cũng lấy user guard. Protected requests đọc session và current User.authVersion; verified gate dùng user hiện tại. Workspace permissions vẫn phải được kiểm khi có business routes, chưa có quyền Owner từ JWT.

## Kiểm chứng và phần tiếp theo

Unit/service tests dùng storage test double có serialization; HTTP tests chạy server local thật với test double. Live Mongo test chỉ chạy khi TEST_MONGODB_URI trỏ tới database workflow_auth_test trên replica set; không drop DB, chỉ cleanup fixture-generated IDs. Không cấu hình URI trong phiên này nên live test skipped, không khẳng định transactions/indexes đã chạy thực tế.

DB local và account flows đã kiểm trong increment accounts. Tiếp theo: Profile/Settings, FE Auth/refresh coordination, cấu hình Google/SMTP thật và các routes công việc.

Nguồn: [jose signing/verification](https://github.com/panva/jose), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Google nối sau theo [server-side ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
