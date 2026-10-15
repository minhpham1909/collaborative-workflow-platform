# P6 — Tổng hồi quy sản phẩm

Ngày kiểm: 15/10/2026. Code sản phẩm: `22d402d`. Chỉ kiểm thử local, chưa deploy.

## Phạm vi và cách chạy

Runner `FE/scripts/check-product-regression.mjs` chạy 17 script × hai theme, tối đa hai tiến trình trình duyệt. Mỗi script nghiệp vụ dùng API/DB fixture riêng; không seed lại dữ liệu dev, không chạy SMTP/queue/purge/cleanup worker và không chạm Mongo hệ thống27017. Log và kết quả máy đọc lưu ở `.local/product-p6/` (gitignored).

Các script native nhận cấu hình Light/VI/1440 và Dark/EN/375. Các script cũ có ma trận viewport/ngôn ngữ riêng; không diễn giải 34 lượt thành 34 kiểm thử mobile/English. Collection và Auth kiểm tra nhiều kích thước 375–1440px. Google/SMTP trong fixture không chứng minh provider thật.

## Kết quả

- FE unit: 35/35 PASS.
- FE build và bundle budget: PASS; initial JS 423918/425000 bytes, gzip 133124 bytes. Khoảng dư budget nhỏ, cần theo dõi khi thêm chức năng.
- BE integration với DB riêng: 137/137 PASS, không skip.
- BE unit invocation riêng: 95 PASS, 23 DB tests skip; DB integration đã chạy ở lượt trên. Không cộng gộp các lượt thành số ca độc lập.
- Browser regression: 34/34 PASS (17 script × hai theme).
- Compiled preview4176: native Workspace-only journey PASS Light/VI/1440 và Dark/EN/375; tạo Workspace/Project/Task, Member thao tác, Owner Inbox, Guest, trash/restore và mất quyền Manager. Hai lượt này bổ sung kiểm chứng build, không phải 34 ca mới.
- Không phát hiện lỗi sản phẩm trong đợt này. Runner mới ghi kết quả tuần tự để tránh hai worker ghi đè file tổng hợp; Project screenshot đợi mô tả đã tải xong trước chụp.

## Kiểm tra hình ảnh

Đã mở ảnh kết quả hiện tại của Auth mobile sáng và Project management archived mobile sáng/tối (lượt tối đã chạy lại sau khi bổ sung chờ mô tả): bố cục không tràn ngang, các vùng nền/nhãn/nút đọc được, khung quản lý giữ trạng thái chỉ đọc. Các assertion tự động kiểm tra overflow, tương phản một số thành phần và hình học shell bổ sung bằng chứng; không thay thế nghiệm thu thiết kế toàn bộ màn hình.

## Chưa được xem là hoàn tất

- Nghiệm thu trực quan của người dùng và rà bàn phím toàn bộ luồng; hiện mới có kiểm tra focus containment/Escape/return ở một số dialog.
- Kéo thả Board, toàn bộ Back/Forward/filter race của Calendar, anchor bị xóa, dữ liệu lịch sử dài ở mọi màn hình.
- Gửi thư thật trên build hiện tại, retry delivery và vận hành cleanup/retention theo thời gian. Các lượt SMTP lịch sử không được tính lại là xác nhận cho code hiện tại.
- Terms/Privacy, cấu hình và kiểm thử phát hành là đợt riêng trước public release.

Không kết luận “đã kiểm thử hết” từ bộ hồi quy này. P6 chỉ đóng khi các mục còn lại có bằng chứng hoặc được chốt rõ phạm vi nghiệm thu.
