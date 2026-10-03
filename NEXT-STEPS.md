# Trạng thái và việc tiếp theo

Cập nhật: 03/10/2026, sau khi triển khai backend foundation.

## Trạng thái hiện hành — ưu tiên phần này

- Theo yêu cầu chủ dự án: tên thư mục gốc là BE/FE; repo GitHub private minhpham1909/collaborative-workflow-platform, commit khởi đầu trên main và tiếp tục làm việc trên dev. Xem docs/decisions/GIT-WORKFLOW.md.

- Đã bootstrap BE bằng Node 24.x/JavaScript ESM, Express 5.2.1, Mongoose 9.10.4; pnpm 11.19.0 và lockfile.
- Có 12 Mongoose models lõi, indexes declarations, rich-text validation và text/counters server, private field protection, editable version/optimistic concurrency.
- Chủ dự án đã chọn **JWT access token + refresh token**. Session model dùng refreshTokenHash/refreshGeneration; JWT signing/TTL/rotation/cookie/CSRF và Auth/Google endpoints chưa triển khai.
- Có GET health/live và health/ready; business routes chưa mở. Start yêu cầu MongoDB hỗ trợ transactions; chưa provision/connect DB hoặc tạo indexes.
- **16 tests passed**, audit dependencies không báo lỗ hổng đã biết; SRS checker vẫn PASS 35 UC/29 FR. Chưa có live DB/auth/security/transaction/FE nghiệm thu.
- Giới hạn editor/name và payload v1 là lựa chọn kỹ thuật tạm thời, không suy thành mọi số đã được chủ dự án duyệt. Storage Upcoming; announcements/idempotency phase riêng.

Bước tiếp theo: Auth/User API contracts và triển khai password/verification/reset + JWT/session refresh/revocation + Google login/linking; nối MongoDB replica set development/test để kiểm tra index/concurrency/transaction thực tế. Sau đó Workspace/Invitations và các module công việc. FE React JS/JSX/UI wireframes tiếp tục theo flow đã có.

Xem [Backend foundation](docs/sds/BACKEND-FOUNDATION-v0.1.md), [hướng dẫn chạy](BE/README.md), [QA](docs/qa/BACKEND-FOUNDATION-CHECK.md). Các đoạn phía dưới là **nhật ký trước foundation**, có thông tin skeleton/open choices đã được thay thế bởi trạng thái trên.

## Nhật ký trước foundation

## Trạng thái hiện tại để chuyển sang thiết kế

DB hiện hành đã chỉnh lại: DATABASE-DESIGN-v0.2.md + DATABASE-LAYOUT-v0.2.json + DATABASE-ERD-v0.2.md. Tách rõ 12 collection lõi/extension pending/storage Upcoming, User Google-only và avatar URL, Owner role derived, membership lifecycle, editor data, query/index plan và consistency. Bước tiếp là API contracts, chốt auth/editor contract trước Mongoose models; layout parse/check chỉ chứng minh consistency thiết kế, không runtime DB/security.

Ưu tiên mới nhất 03/10/2026: storage/resources là Upcoming sau hệ thống lõi; không cần trả lời/cài đặt provider/quota/Assignee upload hiện tại. Tiếp tục data dictionary/schema và API cho User/Google identity/session, Workspace/membership/invitations, Project/Task/Comment, Notifications/email settings/outbox; UI core song song. Google avatar không cần bucket. Announcements/pin phase/quota giữ riêng; mô tả Workspace dài vẫn review trong editor/core.

Scope mới 03/10/2026: đã chốt Google login/avatar ngay bản đầu và Owner announcement/pin capability; SRS/JSON 35 UC/29 FR, checker và traceability cập nhật. DB có identity/announcement extension. Storage/resources/provider/quota/description limits đang review tại docs/sds/AVATAR-STORAGE-RESOURCES-REVIEW.md; chưa upload/account cloud/deploy.

Thiết kế DB theo yêu cầu mới: docs/sds/DATABASE-DESIGN-v0.1.md và DATABASE-ERD-v0.1.md đã có collection/fields/index plan, ownership/membership, editor data, token/outbox, concurrency và lifecycle. Review cấu trúc cùng wireframe/API tiếp theo; trước models cần cụ thể hóa auth/editor/search và chính sách còn mở. Chưa tạo DB/index/models hoặc chạy integration tests.

