# Workspace / Invitations API v0.1

Ngày 03/10/2026. BE implementation theo UC-04 đến UC-12, BR ownership/membership/invitation và UC-33 Workspace email override. [QA](../qa/WORKSPACE-INVITATIONS-CHECK.md). Chưa có FE sản phẩm, Project/Task APIs hoặc Notifications inbox APIs.

## Transport và quyền

Origin/CORS dùng policy chung; POST/PATCH cần WEB_ORIGIN chính xác, application/json, body ≤256 KiB (rich text). Access JWT Bearer + verified gate cho Workspace và accept; repository kiểm lại session/authVersion/verified trong transaction. Preview public nhưng cần token hợp lệ, JSON/Origin. Workspace không tồn tại hoặc không có membership trả WORKSPACE_UNAVAILABLE 404; sai quyền Owner trả OWNER_REQUIRED 403. Fields server-owned bị DTO từ chối.

Workspace.ownerId là nguồn quyền duy nhất, membership không thêm role. User guard → Workspace mutationRevision guard → kiểm membership/ownership → ghi trong transaction. Read Workspace cũng dùng guard để lấy snapshot có quyền; đây là lựa chọn implementation, chưa benchmark NFR. Startup yêu cầu unique membership pair, invitation token và notification event/recipient indexes đã tạo bằng db:indexes.

## Routes

| Method/path | Input / hành vi |
|---|---|
| GET /workspaces | Chỉ Workspace có membership active |
| POST /workspaces | name, description tùy chọn rich-text envelope; tạo Workspace+Owner membership atomic |
| GET /workspaces/:id | Workspace DTO, role hiện tại, membershipVersion, emailOverrides |
| PATCH /workspaces/:id | Owner; expectedVersion của Workspace, name và/hoặc description |
| GET /workspaces/:id/members | Member hiện tại; userId, tên, avatar, role, membership version, joinedAt; không email |
| POST /workspaces/:id/leave | expectedVersion của membership; Owner cần chuyển ownership trước |
| POST /workspaces/:id/members/:userId/remove | Owner; expectedVersion của membership target; không loại Owner |
| PATCH /workspaces/:id/ownership | Owner; expectedVersion của Workspace, memberId active khác actor |
| PATCH /workspaces/:id/email-overrides | Chỉ membership bản thân; expectedVersion, emailOverrides partial |
| POST /workspaces/:id/email-overrides/reset | expectedVersion membership; tất cả về inherit |
| GET /workspaces/:id/invitations | Chỉ Owner; id/type/recipient email/state/version/emailDelivery, không token/hash |
| POST /workspaces/:id/invitations | Owner; type EMAIL+email hoặc LINK không email; created trả 201, ALREADY_MEMBER 200 |
| POST /workspaces/:id/invitations/:invitationId/revoke | Owner; expectedVersion invitation; scoped parent/child |
| POST /workspaces/:id/invitations/:invitationId/retry-email | Owner; expectedVersion invitation; retry failed job nếu invitation còn active |
| POST /invitations/preview | token; chỉ workspaceName, inviterDisplayName, type, expiresAt |
| POST /invitations/accept | Bearer verified, token; WORKSPACE_JOINED hoặc ALREADY_MEMBER |

List hỗ trợ limit (mặc định 20, tối đa 100), cursor opaque, items/nextCursor. Workspace/invitations sort createdAt mới nhất rồi _id; members sort joinedAt mới nhất rồi _id. Token/cursor/ID kiểm nghiêm, không nhận Mongo operators. Member list/Workspace DTO không lộ email người khác, credentials, payload outbox hoặc guard revisions. Guardrails tên 200 UTF-16 units, mô tả 20.000 graphemes/editor tree bounds là kỹ thuật; không suy thành product limits đã duyệt. Limiter tạm 60 request/phút/IP mỗi router; create Workspace/invitation/retry thêm 10/phút/IP, theo process.

## Invitations

