# R1–R3 — Patch sửa lỗi theme

12/10/2026. User đã cho triển khai sửa lỗi trước khi tích hợp tính năng mới. Giữ R4/R5 bố cục và M2–M4 tính năng trong plan; không dựng pin/calendar ở patch sửa màu.

## R1 — Shared surfaces

Token hóa hero gradient/description, EmptyState và badge foreground/background tại nguồn styles.css; theme.css cấp palette theo mode. Error feedback dùng cặp nền/chữ rõ ràng. Không đổi text, count, query, pagination, spacing hoặc quyền.

Kiểm browser trên QA account hiện có: Shared empty và empty comment, Light/Dark; nền Shared hero đổi theo palette, empty không còn trắng trong dark; assert contrast Empty/badge>=4.5. Các route style snapshots ở.local/theme-fixes/. Token metadata/editor đã chuẩn bị nhưng R2 sửa source liên quan ở patch kế tiếp. Browser chỉ đọc, Session QA thu hồi; không mail/worker/data nghiệp vụ.

R2/R3 đang triển khai; chưa đóng lại toàn gate visual.

## R2 — Task/comment/editor/dialog

Metadata/nhãn/value/overdue, vùng mô tả và bình luận dùng semantic palette; editor toolbar/link/border/focus và form hint/error theo theme. Rà thêm confirmation dialog: paragraph cố định tạo contrast3.14:1 trong dark; sửa cùng token. Danger action giữ cặp màu cảnh báo ở cả hai mode.

Regression S7a đã PASS: checklist CAS/ID/tick, Done incomplete cancel/confirm, activity, Guest/Workspace Archived readonly, drawer draft/focus return và5width. Browser trên QA account: Task empty/populated ởLight/Dark không còn metadata/comment nền sáng ngoài ý muốn. Journey fixture mới Vi/Dark1440 PASS cả contrast metadata/empty/editor/link/dialog, chuyển theme từ tab khác giữ draft, cancel không tạo comment; Guest Shared populated/no-result/503 retry/Archived, unassigned/fullpage và readonly.

Kiểm Shared populated còn tìm ra surface-link::after phủ ngoài card, chặn Refresh; .card có position:relative để giới hạn hit area. Test click thật Refresh/Retry đã PASS, không force click. Hành trình vẫn giữ code/comments khi restore và không replay notifications. Ma trận locale/theme/width R3 đang chạy tiếp.
