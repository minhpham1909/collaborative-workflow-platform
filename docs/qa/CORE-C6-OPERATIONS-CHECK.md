# C6-B — Backup/restore rehearsal và đo tải local

05/10/2026. Bằng chứng: `pnpm check:operations`, `test/rehearsal-snapshot.test.js`, full BE unit/integration. Không đọc .env/MONGODB_URI, không gọi provider, không truy cập dữ liệu dev. [Runbook](../operations/CORE-OPERATIONS-RUNBOOK.md).

## Backup và khôi phục

- Snapshot nhất quán bằng transaction snapshot-read trên source fixture, index metadata lấy khi fixture writers đã dừng. 27 collections, **10 documents**; chưa phải backup dung lượng production.
- EJSON giữ ObjectId/Date/BSON numbers, gzip + AES-256-GCM authenticated envelope. File fixture mã hóa; khóa chỉ memory, không lưu cùng artifact. Khóa sai và ciphertext bị sửa bị từ chối.
- Restore chỉ vào database fixture mới, trống; restore lần hai bị từ chối. Không drop/overwrite database existing hoặc production. Exact BSON và declared index properties khớp, API đọc Task/Comment và authenticate trên restored fixture đạt.
- Legacy code audit/backfill idempotent trên restored fixture, giữ updatedAt/unknown completedAt; rollback rehearsal bằng pre-migration snapshot vào target mới giữ code/time chưa biết và version cũ. Đây không là live rollback không mất writes mới.
- Backup round-trip/verify/migration quan sát **1555.21 ms**, artifact mã hóa **2359 bytes**; rollback cũng đã kiểm. Kết quả nhỏ/local không là RPO/RTO production.

## Đo tải

Source/target đều local single-member Mongo8.0.17, cache warm sau2 calls; page12. 12 samples tuần tự, 15 samples với5 callers chung account. Service/store timing gồm auth/scope locks + queries + DTO, không HTTP/TLS/browser network. p95 theo nearest rank của sample nhỏ; với12 samples, đây cũng là maximum quan sát, không population p95/SLA.

Lần đo cuối chạy sau khi các bộ test khác đã kết thúc. Không kiểm soát toàn bộ tải hệ điều hành; dùng để tìm query/contended paths và so sánh thăm dò.

| Luồng | Task trong Project | Đồng thời | Samples | p95 quan sát (ms) |
|---|---:|---:|---:|---:|
| tasks_first_page | 100 | 1 | 12 | 67.22 |
| board_first_page | 100 | 1 | 12 | 147.36 |
| my_tasks_first_page | 100 | 1 | 12 | 108.48 |
| literal_search | 100 | 1 | 12 | 27.72 |
| whole_project_statistics | 100 | 1 | 12 | 9.86 |
| tasks_parallel_same_account | 100 | 5 | 15 | 477.83 |
| tasks_first_page | 1000 | 1 | 12 | 115.05 |
| board_first_page | 1000 | 1 | 12 | 251.66 |
| my_tasks_first_page | 1000 | 1 | 12 | 248.81 |
| literal_search | 1000 | 1 | 12 | 58.27 |
| whole_project_statistics | 1000 | 1 | 12 | 11.46 |
| tasks_parallel_same_account | 1000 | 5 | 15 | 434.79 |
| tasks_first_page | 3000 | 1 | 12 | 56.63 |
| board_first_page | 3000 | 1 | 12 | 138.44 |
| my_tasks_first_page | 3000 | 1 | 12 | 480.65 |
| literal_search | 3000 | 1 | 12 | 58.47 |
| whole_project_statistics | 3000 | 1 | 12 | 15.06 |
| tasks_parallel_same_account | 3000 | 5 | 15 | 405.26 |

## Sửa đổi dựa trên bằng chứng

1. Baseline trang Task all-status dùng membership-cleanup index rồi SORT, đọc100/1000/3000 documents cho page12. Thêm additive index `task_project_chronological` (projectId,workspaceId,createdAt desc,_id desc, partial nondeleted). Explain sau sửa: LIMIT→FETCH→IXSCAN trên index đó, **12 docs/12 keys** ở cả ba mức, không blocking SORT. Đây là bằng chứng deterministic hơn số latency nhỏ.
2. MyTasks trước tính totals và deadline groups bằng hai pipeline authorization/filter giống nhau. Gộp vào counts-only facet sau cùng authorized/filter input; page query vẫn riêng để rich-text page không gặp facet output16MiB. Không gộp cả page hoặc bỏ scope/Ban/parent guards. Regression scope/counts/cursor/race đã pass.
3. MyTasks3.000 Task p95 quan sát baseline710.86ms → lần độc lập sau sửa480.65ms. Đây là kết quả thăm dò cùng máy với sample nhỏ, chưa đánh dấu SLA đạt. Concurrency vẫn chịu auth/WS transaction contention; không bỏ guard để chạy nhanh.

## Worker

Một batch20 Task hết hạn +3 Comment/Task: **20 purge/0 failed**,60 Comment dọn,20 metadata audits; Task unrelated giữ nguyên. Thời gian batch184.53ms. Chỉ fixture; không chạy retention worker/SMTP/dev queue và không schedule legacy trash thực.

## Regression và vận hành

- 65 BE unit pass;14 dedicated Mongo suites skip trong unit. Full isolated integration **113 pass/0 fail/0 skip**, gồm C6 HTTP e2e và C5 race/rollback/retention.
- 2 snapshot unit kiểm BSON round-trip/tamper/wrong key và cấm restore dev/production targets. Local helper là test-support, không export thành production backup CLI.
- Report JSON/baseline và encrypted fixture artifacts dưới `.local/core-operations` được Git ignore. Mỗi run giữ report riêng, latest-report trỏ run mới; không in secrets/payload.
- [Runbook](../operations/CORE-OPERATIONS-RUNBOOK.md) ghi startup/readiness, worker gating/retry, backup custody, restored session/queue quarantine, migration/rollback window và giới hạn provider.

## Gate

**C6-B rehearsal local đạt**. Backend core đủ bằng chứng để tiếp U1 screen contracts theo phạm vi đã có. Chưa public-deployment/production acceptance: workload/SLA chưa chốt, production managed backup/PITR/key custody chưa chọn, provider live/monitoring chưa kiểm, legacy retention chưa backfill; manual purge và Workspace transfer chưa mở. Không dựng CTA giả từ mockup cho các API chưa có.

Dev local: chronological index đã tạo additive; API restart/health ready đạt. Read-only retention audit vẫn1 legacy WS/1 legacy unscheduled trash/0 scheduled/0 due. Không thêm dữ liệu, backfill, purge hoặc gửi queue dev.
