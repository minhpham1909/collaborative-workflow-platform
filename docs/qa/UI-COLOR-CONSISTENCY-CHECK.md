# Kiểm tra đồng bộ màu UI — management và toàn site

12/10/2026. Patch theo phản hồi Workspace tabs / tư cách thành viên / cài đặt / email riêng vẫn trắng khi bật dark. Giữ bố cục Stitch, Jakarta, hệ kem–tím, hành vi và phân quyền hiện tại.

## Sửa tại nguồn

- CSS chung và CSS từng cụm dùng token `--wf-*`: nền, chữ, viền, màu trạng thái, selected/hover/focus, form, editor, tab, panel, dialog và shadow. `--studio-*` là alias của palette chung.
- Màu chữ trên ảnh dùng `--wf-on-image`; chữ trên nút nhấn dùng `--wf-on-accent`. Overlay/shadow/focus có giá trị riêng theo theme. Không dùng màu trắng của ảnh cho chữ của panel.
- Các panel quản lý Workspace độc lập/trực thuộc, membership, email, tổ chức, Project và Settings không còn nền trắng cố định ở CSS màn hình.
- Unit guard chặn hex/rgb/white/black ở CSS ngoài palette chung. Guard này ngăn một nguyên nhân tái phát; không thay thế kiểm tra giao diện thực tế.

## Kiểm chứng đã hoàn thành

- Tài khoản QA `pepe19092003@gmail.com`: **24 màn/tab mỗi theme Light và Dark, tiếng Việt, 1440px**. Workspace độc lập/trực thuộc: Members, Settings, Email; Workspace độc lập thêm Invitations. Org Members/Invitations/Audit; Project Labels/Guest/Guest Invitations/Reopen Requests; Home, Organizations, Workspace, My Tasks, Shared, Notifications, Task có bình luận/rỗng, Trash, Settings. Shell authenticated, theme đúng, contrast text được chọn và không overflow; không ghi dữ liệu nghiệp vụ. Temporary auth session thu hồi sau test.
- **8 W2 fixture journeys**: Light/Dark × Việt/Anh × 1440/375. Org → Workspace → Project → Task → Member My Tasks/status/comment → Inbox → Guest → Trash/restore. Checks contrast, đổi theme khi có draft, dữ liệu và quyền; riêng DB/API tạm.
- FE **23/23 unit** gồm color policy; production build và budget đạt. Entry 310,197 bytes; initial 411,621 bytes / gzip 128,729; largest chunk 395,893. Budget không thay đổi.

## Gate bổ sung đã đạt

- **12/12 lượt regression PASS** — sáu cụm management ở Light/Dark: Workspace, Workspace Team, Organization Team, Organization management/audit, Project management, Settings. Runner bật `WORKFLOW_COLOR_CHECKS=1`; snapshot đo màu sau khi transition 160ms đã kết thúc. Locator dialog snapshots được kiểm riêng; screenshot vẫn lưu khi check fail.
- **Theme foundation PASS**: system/manual/reload, OS change, metadata một hàng, 5 widths, 11 dark routes và carousel keyboard/reduced-motion/missing-image.

Bộ Team ban đầu thất bại vì expected busy-Back text tiếng Anh đã cũ; đổi selector theo `organizationText`, giữ nguyên assertion chặn Back, URL và đúng một revoke write. Lượt rerun Dark đã PASS. Mẫu audit trước dùng selector Project tabs sai đã được sửa; chỉ lượt đủ 24 màn mới được tính ở trên.

- **Auth Light/Dark PASS**: Login/Register/Recover/Verify/Reset, 5 widths; xác minh, recovery, token single-use/expired và lost-response khóa retry. Google SDK/verifier giả lập; không gửi email thật.

## Chạy lại

Từ repo root, đặt `WORKFLOW_PLAYWRIGHT_MODULE` và `WORKFLOW_BROWSER_EXECUTABLE` như các runner QA hiện tại. Đặt `WORKFLOW_REGRESSION_THEME=light` hoặc `dark`, `WORKFLOW_COLOR_CHECKS=1`; chạy lần lượt `FE/scripts/check-stitch-{workspace,workspace-team,team,team-management,project-management,settings,auth}.mjs`.

Audit đọc tài khoản QA: `node --env-file=BE/.env FE/scripts/check-management-theme.mjs --qa-account`, với `WORKFLOW_MANAGEMENT_THEME=light|dark`, locale mặc định `vi`. Báo cáo và ảnh ở `.local/theme-complete/` (ignored). Theme foundation dùng `FE/scripts/check-ui-foundation.mjs --qa-account`. Ảnh regression fixture vẫn ở các thư mục `.local/stitch-*` và bị ghi đè khi rerun; kết quả mỗi theme ghi nhận trong gate trên.

## Phạm vi và giới hạn

Computed-style contrast xét các selector có nội dung nhìn thấy, nền ancestor/gradient và ngưỡng 4.5:1 cho text thường. Không chứng nhận WCAG toàn app, không đo từng pixel ảnh hoặc mọi trạng thái có thể xảy ra. Ngoài QA đọc thật, mutations ở fixture riêng; không bật SMTP/moderation/purge, không backfill hoặc đổi collection dev. Không test provider thật trong patch màu.

R4 tích hợp slider vào banner và R5 fluid/density còn riêng; M2 pin, M3 chế độ danh sách, M4 lịch chưa triển khai. Patch này sửa đồng bộ màu, không thay các scope đó.
