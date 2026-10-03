# Thiết kế MongoDB v0.1

Bản này giữ làm lịch sử. Thiết kế hiện hành sau chỉnh sửa phạm vi: [DATABASE-DESIGN-v0.2.md](DATABASE-DESIGN-v0.2.md), [layout JSON](DATABASE-LAYOUT-v0.2.json) và [ERD v0.2](DATABASE-ERD-v0.2.md). Không dùng số collection/phần mở rộng xen kẽ ở v0.1 để bootstrap schema lõi.

Ngày 03/10/2026. Trạng thái: bản thiết kế cụ thể để review, chưa triển khai Mongoose models, tạo database hoặc index thật. Nguồn nghiệp vụ: SRS, decision register và DATA-MODEL-v0.1.md. Các lựa chọn schema dưới đây do assistant đề xuất trong phạm vi thiết kế DB; không biến giới hạn/NFR/retention còn mở thành quyết định đã duyệt.

## 1. Quyết định cấu trúc

Ưu tiên mới 03/10/2026: storage/resources chuyển Upcoming theo chủ dự án. Không thêm files/workspace_resources/storage_usage vào schema lõi, không cần chọn provider/quota/scan jobs lúc này. Google identity/avatar URL vẫn thuộc User/auth core. Announcement/pin capability giữ để thiết kế nhưng phase chưa chốt; không tự đưa vào lịch triển khai lõi từ việc hoãn storage. Bước tiếp tập trung User/Identity/Session → Workspace/Membership/Invitation → Project/Task/Comment → Notifications/Email settings/outbox.

1. Dùng một database ứng dụng; tách collection theo đối tượng có lifecycle/query độc lập. Không nhúng toàn bộ thành viên, Project, Task, Comment hoặc Notifications thành mảng trong User/Workspace/Project.
2. `workspaces.ownerId` là nguồn ownership duy nhất. Membership không lưu thêm role Owner/Member: role API được tính từ ownerId và membership active. Owner cũng bắt buộc có membership active.
3. Membership giữ một document cho mỗi cặp Workspace/User, kể cả khi đã rời; state active/inactive và thông tin lần gia nhập hiện tại. Rejoin cập nhật document đó, không tạo duplicate hoặc phục hồi assignment/override cũ.
4. Task và Comment lưu `workspaceId` bên cạnh parent ID để query/quyền/cleanup rõ ràng. Server lấy các ID ngữ cảnh từ parent, không nhận tùy ý từ client. Bản đầu không có thao tác move Task/Project giữa các parent.
5. Cấu hình hữu hạn được embed: email settings/locale/Terms trong User, email override trong Membership, rich text trong các trường mô tả/content. Dữ liệu phát triển liên tục được reference.

Đây là lựa chọn thiết kế cho dự án. MongoDB khuyến cáo tránh mảng tăng không giới hạn: [Unbounded arrays](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/).

## 2. Bản đồ collection

| Nhóm | Collection | Trách nhiệm |
|---|---|---|
| Tài khoản | `users` | Danh tính, credential hash nếu có, verified, setting chung, avatar Google/fallback |
| Tài khoản | `auth_identities` | Google provider/sub liên kết User; không tự merge email |
| Tài khoản | `sessions` | Phiên và trạng thái thu hồi, dùng cho auth mechanism được chọn |
| Tài khoản | `auth_tokens` | Xác minh/reset, purpose/expiry/used/revoked |
| Cộng tác | `workspaces` | Nhóm, Owner duy nhất, thông tin nhóm |
| Cộng tác | `workspace_memberships` | Membership hiện tại/inactive và override |
| Cộng tác | `workspace_invitations` | EMAIL/LINK, quyền nhận, lifecycle |
| Công việc | `projects` | Project Active/Archived |
| Công việc | `tasks` | Task, assignment/status/deadline/editor |
| Công việc | `task_comments` | Comment và Author |
| Thông báo | `notifications` | In-app theo recipient/read state |
| Nội dung Workspace | `workspace_announcements` | Bài chung do Owner đăng/ghim; phase/quota cần review |
| Gửi email | `email_outbox` | Yêu cầu gửi bền vững, worker/retry/dedup |
| Thử lại thao tác | `operation_keys` | Đề xuất idempotency Task/Comment; phụ thuộc nhóm 6 |

