# M2 — kiểm thử Project pins

12/10/2026. [Contract](../ui-ux/PROJECT-PINS-M2-CONTRACT.md).

- **BE119/119 integration PASS**, full isolated replica-set suite gồm6 tests M2 (5 subcases + group). M2: auth/unverified/Origin/JSON shape/ID/query injection, account isolation, legacy field thiếu, idempotency/no notification or mail, Member/Guest Archived không tăng quyền, revoke/Ban redaction/unpin, Org Admin không membership Workspace/Org exit, max20/newest-first/no eviction/2 requests slot cuối, missing Project và revoked session. Test mutations/retention/dispatcher ở DB/API tạm; không queue/dev Mongo.
- **BE67 unit PASS**, 15 Mongo test groups skipped trong lượt unit không có dedicated DB; các nhóm tích hợp đã chạy trong full suite119 ở trên. **FE23/23 PASS**.
- **8 browser M2 cases PASS**: Light/Dark × Việt/Anh ×1440/375. Ghim từ card/header, reload giữ pin, sidebar/mobile mở Kanban, tài khoản khác không có pin của Owner, lost-response committed đúng1write/locked action/readback clears error,5/7 expand, Guest Shared/Archived read-only/revoke hides metadata/unpin. Assert contrast pin names/context, page errors rỗng; ERR_FAILED trong log là injection có kiểm kết quả.
- WorkspaceS3 Vi/En/5width regression PASS với pin button mới. W2 Dark/EN/375 PASS: Org→Workspace→Project→Task→MyTasks→Inbox→Guest→Trash và draft/theme/read-only. Không suy các W2 case còn lại là rerun M2.
- Production build/budget PASS: entry303524, initial417580/gzip130582, largest395855 bytes; budget không thay đổi. Shared pin provider làm thay đổi cách chia chunk, dùng initial tổng để so thay vì chỉ entry.
- API local cũ trả404 cho `/project-pins`; restart riêng API (watch, no worker), `/health/ready`200 và unauthenticated pin list401. Read-only smoke `check-project-pins-live.mjs --qa-account` trên `pepe19092003@gmail.com` PASS: authenticated list, enabled Project control; không ghim hay sửa dữ liệu nghiệp vụ QA. Temporary session revoked cuối audit. Mongo27017/27018 không restart.

Chạy lại từ BE: `node scripts/run-integration.js`; script tự tạo isolated replica set. Browser runner `FE/scripts/check-project-pins.mjs` nhận `WORKFLOW_JOURNEY_THEME`, `WORKFLOW_JOURNEY_LANGUAGE`, `WORKFLOW_JOURNEY_WIDTH` giống W2; đặt Playwright/Edge runtime như các runner hiện tại. Screenshot `.local/project-pins/` ignored.

Scope chưa kiểm riêng: mọi kiểu network timeout/OS/hỗ trợ AT hoặc đồng bộ đa thiết bị realtime. Quyền do server quyết định mỗi request; pin cache UI chỉ revalidate mount/route/focus. M2 đạt scope; tiếp M3.
