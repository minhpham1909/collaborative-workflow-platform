# Compatibility Organization / Workspace

05/10/2026 — C1 increment 2. Không chạy mutation trên database dev thật trong increment.

## Invariants

- Legacy Workspace có ownerId, không có organizationId/managerId: tiếp tục là standalone. DTO trả organizationId=null và managerId=null. Không tạo tổ chức giả cho từng Workspace.
- New standalone: ownerId bắt buộc; organizationId=null và managerId=null.
- New attached: organizationId và managerId bắt buộc, ownerId=null. Store tạo Manager membership và Workspace atomic; Manager phải là Member tổ chức hiện tại.
- Model validation chặn mixed ownership. organizationId immutable với document; mọi HTTP fields hiện có đều chặn client đổi parent. Chuyển Workspace là API riêng chưa mở.
- Ownership quản trị tổ chức không đặt trên User; Org Owner/Admin không tự biến thành Member Workspace hoặc nhận Task.

## Deploy additive

1. Backup + kiểm khả năng restore của môi trường trước migration có ghi dữ liệu.
2. Audit Workspace standalone cũ: ownerId tồn tại, Owner có membership active, không mixed ownership; kiểm Organization/Manager references và duplicate memberships nếu có dữ liệu mới.
3. Tạo indexes qua db:indexes trên database được chỉ định, không syncIndexes/drop. Thêm workspaces.organizationId/createdAt/_id index và Organization indexes.
4. Deploy BE, smoke test standalone/attached/outsider/Admin/member assignment, revoke role và response null fields; FE Organization/Manager role hiển thị/actions phải triển khai riêng.
5. Chỉ backfill null fields nếu một consumer thật cần chúng; authorization không cần backfill. Không backfill organizationId bằng suy đoán.

Lượt này chỉ kiểm các invariants/schema/index và legacy fixture trên isolated Mongo replica set. Chưa có audit dataset thật, rollback rehearsal hoặc prod readiness.

## Race và lifecycle

Workspace child operations khóa Workspace và Organization guards trước kiểm quyền; role/ownership mutations tương lai phải dùng guard Organization để serialize. My Tasks/inbox/counts không dùng stale Workspace membership làm nguồn quyền đủ cho attached Workspace. Work-email eligibility kiểm trước delivery, không phải bảo đảm recall thư đã gửi hoặc loại hoàn toàn khoảng cách giữa check và provider send.

End-organization-membership cascade, cleanup assignee và cancel outbox sẽ triển khai C2/C3. Hiện dù Workspace membership còn stale thì đọc/ghi/list/My Tasks/mail bị chặn; chưa có user API rời tổ chức để vận hành cascade.

Không chuyển Comment cũ thành hard delete hay purge Task/dev queue ở C1. Không xóa dữ liệu do rollout schema.
