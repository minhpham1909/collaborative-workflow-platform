# Home highlights, footer, icons và compact filters

Ngày 04/10/2026, bổ sung theo ảnh/chỉ dẫn trực tiếp của chủ dự án, dựa trên [Stitch đã chọn](stitch-import-2026-10-04/README.md).

## Thiết kế và nghiệp vụ

- Footer chung ở shell đăng nhập, cuối nội dung hoặc đáy viewport; copyright năm hiện tại, tagline và các liên kết Home/My Tasks/Settings có thật.
- Hero Home hiển thị ngày Việt Nam, số Task chưa Done được giao cho user và đến hạn trong ngày, cùng số Workspace chứa các Task đó. Phạm vi chỉ membership hiện hành và Project Active. Task không deadline, Task Done hoặc Project Archived không nằm trong số ưu tiên; việc quá hạn được đếm riêng, có thể trùng với việc đến hạn hôm nay, không cộng hai số thành tổng.
- Khối ưu tiên hiện tối đa ba Task từ query mới tạo trước, link trực tiếp Task, Workspace và giờ hạn; số tổng độc lập với pagination. Link Xem công việc mở My Tasks với bộ lọc hiện hành của màn đó, không giả vờ đã áp filter ngày. Đây là gợi ý theo hạn, không phải field priority mới hay reminder scheduler.
- Khối thông báo hiển thị số chưa đọc và thông báo chưa đọc gần nhất, link detail/inbox. Tôn trọng available/masking của API; không dùng payload bị che. Loading/lỗi không biến thành số 0. Tổng quan refresh khi trở lại tab, inbox thay đổi, Home Làm mới và ngày VN đổi; không khẳng định đồng bộ realtime.
- Card Workspace có memberCount (active membership, gồm Owner) và activeProjectCount. Backend aggregate theo các Workspace trong trang đã lọc quyền; không fetch N+1 từng card hay lấy số từ trang thành viên đầu tiên.
- Icon Project là metadata visual do Owner chọn: folder/palette/code/megaphone/layers/document. FE hiện lựa chọn có label và aria-pressed khi tạo/đổi tên; BE validate enum, lưu với CAS/Owner/Active guards. Project cũ không có icon hiển thị folder; không cần migration phá dữ liệu. Icon không cấp quyền hay mở Project Membership mới.
- Home, Workspace, Board/My Tasks, Team và Notifications dùng compact filters: search + select đầu tiên + actions luôn thấy; ngày và các điều kiện phụ mở bằng Bộ lọc. Có aria-expanded/controls, badge điều kiện phụ đang dùng, đóng không reset; Xóa bộ lọc giữ reset semantics từng màn. Tất cả vẫn gửi query server/debounce và sort cố định; không thêm dropdown sort giả.

## Bổ sung contracts

- GET /workspaces: mỗi item thêm memberCount và activeProjectCount, tính trong transaction xác thực/membership hiện hành. Không lộ Workspace đã rời.
- Project model/POST/PATCH/DTO: icon enum optional khi ghi, default folder; expectedVersion vẫn bắt buộc PATCH, validation unknown fields giữ nguyên.
- GET /my-tasks: thêm workspaceCount = distinct workspaceId trên toàn tập khớp query trước cursor/limit. Total vẫn là số Task khớp query.

## QA

Build và 12 FE unit tests đạt. BE regression mới kiểm icon invalid/member forbidden/CAS, aggregate membership/lifecycle và count đủ scope qua ngày VN/cursor. Full integration runner kiểm tất cả suites; kết quả tại NEXT-STEPS.

Fixture React/Express/Mongo riêng kiểm Home có hai Task ở hai Workspace, thông báo thật trong fixture, số thành viên/Dự án, filter đóng/mở/apply/reset, icon tạo/edit/reload; không overflow ở 1440/1280/390. Đã xem screenshot desktop và kiểm responsive. Các fixtures Home/Workspace/Board/My Tasks/Team/Notifications và fault-injection create đều đạt. Không chạy mail worker thật, không gửi hàng đợi cũ; Google live chưa được kiểm lại trong lượt UI này.

Screenshots/harness lượt này nằm trong .local (ignored); dữ liệu kiểm thử tách khỏi dev.
