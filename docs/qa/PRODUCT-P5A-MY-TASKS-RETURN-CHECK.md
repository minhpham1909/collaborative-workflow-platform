# P5a — My Tasks quay lại giữ vị trí

15/10/2026. Native Workspace-only fixture, 28 Task được giao; DB/API/browser riêng. Không dev data/SMTP/workers/deploy.

## Sửa lỗi

My Tasks trước đây unmount khi mở Task toàn trang, quay lại chỉ tải trang đầu và không khôi phục điểm đang xem. Thêm bộ nhớ tạm theo user/query chỉ giữ anchor ID, offset, scrollY và số trang, tối đa20 vị trí/20 trang; không chứa Task body, quyền hoặc response. Xoá khi account changed, lấy một lần khi quay lại.

Liên kết toàn trang trên hàng Task và trong panel ghi vị trí trước điều hướng (bỏ qua modified clicks). Khi quay lại, đọc mới các trang cần thiết qua API có kiểm quyền, loại trùng ID rồi khôi phục anchor; anchor không còn dùng fallback scrollY. Query phải khớp, các phản hồi của generation cũ không áp dụng. Không phục hồi qua browser restart hoặc cache dữ liệu nhạy cảm.

## Kiểm chứng

- Tải12 →24 Task, mở Task ở trang2. Đổi tiêu đề qua service ở phiên khác; quay lại My Tasks đọc đủ24 mục mới, thấy tiêu đề mới và offset chênh dưới4px, không trùng ID.
- Mở panel rồi chọn Full page và quay lại vẫn đọc hai trang.
- Trang tiếp theo503 giữ24 hàng, không tự retry liên tục; tải thủ công lại thành công28 hàng.
- Browser Light/VI1440 và Dark/EN375 PASS; no pageerror. Fixture tắt IntersectionObserver để cô lập manual fallback và restoration. Không dùng ca này để kết luận automatic lazy loading đã đạt.
- FE35/35 PASS; build/budget PASS initial423906/425000 bytes. Script FE/scripts/check-product-my-tasks-return.mjs; log .local/p5a-*.log.

## Còn lại P5b

Automatic lazy loading/cap/error/filter race của các màn; Inbox target đã xoá/mất quyền; Calendar chọn ngày/back/return; nhiều trạng thái và đổi view. P5a không đóng toàn bộ P5 hay mọi lịch sử điều hướng.
