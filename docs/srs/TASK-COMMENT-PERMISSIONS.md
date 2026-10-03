# Quyền Task và Comment đã chốt

Ngày: 01/10/2026. Người duyệt: chủ dự án qua trao đổi trong chat. Đã xác nhận “người được uỷ quyền” chính là Assignee được giao Task, không có người thứ ba hoặc cơ chế cấp quyền riêng.

## Ma trận quyền Task

Các quyền ghi chỉ có hiệu lực khi User còn membership trong Workspace và Project Active. Quyền được cộng nếu User đồng thời là nhiều quan hệ/vai trò.

| Hành động | Owner Workspace | Task Creator | Assignee, không là Owner/Creator | Member khác |
|---|---|---|---|---|
| Xem Task/Board | Có | Có | Có | Có |
| Đổi status | Có | Có | Có | Không |
| Sửa title/description/deadline | Có | Có | Không | Không |
| Đổi/bỏ assignee | Có | Có; assignee mới phải là thành viên hiện tại | Không | Không |
| Xóa Task | Có | Có | Không | Không |

Ví dụ: An tạo Task giao cho Bình. An sửa/phân công/đổi status/xóa được; Bình chỉ đổi status nếu không đồng thời là Owner. Chi là Member khác chỉ xem Task theo quyền Workspace, không edit/delete hoặc đổi status. Owner Workspace quản lý Task theo quyền Owner.

Đổi assignee từ Bình sang Chi chuyển quyền riêng đổi status cho Chi. Bình mất quyền từ assignee nhưng vẫn có quyền nếu là Creator/Owner. Assignee đã rời chỉ còn là danh tính lịch sử ở Task Done, không giữ quyền thao tác; tái gia nhập theo OD-01. Không có phân quyền bắc cầu để assignee cấp quyền cho người thứ ba.

## Quyền Comment

Comment chỉ chính Author còn membership được sửa/xóa trong Project Active. Task Creator, Assignee và Owner không được sửa/xóa Comment người khác. Owner có quyền Author với Comment do chính họ viết.

Ví dụ: An tạo Task, Bình viết Comment; An không được sửa/xóa Comment của Bình. Quyền quản lý Task không phải quyền biên tập Comment của người khác.

Nếu Owner/Creator xóa Task, Comments thuộc Task cũng không còn truy cập được theo UC-20; đây là tác động xóa Task, không phải quyền xóa Comment riêng. Cơ chế hard/soft delete và retention vẫn chờ OD-11/SDS.

## Điều kiện và thiết kế

- Project Archived vẫn chỉ đọc với thao tác người dùng, kể cả Owner. Owner phải mở lại Project trước khi sửa Task/Comment.
- Creator/Author đã rời Workspace không còn quyền ghi chỉ vì giữ User ID lịch sử.
- Board chỉ hiển thị khả năng kéo/đổi status cho Owner/Creator/Assignee hiện tại; Member khác vẫn xem/mở Task.
- Task Detail tách quyền đổi status, sửa nội dung, phân công và xóa; không dùng một cờ editable chung.
- Backend suy ra Workspace/Project/Creator/Assignee từ dữ liệu thật, kiểm tra quyền và membership ở lúc lưu; không tin các cờ quyền do client gửi.
- Tạo Task/thêm Comment vẫn theo baseline draft hiện có; câu trả lời này chưa tự chốt toàn bộ quyền tạo.

## Tiêu chí nghiệm thu đã đưa vào SRS/UC

- Owner/Creator thao tác Task theo quyền trong Active; Assignee chỉ đổi status khi không có quyền Owner/Creator; Member khác bị từ chối ghi qua API.
- Thay assignee/ownership/membership trong lúc form mở kiểm tra lại lúc lưu.
- Owner/Creator/Assignee không sửa/xóa Comment của Author khác; Author đã rời không còn quyền ghi.
- Board và Task Detail dùng cùng ma trận quyền; phân công mới vẫn cần membership hiện tại.

SRS/JSON đã đồng bộ UC-19/20/21/24 và BR-09/10; công cụ kiểm tra tài liệu đã qua. Chưa có code hoặc test nghiệp vụ chứng minh các quyền này.

## Những phần chưa được duyệt từ quyết định này

Status transitions, sort/pagination Board, default/filter My Tasks, conflict OD-04/05/06, retention OD-11 và các nghiệp vụ khác vẫn review riêng. Không xem việc chốt quyền là duyệt toàn bộ thiết kế Kanban/My Tasks.
