# M4 — QA lịch công việc cá nhân

12/10/2026. [Contract/API](../sds/PERSONAL-CALENDAR-M4-API-v0.1.md).

- **BE122/122 full integration PASS**, có Calendar group3tests. Theo sau patchfixed+07/historical, Calendar3/3 rerun PASS. Counts20date tasks vs page12+8, defaultopen19/done1/overdue19, day/month UTC7 cutoffs, leapmonth validation, null/missingdue2, excluded trash/other account/Guest, forged query/ID/date/unverified/auth, search/no match, Archive/readOnly, membership/Ban/missingparent và agreementMyTasks. Historical1900Jan1UTC7boundary đã kiểm. Tests replica set/temp DB, khôngdev queues.
- **BE68 unit PASS** (16 Mongo groups skipped ởunit invocation; full integration ở trên chạy đủ); **FE26/26 PASS** gồmVietnam date/leap/navigation/route-return whitelist. Production build/budget PASS: entry308274/initial422338/gzip132268/largest395860 bytes, budget không đổi.
- **4 browser Calendar cases PASS** =Light/Dark×Vi/En, mỗi5width375/768/1024/1280/1440. 20count vs12page, manual20, keyboard focus/selection, none, Task panel/fullpage/return day/filter, stale November→October request, empty/error/retry, Archived readonly,44pxday hits/contrast/overflow. Expected ERR_FAILED làinjection; pageerrorsrỗng. Lượt selector“Lịch”hai links và hidden/implicit scope label đã sửa/test lại; lượt lỗi không tínhPASS.
- Regressions MyTasksS8 (Vi/En/5width) vàW2 Dark/EN/375 PASS sau shared assigned pipeline/Task return changes. Không suy cácW2case khác rerunM4.
- Live localhostAPI ready200/calendar401 khiunauth. **Read-only smoke** `check-calendar-live.mjs --qa-account` trên`pepe19092003@gmail.com` PASS: authenticated grid≥28days, summary/day loaded, no error/overflow. Không thêm/đổi dữ liệu nghiệp vụ; temporary session revoked. WatchAPI nhậnsource mới, khôngMongo restart/worker/SMTP/provider/backfill/purge.

Runner: từBE `node scripts/run-integration.js`; từroot `node FE/scripts/check-calendar.mjs` với WORKFLOW_JOURNEY_THEME/LANGUAGE nhưW2; Playwright/Edge runtime theo scripts trước. LiveQA cần`--env-file=BE/.env ... --qa-account`. Ảnh `.local/calendar/{theme}-{locale}-{width}.png` ignored. Pixel ảnh/native picker/AT mọi OS chưa là chứng nhậnWCAG; chưatest realtime/millionrows hoặcđồngbộ vớicalendar ngoài.

M4 đạt scope; M1–M4 UI upgrade đã triển khai. Tiếp nghiệmthu web trực tiếp theoactor/flow trước nghiêncứu deploy/CI-CD, không coi technicalPASSthayuser acceptance.
