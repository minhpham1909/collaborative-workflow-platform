# Decision register

## Implementation 03/10/2026 — lát cắt Auth/session

Main đã nhận commit sắp xếp tài liệu; Auth mới tiếp tục trên dev. Đã triển khai password login, Argon2id, JWT signing/verify, refresh rotation/reuse revocation, logout, /me và verified middleware. Signing HS256/hai key riêng, access 15 phút, refresh/session tuyệt đối 7 ngày, strict single-use/no grace, cookie Strict/CSRF và rate limits là implementation-selected; không coi là chủ dự án duyệt mọi tham số hoặc production topology.

28 tests đạt, 1 live Mongo test skipped; chưa nghiệm thu DB transactions/indexes, signup/Google/email verification/reset/change password hoặc FE. Xem [Auth/session](../sds/AUTH-SESSION-v0.1.md) và [QA](../qa/AUTH-SESSION-CHECK.md). Các đoạn foundation bên dưới là lịch sử trước lát cắt này.

## Cập nhật 03/10/2026 — backend foundation và auth

- **Approved, trực tiếp trong chat:** chủ dự án chọn “JWT access token + refresh token” khi được hỏi cơ chế đăng nhập. Thay thế trạng thái auth mode còn mở/khuyến nghị opaque session trước đây. Session model dùng refreshTokenHash + refreshGeneration; JWT signing/TTL/rotation/cookie/CSRF chưa được triển khai hoặc duyệt mọi tham số.
- **Implementation-selected:** Node 24.x/JavaScript ESM, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0; 12 core models và editor prosemirror-json/v1. Các giới hạn số editor/name là guardrails đề xuất để code không nhận dữ liệu không giới hạn, không coi là duyệt toàn bộ nhóm 6/NFR. Chi tiết tại docs/sds/BACKEND-FOUNDATION-v0.1.md.
- **Evidence:** 16 schema/editor/HTTP tests đạt; audit không báo lỗ hổng đã biết. Không có live DB/index/transaction hoặc Auth/Google API nghiệm thu. Storage Upcoming, announcements phase riêng như scope đã chốt.

Các mục dưới là lịch sử; cập nhật mới ưu tiên khi khác trạng thái cũ.

Ngày: 01/10/2026. Đây là sổ review bổ sung cho SRS v0.2 mục 3 và 12; chưa thay thế baseline. `recorded-approved` nghĩa là tài liệu bàn giao ghi nhận chủ dự án đã chốt. `approved` nghĩa là được chủ dự án duyệt trong chat này; `partially-approved` giữ các chi tiết chưa trả lời ở trạng thái mở. `open` nghĩa là chưa có trả lời duyệt. `proposed` nghĩa là vấn đề bổ sung từ review hiện tại.

## Quyết định được ghi nhận từ bàn giao

| ID | Trạng thái | Nội dung |
|---|---|---|
| D-01 | recorded-approved | Display name chung toàn ứng dụng |
| D-02 | recorded-approved | Cả EMAIL và LINK invitation |
| D-03 | recorded-approved | Hạn 7 ngày; Owner revoke; EMAIL một lần, đúng email xác minh; LINK nhiều người, role Member |
| D-04 | recorded-approved | In-app luôn có với event liên quan, không có switch |
| D-05 | recorded-approved + approved phạm vi | Setting email ở Personal Settings; chủ dự án duyệt chung toàn tài khoản + override Workspace ngay bản đầu ngày 01/10/2026 |
| D-06 | recorded-approved | Avatar chữ cái đầu ở bản đầu |
| D-07 | recorded-approved về roadmap | Storage chung cho avatar, Task Attachments, Workspace Documents; đặc tả chi tiết chưa duyệt |
| D-08 | recorded-approved về roadmap | Reminder sau event notifications |
| D-09 | recorded-approved | Bỏ email tổng hợp hằng ngày |
| D-10 | recorded-approved về roadmap | Browser push sau, tôn trọng permission |

## Quyết định mở kế thừa SRS

