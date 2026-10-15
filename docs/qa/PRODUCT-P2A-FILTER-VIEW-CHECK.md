# P2a — Thanh bộ lọc và dạng xem thống nhất

15/10/2026. Giữ brand hiện tại; không đổi API hay dữ liệu nghiệp vụ.

## Thay đổi

- Home, Project trong Workspace, Project được chia sẻ, My Tasks và Thông báo gom tìm kiếm/bộ lọc/sắp xếp/đổi dạng xem vào một khu vực.
- Card/list dùng icon có tên trợ năng, tooltip và vùng bấm tối thiểu 44 × 44. My Tasks/Thông báo giữ chữ cho lựa chọn mật độ.
- Màn hẹp tự xuống hàng trong thanh công cụ. Giữ lựa chọn riêng từng tài khoản và màn hình.
- Sửa quy tắc hover bộ lọc ghi đè nền nút đang chọn gây tương phản thấp. Kiểm tra tương phản bao gồm cả nút chỉ có icon.

## Kiểm chứng

- Collection browser Light/VI và Dark/EN: Home, Workspace, My Tasks, Guest Shared ở 375/768/1024/1280/1440; giữ số item, query và không thêm request khi đổi dạng xem; persistence/account isolation, không tràn ngang, không pageerror.
- Inbox Dark: hai dạng xem, 5 chiều rộng, giữ cursor/return position, blocked storage. Fixture tắt IntersectionObserver để kiểm tra fallback phân trang thủ công; không tuyên bố bao phủ lazy loading từ lần chạy này.
- FE unit 35/35 PASS; build/budget PASS, initial 423470/425000 bytes.
- Test dùng DB/các tài khoản riêng; không gửi thư, không chạy worker, không ghi dữ liệu nghiệp vụ dev. Ảnh kiểm tra ở .local/collection-views; log p2-* ở .local.

## Còn lại

P2a chỉ hoàn tất bố trí toolbar. Chưa đóng toàn bộ P2 hoặc nghiệm thu độ khác biệt của Detailed/Compact. P1b mất quyền khi form đang mở, CAS, phản hồi ghi không rõ kết quả và các tổ hợp reopen vẫn cần kiểm thử riêng. Không deploy.
