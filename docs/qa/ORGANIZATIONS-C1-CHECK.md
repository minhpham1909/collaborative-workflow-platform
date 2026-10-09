# C1 — Organization increment 1 QA

## Hiện hành: C1 đạt gate nền — increment 3

05/10/2026. 48 BE unit pass (7 Mongo skip riêng lượt unit), 55 integration pass trên isolated replica set, 12 FE unit pass và build 113 modules đạt. Sau bổ sung assert role CAS, targeted Organization suite 9/9 pass. `git diff --check` đạt.

Thêm bằng chứng: Owner-only Admin role mutation, self owner role immutable; target outside/unverified từ chối; Admin tự làm Manager giữ Org role; Manager cũ vẫn Member; demote Admin không mất membership đã cấp riêng. Manager không bổ nhiệm Manager khác. Internal reactivate unique pair/override reset/no duplicate audit/notification; signed membership read-all, scope/privacy. Concurrent role mutation một commit; concurrent ownership transfer một owner và audit duy nhất. API HTTP roster/audit/invalid role được kiểm.

Thêm OrganizationAudit model/index, input DTO strict/CAS và 10 use cases mới. Đã có script audit scope read-only, fixtures phát hiện Manager thiếu membership và legacy valid. Local Mongo dev được khởi động để audit: 0 organizations, 1 standalone, 1 legacy missing fields, 0 issues. Indexes tạo additive trên database local đã audit; không backfill, không ownership chuyển, không gửi mail. Mongo dev đang chạy riêng; API/worker không được khởi động bởi đợt này.

Gate C1 chỉ gồm nền Organization/scoped access/management/internal assignment/compatibility. Org invitation/admission, exits/Kick/Ban, Guest/Lead, D4/D5 và production migration/restore rehearsal thuộc mốc sau, chưa nghiệm thu. FE chỉ hỗ trợ notification membership mới, chưa Organization screens/UI Stitch.

Các phần dưới là lịch sử.

## Hiện hành: C1 increment 2 — 05/10/2026

- 47 unit pass, 7 dedicated Mongo suites skipped trong lượt unit; 54 integration pass trên isolated replica set. Sau thêm assertions HTTP attached Workspace/counts/roster/reopen, targeted Organization suite 8/8 pass. Không SMTP thật hoặc mutation DB dev.
- Organization Owner/Admin create/list attached Workspace; Manager membership atomic; member không vào Workspace khác chỉ vì là Org Member; client không inject parent/manager.
- Org Admin chưa có Workspace membership đọc/quản trị Task được nhưng không được gán Task hay sửa email override cá nhân; hạ Admin mất access khi không có Workspace membership riêng.
- Org membership inactive chặn stale Workspace membership trên direct Work/Workspace, Home/My Tasks counts, roster, Inbox và work mail. Done giữ assignee lịch sử; reopen bỏ assignee đã mất Org access.
- Legacy missing-field Workspace tiếp tục owner access/list; Admin tổ chức không truy cập standalone khác. Auth/Accounts/Profile/Workspace/Work/Notifications regression đạt.
- Invitation/ownership API standalone bị chặn trên attached Workspace; Manager leave không làm nhóm thiếu quản lý.
- C1 vẫn Đang làm: chưa runtime member/role/Manager mutation và audit dữ liệu thật. C2/C3 sẽ hoàn thiện invitations/Guest/lifecycle, hard Comment moderation. UI chưa đổi.

Các kết quả increment 1 dưới đây là lịch sử.

05/10/2026. Phạm vi: hai model mới, create/list/get/update API, authorization Organization và compatibility BE cũ. Contract: [Organization API](../sds/ORGANIZATIONS-API-v0.1.md).

## Kết quả thực thi

- Unit/schema suite: 46 pass, 7 Mongo tests skip vì không có TEST_MONGODB_URI trong lượt unit.
- Integration suite riêng Mongo replica set: 53 pass, 0 fail/skip; gồm 7 Organization tests (suite cha và 6 nhóm assertion). Binary test local, database `workflow_auth_test`; không dùng Mongo dev thật.
- Organization: atomic ownership/membership, unique pair duplicate rejection, pagination, cross-org denial, Member cannot edit, Admin edit/demotion, inactive membership, stale authVersion, revoked session/unverified gate, concurrent CAS, DTO redaction.
- HTTP: missing Bearer, hostile Origin, client role injection rejected; GET và POST đúng contract.
- Regression integration Auth/Accounts/Profile/Workspace/Work/Notifications đạt; mail delivery dùng test capture, không chạy SMTP queue dev.
- git diff --check đạt. Chưa đổi FE nên không coi đây là UI QA.

## Giới hạn nghiệm thu

- C1 đang làm, không đạt gate toàn mốc: chưa attached Workspace, Manager/Lead/Guest, invitations/member mutation, ownership transfer, Ban hoặc migration Workspace.
- Chưa chạy create-indexes trên database dev/production. Organization create trả setup-required nếu unique pair index chưa được cài; server Workspace cũ không bị startup fail vì index Organization.
- Chưa có idempotency create; chưa UI Organization; chưa Google/SMTP providers live mới.
- Membership role/state mutations trong tests dùng dedicated fixtures; chưa phải API cho người dùng.

Tiếp theo: scoped Workspace contract/migration, liên kết organizationId và authority chain; kiểm lại mọi service workspaces/work/notifications để Org Admin được quyền theo D2 mà không tạo shortcut lệch scope.
