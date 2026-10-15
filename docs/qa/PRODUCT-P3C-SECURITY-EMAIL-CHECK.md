# P3c — Email theo Workspace, Ban/unban và lỗi dialog

15/10/2026. Native Workspace-only, Mongo/API/browser fixture riêng. Không ghi dữ liệu dev, không SMTP, cleanup worker hoặc deploy.

## Lỗi đã sửa

ModerationDialog dùng cùng trạng thái uncertain cho lỗi preview và lỗi Ban/unban. Preview POST chỉ đọc/xem trước tác động; lỗi503 làm khoá toàn bộ form và bắt đóng dù chưa gửi lệnh Ban. Tách unknownWrite = !previewOnly && isUncertainMutation(error): preview lỗi vẫn giữ lý do và có thể thử lại; lỗi ghi không rõ kết quả vẫn khoá gửi tiếp.

## Ca kiểm tra

- Member đặt assignment email override off và lưu; chỉ cấu hình của mình đổi, Owner vẫn inherit. Reset qua xác nhận đưa cả bốn loại về inherit. Không gửi thư để kiểm tra lựa chọn này.
- Ban preview503: thông báo lỗi, lý do giữ nguyên, nút preview vẫn dùng được. Bỏ lỗi giả lập, preview và Ban thực hiện thành công.
- Ban chặn tài khoản dùng lại LINK invitation đang hiệu lực; Task chưa Done bỏ assignee, Task Done giữ attribution. Chọn cleanup none giữ bình luận.
- Unban qua UI không tự cấp lại membership; cần chấp nhận lời mời lại. Assignee Task chưa Done không tự khôi phục.
- Role dialog đang mở bị cập nhật membership ở phiên khác: submit409, giữ lý do readonly và khoá gửi lặp.
- Ban POST đã commit nhưng mất phản hồi: DB xác nhận ban active, chỉ một write, nút Ban bị khoá. Đây là kiểm tra rằng sửa lỗi preview không làm mất bảo vệ khi ghi.
- Browser Light/VI1440 và Dark/EN375 PASS, không pageerror. 503/409/net::ERR_FAILED là lỗi thử có chủ đích.
- FE35/35 PASS; build/budget PASS initial423906/425000 bytes. Script FE/scripts/check-product-workspace-security.mjs; log .local/p3c-*.log.

## Phạm vi còn lại

Không chạy dọn bình luận hoặc kiểm thử cleanup theo khoảng thời gian. Ca này dùng cleanup none. Chưa bao phủ mất phản hồi khi chuyển Owner/tạo EMAIL invitation, quyền bị thu hồi trong mọi dialog, retry SMTP và pagination dài. Các ca này được giữ trong danh sách nghiệm thu bổ sung P3; không công bố toàn bộ P3 hoàn tất chỉ vì các scoped gates đạt.
