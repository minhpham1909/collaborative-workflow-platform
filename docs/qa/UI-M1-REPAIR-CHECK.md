# R1–R3 — Patch sửa lỗi theme

12/10/2026. User đã cho triển khai sửa lỗi trước khi tích hợp tính năng mới. Giữ R4/R5 bố cục và M2–M4 tính năng trong plan; không dựng pin/calendar ở patch sửa màu.

## R1 — Shared surfaces

Token hóa hero gradient/description, EmptyState và badge foreground/background tại nguồn styles.css; theme.css cấp palette theo mode. Error feedback dùng cặp nền/chữ rõ ràng. Không đổi text, count, query, pagination, spacing hoặc quyền.

Kiểm browser trên QA account hiện có: Shared empty và empty comment, Light/Dark; nền Shared hero đổi theo palette, empty không còn trắng trong dark; assert contrast Empty/badge>=4.5. Các route style snapshots ở.local/theme-fixes/. Token metadata/editor đã chuẩn bị nhưng R2 sửa source liên quan ở patch kế tiếp. Browser chỉ đọc, Session QA thu hồi; không mail/worker/data nghiệp vụ.

R2/R3 đang triển khai; chưa đóng lại toàn gate visual.
