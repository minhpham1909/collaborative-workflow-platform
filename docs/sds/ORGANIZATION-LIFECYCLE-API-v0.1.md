# C2 increment 1 — Organization invitations/admission/exit

> Hiện hành 05/10: public Organization/Project mail entry và Guest context đã nối, C2 đạt [gate core](../qa/C2-ENTRY-GUEST-UI-CHECK.md). Token chỉ memory của tab sau scrub; explicit accept sau verified login. Ghi nhận UI entry chưa nối bên dưới là lịch sử increment 1; chưa live SMTP/Google hoặc production fallback.

05/10/2026. Backend slice: lời mời EMAIL vào tổ chức, có thể kèm Workspace; tiếp nhận và rời/loại Member. Chưa hoàn thành C2 Lead/Guest hoặc C3 Ban.

## Contract

| Method/path | Input | Quyền |
|---|---|---|
| POST /organizations/:id/invitations | email, workspaceId tùy chọn | Org Owner/Admin |
| GET /organizations/:id/invitations | limit/cursor | Org Owner/Admin |
| POST /organizations/:id/invitations/:invitationId/revoke | expectedVersion invitation | Org Owner/Admin |
| POST /organization-invitations/preview | token | Public; Origin/JSON/rate guard |
| POST /organization-invitations/accept | token | User xác minh, đúng email |
| POST /organization-invitations/:id/accept | body rỗng | User xác minh, đúng email; dùng Inbox |
| POST /organizations/:id/leave | expectedVersion membership | Member/Admin; Owner phải transfer |
| POST /organizations/:id/members/:userId/remove | expectedVersion membership | Owner; Admin chỉ loại Member |

Lời mời chỉ cấp Member. Không nhận role/type LINK/managerId hoặc parent ngoài contract. Organization admission bản này EMAIL-only; Guest EMAIL/LINK thuộc slice sau. Hạn 7 ngày là implementation-selected kế thừa invitation nền, chưa biến thành phê duyệt mọi tham số cho tổ chức. workspaceId phải thuộc đúng Org trước tạo và trước accept. Input email canonical, hash token unique, plaintext token chỉ trong encrypted delivery payload; không trả token/link bí mật trong invite/list DTO.

Public preview chỉ tên tổ chức, Workspace đích nếu có, role Member, inviter name và expiresAt; không email/member list. Existing user nhận in-app organization_invitation ngay lúc queue, không chờ SMTP; không tự gia nhập. Outbox failure không rollback invitation đã lưu. Recipient chưa có account dùng token sau signup/verify; FE public organization-invite entry page/token intent chưa nối, không nghiệm thu email-link E2E người dùng mới ở slice này.

## Accept/revoke

Actor session/authVersion/verified và exact email kiểm trong transaction. Org guard serialize accept/revoke/role/exit. Org membership + optional Workspace membership + consume invitation + cancel queued mail atomic. Member hiện tại giữ role đã cấp; inactive rejoin về Member, clear exitReason và tăng generation. Không tự phục hồi Admin hoặc Task assignment cũ.

Invitation EMAIL single-use. Replay cùng account khi membership vẫn active trả ALREADY_ACCEPTED, không cấp lại Workspace đã rời. Accepted invite không dùng để rejoin tổ chức sau exit. Wrong email → INVITATION_EMAIL_MISMATCH; expired/revoked/missing parent → INVITATION_UNAVAILABLE. Inbox accept-by-ID không expose reusable token. Accepted/revoked payload bị ẩn theo current invitation state.

## Exit/remove

- Owner không rời/bị loại nếu chưa transfer. Admin không loại Owner/Admin khác.
- Manager phải được thay ở mọi Workspace quản lý trước exit; trả MANAGER_REPLACEMENT_REQUIRED, không để nhóm mồ côi. Emergency Ban/takeover thuộc C3; chưa có tự động fallback.
- Thu hồi Org membership và mọi Workspace membership trực thuộc; reset email overrides; role cũ ngừng hiệu lực. Task chưa Done bỏ assignee cả Project Active/Archived; Done giữ assignee lịch sử; Creator/Comment Author/nội dung giữ nguyên.
- Cancel Work outbox pending/processing/failed theo recipient và Workspace scope; thư đã gửi không recall được. Không thay Workspace độc lập, tổ chức khác, auth account hoặc sessions toàn tài khoản.
- Guest grants chưa có model; cascade Guest sẽ nối khi Guest slice được triển khai, không coi exit hiện tại đã kiểm toàn bộ Guest.

## Email worker

Shared dispatchInvitationMail phân nhánh OrganizationInvitation riêng dưới category invitation. Validate encrypted recipient/purpose/token hash, target parent/current invitation và lease; capture tests kiểm retry/redaction/concurrent lease. Template chứa Organization/Workspace/Member và URL `/organization-invite#token=...` cho FE contract tương lai. Không chạy worker SMTP thật hoặc queue dev cũ; không bật mail-link luồng người dùng mới trước FE intent/page hoàn thiện. Provider exactly-once và khoảng cách check/send không được bảo đảm.

## Models/indexes

Thêm organization_invitations, unique tokenHash và organization list index; OrgMembership thêm generation/exitReason, Audit thêm joined/left/removed/invite events. Notification/Outbox có nullable organizationId/organizationInvitationId và validation exclusive Workspace-vs-Organization target. Signed Inbox category hỗ trợ organization_invitation. Không TTL/purge invitation hay chuyển dữ liệu cũ.

Indexes đã tạo additive trên local dev sau audit scope valid; dev 0 Org/1 legacy standalone, không tạo thử invitation thực hoặc đụng pending Auth mail. Runtime Invite trả setup-required khi thiếu unique indices.
