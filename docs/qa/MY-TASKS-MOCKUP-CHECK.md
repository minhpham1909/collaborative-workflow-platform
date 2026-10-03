# Kiểm tra bản mẫu My Tasks

Ngày: 01/10/2026. Phạm vi: bản mẫu tương tác dùng dữ liệu minh họa, không phải ứng dụng thật. Có hai phương án trình bày Danh sách và Thẻ công việc; chọn Danh sách làm hướng thiết kế mặc định, cả hai giữ cùng thứ tự thời gian tạo.

Cập nhật: có thêm màn hình Kanban Project để kiểm tra cùng search động/bộ lọc thời gian với My Tasks; cả Danh sách/Thẻ/Kanban giữ nguyên quy tắc sort mới tạo trước.

| Kiểm tra | Kết quả |
|---|---|
| Thứ tự ban đầu và khi xem toàn bộ sample | Mới tạo trước, không phụ thuộc deadline |
| Filter Workspace và quá hạn; reset | Thay đổi kết quả đúng trên dữ liệu mẫu |
| Project Archived | Không đổi status trong bản mẫu |
| Assignee đổi status trong Active | Thay đổi local và phản ánh filter, giữ thời gian tạo |
| Giao diện desktop và 360 px | Đã kiểm tra ảnh render; không tràn ngang |
| Lỗi JavaScript lúc thực hiện các thao tác trên | Không ghi nhận |
| Search title/description, bỏ dấu và hoa thường, nhiều lần nhập nhanh | Kiểm tra trên dữ liệu mẫu; query mới nhất quyết định kết quả sau debounce |
| Filter Ngày tạo/Deadline, biên ngày kết thúc theo giờ Việt Nam | Kết quả mẫu phù hợp; không deadline bị loại khi có khoảng Deadline |
| Khoảng Từ > Đến | Báo lỗi, giữ kết quả gần nhất; không giả trả 0 kết quả |
| Preset Hôm nay và reset | Phù hợp ngày mẫu, reset xóa search/thời gian và giữ defaults riêng mỗi màn hình |
| Search/time trong Kanban và layout 360 px | Project scope, ba cột/tổng số theo kết quả mẫu; không tràn ngang |

Các kết quả trên không chứng minh backend permissions, persistence, concurrency, phân trang dữ liệu thật hoặc NFR. Eligibility/default/Archived filters vẫn là đề xuất nghiệp vụ chưa tự được duyệt từ bản mẫu.

Chưa chứng minh response API cũ không ghi đè response mới; kiểm tra nhập nhanh hiện tại chỉ xác nhận debounce local. Search toàn tập dữ liệu thật, index, giới hạn query và security còn cần SDS/code/test tương ứng.
