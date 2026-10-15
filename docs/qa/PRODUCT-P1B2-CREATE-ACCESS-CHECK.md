# P1b2 — Tạo mới mất phản hồi, thu hồi membership và reopen

15/10/2026. Native Workspace-only browser fixture; DB/API và 4 tài khoản riêng. Không đổi dữ liệu dev, không gửi thư hoặc chạy worker.

## Đạt

- API nhận POST tạo Task, trả 201 rồi browser bị ngắt phản hồi có chủ đích. Chỉ một POST, DB đúng một Task; form giữ draft/khoá gửi tiếp. Đóng qua xác nhận, Board đọc lại thấy Task, không lặp POST.
- Manager mở form Task rồi Owner thu hồi toàn bộ membership. PATCH nhận 404; DB không bị sửa và draft cục bộ vẫn ở form. Service đọc mới cũng từ chối RESOURCE_UNAVAILABLE. Không tuyên bố đã xoá nội dung người dùng từng nhìn thấy khỏi bộ nhớ trình duyệt.
- Member gửi request; Owner từ chối qua UI có lý do. Task vẫn Done. Member mở lại màn hình để đọc trạng thái mới rồi gửi lần nữa: API429 REOPEN_REQUEST_COOLDOWN, hiển thị lỗi và giữ lý do trong dialog. Đây không phải realtime push giữa hai tài khoản; không tuyên bố có đồng bộ tức thì.
- Đồng hồ riêng của work store đi qua ngày 1/2: request mới được nhận sau 24h và bị Owner từ chối qua service. Ngày 3 chặn request thứ tư trong 7 ngày. Sau ngày 7 request đầu ra khỏi cửa sổ, request mới được nhận. Không sửa timestamp DB, không chờ ngày thật. Session fixture dùng refresh TTL30 ngày để còn hợp lệ trong cửa sổ thử; cấu hình sản phẩm không đổi.
- Owner mở dialog approve rồi Project được lưu trữ qua service trước submit. API409 PROJECT_ARCHIVED; dialog báo lỗi, Task vẫn Done.

Browser Light/VI1440 và Dark/EN375. FE35/35 PASS; build/budget PASS initial423906/425000 bytes. net::ERR_FAILED/429/409 trong log là các ca có chủ đích, không pageerror. Script FE/scripts/check-product-create-access.mjs; log .local/p1b2-*.log.

## Patch nhỏ phát hiện khi rà

TaskLabelPicker còn hướng dẫn “Manager hoặc Lead”. Đổi VI/EN thành Owner hoặc Manager của Workspace; không đổi logic quyền.

## Phạm vi còn lại

Các form Workspace/Project/comment, Guest mất quyền khi Task panel đang mở và requester mất quyền trong lúc review cần nghiệm thu trong P3/P4. Cặp P1b1/P1b2 chứng minh Task write/reopen ở các ca trên; không bao phủ mọi form hoặc mọi race. Không deploy.
