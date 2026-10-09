# C6-A — Kiểm thử core end-to-end qua HTTP

05/10/2026. Theo yêu cầu tiếp tục chạy test BE nếu có thể, rồi tiến bước kế tiếp. Chạy được; không có case bị bỏ qua do môi trường trong integration run.

## Phạm vi đã chạy

BE unit 63 pass, 13 dedicated Mongo suites skip khi không cấp TEST_MONGODB_URI. Full integration trước khi thêm suite C6: **107 pass/0 fail/0 skip**. Suite C6 riêng: **6 pass/0 fail/0 skip**; runner mặc định đã thêm suite này. Các con số unit và integration là bằng chứng riêng, không cộng dồn như số case không trùng.

`BE/test/core-e2e-mongo.test.js` khởi tạo Express thật và Mongo replica set riêng trên cổng tự chọn, database bắt buộc workflow_auth_test. Tạo account fixture rồi login bằng password/JWT thật; nghiệp vụ đi qua HTTP. Hai Organization riêng, Workspace attached từng Org, một Workspace standalone, Admin không có WS membership, Member, Guest và account chưa verified. Không gọi Google hoặc SMTP provider.

| Luồng | Kết quả kiểm |
|---|---|
| Org/WS onboarding và admission | EMAIL accept-by-ID đúng người; role Admin chỉ theo Org; không tạo WS membership giả cho Admin; scope khác 404; verified gate |
| Project/Task/Guest | Member Lead tạo label/Task; Guest chỉ Project được cấp/Comment; Task DTO không secrets/internal revisions; không đọc Org B |
| Checklist → Done → request → approval → stats | Done phải hoàn thành checklist/xác nhận; Lead không tự duyệt; Org Admin duyệt đúng scope; clear completedAt; current Done statistics đúng |
| Archive → Unarchive → Ban/Unban → Org leave | Effective readonly cho Guest, cancel pending; giữ Project own state; Ban chặn ngay; Unban không tự grant; leave mất Org quyền nhưng standalone vẫn làm được |
| Trash → restore → retention | Restore không thêm notification/outbox; chạy purge với fixture đủ30d, giữ Task Org A/B, audit một lần, mã không tái dùng; manual purge route vẫn404 |
| Legacy rehearsal + session revoke | Legacy WS thiếu state vẫn active; Task Done thiếu completedAt giữ unknown; audit/code backfill trên fixture chạy lại idempotent, giữ updatedAt và tăng version; session revoked bị401 |

Các thao tác seed data, thay thời gian purge và backfill chỉ nằm trong dedicated test database. Fixture cleanup theo workspaceId/organizationId/userId của suite; không xóa toàn database và không dùng dữ liệu dev. Không thực hiện retention:once, mail:once, worker hoặc migration --apply trên dev thật.

## Giới hạn của kết quả

- Đây là **C6-A gate kiểm luồng core**, không production/release acceptance. Live Google/SMTP, vận hành worker, backup/restore, quota và tải lớn chưa nghiệm thu từ lần chạy này.
- Migration rehearsal chỉ đặc tả/cấp mã Task legacy ở fixture, không thay backup/snapshot hoặc production rollback plan. Legacy Task trash thiếu purgeAt vẫn chưa backfill/schedule.
- Chưa có manual purge authority/API, chưa có Workspace transfer vào Org; không suy việc test pass thành chốt business decisions còn mở.
- Request/review queue, Archive/trash UI và Org management UI đầy đủ chưa dựng. Các kiểm browser ở C4/C5 là nền cũ tương thích, không nghiệm thu full UI mới.

## Bước kế tiếp — C6-B và U1

1. Đóng phạm vi release: manual purge chưa mở; Workspace transfer chưa mở. Nếu hoãn module này, giữ CTA/endpoint không khả dụng và ghi backlog rõ.
2. Rehearsal backup → restore snapshot riêng, audit index/relationship/counter, migration/rollback có kế hoạch; không thực hiện trực tiếp trên dev hiện có.
3. Đo query/list/pagination và worker batch ở tải mục tiêu được chốt; không đưa số performance giả vào UI.
4. Runbook worker/outbox retry, redacted diagnostics, health và provider setup theo môi trường. Live SMTP cũ vẫn ngoài phạm vi cho đến chỉ định địa chỉ/queue cụ thể.
5. U1 screen contracts có thể chuẩn bị theo API hiện tại, nhưng không claim production ready hoặc dựng CTA dựa mockup cho endpoint chưa có.
