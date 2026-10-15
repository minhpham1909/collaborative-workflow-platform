# P4c — Project description, labels và keyboard

15/10/2026. Native Workspace-only; DB/API/browser riêng. Không SMTP/workers/dev data/deploy.

## Kiểm chứng

- Mô tả Project bị phiên khác cập nhật: PATCH409, giữ draft tại editor; huỷ qua xác nhận, đọc snapshot mới.
- PATCH mô tả đã commit rồi mất phản hồi: editor readonly, submit khoá, một write. Huỷ/phục hồi đọc đúng kết quả, không PATCH lại.
- Member không có CTA sửa mô tả hoặc quản lý Project.
- Owner tạo nhãn qua UI; tên trùng409 giữ form cho sửa tên rồi lưu thành công. UI archive/unarchive nhãn được service xác nhận.
- Dialog có focus bên trong khi mở và Shift+Tab; Escape khi chưa sửa đóng dialog và trả focus về nút tạo nhãn. Đây là ca keyboard đại diện, không tuyên bố mọi dialog đã được kiểm tra.
- Project archived vẫn xem danh sách nhãn nhưng không có CTA tạo/sửa. Không overflow ở375/768/1440, Light/VI và Dark/EN. Các409/net::ERR_FAILED có chủ đích, không pageerror.
- FE35/35 PASS; build/budget PASS initial423906/425000 bytes.

Script FE/scripts/check-product-project-management.mjs; log .local/p4c-*.log; ảnh .local/product-p4c.

## Tối ưu bố cục nhỏ

Danh sách quản lý có div.buttons rỗng khi readonly. Ẩn vùng rỗng để không chừa khoảng thao tác thừa. Mobile có số tab lẻ cho tab cuối rộng trọn hàng, không để một ô lẻ nửa hàng. Không ẩn CTA hoặc nội dung có sẵn.

## Tiếp P5 / hậu kiểm P6

P4a–P4c đạt các luồng đã ghi; chưa đại diện mọi race hoặc toàn bộ visual/keyboard. P6 giữ hậu kiểm nhiều dữ liệu, mọi dialog, trạng thái empty/error và thao tác kéo thả Board. Tiếp P5 My Tasks/lịch/Inbox, đặc biệt lazy loading/back/notification target mất quyền. Không công bố sẵn sàng deploy.
