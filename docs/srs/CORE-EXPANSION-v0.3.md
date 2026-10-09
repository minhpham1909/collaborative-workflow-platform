# Core expansion v0.3 — D1–D5

Ngày 05/10/2026. Tổng hợp quyết định trực tiếp của chủ dự án trong chat. Đây là đặc tả mở rộng; chưa phải bằng chứng triển khai. SRS v0.2 vẫn mô tả nền đang chạy. Khi khác nhau, các quyết định Approved bên dưới là hướng nghiệp vụ mới; không dùng Proposed/Open để thay quyền hiện hành.

## Phạm vi

- Approved: hỗ trợ Workspace độc lập và Organization → Workspace → Project → Task. Studio là tên hiển thị của tổ chức, không là một thực thể riêng.
- Approved: ưu tiên core BE trước; UI tiếp theo theo bộ Stitch tại `assets/ui_design/stitch_workflow_collaborative_workspace_design/`.
- Giữ đăng nhập email/password và Google, unique account/identity, JWT/refresh, xác minh, validation BE/FE, quyền kiểm tại lúc thực hiện và kiểm phiên bản.
- Storage/upload/quota, billing, Sprint, lịch họp và realtime presence là các module riêng; không đưa mockup thành chức năng đã có.

## D1 — Sở hữu và vai trò

| ID | Trạng thái | Quy tắc |
|---|---|---|
| EX-01 | Approved | Workspace độc lập có Owner; Workspace trực thuộc do tổ chức sở hữu và có Manager quản lý |
| EX-02 | Approved | Organization có Owner/Admin/Member; Workspace có Manager/Member; Project có Guest và Lead; không có Collaborator |
| EX-03 | Approved | Vai trò theo phạm vi, không thay User; Admin tổ chức có thể đồng thời là Manager Workspace và được tự bổ nhiệm |
| EX-04 | Approved | Thu hồi role không xóa danh tính hay lịch sử; không tích lũy quyền từ role đã hết hiệu lực |
| EX-05 | Proposed | Một Owner tổ chức, một Manager chính mỗi Workspace trực thuộc, tối đa một Lead mỗi Project; thay Manager giữ người cũ là Member nếu không bị loại |

Org Owner/Admin có quyền nội dung toàn tổ chức theo D2 nên việc tự bổ nhiệm không là điều kiện để đọc nội dung. Mỗi Workspace thuộc tối đa một tổ chức là hướng thiết kế; migration phải xác nhận invariant này.

## D2 — Quyền truy cập và kiểm duyệt

| ID | Trạng thái | Quy tắc |
|---|---|---|
| EX-06 | Approved | Org Owner/Admin đọc và quản trị mọi Workspace trực thuộc; không có quyền trên Workspace độc lập của người khác |
| EX-07 | Approved | Để nhận Task, Owner/Admin cũng phải có membership thực hiện công việc trong Workspace |
| EX-08 | Approved | Member chỉ xem phạm vi được cấp; Workspace không bắt buộc tương đương phòng ban; chưa mở truy cập toàn tổ chức cho Member |
| EX-09 | Approved | Guest chỉ xem/bình luận trong Project được cấp, không tạo/nhận/sửa Task; freelancer làm việc dùng Member |
| EX-10 | Approved | Owner/Admin/Manager được xóa Comment vi phạm theo phạm vi, kể cả Archived; không sửa lời tác giả |
| EX-11 | Approved, thay đề xuất cũ | Comment bị tác giả hoặc quản trị xóa là xóa hẳn, không phục hồi. Nhật ký quản trị giữ actor/thời điểm/lý do, không sao chép nội dung |

Org Admin không quản lý Owner/Admin khác; Workspace Manager không Ban quản trị cấp trên là đề xuất bảo vệ phân cấp, chưa tự coi mọi ngoại lệ đã duyệt. Project Lead được quản lý công việc nhưng quyền kiểm duyệt/Guest invitation riêng của Lead cần ma trận cuối trước API.