| ID | Trạng thái | Cần duyệt | Review liên quan |
|---|---|---|---|
| OD-01 | approved, 01/10/2026 | Cleanup chưa Done cả Active/Archived; Done giữ lịch sử khi sửa nội dung; reopen kiểm tra membership; tái gia nhập không phục hồi phân công đã bỏ và bỏ nhãn đã rời | RV-01/02/07; filter My Tasks riêng OD-05 |
| OD-02 | approved, 01/10/2026 | Chung + override từng event Theo setting chung/Bật/Tắt; default assignment bật, comment/content/status tắt; override ưu tiên, reset kế thừa; rời xóa override, tái gia nhập kế thừa | RV-06; email đã xếp hàng review riêng OD-09 |
| OD-03 | approved, 01/10/2026 | Nhập đến phút; lưu UTC/hiển thị giờ Việt Nam; now > dueAt và chưa Done; cho past-due có cảnh báo; Archived vẫn overdue/không reminder; bỏ deadline/reopen theo mục 5.1 SRS | RV-08; filter riêng OD-05, reminder riêng OD-10 |
| OD-04 | approved status/thứ tự, 01/10/2026 | Ba trạng thái cố định Chưa làm/Đang làm/Hoàn thành; chuyển trực tiếp giữa mọi trạng thái theo quyền; mỗi cột sort thời gian tạo mới nhất trước, không sắp thủ công; sửa/chuyển status không đổi khóa sort | RV-12 về tải thêm/pagination vẫn mở |
| OD-05 | partially-approved sort; layout-selected theo uỷ nhiệm, 01/10/2026 | Sort thời gian tạo mới nhất trước giống Kanban đã chốt; assistant chọn danh sách ghi Workspace → Project theo yêu cầu xem xét bố cục. Eligibility/default Active/chưa Done và filter Archived vẫn là baseline đề xuất | RV-07/08 |
| OD-06 | open | Conflict thay vì ghi đè stale | RV-01/02 |
| OD-07 | open | Quyền chưa xác minh, chính sách password, reset/đổi password và sessions | Nhóm review 3 |
| OD-08 | open | Terms acceptance; đổi email/xóa tài khoản và retention | Nhóm review 3 |
| OD-09 | open | Gộp event mỗi recipient/lần lưu; email chỉ chứa loại đã bật | RV-05/10 |
| OD-10 | open, increment sau | Mốc reminder và dedup khi đổi deadline/assignee/settings | Không chặn skeleton/bản đầu |
| OD-11 | open | Xóa Task/Comment, target unavailable và retention | RV-10 |
| OD-12 | open | NFR và giới hạn dữ liệu | RV-09/11/12 |
| OD-13 | open | Verification 24 giờ/recovery 30 phút, resend vô hiệu token cũ | Nhóm review 3 |
| OD-14 | open | Invitation preview và quyền trước gia nhập | RV-03/04 |

## Điểm bổ sung cần quyết định

Các ID RD dưới đây chỉ thuộc sổ review này, chưa thêm vào yêu cầu gốc.

| ID | Trạng thái | Vấn đề |
|---|---|---|
| RD-01 | approved, 01/10/2026 | Cleanup assignee trong Archived là thao tác vòng đời hệ thống; sửa Task Done trong Active giữ assignee lịch sử |
| RD-02 | approved một phần, 01/10/2026 | Tái gia nhập không tự giao lại Task đã bỏ, nhãn theo membership hiện tại; My Tasks/filter còn mở OD-05 |
| RD-03 | approved quyền, 01/10/2026 | Owner/Task Creator quản lý Task; Assignee chỉ đổi status nếu không đồng thời là Owner/Creator; Comment chỉ Author sửa/xóa. Retention riêng OD-11 |
| RD-04 | proposed | Recipients khi gỡ/reassign; in-app invitation và payload sau mất membership |
| RD-05 | proposed | Bảo đảm email delivery, create retries và phân trang Board cần AC cụ thể |
| RD-06 | approved, 01/10/2026 | Chủ dự án xác nhận bằng ví dụ: uỷ quyền chính là Assignee được Creator giao Task, không có người thứ ba/cấp quyền riêng; Assignee chỉ đổi status, không edit/deadline/phân công/xóa nếu không là Owner/Creator |
| RD-07 | capability requested, 01/10/2026; chi tiết design-selected | Cả Kanban/My Tasks có search động và lọc thời gian. Assistant cụ thể hóa title/description, debounce, Ngày tạo/Deadline, khoảng/presets, timezone và kết hợp filter; không đổi sort hoặc membership |

## Quy tắc cập nhật

### Chỉnh DB theo phạm vi hiện tại — 03/10/2026

