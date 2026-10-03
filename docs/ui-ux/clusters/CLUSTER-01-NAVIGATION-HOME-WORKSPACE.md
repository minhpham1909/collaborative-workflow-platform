# Cụm 01 — Điều hướng, Home và Workspace Projects

Ngày 03/10/2026. Phân tích theo yêu cầu: đi từ từng cụm màn hình, sau đó mới xác định vấn đề dữ liệu/API. Đây là đề xuất bố cục để review; không phải quyết định layout đã được chủ dự án duyệt. Quyền nghiệp vụ giữ theo SRS. Không triển khai FE hoặc tạo Figma trong bước này.

Nguồn: [screen spec](../SCREEN-SPEC-v0.2.md), [flows](../SCREEN-FLOWS-v0.2.md), [SRS](../../srs/SRS-v0.2.md), response và truy vấn hiện hành trong BE.

## 1. Cụm này giải quyết việc gì?

Người dùng cần nhận biết đang ở cấp cá nhân hay nhóm, tìm Workspace muốn làm việc và mở đúng Project. Vì thế:

- Home là danh sách Workspace của mình.
- Workspace là nơi đọc thông tin nhóm và chọn Project.
- Project mở thẳng vào Board; Task được mở từ Board, My Tasks hoặc Notifications.

My Tasks là lối truy cập công việc xuyên Workspace. Nó nằm trong điều hướng cá nhân, không bị giới hạn theo Workspace đang chọn. Search trên Home chỉ tìm Workspace; search trong Workspace chỉ tìm Project. Không dùng một ô search chung với phạm vi thay đổi ngầm.

## 2. Khung điều hướng chung

### Desktop

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│ Logo / Trang chủ     │ Workspace > Project       Chuông   Tài khoản │
│ Công việc của tôi    ├──────────────────────────────────────────────┤
│ Thông báo            │ Tiêu đề + thông tin ngữ cảnh        CTA chính │
│                      │ Search + bộ lọc theo màn hiện tại            │
│ Workspace hiện tại ▾ │ Nội dung chính                               │
│   Dự án              │                                              │
│   Thành viên         │                                              │
│   Lời mời *          │                                              │
│   Cài đặt nhóm *     │                                              │
│   Email của tôi      │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
* Chỉ Owner nhìn thấy và sử dụng.
```

Sidebar đề xuất rộng 224–256px, có thể thu gọn sau khi thử wireframe. Không liệt kê mọi Project tại sidebar vì danh sách tăng sẽ làm mất lối điều hướng chính. User menu gồm cài đặt cá nhân, ngôn ngữ Việt/English và đăng xuất; không đặt hành động rời/xóa nhóm cạnh đăng xuất.

Khi ở Home hoặc My Tasks, vùng Workspace context không tự chọn nhóm đầu tiên. Khi mở Workspace/Project/Task, context lấy theo đối tượng đang xem. Mở link trực tiếp phải tải và kiểm quyền trước khi dựng tên/breadcrumb; không bắt người dùng về Home rồi chọn lại.

Workspace switcher hiển thị nhóm đang mở và danh sách nhóm có quyền truy cập. Chọn nhóm khác về danh sách Projects của nhóm đó. Có Tải thêm hoặc tìm kiếm toàn tập khi server hỗ trợ; không lọc riêng trang đầu rồi báo không tìm thấy nhóm.

### Mobile

Header giữ nút menu, tên khu vực, chuông và menu tài khoản. Sidebar mở thành drawer; chọn đích xong đóng drawer. Tên dài được rút gọn nhưng trang nội dung vẫn có tên đầy đủ. Card một cột; search và nút Bộ lọc nằm trên danh sách. Bộ lọc mở panel với Áp dụng/Đặt lại và số điều kiện đang bật. Không yêu cầu người dùng vuốt ngang bảng chỉ để mở một Workspace/Project.

## 3. Home — Workspace của bạn

### Nội dung và thứ tự

1. Tiêu đề “Workspace của bạn”, lời chào ngắn tùy chọn; nút Tạo Workspace cho tài khoản đã xác minh.
2. Search “Tìm Workspace theo tên hoặc mô tả”; bộ lọc ngày tạo.
3. Danh sách card, mới tạo trước. Desktop đề xuất 2–3 cột tùy chiều rộng, mobile một cột.
4. Tải thêm khi còn cursor; giữ vị trí đọc khi quay lại từ Workspace.

Card gồm tên, mô tả tối đa hai dòng dưới dạng văn bản thuần trích từ editor, nhãn Owner/Member và hành động Mở Workspace. Không hiển thị số thành viên, tổng Project, tiến độ hoặc hoạt động gần nhất khi chưa có yêu cầu sử dụng rõ ràng và nguồn dữ liệu tương ứng. Không nhúng các nút sửa/xóa vào toàn bộ card Home; quản lý nhóm có đích riêng trong Workspace.

### Tạo Workspace

Dialog desktop/full-screen form mobile: tên bắt buộc, mô tả bằng editor chung, Tạo/Hủy. Hạn độ dài và thông báo validation bám BE, không tự chốt một mức mới trong thiết kế. Trong lúc gửi khóa submit; lỗi giữ nội dung đã nhập. Thành công mở Workspace mới để Owner tạo Project đầu tiên. Nếu timeout, không tự gửi lại thao tác tạo khi chưa có idempotency contract.

### Trạng thái cần thiết

| Trạng thái | Hiển thị và hành động |
|---|---|
| Đang tải lần đầu | Skeleton card, không hiện “chưa có Workspace” |
| Chưa có nhóm | Giải thích tạo nhóm hoặc nhận lời mời; Tạo Workspace và Xem lời mời trong Notifications |
| Không có kết quả lọc | Nhắc phạm vi tìm kiếm; Xóa bộ lọc, giữ ô search |
| Tải lỗi | Thông báo tải thất bại + Thử lại, giữ search/filter |
| Tải thêm lỗi | Giữ các card đã tải, cho thử lại phần tiếp theo |
| Chưa xác minh email | Hướng xác minh; không tải danh sách công việc phía sau gate |

Không đặt ô nhập mã tham gia vì hệ thống dùng invitation EMAIL/LINK. Home không tự tạo Workspace hộ người dùng mới và không có danh sách nhóm công khai.

## 4. Workspace — thông tin nhóm và Projects

### Bố cục

```text
Trang chủ > Workspace
Tên Workspace                       [Owner/Member]
Mô tả nhóm tối đa vài dòng… [Xem thêm]