Xóa Comment trực tiếp khác với ẩn do Task/Project/Workspace cha ở thùng rác: trường hợp sau Comment còn dữ liệu và hiện lại theo cha nếu chưa bị xóa riêng.

## D3 — Thành viên, lời mời, Kick/Ban

| ID | Trạng thái | Quy tắc |
|---|---|---|
| EX-12 | Approved | Thêm Member nội bộ vào Workspace không cần chấp nhận lại; có thông báo |
| EX-13 | Approved | Lời mời tổ chức có thể kèm Workspace đích; phạm vi phải rõ trước khi chấp nhận |
| EX-14 | Approved | Guest invitation hỗ trợ EMAIL và LINK theo Project |
| EX-15 | Approved | Rời tổ chức thu hồi mọi quyền bên trong, kể cả Guest; giữ Task/Comment và danh tính lịch sử |
| EX-16 | Approved | Tên/avatar mở profile card theo ngữ cảnh; trạng thái đã rời nằm trong card, không lặp tag dài trên Task/Comment |
| EX-17 | Approved | Kick thu hồi quyền hiện tại, cho gia nhập lại bằng lời mời hợp lệ; Ban chặn tái gia nhập theo phạm vi đến khi unban |
| EX-18 | Approved | Ban áp dụng Member và Guest, không chỉ Guest; unban không tự cấp lại membership |
| EX-19 | Approved hướng; chi tiết thực thi Proposed | Ban tùy chọn dọn Comment 1/3/7/30 ngày hoặc toàn bộ thời gian, mặc định không xóa; chỉ trong phạm vi Ban, không xóa Task/tài liệu |

Thiết kế thực thi EX-19: chốt cutoff tại xác nhận, lọc createdAt; hiển thị số lượng/ảnh hưởng; Ban có hiệu lực trước khi dọn batch; dọn lỗi không rollback Ban. Retry và tiến độ không sao chép Comment vào log. Phải kiểm Ban ở API và lúc accept invitation, không chỉ UI. Ban tổ chức không khóa account ở tổ chức khác; xử lý tài khoản bị chiếm quyền/thu hồi phiên là luồng auth riêng.

Giữ quy tắc assignee: mất quyền làm việc thì Task chưa Done bỏ assignee kể cả Archived, Done giữ lịch sử; gia nhập lại không tự giao lại. Creator/Author mất quyền nhưng danh tính không bị xóa. Thẻ profile không lộ email hoặc dữ liệu tổ chức khác cho Guest.

Open: hạn dùng/multi-use/thu hồi link Guest, quyền mời và trường hợp Guest invitation cho người đã là Member phải chốt contract chính xác; không cho link nâng quyền hoặc ghi đè membership hiện tại.

## D4 — Archive, Trash và purge

| ID | Trạng thái | Quy tắc |
|---|---|---|
| EX-20 | Approved | Workspace Archived làm cả phạm vi chỉ đọc; mở lại không đổi state riêng của Project; kiểm duyệt và cleanup quyền là ngoại lệ đã chốt |
| EX-21 | Approved | Task và tài nguyên được phép xóa dùng hai bước: vào thùng rác → xóa vĩnh viễn; trash tự purge sau 30 ngày |
| EX-22 | Approved | Restore giữ dữ liệu, kiểm lại assignee và quyền hiện tại; không phát lại thông báo cũ |
| EX-23 | Approved hướng | Ưu tiên Archive nhóm, xác nhận nhiều bước và có điều kiện Unarchive |
| EX-24 | Approved 05/10 | Workspace và Project chỉ Archive, không Trash/purge; chỉ Task có thùng rác 30 ngày. Không mở destructive Workspace/Project API |
| EX-25 | Open | Ma trận purge thủ công, chuyển Workspace độc lập vào tổ chức và xử lý membership ngoài tổ chức chưa chốt chi tiết |

