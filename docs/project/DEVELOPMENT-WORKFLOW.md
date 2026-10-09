# Quy ước thay đổi và Git

Theo yêu cầu trực tiếp09/10/2026: mỗi đợt patch/code có commit đi kèm, không để nhiều cụm hoàn tất tích lũy thành một commit lớn.

1. Chọn một increment có phạm vi rõ và đọc contract/QA/plan hiện tại.
2. Hoàn thiện đợt thay đổi và chạy kiểm thử phù hợp; không commit WIP như thể đã nghiệm thu.
3. Stage các file liên quan, kiểm secrets/runtime/generated outputs và diff. Giữ thay đổi không liên quan của người dùng.
4. Tạo commit có mô tả vấn đề/đợt thay đổi; push `origin/dev` theo luồng dự án đã được người dùng chấp thuận. Không tự merge/đẩy main khi chưa có yêu cầu cho việc đó.
5. Cập nhật QA/NEXT-STEPS/progress cùng commit, báo hash và giới hạn kiểm thử. Gate còn thiếu phải ghi rõ, không tính cả cụm đã xong từ một increment.

Một đợt có thể gồm nhiều chỉnh sửa nhỏ phụ thuộc nhau và repair khi kiểm thử; không cần commit từng lệnh sửa file. Không stage `.env`, DB27018/.local, logs, dependencies/build, screenshots kiểm thử hoặc raw design ZIP duplicate. Không chạy dev SMTP/purge/moderation/retention/backfill khi chỉ kiểm UI.
