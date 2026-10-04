# Rà soát và tối ưu giao diện bằng ui-ux

Yêu cầu trực tiếp: kiểm tra và sửa ngay trên màn hiện có, bỏ bước wireframe. Giữ nền visual Stitch, Plus Jakarta Sans, kem/tím và các màu trạng thái. Không thay API hoặc quyền nghiệp vụ. Đây là increment giao diện được chủ dự án yêu cầu thêm; không đóng gate P1 khi NAV-01 còn mở.

## Phạm vi và kết quả

React 19/JSX, Vite, CSS riêng; tái sử dụng Avatar, Icon, FilterPanel, RichEditor và dialog hiện có. Tín hiệu gradient, blur và shadow xuất hiện trong hai file CSS; dự án chưa có dark mode bật được. Không cài thêm thư viện giao diện.

| Màn / thành phần | Vấn đề quan sát | Đã sửa | Bằng chứng |
|---|---|---|---|
| Home | Hero chiếm nhiều chiều cao, tiêu đề quá lớn ở màn vừa | Giảm padding và cỡ chữ, giữ lời chào/ngày/CTA | Ảnh fixture 1440/375 |
| Workspace | Mô tả dài đẩy Projects xuống sâu | Preview hai dòng, nút đọc toàn bộ/thu gọn; mô tả ngắn vẫn hiện rich text | Component dùng chung, ảnh và kiểm Board |
| Project/Board | Nhãn và lời giới thiệu lặp, ngày tạo chiếm hàng riêng | Bỏ copy lặp, ngày cạnh trạng thái; khoảng cách gọn hơn | Ảnh fixture |
| Project/Task cards | Phải bấm tên hoặc CTA | Link phủ vùng thẻ; CTA Project vẫn có link riêng, giữ Tab/focus | Bấm góc thẻ qua React/API/DB |
| Các danh sách | Nhãn sort giống control bấm được; vùng lọc thiếu đồng bộ | Sort có nhãn rõ, control đều nhịp, checkbox và focus nhất quán | Probe và ảnh |
| Bộ lọc mobile | Ô tìm kiếm có thể bị co nhỏ dù không overflow toàn trang | Sửa specificity CSS, field chiếm nguyên hàng | Assertion ô tìm rộng ít nhất 250px ở 375px |
| Cài đặt | Màu tím nút lưu/công tắc khác hệ; hero nặng | Dùng cùng token tím, header gọn, giới hạn chiều rộng form | Settings regression, ảnh |
| Avatar/footer | Chữ nhỏ chưa đủ tương phản trên nền màu | Chữ avatar đậm hơn, footer mark dùng tím chính | Probe trước/sau |
| Project Archived | Badge vẫn dùng xanh đang hoạt động | Badge trung tính và chữ chỉ đọc | Code; luồng archived regression |

Dáng: nút/input/checkbox theo nhịp của skill, mô tả dài có preview và hành động đọc tiếp, card dùng link thật. Giữ focus bàn phím theo yêu cầu accessibility trước đó của chủ dự án. Giữ pill và màu phân vai của hệ hiện có; không đổi sang một hệ xám khác. Select/ngày vẫn dùng control native có styling; picker chuyên dụng chưa triển khai trong increment này.

## Kiểm tra

- `FE/scripts/check-screen-layout.mjs`: API/Mongo/browser cô lập, bấm toàn thẻ Project/Task, mở/thu gọn mô tả và đọc đoạn cuối; Home/Workspace/Board/Task/My Tasks/Settings ở 1440 và 375px. Không tràn ngang, ô tìm kiếm dùng được, không có `pageerror`.
- `FE/scripts/check-interaction-flows.mjs`: regression tạo/sửa, CAS giữ draft, quyền bình luận/assignee, archive, pagination và soft delete đạt sau thay đổi component mô tả/link thẻ.
- Build FE và 12 FE tests đạt. Settings fixture chạy lại cho profile/preferences/password/Google giả lập; không gửi email hoặc gọi Google thật.
- Đã chạy script `probe.mjs` của skill trên Board có phiên fixture ở 375/1440px. Bản sao local chỉ bổ sung Edge, đăng nhập fixture riêng cho mỗi context và route đến API cô lập; không sửa phép đo của skill. Lần đầu tái sử dụng refresh cookie khiến context thứ hai mất phiên; đã bỏ cách đó và đo lại trên Board thật ở cả hai khổ.
- Đã xem ảnh render thực tế. Ảnh và raw report nằm `.local/design-review/`, không đưa fixture credentials/storage state hoặc ảnh tài khoản thật lên Git.

Đối chiếu probe cuối: **1 mã Hỏng**, **0 bỏ sót**. P1 tại 375px là header chuyển sang hai hàng: logo/avatar trên, điều hướng dưới. Đã xem ảnh; đây là bố cục responsive có chủ đích, không che nội dung/CTA hoặc tràn ngang nên loại khỏi lỗi. Các mã tương phản avatar/footer và nút Project rớt riêng một hàng ở lần đầu đã được sửa và không còn trong lần đo cuối.

Các gợi ý khác của probe: viền kem so với ngưỡng xám mặc định và một số control pill khác hình là khác biệt nhận diện, không tự coi là lỗi. Probe coi cả cột Kanban là một mục danh sách nhiều dòng; cấu trúc này không phải danh sách master/detail. Focus outline giữ theo yêu cầu đã có. Ô ngày native, nhãn tài khoản 10px và cảnh báo React khi probe mở nội dung editor còn cần xem tiếp; không gọi kết quả này là “mọi cảnh báo đã hết”. Chưa xác định nguồn cảnh báo lifecycle của React trong lượt này.

## Còn mở

Tại mốc review visual này NAV-01 vẫn chặn P1. Increment tiếp theo đã [sửa và kiểm điều hướng](FE-DRAFT-NAVIGATION-CHECK.md), đóng gate audit P1 trong phạm vi ghi nhận. Cần tiếp tục rà picker, lỗi cạnh field, dialog labels, các trạng thái của Team/Invites/Auth/Inbox, trang khôi phục và English UI. Chưa nghiệm thu toàn hệ thống hoặc Google/SMTP thật. Không chạy worker hay gửi hàng đợi email cũ.
