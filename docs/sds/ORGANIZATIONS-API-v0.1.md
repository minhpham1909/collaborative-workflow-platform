# Organization API — C1 increment 1

## C1 increment 3 — hiện hành 05/10/2026

Nền C1 đã đạt gate theo [QA](../qa/ORGANIZATIONS-C1-CHECK.md). [10 Organization use cases](../srs/organization-use-cases-v0.3.json) bổ sung use-cases.json của nền cũ, không giả định invitations/Guest mới đã có. Các mục increment cũ bên dưới là lịch sử.

| Method/path dưới /organizations/:id | Input | Quyền | CAS |
|---|---|---|---|
| GET /members | q/from/to/limit/cursor | Org member active | — |
| PATCH /members/:userId/role | role admin/member, expectedVersion | Org Owner; không đổi role của owner | Membership version |
| PATCH /ownership | memberId, expectedVersion | Org Owner; target active/verified, khác owner | Organization version |
| POST /workspaces/:workspaceId/members | userId, expectedVersion | Org Owner/Admin hoặc Manager đúng Workspace | Workspace version |
| PATCH /workspaces/:workspaceId/manager | managerId, expectedVersion | Org Owner/Admin | Workspace version |
| GET /audit | limit/cursor | Org Owner/Admin | — |

Không có API thêm người ngoài vào tổ chức trực tiếp: Organization admission phải qua invitations C2. Internal assignment chỉ target đã active/verified trong Org. Unique Workspace member pair và guard bảo vệ upsert; reactivate reset overrides, tăng generation, không tự giao lại Task cũ. Không đổi API standalone transfer/invitation.

Manager cũ giữ Workspace membership; Manager mới được bổ sung membership nếu thiếu. Org role Admin/Member không đổi vì managerId. Ownership không trùng role membership: transfer thay ownerId, role được cấp riêng trước đó giữ nguyên; người cũ mất quyền Owner nhưng không mất quyền Admin đã được cấp riêng. Chỉ Owner đổi Org role; Admin không tự cấp Admin hay quản lý Admin khác qua role endpoint.

No-op không tạo audit/notification hoặc tăng version; stale expectedVersion vẫn 409. Role, Manager, internal membership và ownership mutations ghi OrganizationAudit trong cùng transaction. Audit endpoint chỉ quản trị, không email/security fields/Comment content.

Membership mới tạo Notification category=membership, workspace-only payload, target Workspace; không gửi email hoặc yêu cầu chấp nhận. Signed read-all hỗ trợ category mới. Nếu không còn Workspace membership/Org access, payload bị ẩn. FE chỉ bổ sung renderer/filter/link tương thích loại notification này, chưa thiết kế lại UI.

Read-only `db:audit-scope` chỉ local development, không tạo indexes/backfill. Audit dữ liệu dev thật: 0 Organization, 1 standalone Workspace thiếu fields mới, tất cả invariants đạt. Index mới đã tạo additive trên dev; không đổi ownership/membership thật, không mail worker. Audit này kiểm compatibility, không thay rollback/backup rehearsal trước production.

Giới hạn C1: chưa Org invitations/leave/remove/ban, Guest/Lead, Archive/trash, hard Comment moderation hoặc D5. C2/C3 xử lý lifecycle admission/exit và cleanup/cancel; không diễn giải membership API thành hoàn thành core mở rộng toàn bộ.

## C1 increment 2 — hiện hành 05/10/2026

Đã thêm `POST /organizations/:id/workspaces` (name, description tùy chọn) cho Org Owner/Admin và `GET /organizations/:id/workspaces` (limit/cursor) theo scope. Creator trở thành Manager chính và Member Workspace trong cùng transaction. Client không được gửi ownerId/managerId/organizationId. Workspace trực thuộc có ownerId=null, organizationId và managerId; Workspace độc lập giữ ownerId, missing organizationId cũ được hiểu là standalone. Không chuyển Workspace cũ vào tổ chức.

Shared access guard kiểm Org membership active trước Workspace membership. Org Owner/Admin đọc/quản trị Workspace và Project/Task dù chưa là Member Workspace; muốn nhận Task hoặc sửa email override riêng phải có membership Workspace. Manager được quản lý trong phạm vi. DTO role thêm organization_owner/organization_admin/manager, cùng organizationId/managerId; management-only membershipVersion/emailOverrides=null. FE role routing/display mới chưa triển khai.

Home/Organization list lọc quyền trước pagination; active member counts/roster không tính Workspace membership stale sau khi rời tổ chức. My Tasks chỉ lấy Task được giao ở Workspace đang là Member, không mở rộng vì role Admin. DTO assigneeLeft/reopen kiểm cả membership tổ chức. Inbox payload và work-email eligibility dùng cùng quyền hiện tại, không auto subscribe Admin vào email.

