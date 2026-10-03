# Google và SMTP thật — kiểm thử local

Ngày 03/10/2026. Hướng dẫn cho BE hiện hành; không tạo project/tài khoản bên ngoài thay chủ dự án, không yêu cầu gửi secrets qua chat. Trang devtools dùng để kiểm Auth khi FE chưa được thiết kế. Chưa chứng nhận Google/SMTP live.

## 1. Google Web client

Mở [Google Cloud Console](https://console.cloud.google.com/), tạo/chọn project. Trong Google Auth Platform cấu hình Branding (tên app, email hỗ trợ/liên hệ), Audience External cho Gmail cá nhân; dùng Testing và thêm tài khoản kiểm thử nếu console yêu cầu. Chỉ đăng nhập/profile/email, không cần quyền Gmail/Drive.

Vào Clients → Create client → Web application. Authorized JavaScript origins thêm http://localhost và http://localhost:5173. Flow đang dùng GIS popup/JavaScript callback nên không cần redirect URI. Lấy Client ID có đuôi .apps.googleusercontent.com, đặt GOOGLE_CLIENT_ID trong BE/.env. Flow này không dùng Client Secret. Theo [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## 2. Gmail SMTP để kiểm thử

Dùng Gmail cá nhân riêng cho dự án. Bật 2-Step Verification ở [Google Account Security](https://myaccount.google.com/security), sau đó mở [App passwords](https://myaccount.google.com/apppasswords), tạo app tên Workflow Local SMTP. Lấy app password một lần, lưu vào .env ở máy; bỏ khoảng trắng phân nhóm. Không dùng mật khẩu đăng nhập Google thông thường. Nếu không có mục này, tài khoản tổ chức, Advanced Protection hoặc cấu hình chỉ security keys có thể hạn chế tính năng; xem [Google App passwords](https://support.google.com/accounts/answer/185833?hl=en).

SMTP server smtp.gmail.com, STARTTLS 587, username email đầy đủ. Theo [Gmail SMTP](https://support.google.com/mail/answer/7104828?hl=en). Chỉ cần gửi SMTP, không cần bật POP/IMAP. Đây là lựa chọn test local; provider production chưa chốt.

Trong BE/.env chỉnh các dòng dưới, thay placeholders, giữ nguyên ba keys JWT/mail đã có:

```dotenv
WEB_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EMAIL_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_SENDER@gmail.com
SMTP_PASSWORD=YOUR_APP_PASSWORD_WITHOUT_SPACES
SMTP_FROM=YOUR_SENDER@gmail.com
```

Không commit .env, app password hoặc OAuth client secret. GOOGLE_CLIENT_ID là ID công khai; SMTP_PASSWORD là secret. Đổi Google account password sẽ revoke app passwords; cần tạo lại nếu đổi.

## 3. Chạy ba terminal

Tất cả mở tại BE, Node 24.x/pnpm 11.19.0. Nếu mới setup: pnpm install --frozen-lockfile và pnpm env:dev trước. Helper không thay keys đã có.

Terminal A:

```powershell
pnpm db:dev
```

Terminal B:

```powershell
pnpm db:indexes
pnpm dev
```

Terminal C:

```powershell
pnpm auth:test-page
```

Mở http://localhost:5173 bằng browser thường; không dùng 127.0.0.1/file URL. BE bind 127.0.0.1:4000 nhưng trang gọi localhost:4000 để cookies cùng site. Cần WEB_ORIGIN chính xác. Trang chỉ chạy NODE_ENV=development, không mount vào server sản phẩm. Dừng bằng Ctrl+C từng terminal. Nếu cổng 5173 đang dùng bởi Vite thì dừng instance đó trước.

## 4. Kiểm SMTP/verify/reset

1. Trên trang điền tên/email nhận do bạn kiểm soát, password 12–128 ký tự, tick Terms draft rồi Đăng ký email. Kết quả REGISTRATION_ACCEPTED/emailDelivery:queued nghĩa là đã xếp hàng, chưa xác nhận gửi.
2. Terminal D tại BE chạy pnpm mail:once. Mỗi lệnh xử lý một job. state:sent nghĩa provider đã accepted; kiểm Inbox/Spam của email nhận để xác nhận thực sự tới nơi. Nếu cancelled, chạy lại để lấy job tiếp theo; idle nghĩa không có job đến hạn.
3. Mở link email khi trang test đang chạy, bấm Xác minh email → EMAIL_VERIFIED. Token trong fragment được xóa khỏi thanh địa chỉ và giữ memory của trang; nếu reload hãy mở lại link email. Dùng lại link đã consume phải INVALID_TOKEN.
4. Đăng nhập mật khẩu để xem emailVerified:true. Yêu cầu đặt lại mật khẩu → pnpm mail:once → mở link → nhập password mới → PASSWORD_RESET. Password cũ thất bại; mới đăng nhập được. Phiên cũ bị thu hồi.
5. Gửi lại xác minh yêu cầu đã login account chưa verified; gửi lại sẽ revoke link cũ. Không dùng Google-only account để test reset local password.

## 5. Kiểm Google

Dùng email Google chưa đăng ký mật khẩu trong DB dev để kiểm tạo account Google mới. Tick Terms draft; bấm Chuẩn bị đăng nhập Google rồi nút Google hiện ra. Nonce hết hạn sau 5 phút: reload và chuẩn bị lại. Kết quả GOOGLE_LOGIN_SESSION_OK kèm meStatus:200 chứng minh GIS gửi credential về BE, BE cấp session và /auth/me xác thực phiên mới.

Nếu Google email đã là account mật khẩu, ACCOUNT_LINK_REQUIRED là đúng policy chống auto-link; trang test đã có nút Liên kết Google: đăng nhập mật khẩu, nhập mật khẩu hiện tại ở ô liên kết, chọn đúng Google; thành công GOOGLE_LINKED_SESSION_OK. Đăng xuất/tải lại, chuẩn bị đăng nhập Google và thử lại; kết quả GOOGLE_LOGIN_SESSION_OK gồm /auth/me 200. Flow link có backend/tests nhưng cần local login+mật khẩu proof và user-bound challenge. Gmail verified từ Google; email ngoài Google không mặc nhiên verified, có thể phải xác minh app email.

## 6. Troubleshooting

| Hiện tượng | Kiểm tra |
|---|---|
| Google chưa cấu hình / GOOGLE_NOT_CONFIGURED | Client ID đã đặt và restart BE |
| Origin không được Google cho phép | OAuth Web client origins đúng localhost:5173, không có path |
| ACCOUNT_LINK_REQUIRED | Email có account local; đăng nhập mật khẩu rồi dùng nút Liên kết Google |
| GOOGLE_CHALLENGE_INVALID | Reload lấy nonce mới; không test cùng lúc nhiều tabs |
| ORIGIN_REJECTED / cookie missing | Dùng localhost cho cả trang/API, đúng WEB_ORIGIN, credentials include |
| SMTP retry_or_failed | App password đúng, 2SV, user/from cùng sender, port 587/TLS; kiểm mạng/tài khoản |
| API_STARTUP_FAILED | DB replica set chạy, keys riêng, db:indexes đã chạy |
| Không thấy email | Kiểm Spam; queued không có nghĩa sent; mail:once có backoff và chỉ xử lý một job |

Worker không tự chạy nền. Google/SMTP live chỉ ghi đạt sau khi thử bằng tài khoản thật và kiểm email nhận. Nội dung Terms, UI sản phẩm, scheduler, production provider/limits còn giai đoạn riêng.