Hướng thiết kế: deletedAt/purgeAt UTC; restore hủy lịch purge; parent restore không hồi sinh child đã xóa riêng; parent trash không kéo dài hạn child. Archived không thuộc lịch purge. Worker cần kiểm lại state/version để không xóa tài nguyên vừa phục hồi. Không áp TTL trực tiếp cho root tài nguyên có con vì cần dọn liên quan có kiểm soát. Backup retention tách riêng.

## D5 — Công việc và thống kê

| ID | Trạng thái | Quy tắc |
|---|---|---|
| EX-26 | Approved | Priority Low/Medium/High, mặc định Medium; overdue riêng; labels dùng chung theo Project |
| EX-27 | Approved | Checklist đơn giản, Assignee được tick nhưng không sửa cấu trúc; Done còn mục chưa xong có cảnh báo/xác nhận |
| EX-28 | Approved | completedAt ghi khi Done, clear khi reopen; lịch sử các lần hoàn thành vẫn giữ |
| EX-29 | Approved | My Tasks chia nhóm theo deadline; Board mặc định newest-created-first như nền hiện tại |
| EX-30 | Approved | Task có mã dễ đọc, ổn định, tìm kiếm được; không tái dùng sau xóa |
| EX-31 | Approved hướng | Project Lead và quyền điều phối; không thêm role toàn account; chưa có duyệt hoàn thành bắt buộc |
| EX-32 | Approved | Creator/Assignee xin reopen Done; quản lý duyệt/từ chối hoặc reopen trực tiếp có lý do; không tự duyệt yêu cầu của mình |
| EX-33 | Approved | Một request pending mỗi Task; sau từ chối người gửi chờ 24h; tối đa 3 requests/người/Task trong rolling 7 ngày; giới hạn requests, không giới hạn số vòng đời Task |
| EX-34 | Approved nhu cầu; định nghĩa Proposed | Thống kê Done và tiến độ Project dùng dữ liệu thật, không dùng số mock/Sprint chưa tồn tại |

Đề xuất EX-34: progress = current Done / nondeleted Tasks; completed-in-period = current Done có completedAt trong kỳ; reopen loại khỏi kết quả current, giữ sự kiện trong activity. Archived vẫn tra cứu; quyền Guest chỉ thống kê Project được cấp. Bộ lọc phải phân biệt tổng Project với kết quả lọc. Không coi số Task bằng khối lượng công việc hoặc năng suất cá nhân.

EX-30 cập nhật theo lựa chọn trực tiếp 05/10: namespace theo Project, dạng WF-A1B2C3-N; prefix sinh tự động unique, counter atomic riêng Project, giữ nguyên mã khi chuyển Workspace. Contract thực thi C4-A ở TASK-ENRICHMENT-C4-API-v0.1.md. Contract mặc định thực thi EX-32/C4-B đã ghi: hủy pending khi archive/delete/mất quyền/mất quan hệ Creator-Assignee; đổi Lead giữ request cho quản lý mới; duyệt kiểm lại scope/người gửi và hai version tại commit, không tự mở Archived. Định nghĩa thống kê EX-34 dùng đề xuất current Done như contract TASK-REOPEN-C4-API-v0.1.md; chưa coi lựa chọn kỹ thuật là xác nhận riêng mọi chi tiết nghiệp vụ.

## Tiêu chí xuyên suốt

- Không trust role/organizationId/workspaceId do client cung cấp; xác định parent chain thật và kiểm quyền tại commit.
- Member/Guest/Manager/Admin thu hồi trong lúc form đang mở phải bị từ chối đúng scope; relationship lịch sử không cấp quyền.
- Không auto-replay mail/notification; không chạy SMTP queue dev cũ từ việc mở rộng core.
- Lưu idempotency và guard xung đột cho accept, assignment, ban, purge, counters và reopen; cấp quyền/xóa dữ liệu phải có negative tests giữa hai tổ chức và Workspace độc lập.
- Đây là delta spec; chưa sửa use-cases.json cũ thành mô hình mới khi contracts vẫn mở. Mỗi implementation slice phải cập nhật use cases/traceability tương ứng.
