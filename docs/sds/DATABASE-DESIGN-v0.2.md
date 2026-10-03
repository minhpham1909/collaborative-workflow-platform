# Thiết kế database v0.2 — phần lõi

Ngày 03/10/2026. Bản hiện hành thay thế DATABASE-DESIGN-v0.1.md để thiết kế phần lõi theo yêu cầu chỉnh sửa của chủ dự án. Stack nền: MongoDB/Mongoose, backend JavaScript/Express. Đã có 13 Mongoose models tại BE; Auth transactions/indexes đã kiểm trên MongoDB local. Nghiệp vụ công việc chưa có API. Xem [Auth/accounts](AUTH-ACCOUNTS-v0.1.md). Xem [Backend foundation](BACKEND-FOUNDATION-v0.1.md) để phân biệt code đã có và hợp đồng cần hoàn thiện. Việc yêu cầu chỉnh sửa không tự phê duyệt mọi thông số kỹ thuật.

## 1. Phạm vi và cách bố trí

**13 collection lõi:** users, auth_identities, sessions, auth_tokens, auth_challenges, workspaces, workspace_memberships, workspace_invitations, projects, tasks, task_comments, notifications, email_outbox.

**Chờ chốt phase riêng:** workspace_announcements (Owner đăng/ghim đã chốt năng lực), operation_keys (idempotency phạm vi/thời hạn chưa duyệt nhóm 6).

**Upcoming:** files, workspace_resources, storage_usage; không có attachment/file ID trong schema lõi hiện tại, không bucket/provider/quota/scan jobs. Google avatar là URL profile, không upload. Reminder/push vẫn increment sau.

Embed cấu hình nhỏ hữu hạn, rich text và Terms acceptance. Reference các quan hệ tăng trưởng để không nhúng toàn bộ thành viên/Project/Task/Comment/Notification vào một document. Không collection My Tasks/Kanban hoặc field overdue làm nguồn sự thật.

## 2. Quy ước chung

| Quy ước | Thiết kế |
|---|---|
| ID | ObjectId; không dùng tên/email làm quan hệ |
| Date | BSON Date UTC; FE hiển thị giờ Việt Nam theo SRS, locale không đổi thời điểm |
| Timestamps | createdAt bất biến; updatedAt chỉ cập nhật khi dữ liệu entity thay đổi |
| Version | Integer bắt đầu 0 cho entity sửa/lifecycle; CAS expectedVersion khi edit; không có hai version độc lập |
| Null | Fields nullable luôn có null trong document mới, không trộn missing/null |
| Availability | Task/Comment deletedAt:null nghĩa là chưa xóa; luôn kiểm parent/quyền |
| Ownership | Workspace.ownerId duy nhất; membership không lưu role thứ hai |
| Server fields | Ngữ cảnh, Creator/Author, quyền, timestamps/version, text dẫn xuất do BE xác định |
| Visibility | Schema DB khác API response; credential/hash/internal fields không serialize tự động |

Date chỉ hợp lệ không đủ: deadline nhập đến phút, expiry/purpose/used/revoked phải kiểm lúc thao tác. `version` phục vụ conflict; `schemaVersion` phục vụ tiến hóa định dạng.

## 3. User và authentication

### 3.1 users

| Field | Type/default | Trách nhiệm |
|---|---|---|
| _id | ObjectId | User ID ổn định |
| displayName | String | Tên chung, không unique |
| email/emailCanonical | String | Hiển thị/so sánh unique; normalize policy còn draft |
| passwordHash | String/null, private | Có local login khi non-null; Google-only null |
| emailVerifiedAt | Date/null | null chưa verified, không lưu boolean trùng |
| avatar | Object | source google/initials; googlePictureUrl/refreshedAt nullable |
| locale | vi/en/null | Lựa chọn cá nhân; null dùng default policy ở i18n design |
| emailPreferences | Object | assignment true; comment/content/status false |
| termsAcceptance | Object | version String, acceptedAt Date; bắt buộc hoàn tất khi tạo tài khoản |
| authVersion | Integer 0 | Credential generation; không bỏ kiểm session revoke |
| authMutationRevision | Integer 0, internal | Guard write cho auth lifecycle nếu triển khai theo mục 8 |
| version | Integer 0 | Profile/settings updates |
| createdAt/updatedAt | Date | Server timestamps |