Công việc thiết kế đã bắt đầu 03/10/2026: DATA-MODEL-v0.1.md chứa quan hệ/invariant conceptual; WIREFRAME-SCOPE-v0.1.md xác định màn hình/states cần vẽ. Nền BE JS/Express/Mongoose dùng hiện tại, FE libraries chọn khi thiết kế/code. Bước cụ thể tiếp: schema/data dictionary + API contracts, wireframes core flow; chốt cơ chế auth và những giới hạn phụ thuộc trước bootstrap. Chưa có model/API/FE chạy được.

Hướng stack mới 03/10/2026: theo nền tảng chủ dự án quen, thiết kế BE JavaScript/Express/Mongoose và FE React JavaScript/JSX; Vite và thư viện phụ tiếp tục review. Xem docs/sds/TECH-STACK-DIRECTION.md. Các ghi nhận trước nói chưa chọn ngôn ngữ/framework được thay thế bởi hướng này; chưa có dependencies/src/app chạy được.

- Nhóm nghiệp vụ 1–3 đã duyệt; nhóm 4–5 tạm chốt, retention/purge vẫn mở. Nhóm 6 về giới hạn/NFR/retry/tải thêm chưa có câu trả lời duyệt toàn bộ.
- Website Việt/English; editor chung mô tả Workspace/Project/Task và Comment đã được yêu cầu/chốt phạm vi. Chi tiết locale/counting/library cần thiết kế.
- UI có screen flows và mock Kanban/My Tasks, chưa wireframes/prototype toàn ứng dụng. SDS-v0.1 là khung, chưa schema/API/stack được lựa chọn.
- FE và BE hiện chỉ có README; chưa có package manifest, src, dependencies hoặc ứng dụng chạy được. packages/contracts và infra là vị trí dự kiến.
- Có thể bắt đầu SDS và UI/UX ngay với các đầu vào đã rõ; không phải chờ xử lý tất cả chi tiết phát hành. SRS v1.0 chưa được thông qua.

Thứ tự công việc mới: (1) kiến trúc và lựa chọn stack có lý do, (2) UI wireframes cùng mô hình dữ liệu conceptual song song, (3) schema/index/API/auth/concurrency/editor/i18n, (4) quyết định nơi host database/email và yêu cầu storage roadmap, (5) bootstrap cấu trúc BE/FE theo stack đã chọn, (6) triển khai Auth/User rồi các module còn lại. Dịch vụ bên thứ ba được khảo sát trước; không tự tạo tài khoản, trả phí hoặc deploy từ yêu cầu thiết kế.

Nếu “lưu trữ bên thứ ba” là file storage: avatar/attachments/Documents vẫn thuộc increment sau; bản đầu chỉ thiết kế ranh giới và ghi yêu cầu cần chốt, chưa bổ sung upload. Database hosting và email provider liên quan trực tiếp bản đầu, cần lựa chọn sớm hơn. Các mục phía dưới là lịch sử các lần review; trạng thái ở phần này và decision register được ưu tiên.

## Đã thực hiện

- Đọc tài liệu bàn giao; xác nhận thư mục `D:\Code\Personal Project\collaborative-workflow-platform`.
- Review SRS v0.2; lưu 12 vấn đề cần làm rõ trong [SRS-REVIEW-v0.2.md](docs/srs/SRS-REVIEW-v0.2.md).
- Tạo [decision register](docs/decisions/DECISION-REGISTER.md), phân biệt đã duyệt, duyệt một phần và đề xuất.
- Chủ dự án duyệt: Task chưa Done bỏ assignee khi thành viên rời; Done giữ người cũ/nhãn đã rời; reopen bỏ assignee không còn membership.
- Chủ dự án duyệt: email chung toàn tài khoản + override từng Workspace ngay bản đầu, đặt tại Personal Settings.
- Chủ dự án duyệt: deadline dạng ngày giờ, bản đầu hiển thị múi giờ Việt Nam. Những chi tiết overdue/lưu UTC/past-due chưa được suy rộng thành quyết định đã duyệt.
- Đồng bộ các lựa chọn vào SRS/JSON, AC-X10 và changelog; chưa tạo baseline v1.0.
- Tạo skeleton `docs/sds`, `docs/decisions`, `docs/ui-ux`, `docs/qa`, `assets/brand`, `assets/references`, `FE`, `BE`, `packages/contracts`, `scripts`, `infra`; có README và các file cấu hình cơ bản.
- Khởi tạo Git local riêng, chưa có commit hoặc remote.
- Công cụ PowerShell kiểm tra đủ 33 UC, 27 FR, 26 BR, 14 OD và 20 AC-X; kiểm tra tham chiếu FR ↔ UC và nội dung JSON/Markdown đồng nhất. Tạo [TRACEABILITY.md](docs/srs/TRACEABILITY.md).

