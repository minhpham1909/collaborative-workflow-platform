# Software Design Specification — khung v0.1

Ngày: 01/10/2026. Trạng thái: **draft để chuẩn bị thiết kế**, chưa duyệt stack/schema/API và không phải baseline triển khai. Nguồn: SRS v0.2, JSON 33 UC, decision register và SRS-READINESS.md. Mọi phần chưa giải quyết phải giữ trạng thái proposed/open; chưa có ứng dụng thật.

## 1 Mục tiêu và ranh giới

Database đã chỉnh theo yêu cầu mới: dùng DATABASE-DESIGN-v0.2.md, DATABASE-LAYOUT-v0.2.json và DATABASE-ERD-v0.2.md làm thiết kế hiện hành. Có 12 collection lõi; announcement/idempotency chờ phase/policy; storage Upcoming. Không dùng bản v0.1 xen lịch sử để tạo models. Chưa chọn auth credential mode hoặc rich-text tree để triển khai; chưa kết nối DB/models.

Theo yêu cầu ưu tiên mới 03/10/2026: storage, upload file và kho tài nguyên Link/File đề xuất là Upcoming sau phần lõi, không chọn provider/cài SDK/storage schema hiện tại. Tiếp tục DB/API/UI cho auth Google+local, Workspace/membership/invitation, Project/Task/Comment, Notifications/settings và bảo mật. Avatar Google dùng URL không upload; announcement/pin phase vẫn riêng, không tự duyệt từ quyết định này.

Cập nhật scope mới: Google sign-in/avatar ngay bản đầu, Workspace announcements Owner đăng/ghim đã chốt capability; phase announcements/file/resources còn review. SRS hiện 35 UC/29 FR; DB thêm auth_identities và announcements. Quy tắc avatar initials-only và passwordHash required mọi User phía dưới là lịch sử, được thay bằng Google/avatar fallback và credential conditional. Nghiên cứu provider/quota tại AVATAR-STORAGE-RESOURCES-REVIEW.md.

Cập nhật trạng thái 03/10/2026: quyền nền/My Tasks/conflict và auth/token đã duyệt ở nhóm 1–3; invitation/notification/delete effect nhóm 4–5 tạm chốt; retention và nhóm 6/NFR còn mở. Việt/English và phạm vi editor chung đã ghi nhận. Các hàng dependencies cũ phía dưới là lịch sử đầu vào, không yêu cầu duyệt lại những mục đã chốt. SDS vẫn là khung, chưa có stack/schema/API được lựa chọn; bước kế tiếp là viết thiết kế cụ thể cùng UI wireframes.

Thiết kế hệ thống phục vụ nhóm nhỏ theo User → Workspace → Project → Task, bảo đảm quyền hiện tại, tính nhất quán membership/ownership và thông báo đúng người. Bản đầu không gồm AI, Project Membership/Manager, daily digest, browser push hoặc file upload.

Hướng thiết kế cập nhật 03/10/2026 theo nền tảng chủ dự án quen: backend Node.js/JavaScript + Express + MongoDB/Mongoose; frontend React JavaScript/JSX, Vite tiếp tục là đề xuất build tool. Không lấy NestJS/TypeScript làm mặc định. Xem TECH-STACK-DIRECTION.md. Package manager, auth mechanism, các thư viện phụ và phiên bản chưa chốt. Nền tảng local đã có skeleton, chưa có root package/app dependencies.

## 2 Boundaries module dự kiến

| Module | Trách nhiệm | Đầu vào/điểm còn chờ |
|---|---|---|
| Auth/User | Accounts, credential/session lifecycle, email verification/recovery, Profile/Terms acceptance | OD-07/08/13 |
| Workspace/Membership | Workspace, một Owner, quyền hiện tại, leave/remove/transfer và assignee cleanup | Quyền nền còn review; invariant OD-01 đã chốt |
| Invitation | EMAIL/LINK, eligibility/expiry/revoke/accept, deep-link intent | OD-14 và in-app mapping |
| Project | Active/Archived, quyền quản lý và read-only gate | Quyền Owner theo baseline chờ xác nhận |
| Task/Comment | Creator/Assignee/Author, quyền từng hành động, status/deadline và lifecycle | Quyền Task đã chốt; conflict/delete retention còn mở |
| Task queries | Kanban/My Tasks, sort chung, search/time filter và pagination | OD-05 defaults, RV-12, NFR |
| Notifications/Email | Event recipients, in-app read state, email prefs/queued delivery và retries | OD-09, RD-04/05, RV-09/10 |

Các module là boundaries thiết kế, chưa tương đương microservices, collections hoặc packages bắt buộc. Storage/reminder/push chỉ giữ chỗ để thiết kế increment sau.

## 3 Invariants đã có đầu vào rõ

