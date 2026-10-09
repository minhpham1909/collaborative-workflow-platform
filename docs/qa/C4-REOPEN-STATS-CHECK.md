# C4-B kiểm tra mở lại và thống kê

05/10/2026. [Contract](../sds/TASK-REOPEN-C4-API-v0.1.md); [C4-A](C4-TASK-ENRICHMENT-CHECK.md).

- Unit: strict request/review input, separate CAS, spoofed role rejection, pending resolution model, independent reviewer; Vietnam date boundaries/invalid periods.
- Isolated Mongo suite: concurrent Creator/Assignee requests only one pending, generic reopen bypass denied; manager reason/self-review guard; new Lead takes over, old Lead denied; reject exact24h and 3/rolling7d; approve/reject race, archive/approve race; assignee change/leave/delete/Ban cancellation, no rejoin replay; independent scopes; current Done/nondeleted/legacy unknown time statistics; Guest only granted Project statistics, no request/review history; HTTP request/review CAS.
- Added Org Owner/Admin/WS Manager reviewers and Org exit cancellation; separate approve-vs-Workspace-leave race. Fixture identities/sessions/organizations/workspaces riêng trong ephemeral replica set, không dùng user dev.

## Kết quả

61 BE unit pass; 12 dedicated Mongo suites skip trong lệnh unit. Full isolated integration 97 pass/0 fail/0 skip; sau bổ sung reviewer Org/race, dedicated C4-B 10/10 pass. 13 FE unit pass; production build 115 modules. Interaction browser PASS: direct reopen reason/system dialog, archived read-only, CAS/draft, author rights/Assignee status, no overflow/page errors; không providers; request/review/statistics UI full không thuộc nghiệm thu này.

25 models/index/layout đồng bộ. Index mới tạo additive dev, không backfill/purge/user mutation/mail queue. API ready sau restart. Không chạy Google/SMTP thật. Gate core C4 hoàn tất theo contracts thực thi; C5 archive/trash/restore/purge và C6 production/NFR/end-to-end tiếp theo; U1/U2 full UI còn mở.
