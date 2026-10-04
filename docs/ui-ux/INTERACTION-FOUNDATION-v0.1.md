# Tương tác, mô tả và phản hồi hệ thống

Ngày 04/10/2026. Theo yêu cầu trực tiếp của chủ dự án; thiết kế Stitch là nguồn visual tham khảo, không tự mở thêm quyền hoặc nghiệp vụ.

## Đã triển khai

- Home: liên kết tên Workspace mở rộng vùng bấm ra toàn card bằng CSS. Giữ native anchor, mở bằng bàn phím và menu chuột phải; CTA footer vẫn là liên kết riêng.
- Workspace: luôn có khu mô tả, kể cả empty state; Owner có CTA đến Cài đặt nhóm. Editor chung, giới hạn 20.000 ký tự hiển thị, quyền và expectedVersion kiểm ở BE.
- Project: mục tiêu và mô tả cùng một trường rich text, tối đa 10.000 ký tự hiển thị. Owner hoặc Creator còn membership được sửa trong Active; tên/icon/archive vẫn Owner. Archived chỉ đọc. CAS giữ draft, lỗi mạng chưa xác định kết quả ngăn gửi lại đến khi tải lại.
- NotificationProvider cung cấp context `confirm`, `input`, `notify` và bridge cho handlers. Confirm/input xếp hàng, trả Promise; hashchange/unmount hủy yêu cầu đang chờ. Dialog dùng portal, aria labels, giữ focus, khóa nền bằng inert, trap Tab, Escape tương đương Hủy và trả focus khi đóng. Confirm mặc định focus Hủy; thao tác xóa dùng nút mang tên hành động và màu đỏ.
- Input liên kết thay prompt; editor vẫn kiểm URL HTTPS/mailto theo validator hiện hành. Toast tối đa bốn mục, tự đóng sau sáu giây hoặc đóng thủ công; lỗi validation/CAS còn cạnh form để người dùng sửa.
- Đã thay các native confirm/prompt trong Home, Project, Task, Comments, Notifications, Settings và WorkspaceSettings. Form Team/NameDialog vẫn là dialog chuyên biệt. Cảnh báo đóng/reload tab do browser beforeunload quản lý, không thể thay bằng dialog React.
- Task đang xóa mềm: tăng version, đặt deletedAt/deletedBy, giữ bản ghi Task và Comments. API/Board/My Tasks chặn dữ liệu bị xóa qua scope/parent gate. Chưa có restore/thùng rác hoặc purge tự động; thông điệp xác nhận ghi rõ giới hạn này.

## Hướng nâng cấp UI/UX tiếp theo

1. Rà từng luồng tạo → xem → sửa → hủy → mất quyền → lỗi mạng, ghi nhận các trạng thái loading/empty/error/read-only/success nhất quán. Không coi một màn đẹp là luồng hoàn chỉnh.
2. Thống nhất component cho form, dialog, picker và thông báo; action labels nói đúng tác động, lỗi chỉ rõ cách tiếp tục. Toast dành cho phản hồi ngắn; lỗi cần xử lý nằm cạnh dữ liệu liên quan.
3. Giữ vùng bấm đủ lớn, focus rõ; mô tả dài cần bố cục thu gọn/mở rộng để Board không bị đẩy xuống quá xa. Không ẩn hoàn toàn nội dung hoặc CTA cần dùng.
4. Hoàn thiện navigation/back/hash và draft guard; hiện guard bắt các liên kết trong trang, chưa bao phủ mọi chuyển route từ lịch sử trình duyệt. Không công bố bảo vệ draft toàn diện.
5. Thiết kế thùng rác/restore riêng trước khi mở chức năng: quyền phục hồi, Project Archived, assignee đã rời, notification cũ, CAS và retention/purge phải được chốt. Soft delete hiện tại không đồng nghĩa có backup hoặc khả năng phục hồi trên UI.
6. Sau audit tương tác, hoàn thiện hierarchy, spacing, icon, ảnh minh họa, màu trạng thái và responsive theo nền visual Stitch/Jakarta/kem-tím đã chọn. Banner/ảnh phục vụ nội dung; không thêm slider hoặc số liệu không có nguồn dữ liệu thật chỉ vì mockup có.

## Kiểm chứng

- BE: 46 integration tests đạt, gồm Creator sau transfer, Member khác, field ngoài description, stale, Archived và mất membership; assertion kiểm Task/Comment thực sự còn trong DB sau xóa.
- FE: 12 tests đạt; build production kiểm riêng.
- `FE/scripts/check-interaction-flows.mjs`: fixture React/Express/Mongo cô lập kiểm vùng bấm card, sửa/đọc mô tả, nested dialog/Escape/khóa nền/giữ draft, input liên kết, CAS, quyền tác giả/assignee, Archived, cancel/confirm xóa mềm và không overflow desktop/mobile. Cần FE localhost:5173 đang chạy, Playwright qua WORKFLOW_PLAYWRIGHT_MODULE và browser qua WORKFLOW_BROWSER_EXECUTABLE nếu không có browser bundled.
- `FE/scripts/check-network-flows.mjs`: mất phản hồi/503 sau commit không tạo trùng Workspace/Project/Task/Comment; cancel tải lại kết quả. Các tests không dùng tài khoản thật hoặc SMTP/Google provider. Không xử lý hàng đợi mail dev cũ.
