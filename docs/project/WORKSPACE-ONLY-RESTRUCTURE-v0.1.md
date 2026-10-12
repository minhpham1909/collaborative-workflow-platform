# Tái cấu trúc Workspace và nghiệm thu UX — v0.1

12/10/2026. Tài liệu phân tích theo phản hồi nghiệm thu; chưa đổi code hoặc dữ liệu. Hướng bỏ lớp Organization/Studio; user đã chốt Workspace Owner/Manager/Member, Guest riêng từng Project. Không triển khai thêm Organization settings trong lúc chuẩn bị bỏ lớp này.

## Mô hình đích

Account → Workspace → Project → Task / Comment. Một người có thể tham gia nhiều Workspace độc lập. Không còn membership/vai trò quản trị Organization hoặc quyền ngầm trên mọi Workspace. UI đề xuất “Nhóm làm việc” (Team), code/DB giữ Workspace để tránh đổi tên kỹ thuật không cần thiết; tên hiển thị còn là đề xuất.

Giữ nghiệp vụ đã có: Project/Task, Creator/Assignee, Guest chỉ đọc/bình luận từng Project, rich text, checklist/priority/labels, approval reopen, CAS/lịch sử, Archive/trash30ngày, notifications/email preferences, My Tasks/Calendar, personal pins. Project Lead đã chốt bỏ ngày12/10. Quyền quản lý trước đây của Lead cần chuyển theo ma trận Owner/Manager; former Lead không tự được nâng vai trò.

## Vai trò — đã chốt bộ role; chi tiết dưới là đề xuất cần xác nhận

Owner: quyền sở hữu, chuyển Owner, cấp/thu hồi Manager và thao tác quan trọng toàn nhóm. Manager: quản lý trong Workspace được giao, không sở hữu hoặc tự nâng quyền; Member làm việc theo quyền Project/Task hiện tại. Guest cấp theo Project, không thành Workspace Member, không tạo/nhận Task. Đã chốt mới: Owner và Manager được mời Member; chỉ Owner bổ nhiệm Manager. Workspace có thể nhiều Manager. Archive Workspace/Project và quyền thay thế Lead cũng cần ma trận cụ thể.

## Backlog UX mở lại sau nghiệm thu

| Vấn đề hiện tại | Hướng sửa |
| --- | --- |
| Sidebar “Không gian của bạn” trùng Trang chủ, tốn chiều cao | Loại bỏ; danh sách chính và pinned Projects đủ navigation |
| Mode control nằm thành hàng riêng, phân tán khỏi filter | CollectionToolbar chung: search/filter/time/sort + icon mode44px, aria-label/tooltip; một khu vực, responsive |
| Compact My Tasks/Inbox chỉ đổi mật độ/font | My Tasks cards versus rows/table cùng nhóm hạn; Inbox detail cards versus concise rows có title/summary/time/unread/action; giữ thông tin quyết định/action và mở chi tiết |
| Refresh lặp trên header, filter, panel | Invalidation sau mutation đã xác nhận, refetch khi focus/reconnect nếu stale, giữ draft/filter/cursor/scroll; chỉ giữ retry/readback khi lỗi/uncertain, không tự retry mutation |
| Avatar “[Q” | Nguồn org.name.slice(0,2); helper initials lọc ký tự đặc biệt, giữ chữ/số/dấu Việt, fallback icon; không sửa tên dữ liệu gốc |
| Organization chỉ có tên, thiếu quản trị metadata | Không xây thêm lớp sắp bỏ; đưa metadata cần thiết vào Workspace settings/create |

Workspace create đã chốt: chỉ tên bắt buộc; mục tiêu/mô tả, nhận diện và mời thành viên có bước thiết lập tiếp rõ ràng. Settings đổi tên/mô tả/nhận diện theo quyền. Avatar/banner từ bộ mẫu trước; upload riêng vẫn cần storage contract. Không bắt người lập nhóm đồ án nhập hồ sơ pháp lý doanh nghiệp.

Refresh strategy là thay data fetching, không gọi window reload hoặc polling vô điều kiện. Không tự overwrite draft/form, không thay signed read-all scope/cutoff trong lúc confirm/mutation; quyền mất/401/403/404 phải xử lý rõ. Có pending/generation/account guards và retry/readback riêng cho outcome unknown. SSE/push realtime chưa chốt.

## Tác động BE/dữ liệu cần rehearsal trước migration

- Organization-attached Workspace hiện ownerId/managerId và membership khác standalone. Đề xuất Owner Organization thành Owner Workspace; Manager giữ role Manager; Org Admin và nhân sự còn lại phải lập mapping explicit cho từng Workspace. Không tự cấp membership hoặc quyền nhận Task cho người chỉ từng có quyền quản trị ngầm.
- Chỉ lấy thành viên hiện có quyền; active Workspace membership nhưng Org membership inactive không được tự sống lại. Active Org Ban, Project Guest grants và user exit phải giữ hiệu lực tương đương khi bỏ parent layer.
- Project/Task IDs, task codes, comments/history, deadlines, pins giữ nguyên. Không gom/xóa Workspace chỉ vì cùng Organization.
- Org invitations, notification cũ, email outbox, moderation jobs/audit và route cũ phải có chính sách chuyển/đóng/redact; không gửi queue hoặc phát lại notifications. Không xóa Organization records trước rehearsal/backup/mapping được duyệt.
- Cần thay cả authorization/membership queries, assigned pipeline My Tasks/Calendar, Guest guard, lifecycle/ban, API/FE nav, tests và đặc tả; chỉ ẩn menu không hoàn tất việc bỏ Organization.

## Trình tự

1. Chốt tên UI, ma trận Owner/Manager/Member/Guest và quyền thay thế Lead và quyền mời.
2. Audit inventory/mapping read-only, làm migration rehearsal trên DB tạm; phân loại dữ liệu thật/test, bảo vệ quyền cũ và hồ sơ. Chuẩn bị kết quả reviewable trước khi xin duyệt chạy data migration.
3. Refactor BE theo Workspace-only, kiểm role boundaries/lifecycle/Guest/assignments/history.
4. FE navigation + Workspace metadata, toolbar chung và hai dạng hiển thị thực sự khác nhau.
5. Shared refetch/recovery/draft behavior; nghiệm thu thủ công toàn luồng trước deploy.

M1–M4 có technical tests nhưng user acceptance UX chưa đạt; không dùng các test density cũ để đóng nghiệm thu “hai cách xem”. Tài liệu này mở backlog mới, không nói migration/UX fixes đã triển khai.


User sửa tên role12/10 thành Owner/Manager/Member. [Đặc tả nghiệp vụ chi tiết](WORKSPACE-ONLY-BUSINESS-SPEC-v0.1.md) là tài liệu phân tích chính cho bước chốt tiếp;3quyết định đã chốt: nhiềuManager/Owner+Manager mờiMember/chỉtênrequired, chưa đổi code/data. OrgAdmin nhắc trong migration là role lịch sử, không role đích.

## Phân tích BE/UI tiếp theo

User chốt bỏ Project Lead; xem [contract màn hình và API đề xuất](WORKSPACE-ONLY-BE-UI-CONTRACT-v0.1.md). Chưa đổi schema/API/UI/data; cần review ma trận quyền và rehearsal mapping trước triển khai.
