# R1–R3 — Patch sửa lỗi theme

12/10/2026. User đã cho triển khai sửa lỗi trước khi tích hợp tính năng mới. Giữ R4/R5 bố cục và M2–M4 tính năng trong plan; không dựng pin/calendar ở patch sửa màu.

## R1 — Shared surfaces

Token hóa hero gradient/description, EmptyState và badge foreground/background tại nguồn styles.css; theme.css cấp palette theo mode. Error feedback dùng cặp nền/chữ rõ ràng. Không đổi text, count, query, pagination, spacing hoặc quyền.

Kiểm browser trên QA account hiện có: Shared empty và empty comment, Light/Dark; nền Shared hero đổi theo palette, empty không còn trắng trong dark; assert contrast Empty/badge>=4.5. Các route style snapshots ở.local/theme-fixes/. Token metadata/editor đã chuẩn bị nhưng R2 sửa source liên quan ở patch kế tiếp. Browser chỉ đọc, Session QA thu hồi; không mail/worker/data nghiệp vụ.

R1/R2 sửa lỗi đã đạt trong scope; R3 xác nhận ma trận dưới đây, không suy mọi route/state đều đã nghiệm thu.

## R2 — Task/comment/editor/dialog

Metadata/nhãn/value/overdue, vùng mô tả và bình luận dùng semantic palette; editor toolbar/link/border/focus và form hint/error theo theme. Rà thêm confirmation dialog: paragraph cố định tạo contrast3.14:1 trong dark; sửa cùng token. Danger action giữ cặp màu cảnh báo ở cả hai mode.

Regression S7a đã PASS: checklist CAS/ID/tick, Done incomplete cancel/confirm, activity, Guest/Workspace Archived readonly, drawer draft/focus return và5width. Browser trên QA account: Task empty/populated ởLight/Dark không còn metadata/comment nền sáng ngoài ý muốn. Journey fixture mới Vi/Dark1440 PASS cả contrast metadata/empty/editor/link/dialog, chuyển theme từ tab khác giữ draft, cancel không tạo comment; Guest Shared populated/no-result/503 retry/Archived, unassigned/fullpage và readonly.

Kiểm Shared populated còn tìm ra surface-link::after phủ ngoài card, chặn Refresh; .card có position:relative để giới hạn hit area. Test click thật Refresh/Retry đã PASS, không force click. Hành trình vẫn giữ code/comments khi restore và không replay notifications. Ma trận R3 đã đạt8cases Light/Dark×Vi/En×1440/375, chạy tuần tự trên fixture riêng.

## R3 — Coverage và gate sửa lỗi

- Journey8/8 PASS: normal UI CRUD/capabilities/return flow; contrast hero/empty/shared cards/metadata/link/editor/confirm/unread; Shared populated/no-result/503 error→Retry, active/Archived; Task panel/fullpage, có/không comment, chưa phân công/quá hạn/readonly; theme đổi từ tab khác giữ draft và cancel không thêm comment.
- check-ui-foundation trên QA account đọc thật:11 màn dark có assert heading/empty/metadata/identifier/unread contrast;5width Light/Dark metadata cùng dòng, System/manual/reload/OS switch và slider controls vẫn PASS. Bổ sung Shared, Task empty, Org directory/detail, Trash vào bộ kiểm trước. Chỉ xem dữ liệu, Session riêng thu hồi finally.
- R3 còn phát hiện Org hero có gradient endpoint sáng trong dark và Team table hover sáng; thay endpoint/hover bằng semantic tokens, giữ màu Light. Qua ảnh Task tìm thêm priority-low và mint label text xanh đậm trên nền tối; cặp màu dùng wf-success/wf-mint.
- Kiểm ảnh sau sửa: Shared dark hero/empty và Task empty metadata/comments đọc rõ, không có khối trắng ngoài ý muốn. Không coi screenshot tự sinh là PASS.
- FE22/22, S7a Task/checklist/draft/readonly5width, build/budget PASS: entry310.20kB/initial411.62kB/gzip128.72kB/largest395.89kB. Không đổi hoặc nới budget.

assertReadable đo rendered foreground/background, compositing rgba ancestors và endpoint gradient; kiểm4.5:1 cho text thường và3:1 cho heading lớn. Strict visibility để không đo sidebar ẩn trên mobile; badge mobile kiểm trong drawer đang mở. Unsupported color format làm fail, không coiNaN làPASS. Đây là checks cho các selector đã chọn, không là chứng nhận WCAG toàn app hoặc pixel contrast của mọi ảnh/opacity.

Ngưỡng gate cũ được giữ, bổ sung checks đúng state. Lượt lỗi dialog3.14:1, Shared stretched-link chặnRefresh và Org gradient1.00:1 không được tínhPASS trước khi sửa. 503 console trongjourney là failure injection; retry và dữ liệu được kiểm, không phải provider thật.

Các flow chưa được suy từ tests này: mọi Ban/transfer/invite/verify/reset/provider-live, mọi tình huống stale permissions/loading và mọi editor popup. Tiếp audit theo từng cụm khi phát triển; không gọi toàn app đã hoàn hảo.

## Tiếp theo

R1–R3 đã đạt gate patch sửa lỗi trong phạm vi trên. R4 slider hòa vào nền hero và R5 fluid/density còn pending; sau đó M2 pin, M3 list modes/lazy-load, M4 calendar. Không thay layout/zoom/slider composition hoặc thêm tính năng trong patch này. Dữ liệu QA cũ giữ nguyên; không bật SMTP/moderation/retention worker hoặc backfill.

Từrepo root:

```powershell
# Fixture journey: đổi theme/language/width để chạy8case tuần tự.
$env:WORKFLOW_JOURNEY_THEME='dark'
$env:WORKFLOW_JOURNEY_LANGUAGE='vi'
$env:WORKFLOW_JOURNEY_WIDTH='1440'
node FE/scripts/check-web-journey.mjs
# Tài khoản QA đã seed; chỉ đọc nghiệp vụ.
node --env-file=BE/.env FE/scripts/check-ui-foundation.mjs --qa-account
```

Playwright/Edge thông qua WORKFLOW_PLAYWRIGHT_MODULE/WORKFLOW_BROWSER_EXECUTABLE như các runner trước. Không thêm test dependencies.Ảnh.local/web-journey/owner-restored-{theme}-dev-{locale}-{width}.png và.local/ux-upgrade/ignored.


## Bổ sung audit management ngày 12/10/2026

User phát hiện các tab quản lý chưa thuộc coverage R1–R3 cũ. Đã mở rộng patch tại nguồn CSS và kiểm toàn bộ cụm management cùng các route chính; [kết quả và phạm vi kiểm tra](UI-COLOR-CONSISTENCY-CHECK.md). Phạm vi cũ ở trên là lịch sử, không dùng để suy coverage các tab quản lý. R4–R5 vẫn riêng.