Token random 32 bytes hex, chỉ SHA-256 ở invitation; hạn 7 ngày. LINK trả URL một lần khi tạo, không lưu/reveal token từ list; dùng cho nhiều User. EMAIL chỉ account verified khớp email canonical, dùng một lần, token không trả cho Owner. Preview không lộ recipient email/IDs/members/projects/tasks. Wrong email/unverified không consume. EMAIL đã accepted chỉ idempotent khi đúng recipient vẫn active; sau leave không dùng lại, cần lời mời mới hoặc LINK còn hiệu lực.

Accept/revoke/transfer serialize trên Workspace guard. Revoke không kick thành viên đã gia nhập; không phục hồi lời mời expired/accepted/revoked. Transfer giữ mọi invitation còn hiệu lực; Owner cũ mất quyền quản lý, Owner mới quản lý. Retry email giữ token và expiresAt, không tự gia hạn. Failed job về pending; pending/processing giữ trạng thái; sent/payload đã xóa không resend qua API này.

## Membership và cleanup

Leave/remove chuyển membership inactive, clear overrides, tăng version; bỏ assignee Task chưa Done và chưa deleted ở cả Active/Archived, tăng Task version/updatedAt. Done giữ assignee lịch sử; không phát assignment notifications hàng loạt. Owner không leave trước transfer. Repeated leave/remove inactive không lặp cleanup. Rejoin giữ cùng membership ID, tăng membershipGeneration/version, cập nhật joinedAt, overrides inherit; không tự giao lại Task. Nhãn đã rời phải derive từ membership khi Task API triển khai, không persist boolean.

Overrides chỉ inherit/on/off cho assignment/comment/content/status. Version membership bảo vệ cả leave/remove và preference edits; snapshot cũ không loại membership vừa rejoin. Role derive ownerId luôn, không duplicate role state. Future Project/Task writes phải lấy cùng Workspace guard và kiểm parent state/membership/version để không resurrect assignee đã cleanup. Work email worker phải kiểm membership/setting lúc gửi; worker đó còn increment sau.

## Invitation email

Invitation+encrypted outbox ghi cùng transaction. mail:once ưu tiên Auth; nếu Auth idle xử lý một invitation job. Provider SMTP/capture chung; template lời mời song ngữ tạm, email locale policy chưa triển khai. Kiểm invitation/expiry/hash/recipient trước send. Lease 60 giây, CAS lease token, retry exponential tối đa 5 attempts, lỗi redacted; Owner có thể retry failed nếu token active. Revoke cancel pending/processing/failed và xóa encrypted payload; token invalid ngay cả nếu email đã ra ngoài.

Capture account recipient tại lúc bắt đầu gửi; sau provider accepted, transaction guard Workspace và dedupe notification theo event/recipient nếu invitation còn valid và chưa là Member. EMAIL có in-app cho account tồn tại lúc gửi, không hồi tố signup sau; LINK không broadcast. Không có Notifications inbox API ở increment này. Stale/consumed/expired invitation mail cancelled. Delivery at-least-once: crash/lease loss sau SMTP accepted có thể gửi lại; không tuyên bố exactly-once hoặc khả năng rút email đã gửi.

URL /invite#token=... do FE xử lý sau; trang development tại localhost:5173 đã có preview/accept khi mở URL này và login trên cùng trang. Token chỉ memory, removed khỏi address bar; reload phải mở lại link. Không mount devtools vào BE production.

## Tiếp theo

Project Active/Archived và Task/Comment APIs dùng cùng guard. Notifications inbox/settings effective eligibility, worker nền và email locale triển khai sau. FE vẫn theo requirement → BE/contracts → thiết kế module, không lấy devtools làm UI sản phẩm. Idempotency operation keys/retention/storage chưa mở ở increment này.


Cập nhật Notifications 03/10/2026: EMAIL in-app có thể accept qua POST /invitations/:invitationId/accept {} với verified exact recipient email; LINK không dùng đường này. Không trả token; cùng transaction guard/lifecycle với token accept. [Contract](NOTIFICATIONS-EMAIL-API-v0.1.md).
