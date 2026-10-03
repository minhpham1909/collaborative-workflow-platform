# Công cụ thiết kế UI/UX — đề xuất

Nghiên cứu 03/10/2026. Đây là đề xuất theo yêu cầu xem xét Stitch/Figma, chưa phải quyết định chọn công cụ của chủ dự án và chưa tạo file thiết kế trên dịch vụ bên ngoài.

## Khuyến nghị cho dự án

Figma Design làm bản thiết kế chính: tổ chức foundations/components/screens/states, prototype và handoff FE. Stitch tùy chọn để thử 2–3 hướng bố cục từ cùng brief, rồi chọn một hướng và chuẩn hóa trong Figma. Không bắt buộc sử dụng hai công cụ: dùng Figma trực tiếp phù hợp nếu muốn giảm việc chuyển đổi.

| Tiêu chí của dự án | Stitch | Figma |
|---|---|---|
| Tìm hướng visual nhanh từ mô tả | Canvas AI/ngôn ngữ tự nhiên, iterate và prototype; phù hợp khám phá | Có thể bắt đầu trực tiếp với wireframe/components; phù hợp quản lý thiết kế lâu dài |
| Đồng bộ nhiều module/trạng thái quyền | DESIGN.md import/export rules; cần review lại mọi business state | Components/variants/variables/auto layout hỗ trợ hệ thống dùng lại |
| Nối với FE React JS/JSX của repo | Xem output là tham khảo; mapping API/auth/routes phải tự kiểm | Dev Mode/MCP hỗ trợ lấy context; code vẫn theo kiến trúc repo và API đã có |
| Cách dùng trong lượt này | Chưa có tool Stitch trong session; đã nghiên cứu nguồn chính thức | Session có tools Figma; chưa kiểm login/plan/file vì chưa cần ghi canvas |

Nhận định phù hợp dự án ở bảng là suy luận của assistant từ capabilities chính thức, không kết quả benchmark trực tiếp. Không so giá/gói/quota khi chưa biết account/plan; không cần mua gói để quyết định bố cục. Tính năng từng plan phải kiểm khi bắt đầu thao tác thực tế.

Google đã bổ sung canvas AI, prototype, DESIGN.md và iteration thời gian thực. Nguồn: [Stitch canvas và DESIGN.md](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/), [DESIGN.md open specification](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/), [Stitch May 2026 update](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/). Không giả định khả năng export trực tiếp Stitch → Figma hiện tại; nguồn mới nhắc Google AI Studio/Antigravity/Netlify, cần thử account/export nếu muốn chuyển layers.

Figma có [components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma), [variants](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants), [variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma), [auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma), [Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode), [MCP context](https://www.figma.com/blog/introducing-figma-mcp-server/). Đây là lý do chọn Figma làm nguồn thiết kế đề xuất; không hứa sinh production code đúng nghiệp vụ tự động.

## Quy trình đề xuất

1. Dùng [brief chung](DESIGN-BRIEF-v0.1.md), screen flows và API hiện tại để dựng foundations + navigation chung.
2. Chọn visual direction từ 2–3 bố cục My Tasks/Board/Task Detail. Nếu thử Stitch, chỉ đưa brief và dữ liệu giả; không cần env/secrets/DB thật.
3. Chuẩn hóa tokens/component variants và responsive frames trong Figma. Giữ tên/layout chung across Việt/English, thử label dài và tiếng Việt có dấu.
4. Thiết kế lần lượt Auth/Profile → Workspace/Invitations → Project/Task/Comment → Notifications/Settings; review empty/loading/error/permission/conflict mỗi module.
5. FE JSX nối API thật theo contracts; test mọi quyền từ BE, không coi nút bị ẩn là kiểm tra bảo mật. Design handoff ghi component mapping, routes, request/response và unavailable states.

Không thêm storage/upload, thông báo ghim chưa có BE, hoặc tính năng mới chỉ vì mẫu AI gợi ý. Figma Make/Stitch code output không tự thay Express/Mongoose/React hoặc auth đã chốt.
