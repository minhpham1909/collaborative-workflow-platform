# Phạm vi wireframe đợt đầu

Ngày 03/10/2026. Đầu vào đã rõ đủ để bắt đầu wireframe; tài liệu này là brief, chưa phải wireframe hoàn chỉnh.

## Luồng chính

Personal Home/Welcome → Workspace overview → Project Board → Task Detail/editor/Comments. My Tasks và Notifications là lối vào khác tới Task Detail với cùng kiểm tra quyền. Auth/invitation được nối tiếp để kiểm chứng first-use, không triển khai trước khi thiết kế auth.

## Màn hình đầu tiên cần vẽ

| Màn hình | Nội dung và state trọng tâm |
|---|---|
| App shell | Điều hướng cá nhân/Workspace, breadcrumb, switch Việt/English và user menu |
| Personal Home | Workspace đang tham gia, vai trò, tạo Workspace; welcome khi chưa có nhóm |
| Workspace overview | Project Active/Archived, tìm/lọc theo phạm vi đã thiết kế; Owner tạo/quản lý, Member xem |
| Project Board | Ba cột, sort/search/time đã chốt; loading/empty/error/read-only; tải thêm còn là đề xuất nhóm 6 |
| Task Detail | Title, assignee, deadline/status, editor chung, quyền Owner/Creator/Assignee/Author, conflict và Comments |
| My Tasks | Assigned-to-me, default Active/chưa Done, filter Done/Archived, context Workspace → Project, sort/search/time chung |

Desktop/mobile và cả hai ngôn ngữ; editor states, missing permissions, target deleted và mất membership sau tải. Nút hiển thị không thay backend authorization. Luồng thao tác và dữ liệu cần thống nhất với DATA-MODEL-v0.1.md trước chọn thư viện UI.

## Đầu ra review

Wireframes desktop/mobile cùng action/state mapping. Sau đó chọn component/editor/router/query libraries cần thiết và viết API contract. Không khóa thư viện FE trước khi có yêu cầu sử dụng cụ thể; không mở rộng file upload/storage increment từ wireframe editor.