Chủ dự án yêu cầu bắt đầu chỉnh DB theo hướng đã đề ra. Tạo thiết kế v0.2 hiện hành với data dictionary/layout JSON/ERD, thay v0.1 làm nguồn thiết kế. Tách 12 collection lõi, announcements/idempotency pending và storage Upcoming. Google-only nullable passwordHash, identity riêng, avatar URL/fallback; Owner source duy nhất; current membership giữ lịch sử; editor/notification/email/security data theo SRS. Auth mode/retention/limits chưa duyệt được giữ open; không coi yêu cầu chỉnh sửa là phê duyệt mọi số liệu/tech mechanism. Chưa tạo DB hoặc models.

### Ưu tiên phần lõi, hoãn storage — 03/10/2026

RD-13 deferred theo yêu cầu trực tiếp: storage để Upcoming sau khi hệ thống hoàn thiện phần lõi. Không triển khai Task uploads, Workspace Documents hoặc kho resources Link/File đề xuất ở giai đoạn hiện tại. Provider/quota/file types/upload rights chưa duyệt và không chặn core. Không xem các câu hỏi pending trước đó là còn bắt buộc trả lời. Google login/avatar đã approved vẫn bản đầu; announcements/pin giữ capability, phase/quota chưa chọn; mô tả Workspace dài không phụ thuộc storage.

### Avatar Google, storage/resources và ghim — 03/10/2026

- RD-11 approved: chủ dự án chọn Google sign-in ngay bản đầu; avatar Google khi có, fallback chữ cái. D-06 initials-only được thay thế; upload avatar riêng không là nhu cầu mặc định.
- RD-12 approved capability: thông báo chung Workspace do Owner đăng/ghim, không pin cá nhân. Quota/content/fanout/phase release chưa chọn.
- RD-13 under-review: Task uploads, Workspace files, kho Link/File và provider/quota/rights. Đề xuất R2 Standard, 25 MiB/file, 10 attachment/Task, 1 GiB/Workspace; chưa duyệt hoặc tạo account cloud.
- RD-14 requested extension: mô tả Workspace đủ dài; mục tiêu draft đổi thành Workspace 20.000/Project 10.000 ký tự hiển thị. Các số cụ thể chưa duyệt; không yêu cầu tối thiểu nội dung dài.
- SRS/JSON mở rộng 35 UC/29 FR: UC-34/FR-28 Google, UC-35/FR-29 announcement. DB thêm auth_identities/announcements; files/resources vẫn proposal. Linking và Google-only lifecycle cần cụ thể hóa trước code, không auto-merge email.

### DB design draft — 03/10/2026

Theo yêu cầu bắt đầu thiết kế DB/bố cục dữ liệu: tạo DATABASE-DESIGN-v0.1.md và DATABASE-ERD-v0.1.md. Lựa chọn thiết kế đề xuất: ownerId duy nhất ở Workspace, membership active/inactive unique cặp User/Workspace, embed settings/rich text và reference relations tăng trưởng, workspaceId server-derived trên Task/Comment, version CAS và workspace mutation guard trong transaction. Chưa xem là chủ dự án đã duyệt schema; guard/cleanup/index/search phải benchmark. Auth mechanism, retention và các lựa chọn còn mở được liệt kê trong DB design; chưa deploy/cài models.

### Nền BE và lựa chọn FE theo giai đoạn — 03/10/2026

Chủ dự án đồng ý BE có thể chốt cơ bản, có thể thay đổi tương lai; FE thêm tech stack trong thiết kế/code. Dùng JS/Express/Mongoose làm nền hiện tại, React JS/JSX theo hướng trước; không coi mọi thư viện FE là đã duyệt hoặc phải chọn hết trước khi thiết kế. Nếu đổi nền BE, ghi lý do và ảnh hưởng. Bắt đầu DATA-MODEL-v0.1.md và WIREFRAME-SCOPE-v0.1.md; chưa bootstrap/cài dependencies từ câu trả lời này.

### Yêu cầu bảo mật — 03/10/2026

RD-10 requirement-requested: chủ dự án yêu cầu authentication/token/JWT và validation cả FE/BE, chú trọng bảo mật dù dự án cá nhân. Server validation và kiểm tra quyền là bắt buộc; JWT so với session, library/expiry/signing và ngưỡng rate limit còn là thiết kế cần chốt. Đã bổ sung SRS và draft SECURITY-DESIGN-v0.1.md; chưa có kiểm chứng bảo mật ứng dụng.

### Hướng stack JavaScript — 03/10/2026

