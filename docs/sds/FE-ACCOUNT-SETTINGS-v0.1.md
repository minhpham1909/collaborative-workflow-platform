# Account / Personal Settings FE v0.1

04/10/2026. React JS/JSX tại `#settings`, tiếp nối [Notifications](FE-NOTIFICATIONS-v0.1.md). [QA](../qa/FE-ACCOUNT-SETTINGS-CHECK.md).

## Hồ sơ và email công việc

User đã đăng nhập, kể cả chưa verified, xem/sửa chính mình. GET /users/me trả `{user, account: {hasLocalPassword, googleLinked}}`. Account capabilities đọc từ password existence và AuthIdentity trong transaction có guard kiểm lại phiên; chỉ boolean ra HTTP, không hash hoặc Google subject. G01 đã xử lý; không suy kiểu đăng nhập từ avatar.

Hồ sơ có tên hiển thị, email chỉ đọc, trạng thái xác minh và avatar Google với initials fallback nếu ảnh lỗi. Không có upload. PATCH profile/preferences dùng expectedVersion; 409 giữ draft, người dùng tải lại có xác nhận bỏ thay đổi. Chỉ cập nhật shell sau response thành công. Tab switch, link navigation và beforeunload có cảnh báo draft; browser back/logout cần router guard hoàn chỉnh trước release.

Email preferences chung gồm assignment/comment/content/status. Locale null/vi/en điều khiển email công việc; UI hiện tiếng Việt và ghi rõ điều này. Workspace override UI là increment riêng; setting email không tắt email xác minh/reset.

## Bảo mật và Google

Local-password account có form mật khẩu hiện tại/mới/xác nhận, không trim mật khẩu. API client lấy fresh CSRF, gửi bearer + cookie, giữ Web Lock dùng chung refresh và cài access token mới sau response đổi mật khẩu. Epoch guard ngăn request đang xếp hàng áp dụng cho phiên khác; không tự retry mutation. BroadcastChannel báo các tab khôi phục phiên. BE thu hồi các phiên khác; mật khẩu/token không lưu localStorage.

Account chưa link và có local password được chọn Google sau xác nhận mật khẩu. GIS dùng link challenge/nonce; BE yêu cầu email trùng chính tài khoản và kiểm unique identity. Không tự link theo email. Shared loader chỉ tải GIS khi người dùng mở thao tác Google. Sai email/identity đã dùng/challenge hết hạn có thông báo riêng. Google-only không hiện form đổi mật khẩu hoặc tạo password; chưa có unlink/email change UI.

Visual dùng nền kem, accent tím, cards và tabs theo hướng Stitch hiện hành; layout kiểm desktop và 390px, không tuyên bố fidelity toàn Figma. Không thay thư viện hoặc nghiệp vụ SRS.
