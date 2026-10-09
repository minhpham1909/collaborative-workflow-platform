# C2 increment 2 — Project Lead / Guest

> Hiện hành 05/10: C2 core entry/scoped views đã nối và đạt [browser QA](../qa/C2-ENTRY-GUEST-UI-CHECK.md). Project DTO thêm `context.workspaceName/canOpenWorkspace` và `permissions.manageProject`, giữ capabilities sau update/state. FE Guest không gọi parent Workspace API. Public Org/Project invite pages/token intent đã có; các ghi nhận “chưa nối” dưới là lịch sử increment 2. SMTP/Google thật/redesign vẫn chưa nghiệm thu.

05/10/2026. Backend slice của C2; không nghiệm thu public invite entry hoặc toàn UI Guest.

## Phân quyền

Project có nullable leadId. Owner Workspace / Manager / Org Owner/Admin bổ nhiệm Lead, target phải là Member Workspace hiện tại (và Org active nếu trực thuộc). Guest không làm Lead. Lead là quan hệ theo Project, không đổi role tài khoản/Workspace/Organization.

Lead chỉnh Task/phân công/status/xóa mềm trong Project Active và chỉnh mô tả/mục tiêu Project. Không sửa tên/icon/lifecycle Project hoặc quản lý Workspace/Guest chỉ vì là Lead. Comment vẫn author-only ở runtime C2; kiểm duyệt/hard delete sẽ triển khai C3. Reopen có request/rate và checklist/priority thuộc C4, chưa coi Task status hiện tại là D5 đã hoàn thành.

Guest đọc Project/Task/Board và bình luận; edit/delete Comment của mình trong Active theo runtime hiện tại. Không tạo/nhận/sửa/xóa/chuyển status Task; không Workspace list/member/org settings. Historical Creator/Assignee không vượt quyền Guest khi người đó quay lại chỉ bằng Guest grant. Active Workspace membership/Org admin được ưu tiên hơn Guest, accept Guest không downgrade các quyền hiện tại.

## Routes

| Method/path | Body/query | Quyền |
|---|---|---|
| PATCH /projects/:id/lead | leadId (User ID hoặc null), expectedVersion Project | Workspace quản trị |
| GET /shared-projects | Project query state/q/from/to/limit/cursor | Verified User; chỉ active Guest grants |
| POST /projects/:id/guest-invitations | type EMAIL/LINK, email cho EMAIL | Workspace quản trị; Project Active |
| GET /projects/:id/guest-invitations | limit/cursor | Workspace quản trị |
| POST /projects/:id/guest-invitations/:invitationId/revoke | expectedVersion invitation | Workspace quản trị |
| GET /projects/:id/guests | limit/cursor | Workspace quản trị; không email/security fields |
| POST /projects/:id/guests/:userId/remove | expectedVersion grant | Workspace quản trị |
| POST /project-invitations/preview | token | Public; Origin/JSON/rate guards |
| POST /project-invitations/accept | token | Verified User; EMAIL đúng recipient |
| POST /project-invitations/:invitationId/accept | body rỗng | Verified exact EMAIL recipient, dùng Inbox |

Backend Task/Board/Comment endpoints hiện có dùng projectAccess thay yêu cầu Workspace membership duy nhất. GET Workspace/projects vẫn chặn Guest, không dùng quyền Project để mở danh sách Project khác. Shared list lọc grants/parent trước pagination. Project DTO có leadId/accessRole và permissions; Task DTO khóa write khi Guest.

## Invitation và thu hồi

- EMAIL một recipient, một lần; hash token, delivery encrypted, role cố định Guest. Inbox nhận ngay nếu recipient có account; accept không tạo Org/Workspace membership.
- LINK nhiều người, có hạn và revoke; 7 ngày là implementation-selected kế thừa nền. Raw link chỉ trả một lần cho người quản trị khi tạo, không có token trong list/preview.
- Public preview tên Project/Workspace, role Guest, inviter name, expiresAt; không recipient email hoặc roster.
- EMAIL replay chỉ khi cùng account có grant active; không hồi sinh grant đã bị thu hồi. LINK còn hiệu lực có thể gia nhập lại sau Kick; Ban sẽ chặn ở C3, chưa có Ban runtime C2.
- Revoke link chặn các lần accept mới, không tự loại Guest đã chấp nhận. Remove Guest grant riêng có version/audit, giữ Comment. Nếu người đó vẫn là Member/Admin, thu hồi Guest grant không thu hồi quyền từ role khác.
- Project Archived đọc được; Guest không viết Comment/Task. Tạo invitation khi Archived bị chặn; invitation đã phát hành có thể accept quyền đọc khi Project chuyển Archived, không mở quyền ghi.
- Rời Workspace/Org cleanup Lead và Guest grants tương ứng cả Project Archived; giữ lịch sử/nội dung. Org exit không ảnh hưởng Guest bên ngoài khác hoặc Workspace độc lập.

## Models và concurrency

project_guests unique (projectId,userId), project_guest_invitations unique tokenHash, project_access_audit. Parent chain project/workspace/organization kiểm thật trong transaction, không trust body parent/role. Workspace/Organization guards serialize grant/revoke/child mutations; Lead dùng Project CAS. Audit cho Lead, accept/revoke Guest và invitation, không token/email/Comment content.

Notification/Outbox thêm project_invitation target typed exclusive với Workspace/Org invitation. Worker shared lease phân nhánh Project mail, kiểm target/token/recipient và dùng template Guest. Work Inbox old events hiện/ẩn theo Project quyền hiện tại; email công việc vẫn cần membership thực hiện, không tự subscribe Guest.

Indexes đã tạo additive trên local dev sau audit scope valid; legacy leadId thiếu được đọc thành null, không backfill hoặc chuyển ownership.

## Giới hạn UI/triển khai

Inbox có renderer/filter/accept-by-ID Guest. `/project-invite` và `/organization-invite` public FE token intent chưa nối. Guest Project/Task màn hiện tại còn lấy parent Workspace qua API mà Guest không có quyền; cần màn shared context riêng trước browser E2E/public release. Không nới Workspace API để làm Guest UI chạy tạm. Template URL là FE contract tương lai, chưa gửi SMTP thật/dev queue. Core C2 đã có Backend Lead/Guest, nhưng toàn mốc chưa đạt UI/admission acceptance.
