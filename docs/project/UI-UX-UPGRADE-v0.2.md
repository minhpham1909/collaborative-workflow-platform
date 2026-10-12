# Vòng nâng cấp UI/UX sau QA dữ liệu

12/10/2026. Dùng Stitch local/Jakarta/kem–tím, thêm thư viện để hỗ trợ triển khai. Hoàn thành và kiểm từng patch trước khi chuyển; mỗi patch commit riêng. Giữ luồng/quyền/capabilities và không tạo dữ liệu thống kê giả vì mockup.

| Mốc | Nội dung | Trạng thái |
| --- | --- | --- |
| M1a | Lucide, Tailwind prefix/no Preflight; metadata cùng hàng và density My Tasks | Đạt; commit33550fa |
| M1b | System/Light/Dark, menu tài khoản, dark palette/core screens | R1–R3 đạt; bổ sung patch đồng bộ màu management/toàn site: token tại nguồn + Light/Dark regression; xem QA color consistency |
| M1c | Home ảnh/slider local, density và motion | Control đã PASS; composition chưa đạt yêu cầu mới: slider tích hợp banner và density fluid; R4–R5 |
| M2 | Ghim Project cá nhân: BE persistence/current access, sidebar truy cập trực tiếp Kanban, Archived/mất quyền | Chưa triển khai |
| M3a | Notifications Chi tiết/Thu gọn, nhớ cách xem, giữ read/filter/cursor và return position | Chưa triển khai |
| M3b | Shared view controls áp từng collection; Team/audit giữ bảng phù hợp, lazy-load có fallback/guard | Chưa triển khai |
| M4 | Lịch cá nhân riêng: deadline GMT+7, day counts đầy đủ từ BE, list ngày paged, Task panel, không hạn/readonly | Chưa triển khai |

[QA màu management/toàn site](../qa/UI-COLOR-CONSISTENCY-CHECK.md). Patch này xử lý lỗi nền trắng/chữ mất tương phản ở các tab quản lý; R4–R5 và M2–M4 giữ scope riêng.

[QA M1](../qa/UI-FOUNDATION-M1-CHECK.md). **R1–R3 sửa lỗi đã đạt scoped gate; tiếp R4–R5 trước M2** theo [review và task](../ui-ux/M1-VISUAL-REVIEW-R1.md). Patch sửa lỗi theo user authorization đã triển khai; [QA repair](../qa/UI-M1-REPAIR-CHECK.md). M1 không có pin/calendar/notification mode; không coi UI framework tự tạo chất lượng UX. Canvas vẽ cần scope riêng nếu người dùng muốn tính năng đó; slider hiện tại là ảnh minh họa thủ công, không có autoplay. M2 phải chốt contract hiện trạng quyền trước UI; M4 không dùng12 Task đã tải ở My Tasks để tính lịch/thống kê.

Tiếp kiểm theme/spacing/state theo các cụm Workspace/Project/Task/Team trong mỗi mốc; đo overflow/focus/readonly/draft và Việt–Anh, desktop/mobile. Thực thi nhiều role bằng tài khoản thật theo lượt QA riêng; không mở worker/queue/providers từ việc chỉnh UI.
