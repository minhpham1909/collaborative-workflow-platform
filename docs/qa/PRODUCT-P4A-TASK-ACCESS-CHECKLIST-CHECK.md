# P4a — Task panel, mất quyền, checklist và reopen

15/10/2026. Native Workspace-only, API/Mongo/browser riêng; không ghi dữ liệu dev, gửi thư hoặc chạy worker/deploy.

## Ca kiểm tra

- Guest mở Task panel từ Board và nhập bình luận. Owner thu hồi ProjectGuest qua service khi panel đang mở: POST comment404, không có comment mới và draft còn trong composer.
- Một phiên Guest mới mở cùng Task: GET không khả dụng, không render tiêu đề/nội dung/comments. Không tuyên bố xoá ngay nội dung đã render trong panel cũ hoặc push realtime khi mất quyền. Panel cũ giữ draft để người dùng tự xử lý.
- Owner sửa cấu trúc checklist qua UI, tạo hai mục. Member là assignee không có nút sửa cấu trúc nhưng tick được mục hiện có; service xác nhận1/2.
- Owner chọn Done khi checklist chưa đủ: Cancel giữ Task chưa Done; chọn lần nữa và xác nhận cho phép hoàn thành.
- Member gửi yêu cầu mở lại. Owner mở dialog approve, rồi thu hồi membership của người gửi qua service trước submit. Request được lifecycle chuyển cancelled; dialog cũ gửi nhận409 VERSION_CONFLICT vì request version đã đổi. Task vẫn Done và không có pending request.
- Browser Light/VI1440 và Dark/EN375; không pageerror. Guest404 và stale approval409 là lỗi có chủ đích. Checkbox là controlled async nên test dùng click rồi đợi state/DB, không giả định cập nhật ngay trước phản hồi.

Script FE/scripts/check-product-task-access-checklist.mjs; log .local/p4a-*.log. Không sửa code sản phẩm trong patch này: các ca trên đạt với logic hiện tại. Không chạy lại build/full suite cho thay đổi chỉ có acceptance script và tài liệu.

## Còn lại P4b

Nhãn/priority/deadline; sửa/xoá bình luận của tác giả; lỗi mạng và draft của các thao tác này; bố cục Board/detail ở các trạng thái dữ liệu dài, trống, archived/trash. P4a không thay thế đợt nghiệm thu visual/responsive toàn bộ P4.
