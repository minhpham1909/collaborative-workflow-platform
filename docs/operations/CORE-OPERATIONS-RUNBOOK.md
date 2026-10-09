# Core operations runbook — C6-B

05/10/2026. Runbook cho nền hiện có. Các kiểm local dùng fixture; không production sign-off. Địa chỉ dev hiện tại: replica set của dự án cổng27018, API4000, FE5173; giữ Mongo standalone27017 của máy.

## Khởi chạy và kiểm trạng thái

Tại BE, `pnpm db:dev` đọc .env, giữ `.local/mongodb-dev`; launcher chỉ quản lý child mongod của mình. Nếu cổng bận thì fail, không dừng tiến trình khác. Chỉ tự cập nhật host khi DB là single-member rs0 trong thư mục dự án, không dùng launcher này để quản lý replica set production.

`pnpm db:indexes` tạo thêm declared indexes, không sync/drop. `pnpm dev` khởi API; `/health/live` kiểm process, `/health/ready` kiểm điều kiện startup DB/index. Ready không là bài smoke nghiệp vụ hoặc giám sát provider. FE chạy riêng bằng `pnpm dev` tại FE.

`pnpm dev:full` **có mail worker**, vì vậy không dùng như lệnh startup mặc định khi còn queue cũ. API không tự khởi worker moderation/retention. Secrets và local logs/artifacts được ignore Git; không in .env/URI/keys hoặc backup payload ra log.

## Worker và hàng đợi

| Worker | Phạm vi | Kiểm trước khi bật |
|---|---|---|
| Mail | Queue eligible hiện tại; provider có side effect | Chốt môi trường/recipient/template/queue cụ thể; production TLS/config; không replay restored/legacy queue |
| Moderation | Chỉ cleanup đã được xác nhận qua Ban preview | Scope/cutoff/matched count/job state; lease/retry; không giữ Comment body trong audit |
| Retention | Task trash có purgeAt đúng30d và đã đến hạn | Backup/audit, legacy trash chưa schedule; parent chain; không Task active; cursor không dừng ở orphan |

Lệnh once/worker tương ứng chỉ chạy sau review phạm vi. Trong dev hiện tại, không chạy mail/moderation/retention worker hoặc backfill thật từ C6-B. Fixture rehearsal được phép chạy worker function trong database tạm.

Nếu lỗi mail: đọc state/attempts/lastErrorCode, không in encryptedDeliveryData/token/to payload. SMTP timeout sau khi provider nhận có thể gây trạng thái không rõ; không hứa exactly-once ở hệ thống bên ngoài. Phải kiểm provider message/status trước retry thủ công. Đừng biến retry thành phát lại queue cũ.

Moderation cleanup failure không rollback Ban, không unban để retry. Job failed dùng retry endpoint có CAS/current authority; scope/time/cursor giữ nguyên. Retention lỗi transaction giữ Task/children, vòng worker sau retry; orphan/invalid deadline phải audit và xử lý riêng. Không cưỡng chế delete hoặc tự sửa quan hệ bằng client input.

Worker retention hiện logs counts, không diagnostics từng task; production cần alert failed/skipped, backlog age, batch duration và người chịu trách nhiệm xử lý. Script CLI rehearsal không thay hệ thống monitoring.

## Backup trước migration hoặc bật purge

Production backup phải dùng công cụ snapshot/managed backup được chọn cho môi trường thực, có mã hóa, retention, key custody và kiểm restore. C6-B helper chỉ snapshot **27 collections của fixture** trên replica set local, chưa backup production/oplog/PITR/validator/sharding/TTL lifecycle.

1. Xác định owner/operator, thời điểm và phạm vi; dừng writers/workers hoặc dùng snapshot nhất quán hỗ trợ đúng môi trường. Không copy từng collection độc lập trong lúc writes chạy rồi coi là snapshot nhất quán.
2. Sao lưu dữ liệu, collection/index metadata, schema/index/code version; custody secrets cấu hình tách khỏi snapshot. Không commit secrets hoặc lưu key bên cạnh file backup.
3. Khôi phục vào database **mới và trống**, không ghi đè dev/production đang chạy. Nếu restore multi-step lỗi, giữ target cách ly và dùng target mới; không serve target một phần.
4. Đối chiếu document counts/BSON types, indexes/unique/partial keys, parent chains, memberships, Ban, Task codes/counters, unknown historical times; chạy API smoke theo scoped roles.
5. Sau restore production, giữ mail/cleanup/retention workers tắt. Phải đánh giá restored sessions/verification/recovery tokens và quyết định vô hiệu phiên/token phù hợp trước mở ingress; snapshot cũ có thể hồi sinh phiên hoặc quyền đã thu hồi. Đối chiếu revocations/Bans với nguồn audit mới hơn nếu có.
6. Kiểm queue/job restored: không gửi email hoặc chạy destructive jobs cũ tự động. Không coi sent/notified trong backup là provider đã gửi hoặc chưa gửi sau cutoff. Quarantine và reconcile theo provider/audit, đặc biệt lease processing đã cũ.
7. Chỉ chuyển app sang target sau acceptance/rollback window. Khôi phục dữ liệu không khôi phục được Comment/Task đã purge nếu snapshot không còn chứa; backup retention tách trash retention.

## Migration và rollback

`pnpm db:task-codes` là audit; `--apply` là mutation explicit. Legacy missing-code backfill dùng guard/counter và tăng Task version, không bịa completedAt/updatedAt. Chỉ migrate sau snapshot, audit duplicate/parent/counter, khóa hoặc điều phối writes theo contract; giữ mã đã cấp, không reset counter.

Rollback rehearsal C6-B khôi phục pre-migration snapshot vào target khác. Trong production có writes sau snapshot, rollback bằng snapshot sẽ mất các writes đó; cần freeze/change window hoặc kế hoạch reconcile. Không chạy blanket `$unset code`, không hạ counter, không suy helper fixture là rollback không mất dữ liệu trên hệ thống live.

Legacy Trash thiếu purgeAt chưa được lên lịch. Migration retention riêng cần quyết định cutoff/mốc áp dụng, audit/backup; không tự suy 30d từ một deletion cũ rồi purge ngay. Workspace transfer và manual purge authority/API vẫn chưa mở.

## Đo tải và tiêu chí release

`pnpm check:operations` tự dựng database tạm, không đọc .env/MONGODB_URI và không nhận URI đầu vào. Chạy độc lập với test khác để giảm nhiễu; artifact dưới `.local/core-operations`. Snapshot fixture mã hóa AES-GCM, khóa chỉ trong memory và không lưu: artifact snapshot không thể dùng lại sau process, nhằm kiểm round-trip trong rehearsal.

Benchmark gồm100/1000/3000 Task, 12 samples tuần tự sau warm-up, 15 samples năm luồng cùng account, page12. Service timing gồm auth/current-scope transaction, data query và DTO; không HTTP/TLS/browser/mobile network. Kết quả nhỏ/local không là SLA, capacity hoặc thước đo năng suất người dùng.

Release cần chốt workload/SLA, đo p95/p99 dưới concurrency/dataset thật đại diện, explain và memory/backlog/connection pool. Auth/Workspace guards tạo contention để serialize quyền và mutation; không bỏ guard chỉ để giảm latency. Manual purge/transfer vẫn không có CTA/API; UI mới phải bám capability và effective readonly. C6-B local pass đủ làm input U1, chưa đồng nghĩa public deployment ready.
