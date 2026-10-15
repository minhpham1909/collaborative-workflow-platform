# P5b — Inbox lazy loading, unavailable target và Calendar return

15/10/2026. API/Mongo/browser fixture riêng; không ghi dữ liệu dev/SMTP/workers/deploy.

## Ca đạt

- Inbox80 thông báo fixture: auto mặc định, cuộn tải thêm3 trang rồi dừng ở48 mục. Có thể tiếp tục thủ công60 mục, không trùng ID. Trang kế lỗi mạng giữ60 hàng và không auto retry; thủ công thử lại đạt72 hàng. Không có IntersectionObserver chuyển sang manual fallback.
- Chạy lazy Inbox Light và Dark ở1440, VI. Đây là fixture đọc/paging riêng, không chứng minh luồng admission/invitation của toàn hệ thống.
- Tạo Task được giao qua service thật sinh notification. Calendar chọn02/01/2030, bấm lại ngày giữ badge; panel → full Task → Calendar giữ month/day và task của ngày đó.
- Task bị đưa vào trash: notification detail hiển thị unavailable, không Task title/CTA mở Task; vẫn đánh dấu đọc được.
- Member bị thu hồi membership: notification của Task khác cũng unavailable và không hiện title/CTA; service DTO xác nhận available=false.
- Calendar/notification browser LightVI1440 và DarkEN375 PASS, không pageerror.

Script FE/scripts/check-product-calendar-inbox-access.mjs; check-lazy-inbox.mjs thêm lựa chọn theme và cleanup handlers trước đóng browser. Log .local/p5b-*.log.

Không sửa code sản phẩm trong patch này. Không chạy lại build/full suite cho thay đổi chỉ ở acceptance scripts/docs.

## Còn P5c

Chưa kiểm tra automatic paging của My Tasks và Calendar bằng nhiều trang; chưa kiểm tra khôi phục số trang/anchor Calendar sau full Task khi đã tải hơn12 mục. P5b chỉ kiểm tra giữ ngày/tháng, không khẳng định đã giữ mọi vị trí. Filter race và các mốc nhiều dữ liệu tiếp tục ở P5c/P6.