Display name do User sửa không bị Google sign-in sau đó ghi đè. Avatar URL chỉ từ profile credential BE đã verify; picture thiếu/lỗi fallback initials. Không avatar upload. Google-only không đi luồng đổi local password, recovery không tự tạo password; việc thêm password/unlink Google cần thiết kế riêng trước mở chức năng.

### 3.2 auth_identities

Fields: `_id, userId(ObjectId), provider(google), providerSubject(String sub), createdAt(Date), lastLoginAt(Date)`. Unique provider+providerSubject. Đề xuất unique userId+provider để một User liên kết một Google identity.

Provider subject là danh tính ổn định; email/picture không thay khóa này. Không lưu Google password/ID token/access token lâu dài. Không auto-link Google với local User chỉ vì trùng email: yêu cầu chứng minh tài khoản hiện có rồi liên kết. Google login create User/identity/Terms phải nhất quán, giữ invitation intent. Verified gate theo bằng chứng email authority/app verification, không tin boolean client.

### 3.3 sessions

Fields chung: `_id, userId, authVersionAtIssue(Integer), createdAt, expiresAt, lastSeenAt, revokedAt(null), revokeReason(null)`.

Hai biến thể đã so sánh; **chủ dự án chọn JWT access + refresh ngày 03/10/2026**:

- Opaque session cookie: phương án lịch sử, không dùng trong model hiện tại.
- JWT+refresh: refreshTokenHash/private, refreshGeneration Integer; access JWT tham chiếu session ID, kiểm revoked/expiry/current user. Không credentialHash opaque và không lưu mọi access JWT vào collection.

Session model hiện dùng JWT+refresh; signing/TTL/rotation/CSRF cần hoàn thiện trước API auth. Không dữ liệu giả để bắt Google-only có password. Không token raw trong DB/log; hash session/token ngẫu nhiên đủ entropy khác password hashing. Không TTL purge session khi retention chưa chọn.

### 3.4 auth_tokens

Fields: `_id, userId, purpose(verify_email/reset_password), tokenHash(private), expiresAt, usedAt(null), revokedAt(null), createdAt`.

Verification 24h, recovery 30 phút theo SRS; single-use, resend revoke cùng purpose. Consume CAS điều kiện purpose, expiry và unused/unrevoked, không dựa TTL để thực thi hết hạn. Không dùng invitation/auth token làm session credential. Token URL gửi email nằm trong delivery data mã hóa tạm thời, không trộn vào User response.

## 4. Workspace, membership và lời mời

### 4.1 workspaces

Fields: `_id, ownerId(ObjectId), name(String), description(RichText), version(0), mutationRevision(0 internal), createdAt, updatedAt`.

Owner phải có membership active. Role trả API: active membership + userId==ownerId → Owner; active khác → Member; inactive/không có → không có quyền. Không role global, không duplicate owner flag/role trong Membership.

Mô tả Workspace editor chung, đề xuất max **20.000 ký tự hiển thị**, chờ review con số; không yêu cầu tối thiểu viết dài. Workspace name không unique toàn app. Mutation guard tăng không làm form version/updatedAt đổi khi metadata không đổi.

### 4.2 workspace_memberships

Fields: `_id, workspaceId, userId, state(active/inactive), joinedAt, leftAt(null), exitReason(left/removed/null), membershipGeneration(1), emailOverrides, version(0), createdAt, updatedAt`.

Unique workspaceId+userId cả active/inactive. Một document/cặp được tái sử dụng khi join lại, không unbounded history array. Override mỗi event inherit/on/off; leave/remove reset inherit và inactive; rejoin generation tăng/joinedAt mới, không restore assignment hoặc override cũ.

Creator/Author/Assignee vẫn tham chiếu User khi họ rời. Task Done không tham chiếu membership generation, đúng quy tắc rejoin bỏ nhãn “đã rời”; Task chưa Done đã bỏ assignee không tự được giao lại.

### 4.3 workspace_invitations