- Quyền Workspace phụ thuộc membership/role hiện tại; Creator/Author/Assignee lịch sử không cấp quyền khi đã rời.
- Owner/Creator quản lý Task; Assignee chỉ đổi status nếu không đồng thời là Owner/Creator; Comment chỉ Author sửa/xóa. Mọi thao tác ghi Task/Comment cần Project Active.
- Assignee mới phải là Member hiện tại; leave/remove cleanup chưa Done cả Archived; Done giữ User ID lịch sử; reopen theo membership hiện tại.
- Status gồm ba giá trị cố định, chuyển trực tiếp; sort thời gian tạo mới nhất trước, sửa/status update không thay khóa thời gian.
- Search/time filter không thay sort hoặc mở rộng quyền. Query không chỉ xử lý dữ liệu đã tải ở client.
- Deadline UTC, hiển thị giờ Việt Nam, now > dueAt và chưa Done; Archived vẫn có overdue khi xem nhưng không reminder.
- Email override theo event/workspace ưu tiên setting chung; leave xóa override; tái gia nhập kế thừa.

Schema, indexes và transaction strategy phải chứng minh các invariant này trước khi duyệt; chưa chọn cách embed/reference hoặc tạo model vật lý.

## 4 Thiết kế cần hoàn thành

Thiết kế DB cụ thể ngày 03/10/2026: DATABASE-DESIGN-v0.1.md (data dictionary/index/query/version/lifecycle/transaction tradeoffs) và DATABASE-ERD-v0.1.md (quan hệ). Có 11 collection nền và operation_keys tùy scope nhóm 6; Owner nguồn duy nhất ownerId, settings hữu hạn embed, quan hệ lớn reference. Chưa tạo DB/models hoặc chứng minh index/transactions bằng test.

Đã bắt đầu mô hình dữ liệu conceptual tại DATA-MODEL-v0.1.md ngày 03/10/2026, đi cùng brief wireframe docs/ui-ux/WIREFRAME-SCOPE-v0.1.md. JS/Express/Mongoose là nền BE hiện tại, FE libraries chọn theo thiết kế/code như chủ dự án đồng ý; chưa schema Mongoose/index/API hoặc wireframe hoàn chỉnh.

Bảo mật là yêu cầu bắt buộc theo chủ dự án 03/10/2026: SECURITY-DESIGN-v0.1.md xác định ranh giới FE/BE, server validation/authentication/authorization, response allowlist, credential lifecycle, CSRF/rich text và test cases. Session hoặc JWT+session record còn cần lựa chọn cụ thể; không chọn JWT chỉ vì tên xuất hiện trong yêu cầu.

Website Việt/English theo yêu cầu 03/10/2026: thiết kế locale preference/catalog/error code/template notification/email và text formatting theo LANGUAGE-v0.1.md. Phạm vi editor chung Task/Comment/Workspace/Project đã duyệt; không dùng schema/editor khác nhau theo trường hoặc locale, chỉ cấu hình toolbar và giới hạn trường. Múi giờ deadline giữ nguyên theo SRS.

Đầu vào editor mới ngày 03/10/2026: docs/ui-ux/CONTENT-EDITOR-v0.1.md. SDS phải chọn representation/schema version, validation rich text và URL, counting Unicode, text extraction cho search/preview, kích thước payload và editor library hỗ trợ tiếng Việt. Năng lực do chủ dự án yêu cầu; scope/format chi tiết đang review, chưa được xem là schema đã duyệt.

| Tài liệu/phần | Nội dung cần viết khi giải quyết dependencies |
|---|---|
| Stack decision | Framework/ngôn ngữ/workspaces/runtime, lý do và validation bootstrap |
| Architecture | Module dependency và frontend/backend/event flow; synchronous/asynchronous boundaries |
| Data model | Collections/relations, indexes/uniqueness, lifecycle/retention, migration conventions |
| Auth design | Session/token/cookie, expiry/revocation, password policy, token purpose và email normalization |
| API contract | Endpoints, request/response/validation/errors, permission predicate, pagination và idempotency |
| Concurrency | Versioning, ownership transfer/leave, invitation accept/revoke, archive/write và cleanup races |
| Notification design | Recipient before/after matrix, grouped event, preference cutoff, outbox/retry/provider constraints |
| Query design | Unicode search, full authorized set, createdAt sort/tie-break, range timezone và cursor reset |
| UI integration | Route map, state/query management, invitation intent, pending/error/conflict UX |
| QA/operation | Test strategy, NFR dataset/workload/environment, secrets, backup/restore và release checklist |

Không coi tên trường `createdAt` ở thiết kế query là phê duyệt schema toàn hệ thống; thời gian tạo là yêu cầu conceptual đã chốt.

## 5 Lát cắt triển khai dự kiến

Auth/User/Profile → Workspace/Membership/Invitations → Project → Task/Board/My Tasks → Comments/Notifications/Email Settings → Supporting/public pages và nghiệm thu. Mỗi lát cắt phải có frontend/backend/persistence/quyền/ngoại lệ phù hợp, không chỉ màn hình mock hoặc endpoint health.

Với Auth/User, cần chốt OD-07/08/13 và stack/auth design trước khi viết code nghiệp vụ. UI/UX wireframe có thể làm trước với các nhánh pending được đánh dấu.

## 6 Trạng thái kiểm chứng

Đã có kiểm tra consistency tài liệu và kiểm tra mock local. Chưa có API tests, auth/security tests, concurrency tests, database connection, migrations, NFR hoặc deployment. Runtime Node đi kèm Codex chạy được nhưng chưa được chọn là runtime sản phẩm.