13 collection trong thiết kế mở rộng hiện tại và 1 collection tùy phạm vi idempotency; release phase announcements còn cần chốt. My Tasks, Kanban và overdue là query/view, không collection. files/workspace_resources/storage_usage là mở rộng đề xuất tại AVATAR-STORAGE-RESOURCES-REVIEW.md, chưa quyết định provider/quota/phase. Reminder/browser push vẫn increment sau.

## 3. Quy ước dữ liệu

- `_id`: ObjectId. Reference dùng ObjectId, không dùng email/display name làm khóa quan hệ.
- Dates: BSON Date ở UTC; server tạo `createdAt`/`updatedAt`, client không sửa. Deadline đến phút, hiển thị Asia/Ho_Chi_Minh dù UI Việt/Anh.
- Editable entities dùng `version` integer bắt đầu 0; tăng trên mọi thay đổi dữ liệu entity, kể cả lifecycle cleanup. Không dùng đồng thời một version độc lập khác mà không có quy tắc.
- Fields tùy chọn dùng `null` nhất quán; `deletedAt: null` nghĩa là còn khả dụng, không để trộn missing/null trong dữ liệu mới. Tất cả ID/enum/field allowlist validate ở BE.
- `schemaVersion` cho rich text/notification payload khi cần tiến hóa, khác `version` phục vụ concurrency.
- Field length theo SRS hiện là mục tiêu review; không coi byte limit MongoDB là giới hạn nhập liệu sản phẩm. Rich text có giới hạn raw payload/node/depth/URL riêng cần chốt ở API/editor design.
- Đề xuất product email comparison: trim/lowercase toàn email vào `emailCanonical`; lưu `email` để hiển thị. Không strip dấu chấm hoặc `+tag`. Đây là quy tắc so sánh ứng dụng đề xuất, dùng chung invitation/auth, cần xác nhận trước implementation; không tuyên bố mọi mail server có cùng quy tắc.

## 4. Data dictionary

Các trường dưới đây chưa bao gồm Mongoose internals. `!` nghĩa là bắt buộc; `?` tùy chọn/null. Schema thực phải enforce kiểu, giới hạn và allowlist, không để `Mixed` tùy ý cho rich text/payload.

