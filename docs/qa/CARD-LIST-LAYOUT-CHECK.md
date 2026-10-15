# Dạng thẻ / Danh sách có khác biệt cấu trúc

15/10/2026. Phạm vi: My Tasks và Thông báo — hai nơi dùng lựa chọn detailed/compact. Home, Project trong Workspace và Shared đã dùng card/list; không đổi nghiệp vụ.

## Thay đổi

- Nhãn hiển thị đổi thành Dạng thẻ / Danh sách (Cards / List). Giữ khóa preference cũ để lựa chọn đã lưu vẫn hoạt động.
- My Tasks: thẻ chia cột trong từng nhóm deadline, tiêu đề phía trên, ngữ cảnh/mã và metadata ở thân, trạng thái/CTA ở chân. Danh sách dùng hàng liền, tiêu đề/ngữ cảnh, metadata và trạng thái/CTA căn ngang trên màn rộng; màn hẹp vẫn có cột trạng thái riêng.
- Thông báo: thẻ chia cột, icon/category/nội dung và chân thao tác; danh sách là các hàng liền, nội dung bên trái, thao tác bên phải ở màn rộng. Mobile về một cột đọc được; không ẩn CTA hoặc nội dung vì đổi view.
- Giữ nhóm, sort, filter, phân trang, assignee/task panel, quyền và hành vi read/unread. Không đổi API hoặc cache dữ liệu.

## Kiểm chứng

- Browser My Tasks Light/VI và Dark/EN: fixture nhiều Task cùng nhóm; kiểm tra toạ độ chứng minh thẻ nhiều cột và list nhiều hàng; item/query/API unchanged khi đổi view, persistence, account isolation. Card Dark và List hai theme được kiểm tra 5 chiều rộng 375/768/1024/1280/1440, không overflow.
- Inbox Light/Dark: hai mode/5 chiều rộng, contrast, giữ item/cursor/read state, return position từ Task/detail, storage fallback. Geometry Light xác nhận thẻ nhiều cột/list một cột. Manual paging fixture tắt IntersectionObserver; không mở rộng kết luận sang lazy loading.
- FE 35/35 PASS; build/budget PASS initial 423890/425000 bytes.
- Chỉ DB browser fixture; không ghi dữ liệu dev, gửi thư, chạy worker hoặc deploy.

Ảnh: .local/collection-views/mine-cards-*, .local/inbox-views/Cards-*, List-*. Log: .local/card-list-*.log.
