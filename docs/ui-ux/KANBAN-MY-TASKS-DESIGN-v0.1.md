# Phân tích thiết kế Kanban và My Tasks v0.1

Ngày: 01/10/2026. Trạng thái: quyền Task, ba status/chuyển trực tiếp và thứ tự card Kanban đã chốt; My Tasks cùng sort mới tạo trước đã chốt, bố cục danh sách do assistant chọn theo yêu cầu xem xét. Eligibility/default/filter OD-05 còn là baseline đề xuất; chưa có ứng dụng chạy được. Tải thêm/pagination và conflict OD-06 review riêng.

## 1 Hai mục đích khác nhau

| Màn hình | Câu hỏi cần trả lời | Phạm vi dữ liệu |
|---|---|---|
| Project Kanban | Nhóm đang làm gì và Task ở trạng thái nào? | Task của một Project mà User có quyền xem, gồm cả Task chưa có assignee |
| My Tasks | Công việc nào đang được giao cho tôi và cần xử lý? | Task có assignee là User ở tất cả Workspace còn membership, không gồm Task chỉ do User tạo |

Task là cùng một nguồn dữ liệu. Chuyển status từ Task Detail làm đổi cột Board và có thể làm Task mất khỏi filter My Tasks. Không sao chép Task thành dữ liệu riêng cho mỗi màn hình.

## 2 Kanban — vấn đề và lựa chọn

| Vấn đề | Phương án đề xuất | Lý do/tác động |
|---|---|---|
| Có cần tùy biến workflow? | Đã duyệt: cố định Chưa làm / Đang làm / Hoàn thành | Phù hợp scope nhóm nhỏ; không thêm cấu hình status/cột |
| Có bắt buộc qua từng bước? | Đã duyệt: chuyển trực tiếp giữa mọi trạng thái | Task nhập sau khi đã làm xong có thể chuyển sang Done; reopen không bị ép lộ trình |
| Ai được đổi status? | Owner, Task Creator hoặc Assignee hiện tại còn membership, Project Active | Đã được chủ dự án chốt; Assignee chỉ đổi status nếu không đồng thời là Owner/Creator |
| Done có khóa Task? | Không; vẫn sửa/reopen theo quyền khi Project Active | Done là trạng thái công việc, Archived mới là chế độ chỉ đọc của Project |
| Task thiếu assignee/deadline có bị chặn hoàn thành? | Không | Cả hai là tùy chọn theo SRS; Done không tạo yêu cầu mới bắt buộc |
| Kéo thả thay đổi gì? | Kéo sang cột khác đổi status; không hỗ trợ kéo để xếp lại trong cùng cột | Tránh hứa lưu vị trí card khi chưa có dữ liệu thứ tự |
| Sắp card nếu không lưu vị trí? | Đã duyệt: thời gian tạo mới nhất trước trong mỗi cột, không sắp thủ công | Sửa/chuyển status không đổi thời gian sắp xếp; tải lại vẫn có thứ tự ổn định |
| Nhiều Task có bị ẩn vì phân trang? | Mỗi cột có tổng số và nút Tải thêm riêng | Không để người dùng nhầm số card đã tải là toàn bộ công việc; kích thước trang chốt trong NFR/SDS |
| Ngoài kéo thả có thao tác nào? | Chọn status trong Task Detail; hỗ trợ bàn phím | Cùng rule/backend, dùng được trên mobile và không phụ thuộc drag |

### Nội dung màn hình đề xuất

Header: Workspace → Project; tên Project, nhãn Active/Archived và nút Tạo Task khi có quyền. Bên dưới là ba cột có tên, tổng số Task tại lần tải gần nhất, card và Tải thêm nếu còn dữ liệu. Board hẹp cuộn ngang có chủ đích.

Card: title, assignee hoặc Chưa phân công, deadline giờ Việt Nam nếu có, nhãn Quá hạn nếu áp dụng. Không đưa toàn bộ description/comments lên card. Chọn card mở Task Detail. Task Done không có nhãn Quá hạn dù deadline cũ đã qua.