### 4.1 users

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id` | ObjectId ! | Danh tính ổn định |
| `displayName` | String ! | Tên chung; không unique |
| `email`, `emailCanonical` | String ! | Email hiển thị/so sánh unique |
| `passwordHash` | String ?, private | Bắt buộc khi có local login; null với Google-only, không trả API/log/populate |
| `avatar` | Object ! | source google/initials, googlePictureUrl tùy chọn và refreshedAt; chỉ từ identity verified, fallback khi thiếu/lỗi |
| `emailVerifiedAt` | Date ? | null nghĩa là chưa verified; không lưu boolean thứ hai |
| `locale` | `vi`/`en` ? | Global preference; mặc định/fallback policy còn draft |
| `emailPreferences` | Object ! | assignment/comment/content/status booleans; assignment true, loại khác false |
| `termsAcceptance` | Object ! | `{version, acceptedAt}` theo nhóm 3 |
| `authVersion` | Integer ! | Đồng bộ credential lifecycle khi cần; không thay session revocation |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | Profile/settings concurrency và timestamps |

Chủ dự án cập nhật: Google sign-in ngay bản đầu, lưu URL avatar nếu Google trả về; thiếu/lỗi dùng chữ cái, không upload avatar riêng. Tài khoản Google-only không có local password; recovery không tự tạo credential mới. Liên kết email hiện có cần chứng minh tài khoản, không auto-merge. Đổi email/xóa account chưa có endpoint/schema lifecycle hoàn chỉnh. Reset password không làm mất memberships.

### 4.2 workspaces

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `ownerId` | ObjectId ! | Owner từ User, phải có membership active |
| `name` | String ! | Tên nhóm |
| `description` | RichText ! | Có thể là document rỗng |
| `version` | Integer ! | Sửa thông tin/transfer ownership |
| `mutationRevision` | Integer ! | Guard nội bộ cho workspace-scoped writes, xem mục 7 |
| `createdAt`, `updatedAt` | Date ! | Timestamps nghiệp vụ |

Không embed member/project arrays hoặc dùng tên nhóm unique toàn hệ thống. Guard increments không làm tăng version/updatedAt của form Workspace nếu thông tin nhóm không đổi.

### 4.3 workspace_memberships

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `workspaceId`, `userId` | ObjectId ! | Unique cặp Workspace/User |
| `state` | `active`/`inactive` ! | Current access |
| `joinedAt` | Date ! | Lần gia nhập hiện tại/gần nhất |
| `leftAt` | Date ? | null khi active |
| `exitReason` | `left`/`removed` ? | Thông tin lifecycle gần nhất |
| `membershipGeneration` | Integer ! | Tăng khi rejoin; không cấp quyền lịch sử |
| `emailOverrides` | Object ! | Mỗi event: `inherit`/`on`/`off` |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | State/settings concurrency |

Leave/remove đặt inactive và reset override về inherit; rejoin active, joinedAt mới, generation tăng, không restore phân công cũ. Không lưu mảng toàn bộ lịch sử join/leave; audit history đầy đủ ngoài phạm vi hiện tại. Task Done tham chiếu User, không khóa membership generation, đúng quy tắc nhãn biến mất sau rejoin.

### 4.4 workspace_invitations

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `workspaceId`, `createdBy` | ObjectId ! | Ngữ cảnh/người mời lịch sử |
| `type` | `EMAIL`/`LINK` ! | Không cấp Owner |
| `email`, `emailCanonical` | String ? | Bắt buộc với EMAIL, null với LINK |
| `tokenHash` | String !, private | Hash token ngẫu nhiên đủ entropy, unique |
| `expiresAt` | Date ! | 7 ngày theo yêu cầu |
| `revokedAt`, `acceptedAt` | Date ? | Accepted chỉ dùng EMAIL |
| `acceptedBy` | ObjectId ? | EMAIL recipient đã accept |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | Lifecycle |

LINK không embed danh sách mọi người đã dùng; membership là kết quả join. Hiệu lực tính từ expiry/revoked/accepted, không lưu enum expired cần job cập nhật. Chuyển Owner không sửa createdBy/token; authorize bằng Owner hiện tại.

Token raw chỉ trả ở thao tác tạo/gửi có quyền; không ở list/preview hoặc log. Nếu UI muốn copy lại LINK sau này, cần chọn rotation hoặc lưu encrypted token, không thể khôi phục từ hash; chưa tự chốt copy-after-create. EMAIL queued gửi link cần token tạm trong payload mã hóa, xem outbox.

### 4.5 projects

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `workspaceId`, `createdBy` | ObjectId ! | Parent/Creator lịch sử |
| `name`, `description` | String/RichText ! | Thông tin Project |
| `state` | `active`/`archived` ! | Vòng đời |
| `archivedAt`, `archivedBy` | Date/ObjectId ? | null khi active; thông tin archive gần nhất |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | Edit/lifecycle |

Không Project Membership. Không tự thêm xóa Project/Workspace vào SRS từ thiết kế này. Archive không di chuyển Task, xóa assignee hoặc đổi status.

### 4.6 tasks

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `workspaceId`, `projectId`, `createdBy` | ObjectId ! | Server xác định parent và Creator |
| `title` | String ! | Tên một dòng |
| `description` | RichText ! | Editor chung |
| `searchText` | String !, derived | Text chuẩn hóa từ title + description.plainText |
| `status` | `todo`/`in_progress`/`done` ! | Đề xuất enum API ổn định, UI dịch nhãn |
| `assigneeId` | ObjectId ? | 0/1 assignee, giữ User ID lịch sử Done |
| `dueAt` | Date ? | Deadline UTC |
| `deletedAt`, `deletedBy` | Date/ObjectId ? | Xóa logic đề xuất; API không truy cập sau xóa |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | Version tăng cả cleanup; createdAt bất biến |

Không lưu overdue, manual order, current assignee name hoặc Project state làm nguồn quyền. My Tasks dùng Project state hiện tại qua lookup/batched join, không cache state trong Task để tránh update toàn bộ khi archive.

### 4.7 task_comments

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `workspaceId`, `taskId`, `authorId` | ObjectId ! | Parent/Author từ server |
| `content` | RichText ! | Không chấp nhận text hiển thị chỉ khoảng trắng |
| `deletedAt`, `deletedBy` | Date/ObjectId ? | Xóa logic đề xuất; chỉ Author theo SRS |
| `version`, `createdAt`, `updatedAt` | Integer/Date ! | Edit/delete |

Read/write Comment luôn kiểm tra Task chưa xóa và Project state. Xóa Task không cần đánh dấu tất cả Comment trong request để chặn truy cập ngay; Task gate chặn cả comment endpoints. Purge cả hai sau khi retention được chọn.

### 4.8 notifications

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `recipientId` | ObjectId ! | Chỉ người nhận đọc/mark |
| `eventId` | UUID/String ! | Một lần ghi thành công, unique cùng recipient |
| `category` | `work`/`invitation` ! | Hai cơ chế quyền/eligibility khác nhau |
| `workspaceId` | ObjectId ! | Context, không tự cấp quyền |
| `taskId`, `invitationId`, `actorId` | ObjectId ? | Loại event quyết định target |
| `changes` | Bounded typed array ! | assignment/content/status/comment; tập liên quan riêng recipient |
| `payloadVersion` | Integer ! | Template/schema version |
| `payload` | Allowlisted bounded object ! | Snapshot tối thiểu; không raw rich text/token/email của người khác |
| `readAt` | Date ? | null chưa đọc |
| `createdAt` | Date ! | Sort timestamp |

Lưu template keys/dữ liệu, không lưu câu Việt/Anh thành nguồn duy nhất. API render/redact sau kiểm tra quyền; không serialize raw payload mất quyền. Work category kiểm membership + Task availability; invitation cho preview tối thiểu, không bắt membership trước accept.

Sau rejoin, có cho hiện lại nội dung notification cũ hay che vĩnh viễn chưa được chốt; mặc định thiết kế theo quyền hiện tại, phải xác nhận policy trước API final. Không coi trạng thái read/unread là quyền.

### 4.9 sessions

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `userId` | ObjectId ! | Session riêng từng lần đăng nhập |
| `credentialHash` | String ?, private | Opaque session credential nếu chọn session cookie |
| `refreshTokenHash`, `refreshGeneration` | String/Integer ? | Chỉ nếu chọn JWT+refresh |
| `authVersionAtIssue` | Integer ! | Credential lifecycle reference |
| `createdAt`, `expiresAt`, `lastSeenAt` | Date ! | Expiry server kiểm mỗi lần dùng |
| `revokedAt`, `revokeReason` | Date/String ? | Logout/reset/change password |

Không triển khai cả hai auth modes cùng lúc. Access JWT nếu dùng tham chiếu session ID để check revoke, không lưu mọi access token trong DB. User-agent/IP metadata chỉ thêm nếu cần, có retention rõ; không là điều kiện xác thực duy nhất. TTL chưa bật cho bản ghi session khi retention/audit chưa chốt.

### 4.10 auth_tokens

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `userId` | ObjectId ! | Chủ token |
| `purpose` | `verify_email`/`reset_password` ! | Token không dùng chéo mục đích |
| `tokenHash` | String !, private | Unique, không lưu raw token lâu dài |
| `expiresAt` | Date ! | Verification 24h, recovery 30 phút |
| `usedAt`, `revokedAt` | Date ? | Single-use/resend revoke |
| `createdAt` | Date ! | Thời điểm phát hành |

Resend revoke token cũ cùng purpose trong transaction trước phát hành token mới/outbox. Expiry được kiểm trong predicate lúc consume; xóa tự động không là phương thức enforcement.

### 4.11 email_outbox

| Field | Type | Ý nghĩa |
|---|---|---|
| `_id`, `eventId`, `recipientKey` | ID/String ! | Unique event+recipient; recipientKey nội bộ, không expose |
| `userId`, `workspaceId`, `taskId`, `invitationId`, `authTokenId` | ObjectId ? | References theo category |
| `category`, `templateKey`, `payloadVersion` | Enums/String/Integer ! | auth/invitation/work; typed template |
| `eventTypes`, `payload` | Bounded array/object ! | Work changes theo recipient, chưa lọc prefs vĩnh viễn ở lúc enqueue |
| `encryptedDeliveryData` | Ciphertext object ? | Raw auth/invite URL nếu cần gửi lại; key ngoài DB, không log |
| `state` | `pending`/`processing`/`sent`/`cancelled`/`failed` ! | Worker lifecycle |
| `attempts`, `nextAttemptAt`, `leaseUntil` | Integer/Date/Date ? | Retry/lease concurrency |
| `providerMessageId`, `lastErrorCode`, `sentAt` | String/String/Date ? | Không lưu raw exception/credential |
| `createdAt`, `updatedAt` | Date ! | Operations |

Worker kiểm lại quyền/Task/preferences/token state trước mỗi lần thử, chọn locale theo policy được duyệt. Auth/invitation không chịu work-email setting. Token URL cần mã hóa ở trạng thái queued, sau sent/cancel/xử lý hết hạn bỏ ciphertext theo chính sách, không biến outbox thành nơi lưu credential không hạn. Provider idempotency chưa chọn; lease/unique không chứng minh exactly-once email.

### 4.12 operation_keys — đề xuất phụ thuộc nhóm 6

`_id`, `userId`, `operation`, `keyHash`, `requestHash`, `state`, `resultRef`, `createdAt`, `expiresAt`. Unique User+operation+keyHash. Cùng key/cùng request trả cùng kết quả; cùng key/khác request từ chối. Lưu references/status tối thiểu, không cache response chứa dữ liệu có thể mất quyền. Retry đọc result phải kiểm lại quyền. Thời hạn và operation scope chưa chốt, chưa bật TTL tùy tiện.

## 5. Rich text dùng chung

### Mở rộng identity và announcement ngày 03/10/2026

`auth_identities`: `_id, userId, provider(google), providerSubject(sub), createdAt, lastLoginAt`. Unique `(provider, providerSubject)`; đề xuất unique `(userId, provider)` để mỗi User liên kết tối đa một Google identity. Không lưu Google password/ID token/access token dài hạn. User creation + identity + Terms nhất quán; kiểm email uniqueness và chống linking race. Google verified dựa theo authority hoặc verification ứng dụng; auth mechanism ứng dụng vẫn mở.

`workspace_announcements`: `_id, workspaceId, title, content(RichText), createdBy, updatedBy, pinnedAt?, pinnedBy?, deletedAt, version, createdAt, updatedAt`. Owner hiện tại quản lý mọi bài trong nhóm; Creator chỉ lịch sử. Index `{workspaceId:1,createdAt:-1,_id:-1}` partial deletedAt:null; index `{workspaceId:1,pinnedAt:-1,_id:-1}` partial deletedAt:null/pinnedAt type date. Pin/unpin dùng Workspace gate/version. Quota ghim, phase release và email fanout chưa chọn; files/resources là proposal riêng.

Envelope đề xuất: `{ format, schemaVersion, document, plainText }`. `document` là tree theo allowlist/limits sẽ chọn ở editor contract, không HTML tùy ý. `plainText` server trích xuất đồng bộ khi lưu, không tin field client gửi. API edit nhận document; server validate rồi tính plainText/count/searchText.

Heading/paragraph/marks/link/list/emoji hỗ trợ cùng định dạng cho mọi trường; chỉ khác max-length và toolbar. Format cụ thể vẫn phụ thuộc editor chưa chọn, không tạo schema `Mixed` tự do rồi dùng làm final. Search tìm nhãn hiển thị của link, không URL ẩn; tiếng Việt/Anh không tạo hai bản dịch nội dung người dùng.

Task `searchText` là dữ liệu dẫn xuất, chuẩn hóa case/dấu/đ theo thiết kế search; không sửa nguyên bản. Cần có cách rebuild khi thuật toán normalization/schema thay đổi.

## 6. Index và query plan đề xuất

Index không phải foreign-key constraint. Các quan hệ/parent/owner consistency do service + transaction bảo đảm. Unique phải tồn tại thật trong MongoDB, không chỉ khai báo Mongoose. [Unique index](https://www.mongodb.com/docs/manual/core/index-unique/).

| Collection | Index key đề xuất | Mục đích |
|---|---|---|
| users | `{emailCanonical:1}` unique | Không duplicate tài khoản |
| workspace_memberships | `{workspaceId:1,userId:1}` unique | Một document/cặp kể cả inactive |
| workspace_memberships | `{userId:1,state:1,workspaceId:1}` | Home và authorized Workspace IDs |
| workspace_memberships | `{workspaceId:1,state:1,joinedAt:-1,_id:-1}` | Members list |
| workspace_invitations | `{tokenHash:1}` unique | Lookup token, không lưu raw |
| workspace_invitations | `{workspaceId:1,createdAt:-1,_id:-1}` | Owner invitations |
| projects | `{workspaceId:1,state:1,createdAt:-1,_id:-1}` | Project list theo lifecycle |
| tasks | `{projectId:1,status:1,createdAt:-1,_id:-1}` partial `deletedAt:null` | Board theo cột |
| tasks | `{assigneeId:1,createdAt:-1,_id:-1}` partial `deletedAt:null` | My Tasks chung, lọc quyền trước pagination |
| tasks | `{workspaceId:1,assigneeId:1,status:1}` partial `deletedAt:null` | Leave/remove cleanup |
| task_comments | `{taskId:1,createdAt:-1,_id:-1}` partial `deletedAt:null` | Comment list |
| notifications | `{eventId:1,recipientId:1}` unique | Dedup in-app |
| notifications | `{recipientId:1,createdAt:-1,_id:-1}` | Notification list |
| notifications | `{recipientId:1,readAt:1}` | Unread count/read-all |
| sessions | `{userId:1,revokedAt:1,expiresAt:1}` | Revoke all/other sessions |
| sessions | `{credentialHash:1}` unique partial field type string | Opaque mode only; optional values không xung đột null |
| auth_tokens | `{tokenHash:1}` unique; `{userId:1,purpose:1,createdAt:-1}` | Consume và resend revoke |
| email_outbox | `{eventId:1,recipientKey:1}` unique | Dedup enqueue |
| email_outbox | `{state:1,nextAttemptAt:1,_id:1}` | Worker pending |
| email_outbox | `{state:1,leaseUntil:1}` | Recover lease khi worker chết |
| operation_keys | `{userId:1,operation:1,keyHash:1}` unique | Retry nếu scope được duyệt |

Trong JWT mode, refresh hash unique partial tương tự credentialHash; chỉ thêm index thật của mode đã chọn. Partial filters phải khớp query predicate và dữ liệu null convention: [Partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/).

Chưa thêm hàng loạt index deadline/title. Search substring không thể tuyên bố dùng index B-tree hiệu quả chỉ vì có `searchText`. Bản đầu có thể lọc escaped literal tokens trên tập authorized bằng query có giới hạn; search ở server trên toàn tập, không trên trang FE. Query plan/NFR phải đo trước chốt. Nếu cần search service/index chuyên dụng, đánh giá riêng provider và semantics, không tự thay substring/AND tokens bằng Mongo text search.

Board: resolve Workspace/Project và quyền, filter status/deleted/search/date, count theo cùng filter, lấy trang theo `(createdAt desc, _id desc)`. My Tasks: membership active → Tasks assignedToMe → join Project state + filters → sort/cursor/limit. Không limit trước khi lọc Project/quyền. Có thể dùng aggregation, cần explain với dữ liệu thật.

Cursor gồm createdAt/_id và scope/filter validation; có chữ ký hoặc validate cấu trúc, không chứa credential. Reset khi filter đổi. Cursor ổn định thứ tự nhưng không hứa snapshot xuyên nhiều lần tải; status/data đang thay đổi vẫn cần UX refresh. Page size 20/max100 tiếp tục là đề xuất nhóm 6.

## 7. Đồng thời chỉnh sửa và consistency

### Version của entity

Mọi edit/delete người dùng gửi expectedVersion; server filter `_id + version + availability`, update trường cho phép và tăng version. Không match thì kiểm lại quyền/availability để trả no-access/unavailable/conflict phù hợp, không lộ đối tượng khác Workspace. Cleanup assignee cũng tăng Task version, nên form mở trước đó không phục hồi assignment.

Mongoose optimisticConcurrency chủ yếu theo document save; query/bulk updates phải thiết kế predicate/increment rõ ràng, không giả định mọi `updateOne` tự check version. [Mongoose versioning](https://mongoosejs.com/docs/guide.html#optimisticConcurrency).

### Guard cho các cuộc đua liên quan nhiều document

Transaction chỉ đọc membership rồi ghi Task có thể không tự xung đột với một transaction khác thay membership. Bản đầu đề xuất mọi nghiệp vụ ghi trong Workspace đều thực hiện một write lên `workspaces.mutationRevision` trong cùng transaction; nhờ đó competing writers có shared write conflict, retry rồi đọc lại quyền/state. Guard không giữ lock bên ngoài transaction hoặc Promise chạy song song trong một transaction.

Mỗi lần retry đọc lại Owner/membership/Project/target rồi áp expectedVersion gốc; không tự nâng expectedVersion và ghi đè. Side effect gửi email không nằm trong callback transaction; chỉ persist notifications/outbox cùng nghiệp vụ. Guard có thể làm các thao tác độc lập trong cùng Workspace chờ/retry; đây là tradeoff cho nhóm nhỏ, phải đo contention trước nghiệm thu và thiết kế gate hẹp hơn nếu cần.

Workspace creation tạo Workspace + Owner membership atomically, không dùng guard trước khi Workspace tồn tại. User/account operations có consistency riêng; reset/revoke/verify theo auth design, không dùng guard Workspace.

| Nghiệp vụ | Thay đổi phải nhất quán |
|---|---|
| Tạo Workspace | Workspace + membership active của Owner |
| Transfer ownership | Gate + target membership active + CAS ownerId/version; Owner cũ là Member qua role derived |
| Accept/revoke invitation | Gate + eligibility/token state + membership activate + consume EMAIL khi cần; revoke thắng trước thì accept bị chặn |
| Leave/remove | Gate + inactive/reset overrides + bỏ assignee Task chưa Done, tăng từng Task version; Done giữ User ID |
| Archive/reopen Project | Gate + Project version/state; write Task/Comment sau archive bị chặn |
| Task/Comment mutation | Gate + current permissions + entity CAS + notifications/outbox và operation key nếu có |
| Xóa Task | Gate + Task tombstone/version; comment API check parent, không cần sync cascade cho logical availability |

Leave/remove có thể chạm nhiều Task. Transaction bulk cleanup phải được đo với dataset/max quy mô thực; quá giới hạn thì abort/report failure, không success khi cleanup chưa xong. Không chọn async cleanup ngoài gate vì rejoin có thể giữ lại assignee cần bỏ. Nếu quy mô lớn, thiết kế staged lifecycle và join/write blocking trước thay thế, không tự thêm trạng thái nghiệp vụ chưa review.

MongoDB multi-document transactions cần deployment hỗ trợ, ví dụ replica set; local environment cũng phải phù hợp. Phải cấu hình read/write concerns/retry/timeouts và tạo index trước rollout. [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/).

## 8. Xóa, expiry và quyền đọc

Xóa logic Task/Comment là đề xuất kỹ thuật để thực hiện unavailable ngay, không cung cấp restore/thùng rác. Không dùng TTL để tự xóa nghiệp vụ khi retention chưa duyệt. Query task/comments bắt buộc thêm availability và parent gates, kể cả API direct ID/search/count.

TTL chỉ dọn dữ liệu sau khi expire/purge policy được chọn; ứng dụng luôn kiểm `expiresAt`/used/revoked trong auth/invitation/session. MongoDB không bảo đảm TTL xóa đúng thời điểm hết hạn: [TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/).

Membership inactive giữ references lịch sử, không xóa User khi rời. Nhãn “đã rời” Task Done được tính từ membership hiện tại, không ghi vĩnh viễn vào Task. Purge User/Workspace lifecycle chưa thuộc bản đầu và không được suy từ soft-delete Task.

Notification payload được server kiểm/redact khi đọc. Email worker cũng kiểm lại quyền/settings trước provider call; nếu state thay đổi sau khi call bắt đầu không có bảo đảm thu hồi email, đúng giới hạn đã tạm chốt.

## 9. API exposure và kiểm thử thiết kế

Schema DB không phải response DTO. Public User chỉ các fields cần thiết; invitation preview minimal; response Task không trả internal searchText/mutationRevision; credential hashes, outbox ciphertext và operation records không có endpoint đọc công khai. Projection allowlist và serializer cần định nghĩa trong API contract.

Khi có MongoDB/models, cần kiểm: duplicate email/membership, FK consistency ở service, current role sau transfer, accept/revoke, leave/rejoin+edit race, archive/write, stale edits, Task deleted/comment inaccessible, rich text derived fields, authorization-before-limit, token purpose/expiry/single-use, outbox/dedup và revocation. Unique declarations phải kiểm cả index tạo thật và duplicate-key handling.

Hiện chưa có DB tests/explain/transaction benchmarks. Không tạo schema code hoặc chọn provider từ bản này; phần tiếp theo là API contract và models khi các technical choices đã được review đủ.

## 10. Mục còn mở

- Session cookie hay JWT+session record; expiry/refresh/CSRF topology.
- EmailCanonical policy; editor format/size/counting; locale/email language defaults.
- Notification cũ sau rejoin; copy lại invitation LINK; notification/token/outbox/session retention và purge.
- NFR/page size/create idempotency vẫn draft nhóm 6; search implementation phải đo hiệu năng.
- Provider database/email và backup RPO/RTO; quy mô lớn cần gate/cleanup khác.

Những mục này được giữ visible, không chặn việc review cấu trúc DB hoặc UI wireframe ngay. Chưa baseline SRS v1.0 hoặc schema v1.0 đã duyệt.
