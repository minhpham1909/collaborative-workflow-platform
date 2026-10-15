# P4b — Metadata Task và bình luận

15/10/2026. Native Workspace-only; DB/API/browser riêng. Không ghi dữ liệu dev, gửi thư hoặc chạy worker/deploy.

## Sửa lỗi UX

TaskForm và comment composer trước đây chỉ khoá submit khi mất phản hồi, còn nội dung vẫn sửa được. Người dùng có thể nhập thêm dù chưa biết phần nào đã lưu. Chuyển trường Task và rich editor sang disabled/readonly khi uncertain. Nút huỷ/phục hồi của Task đặt ngoài fieldset bị khoá, chỉ khoá khi đang gửi, để luôn đóng/đọc lại được qua xác nhận. Không tự retry write, không mất draft khi chưa xác nhận bỏ.

## Kiểm chứng

- Owner sửa Task priority high, nhãn và deadline 02/01/2030 07:15 giờ Việt Nam; service đọc UTC00:15 đúng ngày.
- Nhãn đã gán sau khi archived vẫn được giữ khi sửa tiêu đề; không âm thầm bỏ nhãn cũ.
- Comment POST commit rồi mất phản hồi: DB đúng một comment, submit khoá, editor contenteditable=false. Huỷ qua xác nhận đọc lại thấy comment, không POST lại.
- Owner không phải tác giả không có CTA sửa/xoá. Tác giả sửa trong lúc phiên khác cập nhật nhận409, giữ draft cục bộ. Tác giả tải dữ liệu mới và xoá: record comment không còn trong DB (hard delete).
- Task/Project có tên dài, bao gồm chuỗi liền: Board/detail không làm tràn document ở375/768/1024/1440. Chụp sau khi đọc lại comments để không dùng snapshot cũ của tab khác. Không tuyên bố đã tối ưu mọi bố cục nội dung dài.
- Browser Light/VI và Dark/EN PASS; net::ERR_FAILED/409 là lỗi giả lập có chủ đích, không pageerror.
- P1b1 chạy lại Light/VI: tiêu đề bị disabled và editor Task readonly khi uncertain; huỷ/đọc lại vẫn hoạt động, cùng các ca CAS/demotion/reopen trước đó PASS.
- FE35/35 PASS; build/budget PASS initial423906/425000 bytes.

Script FE/scripts/check-product-task-metadata-comments.mjs; P1b1 script bổ sung assertion. Log .local/p4b-*.log; ảnh .local/product-p4b.

## Còn lại P4c

Project metadata form/lỗi ghi; nhãn tạo/sửa/archive qua management UI; visual sâu Board/detail/panel ở trạng thái trống, archived/trash; rà focus/keyboard. P4b chưa đóng tổng nghiệm thu P4.
