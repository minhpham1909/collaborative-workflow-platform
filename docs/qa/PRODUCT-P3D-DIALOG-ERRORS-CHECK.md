# P3d — Lỗi lời mời và chuyển Owner

15/10/2026. Browser native Workspace-only với API/Mongo riêng. Không gửi SMTP, chạy queue/cleanup worker, ghi dữ liệu dev hoặc deploy.

## Sửa lỗi

TeamAction trước đây chỉ báo “chưa xác nhận kết quả” khi không có HTTP status. HTTP5xx sau khi backend đã commit có thể không chứng minh rollback. Dùng isUncertainMutation cho cả mất kết nối và5xx; giữ khoá gửi lại và hướng dẫn đóng/đọc danh sách. Lỗi403/409 vẫn báo nguyên nhân cụ thể. Không đổi API/quyền hoặc tự retry ghi.

## Ca kiểm tra

- Manager tạo EMAIL invitation cho địa chỉ example.invalid; API commit rồi browser nhận502 giả lập. Dialog báo kết quả chưa rõ, khoá submit; chỉ một invitation được ghi. Đóng qua xác nhận, đọc danh sách thấy invitation, không POST lại. Outbox chỉ nằm trong DB thử, không gửi mail.
- Manager mở invitation dialog rồi Owner hạ xuống Member. Submit403, email đang nhập còn nguyên, không có invitation mới.
- Owner mở dialog chuyển quyền rồi Workspace bị đổi metadata ở phiên khác. Submit409, không chuyển Owner và khoá submit cũ.
- Một phiên Owner khác đọc dữ liệu mới, gửi transfer thành công rồi mất phản hồi. Chỉ một transfer; người nhận là Owner, Owner cũ Member. Dialog khoá gửi lặp; đóng và đọc lại Team không còn CTA chuyển Owner cho tài khoản cũ.
- Light/VI1440 và Dark/EN375 PASS, không pageerror. 502/403/409/net::ERR_FAILED là lỗi thử có chủ đích.
- FE35/35 PASS; build/budget PASS initial423906/425000 bytes. Script FE/scripts/check-product-workspace-dialog-errors.mjs; log .local/p3d-*.log.

## Chuyển trọng tâm sang P4

P3a–P3d đã kiểm tra các luồng cài đặt, role/ownership, LINK admission, EMAIL invitation creation, archive và Ban cơ bản. Hậu kiểm trước phát hành vẫn cần delivery SMTP thật trên bản hiện tại, retry mail, cleanup theo khoảng thời gian, danh sách dài và ma trận race bổ sung. Những ca này không được tính là đã đạt; ghi ở P6 để tiếp tục P4 Board/Task thay vì tuyên bố P3 hoàn chỉnh tuyệt đối.
