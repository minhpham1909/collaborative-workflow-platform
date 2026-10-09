# S8 — QA My Tasks

09/10/2026: S8 đạt trong phạm vi My Tasks. [Contract](../ui-ux/MY-TASKS-S08-CONTRACT.md).

- Đối chiếu Stitch local: summary/filter pills/group headings/Task rows/metadata, cream-indigo-Jakarta, desktop/mobile. Không sao chép số liệu tăng trưởng/Sprint, tạo personal Task, calendar/Board tabs hoặc bulk actions chưa có nghiệp vụ.
- `FE/scripts/check-stitch-my-tasks.mjs`: real React/Express/temporary Mongo PASS.17 open tasks từ2 Workspaces,12 trang đầu và17 sau tải thêm;14 no-deadline counts đầy đủ. All thêm Done đúng nhóm, deadline past Done không overdue. Hidden unassigned/other assignee bị loại.
- Workspace/Project/label/priority filter, scope select paging, reset; tìm kiếm late response bị bỏ; invalid dates không HTTP/no stale rows; error/empty/retry; Archived đọc-only; mất membership rồi refresh loại Tasks, rejoin fixture hợp lệ; panel close/full-page return giữ query. Không provider/queue/dev collection.
- FE15 unit PASS (thêm test filter roundtrip/return destination); build145 PASS. BE enrichment/work19 integration PASS, gồm Project filter giữ count full-set và outsiders0, invalid ObjectId rejects, deadlines/Vietnam boundary/lifecycle/privacy. Core browser regression PASS; selector cập nhật phân biệt title/panel và link toàn trang, không bỏ assertions nghiệp vụ.
- Screens `.local/stitch-my-tasks/mine-{1440,1280,1024,768,375}.png`; installed skill probe `.local/stitch-my-tasks/probe-mine-{width}/report.json`. Probe0 Hỏng cả5width, console sạch, không tràn ngang. Vùng bấm Workspace/Project tăng32 desktop/44 touch; title dài text-pretty. Thanh tìm kiếm tablet từng co về0px đã sửa flex basis/min-width/wrap theo scope My Tasks.
- Các điểm Gu còn lại: focus rings giữ theo user accessibility; native date/select dùng component hiện tại; warm borders/overlay shadow theo brand; heuristic sidebar đang nhận nhầm các Task title là navigation, giữ heading của row; row nhiều dòng là rich grouped rows theo Stitch, không phải sidebar list pane nên không cắt metadata quan trọng. Không claim tất cả heuristics đều clean.
- Default HTTP rate policy giữ nguyên. Scenario dài và từng probe width dùng fresh app/limiter trên cùng fixture DB/auth; không tăng rate để né lỗi. Core regression giữ cấu hình fixture hiện có, không đổi chính sách rate trong S8.
- API4000 readiness ready sau restart cập nhật query/DTO. Mongo27017 hệ thống và27018 project giữ nguyên. Không SMTP/moderation/retention/purge, không backfill Tasks cũ.

Tiếp S9a Notifications inbox; whole-app navigation/localization/regression gate ở S12 vẫn cần thực hiện.