Fields: `_id, workspaceId, createdBy, type(EMAIL/LINK), email(null), emailCanonical(null), tokenHash(private), expiresAt, revokedAt(null), acceptedAt(null), acceptedBy(null), version(0), createdAt, updatedAt`.

EMAIL bắt buộc email, accept một lần đúng verified email; LINK không email/acceptedBy/acceptedAt và không lưu danh sách mọi người đã dùng. Hạn 7 ngày; hiệu lực tính lúc accept, không field expired cần job đồng bộ. Chỉ Owner hiện tại quản lý; chuyển Owner giữ createdBy và hiệu lực.

Raw token chỉ xuất hiện khi tạo/gửi đúng quyền, không list/preview/log. Copy LINK lại sau tạo cần policy rotation/encrypted token, còn mở. Preview không lộ email người nhận, members hoặc nội dung nhóm. In-app EMAIL khi lúc gửi đã có User, không hồi tố; LINK không broadcast.

## 5. Project, Task và Comment

### 5.1 projects

Fields: `_id, workspaceId, createdBy, name, description(RichText), state(active/archived), archivedAt(null), archivedBy(null), version(0), createdAt, updatedAt`.

Owner quản lý; mọi active Member xem. Không Project Membership. Description đề xuất 10.000 ký tự hiển thị, số chưa duyệt. Archive/reopen không di chuyển Task hoặc sửa status/assignee; không thêm xóa Project/Workspace ngoài SRS.

### 5.2 tasks

Fields: `_id, workspaceId, projectId, createdBy, title, description(RichText), searchText(derived), status(todo/in_progress/done), assigneeId(null), dueAt(null), deletedAt(null), deletedBy(null), version(0), createdAt, updatedAt`.

workspaceId và Creator từ server, đối chiếu parent Project. Không cho client move parent. Assignee mới phải Member active; Done có thể giữ User đã rời; reopen kiểm membership rồi bỏ nếu không hợp lệ. Cleanup chưa Done cả Archived tăng version; status/edit không đổi createdAt. Không overdue/manualOrder/attachment fields ở lõi.

Owner/Creator ghi nội dung/phân công/deadline/xóa; Assignee chỉ status nếu không có quyền kia; Member khác xem. API không trả searchText/version guards riêng của Workspace. Status enum là design API proposal, UI Việt/Anh chỉ dịch nhãn.

### 5.3 task_comments

Fields: `_id, workspaceId, taskId, authorId, content(RichText), deletedAt(null), deletedBy(null), version(0), createdAt, updatedAt`.

BE resolve Task → Project → Workspace, kiểm deleted/Active/current membership. Chỉ Author sửa/xóa, Owner không sửa Comment người khác. Xóa Task chặn Comment ngay qua parent gate, không cần sync physical cascade để báo success. Content không chỉ whitespace; không file attachments trong Comment.

## 6. Notifications và email_outbox

### 6.1 notifications

Fields: `_id, recipientId, eventId(String UUID), category(work/invitation), workspaceId, taskId(null), invitationId(null), actorId(null), changes(bounded typed array), payloadVersion(1), payload(allowlist), readAt(null), createdAt`.

Unique eventId+recipientId; mỗi recipient/lần ghi một mục. Creator/assignee cũ/mới nhận assignment khác nhau, content/status theo assignee sau lưu; actor/trùng/mất membership bị loại. Payload tối thiểu, không raw rich text/token/email người khác. Mẫu hệ thống dịch theo locale, không tự dịch nội dung User.

API list/detail kiểm quyền hiện tại và target availability trước serialize; mất quyền/Task xóa thì generic message không title/comment/Workspace name/link. Giữ time/read state. Invitation có quyền preview khác work, không đòi membership trước accept. Read-all dùng cutoff/phạm vi request để không mark notification mới ngoài lần xử lý. Notification sau rejoin còn cần policy hiện lại/che vĩnh viễn.

### 6.2 email_outbox

Fields: `_id, eventId, recipientKey, userId(null), workspaceId(null), taskId(null), invitationId(null), authTokenId(null), category(work/invitation/auth), templateKey, payloadVersion(1), eventTypes(bounded), payload(allowlist), encryptedDeliveryData(null), state(pending/processing/sent/cancelled/failed), attempts(0), nextAttemptAt, leaseUntil(null), leaseToken(null private), providerMessageId(null), lastErrorCode(null), sentAt(null), createdAt, updatedAt`.