Dự án                                  [Tạo Project — Owner]
[Active] [Archived] [Tất cả]
[Tìm Project theo tên/mô tả] [Ngày tạo] [Đặt lại]
Số Project phù hợp
[Project card] [Project card] [Project card]
[Tải thêm]
```

Thông tin nhóm đặt phía trên nhưng mô tả dài được thu gọn; Xem thêm hiển thị nội dung rich text chỉ đọc và có Thu gọn. Không luôn mở editor ở màn đọc. Khi chọn bộ lọc, phần mô tả không đẩy danh sách xuống một khoảng quá lớn.

Card Project có tên, mô tả hai dòng và nhãn Active/Archived. Click mở Board, giữ breadcrumb Workspace → Project. Owner có menu Sửa/Lưu trữ đối với Active hoặc Mở lại đối với Archived; Member chỉ mở đọc. Tạo Project đặt một lần ở header, không lặp CTA trên mọi card. Không dùng cả card click và menu con khiến bấm menu vô tình mở Board.

Mặc định hiển thị Active. Archived và Tất cả là lựa chọn chủ động; lưu search/filter vào URL của danh sách để Back và chia sẻ đích không mất ngữ cảnh. Dữ liệu đã tải, cursor và scroll giữ trong cache của lần điều hướng, không đưa toàn bộ vào URL.

### Project đầu tiên và kết quả trống

- Owner chưa có Project: “Tạo Project đầu tiên để bắt đầu phân công công việc” + Tạo Project.
- Member chưa có Project: giải thích Owner sẽ tạo Project; không đưa nút tạo chắc chắn bị từ chối.
- Active trống nhưng có Archived: cho chuyển sang Archived; không khẳng định Workspace hoàn toàn chưa có Project dựa trên riêng bộ lọc Active.
- Search/filter không có kết quả: Xóa bộ lọc; không biến thành onboarding tạo Project đầu tiên.

Tạo Project dùng form tên + mô tả editor chung, tạo trong Workspace đang mở; không có dropdown Workspace thừa. Thành công đề xuất mở Board mới để tạo Task. Form sửa cũng dùng cùng trường, nhưng lưu version và giữ nội dung khi conflict; cách giải quyết conflict được phân tích sâu ở cụm Board/Task.

Announcements do Owner đăng/ghim là capability đã ghi nhận, nhưng phase riêng chưa đủ contract. Storage/resources tiếp tục Upcoming. Không dựng khối dữ liệu giả ở trang này; khi triển khai announcements sẽ review vị trí giữa thông tin nhóm và Projects để tránh đẩy công việc xuống quá xa.

## 5. Luồng và thay đổi quyền

| Tình huống | Luồng đề xuất |
|---|---|
| Đã xác minh, chưa có Workspace | Home → Tạo Workspace → Workspace Projects → Tạo Project → Board |
| Đã có nhiều Workspace | Home/switcher → Workspace Projects → Board → Task |
| Mở Task từ My Tasks/Notifications | Tải Task và context theo quyền hiện tại → mở đúng Workspace/Project, giữ đường quay lại nguồn |
| Workspace không còn truy cập được | Màn không khả dụng, gỡ context/cache dữ liệu nhóm, CTA về Home; không tiết lộ dữ liệu cũ |
| Owner vừa chuyển quyền | Tải lại vai trò; đóng form quản lý không còn quyền, cập nhật navigation và actions |
| Phiên hết hạn | Xử lý refresh theo auth contract; nếu không khôi phục được, Login và giữ đích hợp lệ |

Các hành động của FE là chỉ dẫn sử dụng. BE vẫn quyết định quyền mỗi request; ẩn nút không thay thế kiểm quyền. Danh sách riêng người dùng và Workspace cache phải tách theo user/context, xóa khi logout/đổi tài khoản/mất membership.

## 6. Từ màn hình suy ra nhu cầu dữ liệu/API

| Nhu cầu giao diện | Hiện trạng BE | Kết luận cho cụm 01 |
|---|---|---|
| Tên/avatar bản thân, ngôn ngữ | User response đã có | Đủ cho user menu; locale null vẫn cần quy tắc mặc định chung |
| Card Workspace: tên, mô tả, role | Workspace response đã có, list cursor | Đủ cho nội dung card; không cần thêm count chỉ để trang trí |
| Workspace detail và role hiện tại | Có get Workspace, membership guard | Đủ context, vẫn phải xử lý quyền thay đổi |
| Project cards, lifecycle, tổng kết quả | Có list Project theo state + total + cursor | Đủ Active/Archived/All; total phải phản ánh toàn bộ điều kiện khi bổ sung filter |
| Tạo/sửa Workspace và Project | APIs có, quyền/CAS hiện hành | Không cần endpoint mới cho mỗi dialog |
| Search động và ngày tạo ở cả hai danh sách | List Workspace/Project chưa có query tương ứng | Cần mở rộng truy vấn trước khi nối các control này vào FE |
| Switcher tìm Workspace ngoài trang đã tải | Chưa có server search | Dùng cùng truy vấn Workspace; không tạo “search toàn bộ” giả ở client |

Search/ngày tạo là yêu cầu người dùng đã đưa ra, không bỏ vì BE hiện chưa có. Đề xuất contract UX: search tên/mô tả thuần, debounce khoảng 300ms; query đổi thì reset cursor, bỏ qua response cũ; ngày tạo có preset và từ/đến, hiển thị múi giờ Việt Nam. Ngày cuối chuyển thành khoảng kết thúc loại trừ lúc bắt đầu ngày kế tiếp để không mất bản ghi cuối ngày. Search/filter thực hiện trên toàn bộ dữ liệu được phép xem; giữ sort createdAt giảm dần và id làm tie-breaker. Search chờ debounce vẫn có thể submit ngay bằng Enter.

Thông tin lịch sử người tạo/assignee, providers/password của tài khoản và member picker không cản việc review cụm này; xử lý khi phân tích màn thực sự dùng chúng. Badge chuông/unread count thuộc cụm Notifications, không tự quy định cách tính ở đây.

## 7. Đầu ra trước Figma và thứ tự tiếp theo

Cụm 01 cần wireframe Home có dữ liệu/trống/lỗi; Workspace Projects cho Owner/Member/Archived/no-results; drawer mobile; Workspace switcher; hai form tạo. Dùng tên/mô tả tiếng Việt và English đủ dài để kiểm wrap, thao tác bàn phím và focus trả về sau đóng dialog. Chưa chốt màu, font hoặc pixel.

Review tiếp theo: (02) Board/My Tasks/Task Detail/Comments; (03) Members/Invitations/quản lý Workspace; (04) Login/Register/Google/verification/recovery; (05) Personal Settings; (06) Notifications; (07) public/policies và announcements phase riêng. Thứ tự review này phục vụ phân tích, không phải thứ tự buộc người dùng đi qua sản phẩm.
