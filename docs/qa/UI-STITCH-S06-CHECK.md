# S6 — QA Project / Board

09/10/2026: **6a/6b đạt trong scope S6**. [Contract](../ui-ux/PROJECT-BOARD-S06-CONTRACT.md). Task detail/checklist/activity/reopen presentation còn S7, không suy thành toàn UI hoàn tất.

## 6a thực hiện

- Header/breadcrumb/role/effective readOnly, Name/icon/description actions dựa capability. Parent Archived + own Project Active có label Workspace lưu trữ, không badge active gây hiểu nhầm. Long descriptions collapsed/expand vẫn đọc đủ.
- Compact filters, priority query,3columns newest order/per-column pagination, mã/priority/labels/checklist/completion metadata từ API. Legacy unknown không ngày/code fake.
- Whole-project statistics projection trong Board response; filtered progress footer phân biệt rõ. Không HTTP stats riêng hoặc fake Sprint. Parent capability reload qua Board/tasks DTO.
- Unknown Archive outcome khóa mutation trước readback. Network paging error giữ page cũ, có retry; scope unavailable clear parent data. Create hiện có clear filter sau success.
- PersonProfile loading/error đổi sang phrasing span: tránh div lồng trong paragraph khi hover profile. Buttons header xếp grid rõ, không lone-row wrap. Mobile Board horizontal region + vertical scroll từng cột; page không tràn ngang.

## Kiểm thử

- FE14 unit PASS/build134. BE work/project-access/task-enrichment28 integration PASS trước và chạy lại sau embedding statistics; assertion so Board whole stats với standalone statistics trong query có filter + paging.
- `FE/scripts/check-stitch-board.mjs`: real API/browser/temp DB. 18todo/page12/loadmore18,1doing,2done, whole2/21; search theo mã thật, high-priority filter2 vẫn whole2/21; labels/checklist0/2/completed date, Done deadline cũ không overdue, legacy missing date. Empty filter vẫn3columns; create dưới filter đọc lại/clear. Guest không create/archive/parent link; WS Archive ở phiên khác rồi Board refresh cập nhật readonly/CTA; unarchive đọc lại đúng.
- Screens1440/1280/1024/768/375 đã soi với source Stitch PNG.5width page không horizontal overflow;375 Board region có intentional horizontal scroll. Giới hạn vertical column tránh full mobile page kéo dài theo12cards.
- Skill probe `.local/stitch-board/probe-board/report.json` **0 Hỏng**, consoleErrors rỗng sau sửa invalid p/div profile; vi decimal percent9,09 thay9.09. Focus/warm borders/native dates/info-rich card/shadow heuristics còn Gu exceptions, không claim sạch mọi tiêu chí.
- `check-interaction-flows.mjs` regression PASS toàn core UI: metadata, editor, nested dialogs/drafts, links/Board/create/detail/comments, author/assignee/status/MyTasks, CAS, Archived, cursor, deleted unavailable.
- Regression từng chạm rate limit do synthetic fast actions + stats HTTP riêng. Đã gộp stats vào Board, chạy lại pass; **không tăng/tắt/bypass rate limiter**. API contract vẫn validated/scoped, chỉ thêm projection.

## Còn lại / vận hành

S7 task detail/checklist/comment/activity/reopen UI là cụm kế tiếp.

Không production acceptance/performance SLA, realtime/presence, drag/drop order, SSO hoặc Sprint. Snapshot whole progress phản ánh lần Board read, không giả live updates. User DB/backfill/SMTP/purge/cleanup queues giữ nguyên; fixtures isolated, không providers.

API project restart để có Board/tasks additive projections, Mongo27017/27018 giữ nguyên; health ready và startup log `.local/s6-api*.log` không lỗi.

## S6b — hoàn thành09/10/2026

- TaskForm priority + paged label picker, minimal changed-field PATCH giữ archived labels; quản lý label name/color/archive, Lead appointment/removal, Guest list/invite/revoke. CopyGuest link/result, actionable errors, deep management route, protected capability matrix.
- BE project-access/task-enrichment16 integration PASS; FE14 unit (manage route valid/invalid/extra segment) và build136 PASS. Không schema migration/index/data backfill cho DTO permissions bổ sung.
- `FE/scripts/check-stitch-project-management.mjs` real API/browser/temp replica PASS: create label mint, create Task high+label, archive label rồi edit priority low giữ labelIds, Lead appointment và chỉ label controls, owner removes Lead khi form đang mở→deny/keep draft/no label created; Guest revoked ở Archived, no grant/read sau revoke, LINK đúng public path/token và revoke invitation.
- `check-interaction-flows.mjs` toàn core regression PASS sau thêm TaskForm fields/route/MemberPicker config; labels legacy không bị gửi lại vô cớ. Không chỉnh rate limiter; probe chạy fresh app per width để không gộp synthetic requests vào cùng window, giữ auth/scope/store thật và policy60/min.
- Đã soi management1440/375 và Lead dialog;5width không page overflow. Probe mỗi width375/768/1024/1280/1440 trong `.local/stitch-project-management/probe-management-{width}/report.json`:0 Hỏng, consoleErrors rỗng. Mobile tab4buttons chuyển2×2; text-pretty sửa orphan word; odd/even header action grid tránh lone button.
- Native styled select, warm borders, overlay shadow classification và focus còn Gu exceptions; không claim all clean. Early fixture404 do thiếu notifications service đã sửa adapter; không phải API live defect.
- Dev được khởi động lại sau phiên ngắt: Vite5173/API4000/project replica27018 dùng `.local/mongodb-dev` hiện có. API ready, `.local/s6b-api*.log` sạch; không SMTP/moderation/purge worker, không real data mutation từ fixture. Không đụng Mongo hệ thống27017.

Chưa mở storage/upload/custom roles/Org-level moderation UI; quản trị Project không bao gồm tất cả domain UI còn trong roadmap. Tiếp S7 theo plan.
