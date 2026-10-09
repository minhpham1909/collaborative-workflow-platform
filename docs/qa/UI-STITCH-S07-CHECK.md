# S7 — QA Task detail

09/10/2026: **7a và 7b đạt trong phạm vi S7**. [Contract](../ui-ux/TASK-DETAIL-S07-CONTRACT.md).

- Full page và right panel từ Board, consistent metadata/read-only/editor/comments. Panel có focus trap/Escape/draft guard, Toàn trang, project return callback và expected-parent check. Same-scope Board refresh giữ filters/DOM để restore opener focus.
- Checklist UI structural save/add/remove/IDs preserved, Assignee tick only, unfinished Done cancel/confirm. Activity lazy/paged, action/fields/status/Vietnam dates; legacy unknown không bịa. Mutual composing/pending locks với comments và header.
- FE14 unit/build140 PASS; BE task-enrichment/reopen17 integration PASS (core API không thay). `check-stitch-task-detail.mjs` real browser/temp DB PASS: new third item, tick by Assignee no edit controls, checked retained after rename, Done warning cancel then confirm, activity, Guest no writes, Archived no writes,5 widths no overflow; panel dirty→Ở lại keeps draft, cancel→Escape close, refreshed opener focus.
- `check-interaction-flows.mjs` core regression PASS sau sửa close breadcrumb/current-URL drawer và deferred own delete navigation. Request busy guard không chặn route sau success; legacy full-page deletion returns Board, deleted Task unavailable/comments retained.
- Full-page screenshots `.local/stitch-task-detail/detail-{1440,1280,1024,768,375}.png`, viewport drawer screenshot `drawer-1440.png`. Full-page stitched screenshot không đại diện fixed overlay khi document đang scroll; dùng viewport để soi panel.
- Installed skill probe fresh scoped fixture per width: `.local/stitch-task-detail/probe-detail-{width}/report.json`;0 Hỏng/consoleErrors rỗng. Badge/eyebrow12px, checkbox accent và focus giữ; native controls/warm borders/shadow heuristics là Gu exceptions, không claim tất cả clean.
- Không đổi status schema/order, restore/purge, upload, reply/mention, notification providers hoặc moderation dev jobs. Tests chỉ DB tạm; live API/DB giữ. Không SMTP/backfill/purge/cleanup worker.

## S7b — Yêu cầu và duyệt mở lại

- Task detail/full-page/panel: gửi lý do và trạng thái đích, Task giữ Done khi chờ; lịch sử phân trang với người gửi/người xử lý/kết quả/ngày giờ Việt Nam. Guest không có controls/history; quyền action lấy từ server, kiểm lại Active và CAS khi ghi.
- Project management có hàng đợi pending cho người quản lý; link phân biệt xem với xem và duyệt. Đổi tab xóa dữ liệu tab trước ngay trong cùng cập nhật state, tránh render sai DTO trước khi effect chạy. Project projection bổ sung manageReopen, không mở rộng quyền nghiệp vụ.
- Duyệt/từ chối bắt buộc lý do, cấm tự duyệt. Có pending thì dropdown không bỏ qua review. Manager mở trực tiếp khi không có pending vẫn dùng reason dialog của S7a/core. Approval bỏ completedAt hiện tại, giữ lịch sử.
- FE14 unit/build141 PASS; BE reopen10 integration PASS; core interaction browser regression PASS. `FE/scripts/check-stitch-task-reopen.mjs` real React/Express/Mongo tạm PASS: request, Project queue, review conflict giữ draft, approve, self-review disabled, Lead reject, cooldown24h, rolling3/7d, Archive cancellation/read-only, lost response chỉ một write/khóa gửi/readback pending,5width không overflow/pageerror.
- Screens `.local/stitch-task-reopen/request-dialog.png`, `review-dialog.png`, `reopen-{width}.png`; skill probe mở lịch sử thật ở375/768/1024/1280/1440. Adapter khôi phục scroll đầu trang sau thao tác mở lịch sử, không đánh đồng auto-scroll do Playwright với app tự cuộn. Fresh app/default HTTP limiter cho scenario dài và từng width, không nới rate policy. Users service thật được nối fixture, không bỏ qua lỗi404.
- Probe:0 Hỏng; kiểm trực quan dialog/history/mobile. Warm borders/focus/shadow/header heuristics giữ theo brand/accessibility; mục history nhiều dòng là chi tiết lịch sử đầy đủ, không phải list-pane bên trái nên không cắt lý do. Giữ focus rõ theo yêu cầu người dùng. Gap các nút và tiêu đề cân dòng đã sửa.
- API4000 khởi động lại với projection mới, readiness ready. Mongo27017 hệ thống và27018 project giữ tiến trình/data. Không chạy SMTP/moderation/retention/purge queue, không backfill legacy.

Tiếp S8 My Tasks; S7 đạt không đồng nghĩa toàn UI hoặc production đã được nghiệm thu.
