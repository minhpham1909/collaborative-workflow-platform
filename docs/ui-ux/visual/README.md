# Visual design v0.1 — hướng teal

03/10/2026. Chủ dự án yêu cầu triển khai visual sau khi bố cục lõi ổn. [Mẫu tương tác](index.html), [Home](home-desktop.png), [Board](board-desktop.png), [Task Detail](task-desktop.png). Đây là hướng design cụ thể để review, chưa coi palette/brand đã được duyệt cuối cùng.

## Hướng thiết kế

Nền sáng, sidebar xanh đậm, accent teal; typography Segoe UI/system hỗ trợ tiếng Việt, không tải font ngoài. Card có icon/spacing/border/shadow nhẹ, CTA chính teal, nhãn Owner/Active mint, deadline quá hạn đỏ kèm chữ, Board status có dot khác màu và tên. Task panel có phân cấp title/status/metadata/description/comments, avatar initials và toolbar editor placeholder.

Token trong theme.css: canvas #f4f7f8; surface #fff; ink #17333c; muted; accent #0f766e; sidebar #102e33; danger #b42334; radius chủ yếu 8–14px. Spacing dùng các cấp 8/12/16/20/24/32, density vừa phải; shadows nhỏ. Icons là SVG nội bộ, không phụ thuộc icon package, hình ảnh AI hoặc remote asset.

## Phạm vi và tương tác

Home, Workspace Projects, Board, My Tasks, Task/Comments, forms tạo/sửa mock. Quyền Owner/Member toggle trong thanh demo ngoài nội dung app. Core.js là snapshot hành vi wireframe ở thời điểm tạo visual; visual.js trang trí theo DOM, không thay BE hoặc production FE. Dữ liệu memory giả, không email/User/Task thật; reload reset. Search trong mock không chứng minh server search. Editor vẫn text thuần; Auth/Members/Settings/Notifications/error/conflict frames ở batch sau. Không thêm priority/subtask/file modules hoặc KPI để lấp bố cục.

## Xem trên máy tính

Mở index.html trực tiếp trong browser, hoặc chạy từ repo:

```text
node docs/ui-ux/visual/serve.cjs
```

Sau đó mở http://127.0.0.1:4174/. Board đích #board:p1, Task #task:t1, My Tasks #mine. Server loopback chỉ phục vụ allowlist artifacts, không workspace/.env; có thể chọn port bằng VISUAL_PREVIEW_PORT. Không đổi auth harness hoặc API đang chạy. Prototype không phải deployment public.

## Kiểm tra

Đã kiểm các luồng navigation/filter/back/role/Archived/comments/My Tasks/create Workspace trên browser với dữ liệu mẫu; không có script error. Screenshots desktop 1440px và kiểm 360/390px không overflow. Visual đã xem ảnh Home/Board/Task để kiểm phân cấp, spacing và nội dung dài. Laptop 1280px/HTTP preview các route lõi đạt, không tràn ngang hoặc script error; server trả 404 cho đường ngoài allowlist. Đã tăng contrast chữ phụ: muted/canvas 4,82:1, CTA white/teal 5,47:1; đây là hai cặp kiểm, không chứng nhận toàn bộ accessibility. Chưa thay kiểm i18n, rich editor hoặc BE integration. Không gửi mobile preview mỗi lượt theo ưu tiên review desktop của chủ dự án.

Hướng này làm đầu vào component/tokens; mở rộng các screen/state còn thiếu sau review, rồi mới chọn libraries/production FE. Figma vẫn bước sau, không mua tool để tạo artifact này.