Chủ dự án quen BE JS/Express/Mongoose và FE JS/JSX hơn TS/NestJS. Điều chỉnh hướng thiết kế SDS sang Node.js/JavaScript + Express + MongoDB/Mongoose, React JavaScript/JSX; NestJS/TypeScript không còn là mặc định đề xuất. Đây không phải phê duyệt mọi thư viện phụ, phiên bản, provider hoặc auth mechanism. Xem docs/sds/TECH-STACK-DIRECTION.md; chưa bootstrap ứng dụng.

### Song ngữ và phạm vi editor — 03/10/2026

- RD-08 scope-approved: chủ dự án đồng ý dùng chung editor cho mô tả Task, Comment, Workspace/Project; cùng bộ format/schema/validation, toolbar Comment gọn hơn. Chi tiết counting/library và toàn bộ giới hạn nhóm 6 chưa được phê duyệt từ câu này.
- RD-09 capability-requested: ngôn ngữ chính website là Việt và English. Phạm vi yêu cầu bổ sung tại SRS mục 7.2; mặc định/lưu lựa chọn/email locale là đề xuất thiết kế tại docs/ui-ux/LANGUAGE-v0.1.md. Không tự dịch nội dung người dùng hoặc thay đổi timezone đã duyệt.

### Yêu cầu editor 03/10/2026

RD-08 capability-requested: chủ dự án bổ sung hyperlink, emoji, dấu tiếng Việt, bộ đếm chữ/ký tự, toolbar và Title/Subtitle/Body. Chi tiết tại docs/ui-ux/CONTENT-EDITOR-v0.1.md: phạm vi trường và định dạng cụ thể là đề xuất. Không suy thành đã duyệt nhóm 6/NFR, Word import/export, shape hình vẽ hoặc file upload. Cần chốt phạm vi trước cập nhật UC/AC/contracts.

### Tạm chốt 03/10/2026 — nhóm 4–5

Chủ dự án: “cứ tạm chốt như vậy” và yêu cầu sang phần tiếp theo. `provisionally-approved` nghĩa là đầu vào tạm chốt để thiết kế, có thể review lại; không đồng nghĩa baseline v1.0.

- OD-14 provisionally-approved: preview tối thiểu cho người giữ URL hợp lệ; accept cần verified/đúng email với EMAIL; giữ intent qua auth; in-app EMAIL chỉ khi đã có tài khoản lúc gửi, không hồi tố; LINK không phát cho mọi User.
- Ownership/invitation provisionally-approved: chuyển Owner không vô hiệu lời mời còn hiệu lực; Owner mới quản lý, Owner cũ mất quyền. Chỉ Owner gửi/thu hồi đã được duyệt trước.
- OD-09 và RD-04 provisionally-approved: Creator/assignee cũ/mới nhận thay đổi phân công nếu còn membership, loại actor/trùng; content/status dùng assignee sau lưu; mỗi recipient/lần lưu một in-app, email chỉ event bật; cleanup membership không phát hàng loạt assignment.
- Queued email provisionally-approved: kiểm tra quyền/settings trước mỗi lần thử gửi; không gửi công việc khi mất quyền hoặc Task đã xóa; không thu hồi email đã bàn giao dịch vụ.
- OD-11 partially provisionally-approved: Task/Comments không còn truy cập sau xóa, không thùng rác; notification che nội dung khi target xóa/mất quyền, giữ timestamp/read state. Retention/purge/backup vẫn mở.
- OD-12/RD-05 và phần retention OD-08/11 chưa duyệt; reminder/push/documents vẫn thuộc increment sau.

SRS/JSON đã cập nhật mapping và UC liên quan; trạng thái tại mục này thay thế những hàng lịch sử còn ghi open phía trên.

### Phê duyệt bổ sung 01/10/2026 — nhóm 1–3

Chủ dự án nói nhóm 1–2 “đã ổn”, xác nhận chỉ Workspace Owner gửi lời mời và đồng ý phương án nhóm 3. Nguồn đề xuất: docs/srs/REVIEW-REMAINING-BUSINESS.md.