Unique eventId+recipientKey; recipients có thể chưa có User với EMAIL invitation. Chỉ enqueue sau nghiệp vụ commit bằng cùng transaction; worker gửi ngoài transaction. Work worker kiểm membership/Task/preferences trước từng lần thử, chỉ email event types còn bật. Auth/invitation kiểm token lifecycle riêng. Chọn locale theo email policy, không persist câu dịch sai locale như nguồn duy nhất.

Raw invitation/reset/verify URL nếu cần queued/retry phải mã hóa, key ngoài DB, loại ciphertext sau sent/cancel theo chính sách; không log. Worker leases cần identity/token để finalize không bị worker cũ ghi đè sau lease mới. Retry unique chống duplicate enqueue, không chứng minh provider chỉ chuyển phát một lần khi mất phản hồi; provider constraint còn mở.

## 7. Rich text và dữ liệu dẫn xuất

Một envelope dùng chung: `format(String), schemaVersion(Integer), document(allowlisted tree), plainText(String derived)`. Foundation chọn kỹ thuật prosemirror-json/v1 và allowlist/raw-size/depth validation trong BACKEND-FOUNDATION-v0.1.md. Tree dùng Mixed storage với document pre-validation nghiêm ngặt, không nhận mọi HTML/object; query/bulk writes bị chặn để không bypass hook. Giới hạn số vẫn là guardrails đề xuất cần review UI/NFR.

BE nhận document hợp lệ, tính plainText và Task.searchText trong cùng lần lưu. Count/search/preview không tin derived field client gửi. Giữ nguyên dấu/emoji/ngôn ngữ nguyên bản; searchText mới normalize dấu/case/đ. Link search theo nhãn hiển thị, không URL ẩn. Có rebuild derived data khi schema/normalization đổi.

Tên đối tượng là text một dòng. Workspace/Project/Task description có thể rỗng; Comment không rỗng. Limits chữ hiện còn review, không thay max bằng quota file Upcoming.

## 8. Consistency và bảo mật khi truy cập

### Entity version

User edit/delete gửi expectedVersion; BE không tăng expectedVersion để retry stale. Update predicate bao gồm version/availability, `$inc` version chỉ khi mutation thành công. Lifecycle cleanup tăng version như edit. Quyền phải kiểm trước và tại lúc ghi; conflict không lộ object ngoài quyền. Không giả định Mongoose query updates tự check document save optimisticConcurrency.

### Workspace guard

Đề xuất transaction cho workspace writes có shared write lên mutationRevision trước đọc/kiểm Owner/membership/Project/target, làm các cuộc đua leave/archive/accept/revoke/transfer có shared conflict. Retry re-read toàn bộ điều kiện; side effects chỉ persist outbox/in-app, không gọi provider trong callback. Gate scope là nghiệp vụ có quyền/lifecycle, không notification readAt hoặc worker bookkeeping riêng.

Tạo Workspace + Owner membership atomic. Transfer kiểm target active rồi đổi ownerId/version. Leave/remove inactive/reset override + cleanup assignee chưa Done + tăng version Task trong cùng transaction. Archive trước write thì write bị chặn. Xóa Task logical rồi comment parent gate ngay; không tự purge lịch sử.

Gate toàn Workspace có contention và cleanup bulk có chi phí; phải benchmark/limit transaction trước release. Không report leave thành công nếu cleanup fail. Chưa thay bằng asynchronous cleanup vì rejoin/write race cần staged lifecycle riêng.

### Auth guard

Đề xuất login/session issuance, Google linking và password reset/change viết cùng User.authMutationRevision trong transaction rồi đọc trạng thái auth lại. Không để session mới theo credential cũ xuất hiện sau reset. authVersion thay đổi theo credential lifecycle; reset revoke mọi session, đổi password giữ current session bằng cập nhật authVersionAtIssue mới của phiên đó và revoke phiên khác atomically. Google sign-in/link không tự reset local password/verified state.