Khi đổi cột: hiển thị trạng thái đang lưu; chỉ coi đổi status thành công khi backend chấp nhận. Lỗi quyền/Archived/task đã xóa phải tải lại dữ liệu phù hợp; không hiển thị card đã chuyển thành công giả. Hành vi stale edits chờ OD-06.

Project Archived hiển thị nhãn và chỉ đọc; Owner có lối mở lại Project. Cleanup assignee do leave/remove vẫn có thể thay đổi card trong Archived theo OD-01, dù người dùng không được kéo/sửa.

### Tình huống nghiệm thu đề xuất

- Todo → Done và Done → Todo trực tiếp được phép; reopen áp dụng assignee/deadline đã duyệt.
- Member khác không đổi status chỉ từ membership; Owner/Creator/Assignee thao tác theo quyền đã chốt tại TASK-COMMENT-PERMISSIONS.md.
- Đổi từ Board hoặc Task Detail cho cùng status; không tạo Task/Board copy.
- Task không deadline/assignee vẫn có thể Done; không phát sinh validation mới.
- Không kéo đổi status trong Archived; request thủ công cũng bị từ chối.
- Tải thêm từng cột không lặp/bỏ card trong cùng trạng thái dữ liệu; tổng số phân biệt số đang hiển thị. Thiết kế cursor/tính nhất quán thuộc SDS.

## 3 My Tasks — vấn đề và lựa chọn

| Vấn đề | Phương án đề xuất | Lý do/tác động |
|---|---|---|
| Creator có đủ để vào My Tasks? | Không, phải là assignee hiện tại | Màn hình tập trung việc được giao; Task tôi tạo cho người khác xem ở Board |
| Dùng Board hay danh sách? | Đã chọn theo yêu cầu giao assistant xem xét: danh sách phẳng có Workspace → Project ở từng dòng | Giữ thứ tự thời gian toàn danh sách và nhìn rõ nguồn công việc; không tự gom nhóm làm đổi thứ tự |
| Mặc định có Done/Archived? | Chỉ Active và chưa Done | Tập trung công việc còn cần xử lý |
| Có mất khả năng tìm Task Done/Archived? | Có filter để xem từng trạng thái hoặc tất cả; Archived có nhãn chỉ đọc | Tránh biến mặc định ẩn thành dữ liệu không thể truy cập |
| Sắp công việc thế nào? | Đã chốt: thời gian tạo mới nhất trước giống Kanban, không sắp thủ công | Deadline vẫn hiển thị và lọc quá hạn được, nhưng không tự thay đổi thứ tự; sửa/status change không đưa Task cũ lên đầu |
| Filter gồm gì? | Workspace, status, quá hạn và Active/Archived/Tất cả; thêm search động và thời gian theo yêu cầu mới | Quy tắc search/Ngày tạo/Deadline dùng chung Kanban tại TASK-SEARCH-TIME-FILTERS.md |
| Có chỉnh nhanh tại dòng? | Bản đầu chọn dòng mở Task Detail để sửa | Dùng cùng validation/quyền; không mở thêm luồng cập nhật riêng |
| Rời rồi tái gia nhập có phục hồi danh sách cũ? | Không phục hồi assignee đã bỏ; Done giữ assignee có thể xuất hiện khi bật filter phù hợp | Kế thừa OD-01 và membership hiện tại |

### Nội dung màn hình đề xuất

Header My Tasks; bộ lọc hiển thị rõ giá trị mặc định: Tất cả Workspace đang tham gia / Chưa hoàn thành / Active / Không giới hạn quá hạn. Status filter có Chưa hoàn thành, từng status và Tất cả. Nút Về mặc định đặt lại các giá trị này.

Một dòng gồm title nổi bật; Workspace → Project ở dòng phụ; status và deadline hoặc Không có hạn ở vùng bên phải; nhãn Quá hạn/Archived nếu áp dụng. Không lặp assignee/avatar vì mọi Task trong màn hình được giao cho chính User. Thời gian tạo là thông tin phụ để giải thích thứ tự. Header hiển thị “Mới tạo trước”, nhất quán với Kanban; không thêm sort deadline riêng mặc định.