- OD-05 approved: eligibility assigned-to-me/current membership, default Active/chưa Done, filters Done/Archived; sort đã duyệt giữ nguyên.
- OD-06 approved: reject stale Workspace/Project/Task/Comment/status; giữ input trong giao diện đang mở, tải bản mới rồi sửa; không overwrite/auto-merge.
- Quyền nền approved: Member tạo Task/thêm Comment trong Active; Owner quản lý Workspace/Project/invitation/membership/ownership; chỉ Owner gửi/thu hồi lời mời; một Owner, chuyển cho Member hiện tại trước khi rời.
- OD-07 approved theo nhóm 3: giới hạn chưa verified ở chức năng tài khoản, password policy và session lifecycle như bản review.
- OD-13 approved: verification 24h/recovery 30 phút, một lần, resend vô hiệu token cũ cùng mục đích.
- OD-08 partially-approved: Terms version/time và đổi email/xóa tài khoản ngoài bản đầu; retention và nội dung Policies trước public release vẫn mở.
- Nhóm 4–5 cần phân tích sâu; OD-09/11/14, RD-04 và nhóm 6 không được phê duyệt từ câu trả lời này. Trạng thái cập nhật ở mục này thay thế các hàng trạng thái lịch sử phía trên.

Khi nhận câu trả lời: ghi lựa chọn, người duyệt (chủ dự án), ngày và phạm vi; cập nhật đồng bộ SRS/JSON/traceability/changelog. Nếu câu trả lời chỉ duyệt một phần, giữ phần khác open. Không coi im lặng hoặc phương án được đánh dấu đề xuất là phê duyệt.

Changelog 01/10/2026: tạo sổ từ D/OD trong bàn giao; bổ sung RD-01 đến RD-05; ghi nhận câu trả lời của chủ dự án về OD-01/02/03 và đồng bộ SRS/JSON. Không suy rộng câu trả lời sang chi tiết còn mở.

Cập nhật nhóm 01 cùng ngày: chủ dự án trả lời “Duyệt cả nhóm này” cho cả ba câu hỏi chi tiết. Đóng OD-01/02/03 ở phạm vi nhóm; cập nhật RD-01/02. OD-05/06/09/10 và các phần khác không được coi là đã duyệt từ câu trả lời này.

Cập nhật quyền cùng ngày: chủ dự án phân tích Owner, Creator và người được uỷ quyền trên Task, Author trên Comment. Thay hướng mọi Member cập nhật Task trong dự thảo; ghi RD-03/06 và cập nhật tài liệu. Chưa tự quy “uỷ quyền” thành assignee hoặc đóng các lựa chọn khác ở OD-04/05/06.

Kết quả làm rõ cùng ngày: chủ dự án xác nhận uỷ quyền chính là Assignee, chỉ đổi status và không có người thứ ba. Đóng RD-03/06 về quyền; OD-04/05/06 và retention OD-11 vẫn còn mở.

Cập nhật thứ tự Kanban cùng ngày: chủ dự án chọn “mới tạo trước, sort by time” thay thủ công. OD-04 duyệt một phần về thứ tự; không coi câu trả lời là duyệt status transitions hoặc sort My Tasks.

Cập nhật tiếp cùng ngày: chủ dự án trả lời “đúng” cho ba trạng thái cố định và chuyển trực tiếp, gồm Chưa làm → Hoàn thành và Hoàn thành → Chưa làm. Đóng OD-04 về status/thứ tự; không suy rộng sang My Tasks, conflict hoặc pagination.

Cập nhật My Tasks cùng ngày: chủ dự án yêu cầu sort tương đồng hai màn hình và giao assistant xem xét bố cục dễ nhìn/hợp cấu trúc. Chốt cùng thứ tự thời gian tạo mới nhất trước; chọn danh sách phẳng có Workspace → Project từng Task. Không tự duyệt các business filters/default từ yêu cầu bố cục.

Cập nhật 03/10/2026 theo yêu cầu trực tiếp chủ dự án: bám requirements → triển khai BE → thiết kế FE tổng thể hoặc theo module. Điều chỉnh ưu tiên khỏi FE Auth trước. Khuyến nghị design system/navigation chung rồi thiết kế module theo contracts đã kiểm; cách chia toàn bộ/theo module chưa coi là quyết định duyệt riêng. Google/SMTP thật được hướng dẫn để kiểm Auth local trước; không chốt SMTP provider production.


Cập nhật 03/10/2026 qua câu trả lời trực tiếp: chủ dự án chọn hiển thị lại nội dung notification công việc sau khi gia nhập lại Workspace, nếu Task còn và quyền hiện tại cho phép. API list/detail luôn kiểm membership/target tại lần đọc; Task đã xóa vẫn unavailable. Quyết định này không chốt retention/purge hoặc mở lại email job đã cancelled. Figma chính/Stitch khám phá mới là đề xuất, chưa được chủ dự án chọn.
