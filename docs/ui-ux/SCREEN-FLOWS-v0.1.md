# Luồng màn hình v0.1

Nguồn lịch sử. Review hiện hành ngày 03/10/2026 nằm ở [flow v0.2](SCREEN-FLOWS-v0.2.md) và [screen spec](SCREEN-SPEC-v0.2.md), đã đối chiếu 35 UC với BE core. Các trạng thái pending phía dưới không được dùng để mở lại quyết định đã duyệt.

Cập nhật 03/10/2026: thêm UC-34 Google sign-in/linking/Terms completion/verified gate/avatar fallback; UC-35 Workspace announcements do Owner đăng/ghim. Nguồn hiện tại có 35 UC/29 FR; các tham chiếu 33 UC phía dưới là danh mục ban đầu. Kho resources/files, quotas và provider còn proposal tại docs/sds/AVATAR-STORAGE-RESOURCES-REVIEW.md. Google login giữ invitation intent; không auto-link email.

Ngày: 01/10/2026. Trạng thái: dự thảo UI/UX để review; chưa có wireframe hoặc UI chạy được. Nguồn: SRS v0.2 mục 7.2 và UC-01 đến UC-33. Đây là danh mục màn hình và trạng thái, chưa chọn URL/router hoặc thư viện UI.

## Màn hình và phạm vi UC

| Màn hình/nhóm màn hình | Use Cases | Hành động và trạng thái chính |
|---|---|---|
| Landing | UC-25 | Giới thiệu; đăng ký/đăng nhập; vào ứng dụng nếu đã có phiên; liên kết Policies |
| Terms / Privacy | UC-26 | Đọc công khai; phiên bản/ngày hiệu lực; quay lại luồng trước; nội dung thật trước public release |
| Đăng ký | UC-01 | Display name/email/password; lỗi dữ liệu/email trùng; email provider lỗi sau khi tạo tài khoản; Terms acceptance chờ OD-08 |
| Đăng nhập / đăng xuất | UC-02/03 | Lỗi chung cho thông tin sai; loading; phiên hết hạn; tiếp tục invitation intent; xử lý chưa xác minh chờ OD-07 |
| Xác minh email | UC-31 | Token hợp lệ/hết hạn/đã dùng; đã xác minh; gửi lại và rate limit |
| Quên / reset password | UC-30 | Phản hồi chung; token hợp lệ/hết hạn/đã dùng; kết quả reset và phiên theo OD-07/13 |
| Welcome / Personal Home | UC-04/05/27 | Không có Workspace: tạo/join; có Workspace: danh sách và lối vào My Tasks; invitation intent ưu tiên |
| Invitation preview / accept | UC-09 | Thông tin preview tối thiểu chờ OD-14; đăng nhập/xác minh; sai email; expired/revoked; đã là Member; accept đang xử lý |
| Workspace overview | UC-13 | Danh sách Active/Archived; empty/loading; Owner có CTA tạo Project; mất membership |
| Thành viên | UC-07/10/11/12 | Role hiện tại; rời/loại/chuyển ownership có xác nhận; không công khai email mọi Member mặc định; thay đổi role trong lúc thao tác |
| Workspace Settings / Invitations | UC-06/08 | Owner sửa name/description; tạo EMAIL/LINK; copy link; delivery status/retry; revoke; quyền đã đổi |
| Project form / quản lý vòng đời | UC-14/15/16 | Owner tạo/sửa/archive/reopen; Archived không sửa nội dung; conflict; archive khi người khác đang sửa |
| Project Board | UC-21 | Ba status cố định/chuyển trực tiếp và thời gian tạo mới nhất trước đã duyệt; không sắp thủ công; Active/Archived; empty/error; keyboard; đổi status thất bại khôi phục/tải lại |
| Task Detail / form | UC-17/18/19/20 | Xem/tạo/sửa/xóa; assignee/deadline; validation; conflict; target bị xóa; mất quyền; assignee lịch sử; Archived chỉ đọc |
| Comments trong Task Detail | UC-23/24 | Gửi; phân trang; Author sửa/xóa; content blank; Task bị xóa/archive; form stale; email lỗi không làm mất Comment |
| My Tasks | UC-22 | Sort thời gian tạo mới nhất trước như Kanban; danh sách phẳng ghi Workspace → Project, reflow mobile; filter Workspace/status/overdue và Archived/default chờ OD-05; empty; mất membership sau khi tải |
| Notifications | UC-32 | Unread/read; pagination; đọc một/tất cả; target unavailable; tránh lộ payload sau mất quyền theo RV-10 |
| Personal Settings — Profile | UC-28 | Email chỉ đọc; tên chung; avatar chữ cái đầu; validation; chưa upload |
| Personal Settings — Account | UC-29 | Password hiện tại/mới; sai password; phiên hết hạn; phạm vi thu hồi session chờ OD-07 |
| Personal Settings — Email | UC-33 | Chung + override từng loại Theo setting chung/Bật/Tắt; kế thừa/reset/default/vòng đời đã duyệt OD-02; save lỗi không giả thành công |