Danh sách giữ thứ tự toàn bộ kết quả, không gom nhóm Workspace/Project ở mặc định vì sẽ phá thứ tự thời gian chung. Chọn Workspace để thu hẹp phạm vi mà giữ cùng sort. Desktop dùng các dòng dễ quét; mobile reflow mỗi dòng thành thẻ gọn với title → breadcrumb → status/deadline, không tạo bảng cuộn ngang. Danh sách phân trang có tổng số theo filter; kích thước trang chốt NFR/SDS.

Các filter kết hợp đồng thời. Chọn Archived không âm thầm đổi status filter: nếu vẫn Chưa hoàn thành thì chỉ xem Task Archived chưa Done. Muốn xem toàn bộ, chọn status=Tất cả và vòng đời=Tất cả; giá trị filter luôn nhìn thấy được.

Nếu chọn status=Done đồng thời Quá hạn, kết quả rỗng vì Done không overdue. Hiển thị giải thích bộ lọc không có kết quả và gợi ý điều chỉnh; không tự đổi filter hoặc tạo cách tính overdue khác.

### Tác động dễ bị hiểu nhầm

Ví dụ: Task X đang nằm trong My Tasks mặc định. User mở X và chuyển Done thành công: quay lại danh sách, X không còn vì filter Chưa hoàn thành. Hiển thị kết quả lưu rõ ràng; User chọn Done/Tất cả để xem lại. Đây không phải xóa Task.

Task bị giao sang người khác thì không còn trong My Tasks dù User vẫn là Creator. Khi User rời Workspace, mọi Task của Workspace đó bị loại khỏi truy vấn, kể cả Done còn giữ assignee lịch sử. Nếu target mất quyền sau khi danh sách đã tải, kiểm tra lại khi mở Task, không cấp quyền từ dữ liệu đã tải trước đó.

### Tình huống nghiệm thu đề xuất

- Task tôi tạo cho người khác không xuất hiện; Task người khác tạo giao cho tôi xuất hiện nếu còn quyền.
- Default chỉ Active/chưa Done; filter cho phép xem Done và Archived với nhãn đúng.
- Done/không deadline không overdue; Archived chưa Done có hạn qua vẫn overdue theo OD-03.
- My Tasks và từng cột Kanban cùng quy tắc thời gian tạo mới nhất trước; filter không đổi sort, deadline không ảnh hưởng vị trí; sửa/chuyển status không làm Task cũ lên đầu; cùng thời gian có khóa phụ ổn định chốt SDS.
- Không có Task được giao khác với không có kết quả theo filter; có hành động phù hợp cho mỗi trạng thái.
- Khi status/assignee/membership thay đổi, tải lại phản ánh đúng truy vấn; không tạo notification hoặc thay dữ liệu chỉ vì mở My Tasks.

## 4 Phạm vi cần chốt

Yêu cầu mới: cả hai màn hình có search động và bộ lọc thời gian; đặc tả dùng chung tại [TASK-SEARCH-TIME-FILTERS.md](TASK-SEARCH-TIME-FILTERS.md). Không coi việc yêu cầu năng lực này là duyệt mặc định My Tasks hoặc tính năng ngoài hai màn hình này.

Chủ dự án duyệt hoặc sửa riêng từng nhóm: (1) status/chuyển trực tiếp, quyền theo SRS, thao tác và thứ tự/tải thêm Board; (2) eligibility/default/filter/dạng danh sách/thứ tự My Tasks. Sau câu trả lời mới đồng bộ SRS/JSON/AC và đóng OD-04/05.

OD-06 conflict vẫn tách riêng. Thông số phân trang, tên API/status nội bộ, component layout cuối cùng và cơ chế lưu không tự trở thành thiết kế kỹ thuật đã duyệt từ tài liệu này.
