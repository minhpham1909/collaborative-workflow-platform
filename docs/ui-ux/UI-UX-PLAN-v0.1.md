# Kế hoạch thiết kế UI/UX v0.1

Ngày: 01/10/2026. Trạng thái: kế hoạch dự thảo, chưa phải thiết kế toàn bộ ứng dụng đã duyệt. Nguồn: screen flows, SRS v0.2 và mock Kanban/My Tasks.

## 1 Đầu ra cần có

Ngôn ngữ chính Việt/English theo yêu cầu 03/10/2026: toàn bộ screens/states/editor thiết kế và kiểm tra cả hai locale, xem LANGUAGE-v0.1.md. Phạm vi editor chung Task/Comment/Workspace/Project đã duyệt; không còn chờ xác nhận trường mô tả Workspace/Project.

Bổ sung 03/10/2026: thiết kế editor dùng chung, toolbar, heading/body, hyperlink/emoji, bộ đếm, paste và viewer/read-only theo [CONTENT-EDITOR-v0.1.md](CONTENT-EDITOR-v0.1.md); đưa vào UX-B và mô tả Workspace/Project nếu phạm vi đó được duyệt.

1. Kiến trúc thông tin: public/auth, personal area, Workspace/Project context; điều hướng và breadcrumb.
2. User journeys: từ đăng ký/invitation đến first-use, tạo/giao Task và nhận thông báo.
3. Wireframes: desktop/mobile, quyền Actor/Owner/Creator/Assignee/Author, Active/Archived.
4. Visual direction: typography, màu, spacing, form/button/list/card/Board và các trạng thái; thiết kế tiếng Việt, không chốt library chỉ từ mock.
5. Prototype các luồng chính và bảng states để nối với API/contracts trong SDS.
6. UI acceptance checklist: keyboard/focus, responsive, validation, loading/empty/error/conflict/no-permission/deleted và search/date filters.

## 2 Thứ tự màn hình

| Đợt | Màn hình/luồng | Phụ thuộc SRS |
|---|---|---|
| UX-A | App shell, Personal Home/Welcome, Workspace/Project navigation | Quyền nền/zero-workspace flow; invitation intent |
| UX-B | Board, My Tasks, Task Detail và Comments | Quyền/status/deadline đã chốt; defaults/conflict còn review |
| UX-C | Auth, verification/recovery, Profile/Account và invitation | OD-07/08/13/14 |
| UX-D | Workspace Settings/Members/Invitations/transfer/leave | Quyền nền, invitation preview; membership lifecycle đã rõ |
| UX-E | Notifications/Email Settings | OD-09/RD-04, payload unavailable; override đã rõ |
| UX-F | Landing/Terms/Privacy và mobile/keyboard audit toàn luồng | Nội dung Policies và NFR trước public release |

UX-A/B có thể bắt đầu ngay với các vùng pending được đánh dấu. Thứ tự thiết kế khác thứ tự triển khai: implementation vẫn bắt đầu Auth/User sau khi yêu cầu và thiết kế liên quan được chốt.

## 3 Hướng bố cục hiện có

Kanban: ba status, quyền Owner/Creator/Assignee, mới tạo trước, search/time controls. My Tasks: cùng sort/search/time, danh sách phẳng có Workspace → Project; có bản mẫu dạng list/card để thảo luận. Chọn variant trong prototype là phản hồi xem bố cục, chưa tự xác lập mọi business default của sản phẩm.

Prototype dùng dữ liệu sample, không kết nối backend và không chứng minh các quyền ở server. Khi chuyển wireframe cuối, cần thể hiện cả quyền xem-only, Archived, assignee-only status, empty/no-results và dữ liệu thay đổi khi form đang mở.

## 4 Thiết kế cần review cùng chủ dự án

- Mức độ gọn của navigation, My Tasks default, các trạng thái filter/search/date và vị trí Task Detail.
- UI auth chưa verified/token invalid; invitation preview và tiếp tục intent.
- Notification payload sau mất membership; ảnh hưởng queued email không đưa chi tiết kỹ thuật vào flow sản phẩm.
- Visual identity và thành phần dùng chung; mock hiện tại là cơ sở thảo luận, chưa phải final branding.

Tài nguyên/prototype giữ local. Không cần mở Figma/cloud storage hoặc publish website để hoàn thành giai đoạn này.
