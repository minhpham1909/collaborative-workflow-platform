# Vòng nâng cấp UI/UX sau QA dữ liệu

12/10/2026. Dùng Stitch local/Jakarta/kem–tím, thêm thư viện để hỗ trợ triển khai. Hoàn thành và kiểm từng patch trước khi chuyển; mỗi patch commit riêng. Giữ luồng/quyền/capabilities và không tạo dữ liệu thống kê giả vì mockup.

| Mốc | Nội dung | Trạng thái |
| --- | --- | --- |
| M1a | Lucide, Tailwind prefix/no Preflight; metadata cùng hàng và density My Tasks | Đạt; commit33550fa |
| M1b | System/Light/Dark, menu tài khoản, dark palette/core screens | R1–R3 đạt; bổ sung patch đồng bộ màu management/toàn site: token tại nguồn + Light/Dark regression; xem QA color consistency |
| M1c | Home ảnh/slider local, density và motion | R4 hero và R5 fluid/density đạt; xem QA riêng từng patch |
| M2 | Ghim Project cá nhân: BE persistence/current access, sidebar truy cập trực tiếp Kanban, Archived/mất quyền | Đạt; max20, redaction/unpin, Guest/Org access,8 browser cases; xem QA M2 |
| M3a | Notifications Chi tiết/Thu gọn, nhớ cách xem, giữ read/filter/cursor và return position | Đạt; bounded fresh return; xem QA M3 |
| M3b | Shared view controls áp từng collection; Team/audit giữ bảng phù hợp, lazy-load có fallback/guard | Đạt:6collections, Inbox opt-in max3pages/manual fallback; xem QA M3 |
| M4 | Lịch cá nhân riêng: deadline GMT+7, day counts đầy đủ từ BE, list ngày paged, Task panel, không hạn/readonly | Đạt; API counts đầy đủ + current scope,4cases/5width, live QA read-only |

[QA màu management/toàn site](../qa/UI-COLOR-CONSISTENCY-CHECK.md). Patch này xử lý lỗi nền trắng/chữ mất tương phản ở các tab quản lý; R4–R5 và M2–M4 giữ scope riêng.

[QA M1](../qa/UI-FOUNDATION-M1-CHECK.md). **R1–R5 và M2–M4 đạt các scoped gates; tiếp nghiệm thu web trực tiếp** theo [review và task](../ui-ux/M1-VISUAL-REVIEW-R1.md). Patch sửa lỗi theo user authorization đã triển khai; [QA repair](../qa/UI-M1-REPAIR-CHECK.md). M1 không có pin/calendar/notification mode; không coi UI framework tự tạo chất lượng UX. Canvas vẽ cần scope riêng nếu người dùng muốn tính năng đó; slider hiện tại là ảnh minh họa thủ công, không có autoplay. M2 phải chốt contract hiện trạng quyền trước UI; M4 không dùng12 Task đã tải ở My Tasks để tính lịch/thống kê.

Tiếp kiểm theme/spacing/state theo các cụm Workspace/Project/Task/Team trong mỗi mốc; đo overflow/focus/readonly/draft và Việt–Anh, desktop/mobile. Thực thi nhiều role bằng tài khoản thật theo lượt QA riêng; không mở worker/queue/providers từ việc chỉnh UI.

R4 đã đạt: [QA banner Home](../qa/UI-HOME-HERO-R4-CHECK.md). Slider hiện là nền trong banner, manual và không đổi dữ liệu/API. Tiếp R5 đo trước/sau layout ở100%.

R5 đạt: [QA số đo khung/density](../qa/UI-DENSITY-R5-CHECK.md). Main fluid/sidebar224/header71, grid theo vùng hiện có, font14 và dữ liệu giữ nguyên. Vòng repair R1–R5 kết thúc trong scope đã kiểm; bước kế ở thời điểm hoàn tất R5 là M2, nay M2–M3 đã hoàn thành.

M2 đã đạt: [contract](../ui-ux/PROJECT-PINS-M2-CONTRACT.md) và [QA](../qa/UI-PROJECT-PINS-M2-CHECK.md). Tiếp M3a Notifications Chi tiết/Thu gọn, sau đó M3b collection modes và M4 calendar.

M3a đạt: [QA collection views](../qa/UI-COLLECTION-VIEWS-M3-CHECK.md). Tiếp M3b; return anchor chỉ trong session trang, bounded20pages và re-fetch theo quyền hiện tại.

M3b đạt: [QA](../qa/UI-COLLECTION-VIEWS-M3-CHECK.md). Active next: M4 calendar; modes local/browser-scoped, Team/audit giữ bảng và lazy chỉ opt-in ở Inbox. Không coi pagination đã có là phải bật infinite scroll mọi nơi.

M4 đạt: [API/UI contract](../sds/PERSONAL-CALENDAR-M4-API-v0.1.md), [QA](../qa/UI-CALENDAR-M4-CHECK.md). M1–M4 đã triển khai trong scope, bước tiếp là user acceptance/thao tác trực tiếp và ghi nhận lỗi trước deploy; không tự mở providers/worker hoặc thaydata.