Danh mục phủ đủ 33 UC ở mức mapping. Nó chưa chứng minh tất cả luồng đã thiết kế hoặc được nghiệm thu.

## Luồng invitation

Mở link → preview theo OD-14 → nếu chưa đăng nhập, đăng nhập/đăng ký và giữ invitation intent → nếu chưa xác minh, hoàn tất xác minh → kiểm tra lại invitation/email/membership khi accept → gia nhập hoặc mở Workspace nếu đã là Member.

Nếu token hết hạn/thu hồi/sai email, hiển thị lý do phù hợp và lối về Home; không tiêu thụ token khi chưa đủ điều kiện. Không ép tạo Workspace nếu User đang tham gia bằng lời mời. Dữ liệu cụ thể ở preview và quyền Visitor chưa được chốt.

## Luồng Workspace và Project

Kanban/My Tasks có search động title/description và lọc thời gian dùng chung theo yêu cầu mới. Ngày tạo/Deadline với khoảng/presets theo giờ Việt Nam; các filter kết hợp và giữ sort mới tạo trước. Search/pagination thực tế phải truy vấn toàn tập được phép, không chỉ dữ liệu đã tải; thiết kế tại TASK-SEARCH-TIME-FILTERS.md.

Quyền Task đã chốt: Owner/Creator sửa nội dung/deadline/phân công, đổi status và xóa; Assignee chỉ đổi status nếu không đồng thời là Owner/Creator; Member khác chỉ xem theo membership. Comment chỉ Author sửa/xóa. Task Detail phải tách quyền từng hành động, Board chỉ cho Owner/Creator/Assignee đổi status; mọi thao tác ghi yêu cầu membership hiện tại và Project Active.

Personal Home → Workspace → Project Board → Task Detail. Owner có hành động Settings, tạo Project, archive/reopen; quyền hiển thị dựa trên trạng thái tải được, nhưng backend vẫn phải kiểm tra quyền hiện tại khi thực thi.

Rời Workspace: xác nhận mất quyền và tác động assignee → xử lý thành công → về Personal Home và tải lại danh sách. Owner cần chuyển ownership trước. Loại Member và transfer dùng xác nhận riêng; role/membership thay đổi trong lúc form mở phải được xử lý ở kết quả lưu.

Archived hiển thị nhãn chỉ đọc ở Board/Task Detail/Comments. Khi thao tác ghi thất bại vì Project vừa archive, giữ nội dung form người dùng đang nhập để họ có thể đọc/sao chép; việc phục hồi bản nháp dài hạn chưa thuộc scope đã duyệt.

## Luồng email settings

Personal Settings → Email → setting chung → chọn Workspace đang tham gia để xem override. Mỗi loại event có Theo setting chung/Bật/Tắt và hiển thị giá trị hiệu lực, đã duyệt OD-02. Đổi chung không thay override Bật/Tắt; reset về kế thừa. Mặc định assignment bật, comment/content/status tắt; rời xóa override, tái gia nhập kế thừa. Chưa hiện thực UI.

Khi lưu lỗi, giữ lựa chọn đang sửa và báo chưa lưu. Không hiển thị công tắc reminder/push/upload hoạt động khi increment chưa được xây.

## Quy tắc trạng thái chung

- Loading không bị hiển thị nhầm thành empty; thông báo lỗi có hành động thử lại phù hợp.
- Empty phải nói rõ không có dữ liệu hay không có kết quả filter, có CTA đúng quyền.
- Sau mất quyền, không tiếp tục hiển thị nội dung nội bộ trong response/list/detail; payload notifications cần đặc tả RV-10.
- Conflict không âm thầm ghi đè; UX chi tiết chờ OD-06. Nội dung người dùng đang sửa cần có đường sao chép trước khi tải lại.
- Form có label, lỗi gắn trường và hỗ trợ bàn phím; Board có thao tác đổi status ngoài kéo thả.
- Xóa/leave/remove/transfer có xác nhận mô tả đối tượng và hậu quả; Cancel không ghi dữ liệu.
- Deadline nhập đến phút, lưu UTC/hiển thị giờ Việt Nam; overdue kể cả Archived theo OD-03 đã duyệt. Filter mặc định My Tasks còn chờ OD-05.

## Bước tiếp theo

Sau review yêu cầu liên quan, dựng wireframes cho invitation → first-use → Workspace → Board/Task Detail trước; sau đó Profile/Settings/Notifications và public/auth pages. Khi chốt thiết kế, thêm route map, bố cục responsive, focus flow và đặc tả thành phần; không tự chọn library hoặc triển khai nghiệp vụ từ tài liệu dự thảo này.