Protected request kiểm session expires/revoked và credential generation hiện tại; phiên bị thu hồi không tiếp tục dùng dù access JWT chưa hết hạn nếu chọn mode đó. Credential cache không được lén trì hoãn revoke SRS. Google token không thay credential ứng dụng/current permissions.

BE validate body/query/params và response allowlist. Không dùng req.body làm Mongo filter/update nguyên khối; không client ownerId/role/authorId/emailVerified/internal revisions. Secrets/hashes không API/log. Referential integrity không tự có từ ObjectId/ref, phải enforce service/transaction. Cookie/CSRF/HTTPS/rate limit thuộc SECURITY-DESIGN-v0.1.md.

## 9. Query và index

Index plan machine-readable ở DATABASE-LAYOUT-v0.2.json; chỉ là plan, chưa tạo thật. Các index bắt buộc về uniqueness: emailCanonical; provider+providerSubject; membership workspaceId+userId; invitation/auth tokenHash; notification eventId+recipientId; outbox eventId+recipientKey. Optional session credential/refresh unique dùng partial String cho mode được chọn, không unique nullable field toàn collection.

Board: auth → Workspace/Project → availability/status/search/time filter → count và sort createdAt desc/_id desc → cursor limit. My Tasks: memberships active → assignee query → join Project current state → tất cả filters → sort/pagination. Không limit trước kiểm quyền/state. Comments và Notifications cùng kiểm quyền trước count/pagination.

Search là normalized literal/AND tokens trên toàn tập có quyền theo specification; B-tree searchText không tự làm substring search nhanh. Query explain/NFR đo trước chốt search strategy; không tự đổi semantics sang text relevance. Cursor chỉ ổn định sort, không hứa snapshot nhiều request khi dữ liệu đổi. Pagination size vẫn nhóm 6 review.

Không bật TTL/purge tùy tiện khi retention chưa chọn. Expiry kiểm trong query dù document còn tồn tại. Local DB cần replica set/config hỗ trợ transactions khi triển khai, không dùng standalone rồi hứa multi-document consistency. Không kết nối DB hoặc chạy migrations trong lần chỉnh thiết kế này.

## 10. Phần mở rộng tách khỏi lõi

`workspace_announcements`: Owner hiện tại quản lý, Members xem; fields title/content/creator/updatedBy/pinnedAt/pinnedBy/deletedAt/version/timestamps/workspaceId. Không ghim Notifications cá nhân, không tự broadcast email. Quota/phase chưa chốt.

`operation_keys`: actor+operation+keyHash/requestHash/resultRef/state/timestamps/expiry; giữ record tối thiểu, retry kiểm lại quyền. Chờ phạm vi/thời hạn nhóm 6, không tạo collection/index/TTL trong core hiện tại.

Files/Workspace Resources/storage usage chỉ giữ ranh giới roadmap. Không cần provider/quota/scanner để hoàn thiện DB lõi và không storage fields buộc User upload avatar.

## 11. Các quyết định còn mở và bước thực hiện

1. JWT đã chọn và Session model đã có; hoàn thiện signing, lifetimes/rotation/CSRF topology trước Auth endpoints.
2. EmailCanonical normalization, locale default/email language, rich-text tree/limits và counting trước validation/API final.
3. Retention/purge/backup RPO/RTO; link invitation copy-after-create, notification sau rejoin; không blocker thiết kế core nhưng cần policy trước release/endpoint liên quan.
4. Nhóm 6 NFR/page size/idempotency còn review; Workspace 20.000/Project 10.000 mô tả là đề xuất, không approved number.
5. Gate/cleanup/index/search cần tests/explain/benchmark sau implementation; chưa có bằng chứng DB runtime.

Tiếp theo: triển khai Auth/User API contracts và services, kết nối replica set phục vụ integration tests. Models/editor validation đã có; chưa đánh dấu nghiệp vụ đã nghiệm thu từ schema tests.

## Auth challenge increment

Collection auth_challenges hỗ trợ nonce Google login/link 5 phút, dùng một lần, hash unique, userId nullable theo intent. Fields/indexes/transaction theo [Auth/accounts](AUTH-ACCOUNTS-v0.1.md); layout JSON và index plan đã đồng bộ. Đây là chi tiết implementation, không thêm quyền nghiệp vụ mới.
