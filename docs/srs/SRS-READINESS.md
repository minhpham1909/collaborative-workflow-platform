# Rà soát để chuyển từ SRS sang SDS/UI/UX

Ngày: 01/10/2026. Trạng thái: đánh giá hiện tại, chưa phải phê duyệt SRS v1.0. Câu “đã khá ổn” được ghi nhận là phản hồi tích cực về bản mẫu; không tự coi là duyệt mọi quyết định còn mở.

## 1 Đã có đầu vào rõ

Cập nhật 03/10/2026: nhóm 1–2 và phương án nhóm 3 đã duyệt; nhóm 4–5 tạm chốt theo trao đổi. Bảng mục 2 phía dưới là danh sách review ban đầu, không còn là danh sách toàn bộ mục đang mở. Hiện còn nhóm 6 (OD-12/RD-05), retention/purge/backup, nội dung Policies trước public release và giới hạn delivery email. Chi tiết trạng thái mới tại DECISION-REGISTER.md. SDS/UI/UX có thể dùng nhóm 4–5 làm đầu vào tạm chốt, chưa công bố baseline v1.0.

- Display name/avatar bản đầu, hai invitation types và hạn 7 ngày, in-app luôn có, loại daily digest và roadmap reminder/push/storage.
- OD-01: membership lifecycle, assignee lịch sử, cleanup Archived và tái gia nhập.
- OD-02: email chung + override từng event, precedence/default/reset và xóa override khi rời.
- OD-03: ngày giờ đến phút, UTC/giờ Việt Nam, overdue/past-due/Archived.
- OD-04: ba status cố định/chuyển trực tiếp, card mới tạo trước, không sắp thủ công.
- RD-03/06: Owner/Creator quản lý Task; Assignee chỉ status; Comment chỉ Author sửa/xóa, yêu cầu membership hiện tại/Project Active.
- Sort My Tasks giống Kanban; search động và bộ lọc thời gian dùng chung đã được yêu cầu. Có mock tương tác và kiểm tra local; chưa có ứng dụng thật.

## 2 Hành vi còn cần chủ dự án chốt

| Nhóm | IDs | Cần quyết định | Phương án hiện có để review |
|---|---|---|---|
| My Tasks và quyền nền | OD-05, ma trận mục 4 | Eligibility/default/Archived filters; Member tạo Task/thêm Comment; Owner quản lý Workspace/Project/membership | My Tasks chỉ assignee, default Active/chưa Done, filter cho Done/Archived; Member tạo Task/thêm Comment ở Active; Owner quản lý Workspace/Project và membership |
| Sửa đồng thời | OD-06 | Ghi đè hay báo conflict; giữ nội dung đang nhập | Từ chối bản cũ ở Workspace/Project/Task/Comment, không auto-merge; giữ nội dung để sao chép, tải bản mới rồi lưu lại |
| Tài khoản/Terms/token | OD-07/08/13 | Chưa xác minh được làm gì; reset/đổi password ảnh hưởng phiên; Terms acceptance; token expiry/resend | Đăng nhập/Settings khi chưa verified, phải verified để create/join Workspace; reset thu hồi phiên cũ, đổi password giữ phiên hiện tại; Terms version/time; verification 24h/recovery 30 phút, resend vô hiệu token cũ |
| Lời mời trước gia nhập | OD-14, RV-03/04 | Visitor preview; dữ liệu hiện ra; in-app invitation ai nhận khi chưa là Member | Preview tối thiểu tên Workspace/người mời/loại/hạn, không lộ Task/member list; accept chỉ verified và đúng email nếu EMAIL; mapping in-app còn cần làm rõ |
| Thông báo và xóa dữ liệu | OD-09/11, RD-04, RV-05/10 | Recipients khi gỡ/đổi assignee; gộp event; preferences cho email queued; payload sau mất quyền; xóa Task/Comment | Mỗi recipient/lần lưu một mục; email chỉ loại được bật; không còn quyền thì che nội dung cũ; xóa Task làm Comments unavailable. Recipient cũ/queued cutoff và retention chưa chốt |
| Nghiệm thu và giới hạn | OD-12, RD-05 | Giới hạn input, dữ liệu đo/NFR, retry create/email, Board tải thêm/tổng số | Số trong SRS mục 11 là mục tiêu dự thảo; cần review rồi ghi môi trường đo và giới hạn bảo đảm thực tế |

Không gộp việc chọn stack hoặc cách lưu MongoDB vào phê duyệt hành vi nghiệp vụ. Mọi phương án ở cột cuối chưa được xác nhận vẫn giữ là đề xuất.

## 3 Phần chuyển sang SDS

Các chi tiết kỹ thuật có thể phân tích ngay nhưng chỉ thông qua sau khi có đầu vào yêu cầu liên quan:

| Thiết kế SDS | Phụ thuộc SRS |
|---|---|
| Framework backend, JavaScript/TypeScript, workspace manager và library versions | Chọn stack ở SDS; chưa cần schema để review SRS |
| Cookie/session/token implementation, hashing, token storage và email normalization | OD-07/08/13 xác định hành vi và lifecycle |
| MongoDB embed/reference/index/transaction và nơi lưu Owner | Invariants membership/ownership/invitation/Task và conflict |
| API routes/contracts/errors, permission checks và idempotency | UC/AC đã duyệt, RD-05 và OD-06 |
| Search query/index, debounce implementation, pagination/cursor/stable tie-break | FR-12/13, search/time specification, NFR và RV-12 |
| Email provider/queue/outbox/retry/idempotency | OD-09, RD-04/05 và giới hạn delivery RV-09 |
| Hard/soft delete, purge jobs, backup/restore | OD-11/12/08 chốt hiệu lực xóa/retention và release expectations |
| Frontend route/layout/component state, tests và deployment config | Screen flows, quyền, API và NFR |

SDS draft không được lén thay BR hoặc biến lựa chọn chưa duyệt thành schema/code bắt buộc.

## 4 UI/UX có thể tiến hành

Có thể tiếp tục kiến trúc thông tin, visual direction, wireframe cho các luồng đã rõ, trạng thái lỗi/empty/loading/readonly và accessibility. UI auth/invitation/notification có thể vẽ nhánh dự thảo và đánh dấu quyết định chờ, tránh hoàn thiện luồng sai rồi viết code.

Kanban/My Tasks hiện là mock để thảo luận, không thay wireframe/thiết kế toàn ứng dụng. Tương tác chọn một variant chưa đủ làm phê duyệt mặc định cuối cùng cho sản phẩm.

## 5 Điều kiện chuyển giai đoạn

1. Chốt hành vi bản đầu ở mục 2, cập nhật SRS/JSON/AC/decision register; kiểm tra tham chiếu.
2. Tạo baseline SRS v1.0 có người duyệt/ngày và danh sách mục deferred/constraints rõ. Chưa cần có kết quả test ứng dụng để baseline yêu cầu; kết quả test là điều kiện nghiệm thu sau triển khai.
3. SDS v0.1 và wireframes có thể soạn song song từ bây giờ; thông qua thiết kế từng module khi yêu cầu phụ thuộc đã chốt.
4. Sau SRS/SDS liên quan được duyệt và stack được chọn, bootstrap ứng dụng rồi triển khai lát cắt Auth/User trước.

Reminder OD-10, browser push FR-26, Documents FR-27 giữ trong roadmap, không chặn baseline bản đầu; chỉ cần boundaries dự kiến, chưa thiết kế/code chi tiết provider/scheduler/upload.