Đây là kết quả kiểm tra tài liệu. Chưa có test nghiệp vụ, phép đo NFR hoặc ứng dụng chạy thật.

## Môi trường thực tế

Git đã kiểm tra: `2.50.1.windows.1`.

Đường dẫn Node được tìm thấy tại `C:\Program Files\nodejs\node.exe`, nhưng lần chạy kiểm tra phiên bản trực tiếp trong phiên này báo `The requested operation requires elevation`. Wrapper npm PowerShell cũng lỗi khi gọi Node. Vì vậy chưa xác minh phiên bản Node/npm hiện tại, chưa cài dependencies và chưa chọn phiên bản runtime sản phẩm. Việc dựng skeleton/kiểm tra SRS không phụ thuộc Node.

Cập nhật kiểm tra tiếp theo: metadata file Node cài trên máy ghi `24.15.0`, nhưng chưa xác nhận nó chạy được. Node đi kèm Codex tại `C:\Users\Acer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` đã chạy và trả `v24.19.0`. Có runtime sử dụng được cho công cụ local; chưa chọn nó làm phiên bản sản phẩm, chưa thay đổi Node/PATH trên máy hoặc cài dependencies.

## Phân tích bổ sung đang chờ trả lời

- [Nhóm review 01](docs/srs/REVIEW-GROUP-01.md): chủ dự án đã duyệt cả ba nhóm chi tiết assignee/Archived/tái gia nhập, email override và deadline/overdue ngày 01/10/2026. Đã cập nhật SRS/JSON, AC-X08/X10/X14/X18, decision register và traceability; chưa chạy test nghiệp vụ.
- [Luồng màn hình v0.1](docs/ui-ux/SCREEN-FLOWS-v0.1.md): mapping đủ 33 UC và trạng thái; chưa có wireframes hoặc UI chạy được.
- [Nhóm review 02](docs/srs/REVIEW-GROUP-02.md): phương án cụ thể cho status/Board, My Tasks và conflict OD-04/05/06; chưa được duyệt.
- Theo yêu cầu phân tích hai phần đầu, đã lưu [thiết kế Kanban/My Tasks v0.1](docs/ui-ux/KANBAN-MY-TASKS-DESIGN-v0.1.md), làm rõ quyền, chuyển trạng thái, thứ tự, tải thêm, filters và default. Chưa ghi nhận OD-04/05 hoặc các chi tiết mới là được duyệt.
- Chủ dự án chốt [quyền Task/Comment](docs/srs/TASK-COMMENT-PERMISSIONS.md): Owner/Creator quản lý Task; “người được uỷ quyền” chính là Assignee, chỉ đổi status nếu không đồng thời là Owner/Creator; không có người thứ ba. Comment chỉ Author sửa/xóa. Đóng RD-03/06 về quyền; status/Board/My Tasks/conflict và retention còn review riêng.
- Đã bổ sung ma trận chuyển trạng thái và so sánh tự sắp/thủ công trong nhóm review 02; đang chờ chốt OD-04, chưa cập nhật các phương án này thành yêu cầu đã duyệt.
- Cập nhật mới: chủ dự án duyệt thứ tự Kanban theo thời gian tạo mới nhất trước trong mỗi cột, không sắp thủ công; đã đồng bộ FR-12/UC-21/AC-21. OD-04 duyệt một phần; status transitions, Tải thêm và My Tasks vẫn còn review riêng.
- Kết quả tiếp theo: chủ dự án xác nhận ba trạng thái cố định và chuyển trực tiếp giữa chúng; OD-04 về status/thứ tự đã chốt. Đã đồng bộ BR-08/UC-19/21; tiếp tục My Tasks OD-05, conflict OD-06 và pagination/tải thêm riêng.
- Chủ dự án yêu cầu sort tương đồng Kanban/My Tasks và giao assistant xem xét bố cục My Tasks. Đã chốt cùng thời gian tạo mới nhất trước, bỏ đề xuất deadline-first; chọn danh sách phẳng có Workspace → Project và mobile reflow. Eligibility/default/filter của My Tasks vẫn là baseline đề xuất, không tự duyệt từ yêu cầu bố cục.
- Đã dựng bản mẫu tương tác My Tasks với dữ liệu minh họa, hai bố cục Danh sách/Thẻ; chọn Danh sách làm hướng mặc định, giữ cùng sort. Đã kiểm tra sort/filter/status local, desktop và 360 px; kết quả tại docs/qa/MY-TASKS-MOCKUP-CHECK.md. Chưa có ứng dụng/backend thật.
- Yêu cầu mới: cả Kanban/My Tasks có search động và bộ lọc thời gian. Đã lưu đặc tả TASK-SEARCH-TIME-FILTERS.md, cập nhật FR-12/13 và UC-21/22; mock minh họa search/time local. Backend search toàn dữ liệu/quyền/pagination và xử lý response cũ cần kiểm tra khi có ứng dụng thật.

