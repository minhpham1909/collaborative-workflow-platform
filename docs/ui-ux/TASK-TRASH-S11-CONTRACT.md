# S11 — Thùng rác Task và phục hồi

09/10/2026. Scope: Project → thùng rác → xem dữ liệu đã xóa → xác nhận phục hồi → trở lại Board. Dùng API C5 hiện có; không thay schema, không mở purge thủ công.

## Bố cục và nguồn dữ liệu

- Route `#project/:id/trash`, đường vào trong header Project cho người nội bộ; đường về Board luôn rõ. Guest truy cập trực tiếp nhận thông báo không có quyền, không tải trash API.
- Nền kem/Jakarta/indigo, danh sách row và detail dialog theo foundation Stitch local, tham chiếu màn My Tasks. Không có screen trash riêng trong bộ nguồn; đây là bố cục bổ sung, không tuyên bố pixel-match mockup.
- Header ghi tổng từ API; danh sách 20 mục/trang, tải thêm bằng cursor, xóa gần nhất trước. Không thêm search/time filter giả trên một trang khi API chưa hỗ trợ.
- Row có mã Task (legacy thiếu mã ghi rõ), title, trạng thái, tên Creator, ngày xóa, hạn phục hồi hoặc legacy chưa có lịch. Ngày giờ Việt Nam; không biến ID `deletedBy` thành tên người xóa.
- Detail đọc snapshot trash DTO: Creator/assignee/priority/deadline/completion/description/labels/checklist, không gọi endpoint Task đang hoạt động. Comment/activity chi tiết chỉ xem sau phục hồi; không tạo endpoint đọc lịch sử thùng rác trong increment này.
- Hết hạn vẫn xem dữ liệu nếu API còn trả, nhưng nút phục hồi bị khóa. Thời gian client hỗ trợ hiển thị; BE quyết định expiry và quyền chính thức.

## Quyền và tương tác

- Owner/Manager/Org management/Lead xem phạm vi do BE cấp; Member chỉ Task mình tạo. Guest không vào. BE lọc trước khi tính total/paging.
- Dùng capability `restore` từng Task, thêm lý do rõ cho parent Archived/expiry. Không cho sửa nội dung, tick checklist, đổi status hoặc bình luận từ detail thùng rác.
- Xác nhận nói đúng tác động: giữ nội dung/trạng thái, kiểm tra lại assignee, không gửi lại thông báo cũ. Không đổi Done thành Todo.
- Trong lúc confirm/restore: chặn submit lặp và chuyển route, vô hiệu hóa refresh/Archive/edit của header Project. Cancel giữ Task trong rác, không POST.
- Restore thành công loại row khỏi snapshot, cập nhật tổng đã tải, có thông báo và link Board. Tải lại lấy tổng/current permissions từ BE, không suy count toàn scope từ số row.
- CAS/parent change/expiry rejection: lỗi ở danh sách, khóa thao tác đến khi tải lại. Response bị mất/5xx: nói chưa xác nhận, không retry tự động, yêu cầu tải lại trước khi tiếp tục; Task có thể đã trở lại Board.
- Refresh/paging tải lại context Project trước trash. 401/403/404 xóa nội dung cũ và báo unavailable. Request cũ/unmount không cập nhật UI; detail đóng khi tải lại.
- Dialog dùng focus trap/Escape/khôi phục focus sẵn có; title dài wrap, metadata xếp dọc trên mobile, CTA ≥44px. Không tự sửa brand/focus theo các heuristic trái accessibility.

## Giới hạn

Retention 30 ngày là contract của Task có `purgeAt`; legacy thiếu lịch không được suy hạn hoặc backfill. Thùng rác không thay backup. Increment không chạy worker dev/SMTP/purge/moderation, không thêm xóa vĩnh viễn, không phục hồi Workspace/Project (Archive riêng). Toàn site Vi/En và kiểm regression tổng thể ở S12.
