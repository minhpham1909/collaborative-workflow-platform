# S3 — QA Workspace / Project collection

07/10/2026. [Contract](../ui-ux/WORKSPACE-S03-CONTRACT.md). Đạt cụm Workspace detail/Project collection, không nghiệm thu toàn UI hoặc Team management.

## Thay đổi

- Header, role/state, mô tả dài preview/expand, tabs, collection/filter thời gian và thẻ Project theo brand Stitch/Jakarta/kem–tím; cards 3/2/1 cột theo bề rộng thực tế. Link phủ cả thẻ; nút sửa riêng không bị link bắt click.
- Workspace DTO có permissions từ effectiveRole sau scoped access: standalone Owner, Manager, Org Owner/Admin. Member không có management CTA. Quản trị Org chưa có WS membership không có tab email override.
- Project name/icon create/edit có dialog, draft/validation/CAS/error/success. Workspace description/name dùng form cũ với quyền management và Archived guard đúng; không chỉ hardcode Owner.
- Archive/Unarchive Workspace có typed exact name + reason + version, pending/uncertain guard, focus/Escape/discard. Mở lại giữ trạng thái riêng của Project. Parent Archived hiện readonly cho cả Project còn Active.
- Task summary whole_project (total/done/percent) aggregate một lần cho page được phép đọc; loại trash, không N+1 hoặc số Sprint giả.
- Editor được tạo sau React commit (`immediatelyRender:false`), sửa console warning khi lazy/Suspense render chưa được gắn vào DOM.

## Bằng chứng

- FE14 unit PASS, build124 modules. BE integration42/42 (Workspace/work/Org/lifecycle), rồi20/20 (work + C5 retention) sau thêm assertions scoped summary/capabilities. Các retention/purge test dùng DB tạm, không worker dev.
- `FE/scripts/check-stitch-workspace.mjs`: real API + replica set tạm + browser; Owner/Member/Manager/Admin no-WS-membership, create/edit/readback, summary1/3=33.33% và trash exclusion, long description, filters/pagination15/page12, confirmation tên sai bị chặn, Archive/Unarchive, Project archive riêng không bị đổi.
- Live demotion lúc create đang mở: BE deny; inline error/draft còn, DB không tạo Project. CAS conflict lúc state dialog đang mở: không archive, giữ lý do. Response bị mất sau commit: một request, không retry, đóng và readback trạng thái thật. Network read failure không để card cũ trên trang; retry phục hồi scope.
- Escape dialog rỗng đóng và focus về nút mở; nested discard confirmation; regression `check-interaction-flows.mjs` PASS cả card click ngoài tên, metadata RichEditor, nested dialogs/Escape/drafts, safe link, Board/Task/comments, author/status/CAS/Archived.
- S1 Home và S2 Organization browser regression PASS, gồm scope isolation/demotion/search race/pagination và các màn ở5 widths.
- Screens `.local/stitch-workspace/projects-{1440,1280,1024,768,375}.png`; đã xem desktop/mobile và source Stitch PNG thực tế. Browser đo không tràn ngang cả5 sizes.
- Đã chụp/soi `archive-dialog.png`, `unarchive-dialog.png`; reason textarea dùng font/viền/bo góc chung, không còn control mặc định lệch editor/form. Build và S3 fixture pass lại sau chỉnh này.
- Skill `probe.mjs` chạy qua fixture-auth adapter; report `.local/stitch-workspace/probe-projects/report.json`: **0 Hỏng**, consoleErrors rỗng tại5 widths. Đã sửa tab email xuống dòng375 và badge11px thành12px. Không kết luận tất cả Gu findings sạch.

## Giới hạn / đối chiếu probe

- Focus ring giữ theo yêu cầu accessibility của dự án. Warm border palette, hierarchy18px/13px/card, nội dung tiến độ nhiều dòng và native date/select giữ theo brand + tương tác đang có. Gu flag còn; không che hoặc bỏ report.
- Probe so bóng mobile menu với account-dropdown đang đóng là phân loại theo DOM; project cards thực tế không dùng bóng. Header đo gap âm do các vùng trái/phải khác mục đích; screenshot xác nhận không đè controls.
- Short description do fixture đồng thời thay trong test; long preview/expanded đã kiểm trước đó. Ảnh là minh họa local, có fallback, không cover upload thật.
- Organization invitations/assignment/Manager recovery UI ở S4/S5; attached WS không lộ CTA lời mời standalone. Project description/Lead/Guest/Board ở S6; form mô tả hiện có vẫn chạy và được regression.
- No new custom RBAC, transfer, purge CTA, upload, locale switch hoặc backup claim. History-navigation draft guard vẫn cần S12. Không gửi SMTP/Google, không purge/backfill/data migration dev.
- API dev restart chỉ tiến trình project đã xác minh, health ready; Mongo27017/27018 giữ nguyên. Logs `.local/s3-api.log`, `.local/s3-api-error.log` không lỗi startup.
