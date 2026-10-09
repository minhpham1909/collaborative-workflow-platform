# C5-A kiểm tra Archive/Trash

05/10/2026. [Contract](../sds/ARCHIVE-TRASH-C5-API-v0.1.md). Mốc C5 đang triển khai, purge thủ công/transfer chưa chốt.

- Unit: Workspace state/name/reason/CAS strict body; archive metadata; legacy active/readOnly; retention đúng30d và không gán deadline vào Task active. Model/index/layout 27 đồng bộ.
- Dedicated Mongo: Archive rights/name confirmation/current version, child Project state giữ riêng; đọc Task/Comment/statistics trong Archived, writes/invites/accept blocked; moderator reason exception; MyTasks active/archived scope. Trash creator vs manager/Lead/Guest, parent readonly, stale/expired/legacy restore, code/content/history giữ, Assignee rời thì bỏ, không tạo notification/outbox mới.
- Retention: scoped children, code không tái dùng, hai worker chỉ một commit, bounded pass; restore/purge tại ranh giới thời gian và stale snapshot; audit failure rollback, invalid retention skip và cursor đi tiếp; foreign Project Comment giữ nguyên; HTTP Origin/CAS/cấm Workspace/Project destructive routes.
- Regression email: Task delete nay cancel outbox ngay, worker trả idle thay vì phải claim rồi cancel; test assert không pending và provider không được gọi.

## Kết quả

63 BE unit pass, 13 dedicated DB suites skip khi chạy unit. Dedicated C5-A 8/8. Full isolated integration 107/107; FE13 unit/115 modules build; Interaction browser PASS (existing flows/dialog/read-only/CAS, no provider calls). Không suy unit thành kiểm DB real index unique.

Không chạy purge/SMTP dev queue, không backfill Task cũ. Dev read-only audit: 1 legacy Workspace/1 unscheduled legacy trash/0 scheduled/0 due; indexes additive và API ready đạt. Cổng27017 là standalone Mongo của hệ thống, giữ nguyên tiến trình đó; project replica set và .env chuyển27018, dùng lại .local/mongodb-dev, sửa launcher reconfig một member khi đổi port. Không chỉnh data collections. Request manual purge vẫn chờ câu trả lời, không endpoint destructive tạm. UI quản lý Archive/thùng rác chưa dựng; FE nền dùng effective readonly/capabilities và thông điệp thùng rác tương thích.

## Kiểm lại theo yêu cầu chủ dự án

05/10: Chạy lại BE unit63/63 và full isolated integration107/107, không integration skip. Purge/restore/race/audit rollback đã chạy được trên fixture. Tiến bước C6-A: [HTTP e2e](CORE-C6-HTTP-E2E-CHECK.md)6/6. Không purge/SMTP/backfill dev hoặc mở manual endpoint thay cho lựa chọn quyền chưa có.
