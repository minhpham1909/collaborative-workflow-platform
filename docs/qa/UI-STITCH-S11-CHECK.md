# S11 — Kiểm tra thùng rác Task

09/10/2026 — đạt gate trong scope [contract](../ui-ux/TASK-TRASH-S11-CONTRACT.md), tiếp S12. Không tương đương nghiệm thu toàn ứng dụng/production.

## Bằng chứng

- FE17 unit PASS, build157 modules PASS; valid/invalid trash routes được kiểm. Không đổi API/schema.
- BE `scripts/run-integration.js test/retention-mongo.test.js`:8 tests PASS/0 skip trên MongoMemoryReplSet riêng. Archive/CAS/restore scope, completion/history/code preserved, no event replay, legacy-unscheduled, expired blocking, atomic bounded purge/restore race/audit rollback/HTTP auth đều đạt. Purge chỉ chạy trong test DB tạm; không gọi worker hoặc hàng đợi dev.
- `FE/scripts/check-stitch-trash.mjs`: React/Express/Mongo thật trong fixture, PASS. 27 trash records,20/page +cursor; Owner/Lead xem rộng, Creator chỉ1 Task, Guest denied/direct route không có CTA; read-only description/checklist dialog/Escape/focus return; confirm cancel0write, restore1write; invalid departed assignee cleared, description/checklist/code retained; CAS rejection không phục hồi; response đã commit nhưng mất→locked→refresh xác nhận Task biến mất; network list error→retry; Project và Workspace Archived chặn; mất membership xóa nội dung cũ; empty Project có empty state.
- Visual list +detail ở375/768/1024/1280/1440px, không page overflow/page errors. Xem ảnh `.local/stitch-trash/trash-{width}.png`, `detail-{width}.png`. Đã sửa inherited float badge làm lệch detail/count; fonts mới ≥12px; mobile metadata thành grid; header trash link có vùng bấm44px.
- Installed ui-ux skill probe:5width, mỗi width một default-limiter fixture app mới, không nới rate limit. `.local/stitch-trash/probe-{width}/report.json`:0 Hỏng ở cả5width. Chỉ probe list/shell; detail kiểm riêng qua screenshots/focus/overflow assertion, không gọi là modal probe toàn diện.
- `check-interaction-flows.mjs` PASS: Workspace card/descriptions/dialog/draft/Board/create/detail/author/assignee/My Tasks/CAS/Archive/deleted-unavailable/paging.
- `check-c2-invite-flows.mjs` PASS: Guest/Org invitation auth/verified/account mismatch/revoke/uncertain/token and responsive regression.

## Các điểm còn theo dõi

- Probe Gu còn nhận xét focus ring, warm border, shadow shell và row nhiều dòng. Giữ focus rõ/brand; trash row cần đủ status/deletion/expiry để quyết định phục hồi, không phải sidebar item3 dòng. Không claim mọi heuristic sạch.
- Detail dùng snapshot API list, không có bình luận/lịch sử riêng trong trash. Bản dịch toàn site, layering toast/dialog và audit toàn scope/performance thuộc S12.
- Không Google/SMTP provider, queue SMTP/moderation/retention dev, legacy backfill hoặc dữ liệu tài khoản thật. OS Mongo27017 và project Mongo27018 giữ nguyên.
