# Auth accounts v0.1

Ngày 03/10/2026, triển khai trên dev. Bổ sung [Auth/session](AUTH-SESSION-v0.1.md). Profile/Settings và frontend còn tiếp theo; không suy thành baseline SRS/NFR đã duyệt.

## HTTP contracts

Tất cả POST cần exact WEB_ORIGIN, JSON ≤16 KiB, DTO allowlist; server-owned fields bị từ chối. Accounts routes 10 request/phút/IP mỗi route, Auth 60/phút/IP theo process. Bearer dùng access JWT; refresh chỉ ở cookie. Lỗi chỉ trả error.code.

| Route dưới /auth | Input/điều kiện | Response |
|---|---|---|
| GET /capabilities | Public | termsVersion, googleClientId/null |
| POST /register | displayName,email,password,termsAccepted:true,termsVersion hiện hành | 202 REGISTRATION_ACCEPTED,emailDelivery:queued |
| POST /verify-email | token | EMAIL_VERIFIED |
| POST /verify-email/resend | Bearer, {} | 202 VERIFICATION_QUEUED hoặc EMAIL_ALREADY_VERIFIED |
| POST /password/recovery | email | 202 RECOVERY_REQUEST_ACCEPTED, giống nhau cho email thiếu/Google-only |
| POST /password/reset | token,password | PASSWORD_RESET,requiresLogin:true; clear refresh cookie |
| POST /password/change | Bearer+refresh cookie+X-CSRF-Token; currentPassword,password | Session/User mới, refresh cookie mới |
| POST /google/challenge | {} | nonce,expiresAt, nonce cookie |
| POST /google/link/challenge | Bearer, {} | nonce liên kết gắn User |
| POST /google | nonce cookie; credential; Terms nếu tạo account mới | Session/User |
| POST /google/link | Bearer+nonce cookie; credential,currentPassword | GOOGLE_LINKED |

Signup không cấp phiên. Unverified login được, verified middleware chặn nghiệp vụ. Terms version từ capabilities; dev draft, production từ chối draft. Nội dung Terms thực tế và màn hình đồng ý cần hoàn thiện trước production.

## Tokens và transactions

Verify 24 giờ; reset 30 phút; random 32 bytes hex, auth_tokens lưu SHA-256. Kiểm purpose/expiry/used/revoked trong transaction. Resend/recovery thu hồi token cũ cùng purpose. Đổi password kiểm lại credential/phiên, tăng authVersion, cấp tokens mới cho phiên hiện tại, revoke phiên khác/reset links. Reset revoke tất cả phiên. Google-only recovery không tạo local password.

User guard serialize Auth mutations. Startup yêu cầu unique indexes Auth có thật; db:indexes tạo riêng. Scoped driver writes trong adapters Auth/mail; generic model query/bulk writes vẫn chặn.

Thêm collection thứ 13 **auth_challenges**: _id,userId nullable,purpose google_login/google_link,tokenHash private unique,expiresAt,usedAt,revokedAt,createdAt. Login challenge không User; link challenge gắn User. Nonce 5 phút, một lần; consume và login/link commit cùng transaction, lỗi rollback cho retry. Purge/retention còn mở; không dùng TTL thay expiry check. Cookie workflow_google_nonce: HttpOnly,SameSite Strict,Secure production,Path=/auth/google. FE truyền nonce cho Google Identity Services; credential BE phải khớp cookie và DB challenge.

## Google

google-auth-library verify chữ ký/audience; thêm checks issuer,expiry,iat,nonce,sub. Identity theo provider/sub; không tự link bằng email. Link cần local login+mật khẩu hiện tại+cùng email canonical. Một User một Google identity. Tên đã sửa không bị ghi đè; avatar HTTPS Google picture hoặc initials.

Google email_verified chỉ đủ khi Gmail hoặc Google Workspace có hd; external email cần xác minh ứng dụng. Theo [Google server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). SDK tests dùng stub; chưa dùng credential Google thật. GOOGLE_CLIENT_ID trống khiến challenge trả 503. OAuth origins cần cấu hình trước FE integration.

## Email outbox

User/token/job cùng transaction. Delivery payload mã hóa AES-256-GCM, AAD eventId, key riêng ngoài DB. Worker kiểm User/token/purpose/hash/expiry trước gửi; stale job cancelled. Token nằm trong URL fragment FE; không log raw token. Sent/cancelled job xóa encrypted payload. Retry tối đa 5 attempts, exponential; lease 60 giây, CAS lease token; redact lỗi provider.

mail:once xử lý một job; chưa scheduler nền. disabled không claim job. capture lưu preview chứa link thật ở .local/mail, chỉ development. smtp dùng Nodemailer TLS 465/587, cần host/user/password/from; chưa chọn/kiểm SMTP thật. Delivery at-least-once: crash sau provider accepted trước commit có thể gửi lại; eventId/messageId không chứng minh exactly-once.

[BE README](../../BE/README.md) hướng dẫn local. Integration runner tải MongoDB 8.0.17 vào .local, chạy replica set riêng và dừng sau test; transaction/index thật. Development DB localhost, dữ liệu .local/mongodb-dev, không dùng production. Production còn DB/email provider,secrets/rotation,shared limiter,proxy/cookie topology,TLS,retention,vận hành. Storage Upcoming.