Các API cũ được chặn trên Workspace trực thuộc khi chưa có contract C2: personal ownership transfer → ORGANIZATION_OWNERSHIP_REQUIRED; tạo/accept/preview invitation kiểu Workspace độc lập → ORGANIZATION_INVITATION_REQUIRED; Manager leave/remove → MANAGER_REPLACEMENT_REQUIRED. Manager replacement/internal member assignment/Organization invitation API chưa có. Không tự cho org member truy cập mọi nhóm.

Chưa triển khai Project Lead/Guest/Ban/Archive/trash/moderation hard delete và D5. Chính sách Comment hiện chạy vẫn author-only/soft-delete cho đến slice kiểm duyệt C3; không coi scoped Task quyền quản trị là hoàn thành mọi quyết định D2.

Index thêm workspace_organization_list (additive). Test riêng có legacy Workspace thiếu field mới; không yêu cầu backfill để đọc standalone. Xem [migration notes](ORGANIZATION-WORKSPACE-MIGRATION.md) và [QA](../qa/ORGANIZATIONS-C1-CHECK.md). Các phần increment 1 dưới là lịch sử, được phần hiện hành này bổ sung/thay thế khi khác.

05/10/2026. Triển khai nền Organization riêng, chưa nối Organization vào Workspace hoặc thay quyền Workspace hiện tại. Không coi increment này là hoàn thành C1/C2.

## Models

`Organization`: ownerId, name (1–200 ký tự, một dòng), version/CAS, timestamps, private mutationRevision.

`OrganizationMembership`: organizationId/userId (immutable, unique pair), role admin/member, state active/inactive, joinedAt/leftAt, version. Owner suy từ Organization.ownerId với membership active; không có role Owner độc lập để tạo hai nguồn sự thật. User không thêm role toàn tài khoản.

Membership inactive chặn Owner/Admin/Member; authorization dùng DB hiện tại, không đọc role do client/JWT tự khai. Các thao tác store kiểm emailVerifiedAt, authVersion, session còn hạn/chưa thu hồi. Transaction actor lock và Organization mutationRevision là nền serialize; các API quản lý role/ownership sau này phải dùng cùng guard.

## HTTP

| Method/path | Input | Quyền | Kết quả |
|---|---|---|---|
| POST /organizations | name | User xác minh | 201, organization + owner membership tạo trong một transaction |
| GET /organizations | limit 1–100, cursor | User xác minh | Chỉ tổ chức có membership active, newest-created-first, nextCursor |
| GET /organizations/:id | — | Member hiện tại | DTO public, role owner/admin/member |
| PATCH /organizations/:id | name, expectedVersion | Owner/Admin hiện tại | DTO version mới hoặc no-op nếu tên không đổi; stale 409 |

Origin và JSON policy, size 16KB, limiter, authentication giống nền BE. Không nhận ownerId, role, membership, description hoặc bất kỳ field ngoài contract.

Error: ORGANIZATION_UNAVAILABLE (404 không phân biệt không có/mất quyền); ORGANIZATION_ADMIN_REQUIRED (403); EMAIL_VERIFICATION_REQUIRED (403); VERSION_CONFLICT (409); ORGANIZATION_SETUP_REQUIRED (503 khi chưa có unique membership index). Secret/internal revision không có trong DTO.

POST chưa có idempotency key; mất phản hồi không tự retry create. UI mới phải dùng uncertain-write guard hoặc bổ sung idempotency trước mở luồng tạo tổ chức.

## Index và triển khai dữ liệu

Thêm collections mới, không sửa/backfill Workspace cũ. Runtime index plan và DATABASE-LAYOUT-v0.2.json có extension C1 ghi rõ phạm vi mới. Unique membership pair kiểm trước create; indexes không tự tạo lúc app startup, không làm API Workspace cũ ngừng hoạt động nếu Organization chưa setup.

Trên môi trường được chọn, tạo indexes qua `BE` script `db:indexes` (additive createIndexes, không syncIndexes/drop). Lượt triển khai này chỉ tạo indexes trong database integration riêng; chưa áp dụng lên database dev thật.

## Chưa có trong increment

Organization invitations/member management/role mutation/ownership transfer; attached Workspace/Manager/Lead/Guest; Admin quyền đọc Workspace trực thuộc; Kick/Ban/activity; archive/trash và Task enrichment. Không có đường tắt cho client gắn organizationId vào Workspace cũ.

## Acceptance

- Tạo tổ chức và owner membership atomic; DB bảo vệ duplicate membership.
- User A không xem/đổi tổ chức B; Member đọc được nhưng không sửa.
- Admin được sửa; hạ role hoặc inactive có hiệu lực ở request sau kể cả claims cũ.
- Hai sửa cùng version chỉ một commit; response không lộ mutationRevision.
- Unverified/revoked session/authVersion cũ bị từ chối ở store.
- List cursor không lẫn tổ chức khác; HTTP chặn missing auth/hostile Origin/role injection.
- Existing Auth/Workspace/Work/Notifications integration tiếp tục đạt.
