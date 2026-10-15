# P3a — Cài đặt và metadata Workspace

15/10/2026. Native Workspace-only, browser/API/Mongo riêng; không ghi dữ liệu dev, không SMTP/worker/deploy.

## Lỗi đã sửa

WorkspaceSettings khoá fieldset sau lỗi lưu chưa rõ kết quả, nhưng nút phục hồi đã bị gỡ cùng Refresh thường trực. Người dùng không có lối đọc lại kết quả ngay tại form. Thêm Reload settings trong thông báo lỗi, bên ngoài fieldset bị khoá. Nút chỉ xuất hiện khi uncertain hoặc tải snapshot thất bại; không xuất hiện ở trạng thái bình thường.

Nếu có draft, tải lại vẫn cần xác nhận bỏ thay đổi. Huỷ xác nhận giữ draft và trạng thái khoá gửi; xác nhận sẽ đọc snapshot mới, không lặp PATCH. Lỗi tải ban đầu503 có thể thử đọc lại tại chỗ. Không đổi BE/quyền hoặc cơ chế CAS.

## Kiểm chứng

- Owner lưu tên, mục tiêu ngắn, màu, cover và mô tả rich text; service đọc lại đúng nội dung.
- Huỷ thay đổi qua xác nhận trở về dữ liệu đã lưu.
- Member không có tab sửa cài đặt; Manager mở form được. Owner sửa ở phiên khác khiến Manager lưu nhận409; draft giữ nguyên, dữ liệu Owner không bị ghi đè.
- PATCH đã commit200 nhưng mất phản hồi: chỉ một write, save bị khoá. Huỷ hộp xác nhận phục hồi giữ form; xác nhận phục hồi đọc đúng kết quả và mở lại form.
- Manager bị hạ Member trong khi sửa nhận403; nội dung chưa lưu có textarea readonly để sao chép, không ghi đè metadata.
- Tải cài đặt503 có nút retry; retry thành công trả snapshot hiện tại.
- Browser Light/VI1440 và Dark/EN375 PASS; không pageerror/overflow. 409/403/503/net::ERR_FAILED là tình huống thử có chủ đích. Route handlers được dọn trước đóng browser để không tạo lỗi teardown từ request còn chờ.
- FE35/35 PASS, build/budget PASS. Log .local/p3a-*.log. Script FE/scripts/check-product-workspace-settings.mjs.

## Còn lại P3b

Team/invitations: nhiều Manager, mời Member/Guest theo Project, đổi role, kick/ban và ownership transfer; audit và Archive/unarchive. Email preferences và các lỗi ghi tương ứng cần ca riêng. P3a không nghiệm thu toàn bộ P3; không kiểm chứng draft tồn tại qua reload/browser close.