## Việc tiếp theo

Theo yêu cầu rà soát để chuyển giai đoạn: đã tạo docs/srs/SRS-READINESS.md, khung docs/sds/SDS-v0.1.md và docs/ui-ux/UI-UX-PLAN-v0.1.md. Có thể soạn SDS/wireframe draft song song, nhưng chưa thông qua baseline SRS v1.0 hoặc viết schema/code nghiệp vụ từ các quyết định còn mở.

1. Nhóm 01 đã chốt chi tiết: giữ assignee lịch sử khi sửa nội dung Done ở Active, cleanup chưa Done cả Archived, tái gia nhập; override từng event/kế thừa/reset/default/xóa khi rời; deadline đến phút/lưu UTC/overdue/past-due/Archived. Các cơ chế concurrency và thời điểm áp dụng preferences cho email đã xếp hàng review riêng nhóm 02/SDS.
2. Duyệt My Tasks, conflict, gộp recipients/event, deletion retention và invitation preview: OD-05/06/09/11/14 cùng RD-04. Quyền Task/Comment RD-03/06 và status/thứ tự OD-04 đã chốt, không cần duyệt lại. Pagination/tải thêm còn thiết kế riêng.
3. Duyệt auth/session/Terms/token, NFR, giới hạn và bảo đảm email delivery/retry: OD-07/08/12/13 cùng RD-05.
4. Cập nhật đồng bộ SRS/JSON/traceability, ghi người duyệt/ngày, lập baseline v1.0 khi không còn quyết định chặn bản đầu.
5. Review stack ứng viên React/Vite + NodeJS + MongoDB trong SDS; chọn backend framework, ngôn ngữ, workspace manager, auth/session, schema/index, concurrency và event/email pipeline. Xử lý khả năng chạy Node trước bootstrap ứng dụng.
6. Hoàn thành SDS và wireframes rồi triển khai từng lát cắt: Auth → Workspace/Invitations → Project → Task/Board/My Tasks → Comments/Notifications/Settings → Public pages/Policies và nghiệm thu.
7. Reminder, browser push, Documents/storage giữ trong roadmap; bổ sung UC/AC trước triển khai increment.

## Phạm vi chưa thực hiện

Chưa có API/React app, dependencies, database connection, root package/workspace manager, schema, storage/email provider, production config, deploy hoặc remote GitHub. `packages/contracts` chỉ là vị trí dự kiến nếu chọn workspace phù hợp.

HANDOFF-PROMPT.md giữ nguyên nội dung bàn giao lịch sử; trạng thái mới đọc tại file này và decision register. Chưa có nguồn SRS v0.1 hoặc AGENTS.md trong cây dự án hiện tại để đối chiếu.
