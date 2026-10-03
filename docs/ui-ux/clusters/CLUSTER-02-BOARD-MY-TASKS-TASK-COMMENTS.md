# Cụm 02 — Board, My Tasks, Task Detail và Comments

Ngày 03/10/2026. Tiếp tục phân tích khi chủ dự án đang dùng điện thoại, không yêu cầu xác nhận ngay. Layout là đề xuất review; không tự chốt thêm nghiệp vụ hoặc triển khai FE/Figma. Nguồn hiện hành: [SRS](../../srs/SRS-v0.2.md), [screen spec](../SCREEN-SPEC-v0.2.md), [search/time](../TASK-SEARCH-TIME-FILTERS.md), [editor](../CONTENT-EDITOR-v0.1.md) và BE/src/work.

## 1. Vai trò của từng màn

Board trả lời “Project đang có những việc gì, ở trạng thái nào?”. My Tasks trả lời “Tôi đang được giao những việc gì trong các nhóm?”. Task Detail trả lời “Việc này cần làm gì và tôi được thao tác gì?”. Comments là trao đổi gắn với chính Task đó, không phải một màn độc lập.

Cùng một Task, một route chi tiết và một bộ form sửa. Không tạo bản dữ liệu riêng cho My Tasks. Đổi status, assignee hoặc membership có thể làm Task biến mất khỏi kết quả lọc, nhưng không có nghĩa Task đã bị xóa.

## 2. Board của Project

### Thứ tự nội dung

1. Breadcrumb Workspace → Project; tên Project, nhãn Active/Archived và nút xem mô tả.
2. Tạo Task khi có quyền theo baseline BE; Owner có menu quản lý Project.
3. Search title/description, trạng thái, quá hạn, ngày tạo/deadline; tóm tắt điều kiện đang áp dụng.
4. Ba cột cố định: Chưa làm, Đang làm, Hoàn thành. Mỗi cột có tổng kết quả và Tải thêm riêng.

```text
Workspace > Project                       [Tạo Task]
[Tìm Task…] [Trạng thái] [Quá hạn] [Thời gian]
Chưa làm (12)       Đang làm (5)       Hoàn thành (18)
[Task card]         [Task card]        [Task card]
[Tải thêm]                            [Tải thêm]
```

Card gồm title nổi bật, tên/avatar assignee hoặc Chưa phân công, deadline theo giờ Việt Nam và nhãn Quá hạn nếu áp dụng. Không đưa toàn bộ mô tả, Comment hoặc menu sửa đầy đủ lên card. Ngày tạo là thông tin phụ; sort mới tạo trước trong từng cột không đổi sau khi sửa hoặc chuyển status.

Đề xuất bản FE đầu: mở Task để sửa; có menu đổi status nhanh theo quyền. Drag desktop có thể bổ sung sau khi luồng lưu/lỗi ổn, chỉ chuyển cột, không sắp vị trí trong cột. Không cần drag để hoàn thành thao tác hoặc sử dụng bằng bàn phím.

Mobile đề xuất tab Chưa làm / Đang làm / Hoàn thành với count; một danh sách dọc theo tab đang chọn. Filter status và tab phải đồng bộ, không để tab Đang làm nhưng truy vấn chỉ Todo. Status=open trên desktop giữ hai cột open và cột Done bị loại có giải thích; mobile chỉ cho chọn các tab phù hợp. Đây là hành vi UX cần kiểm ở wireframe, chưa là thay đổi business rule.

Project Archived: banner chỉ đọc, vẫn đọc/search/filter Task; không tạo, sửa, xóa, gửi Comment hoặc đổi status. Owner có Mở lại Project. Không nhầm Task Done với Project Archived: Done vẫn được sửa theo quyền khi Project Active.

### Khi thao tác hoặc tải lỗi

Đang tải có skeleton; empty Project khác no-results. Khi chuyển status, khóa thao tác đang gửi trên Task đó, chỉ báo đã lưu sau response thành công. Task xuất hiện ở cột mới theo thời gian tạo, có thể không nằm trong phần đã tải; thông báo thành công và refresh các cột bị ảnh hưởng, không ép card lên đầu. Không giả các page là snapshot bất biến khi nhiều người đang sửa.

Tải thêm một cột dùng cursor của chính cột đó qua status query; không append dữ liệu của hai cột khác trong response cùng cursor. Có thể dùng endpoint list Task theo status cho lần tải thêm. Search/filter đổi reset tất cả cursor. Deduplicate theo Task ID; refresh sau mutation, tập kết quả và count chỉ phản ánh lần tải gần nhất, chưa hứa realtime.

## 3. My Tasks

Desktop dùng danh sách phẳng, mobile dùng card. Nội dung mỗi dòng: title → Workspace/Project → status/deadline, nhãn Archived/Quá hạn khi có, ngày tạo phụ. Không lặp avatar bản thân ở mọi dòng.

Defaults hiện hành: Task assigned-to-me, Workspace còn membership, Project Active và chưa Done. Task do mình tạo nhưng giao người khác không vào My Tasks. Search/bộ lọc ngày và sort dùng cùng quy tắc Board; thêm Workspace và Active/Archived/Tất cả. Không gom nhóm theo Workspace làm thay đổi thứ tự mới tạo trước toàn danh sách.

Không đặt Tạo Task chung trên màn này vì chưa xác định Project đích. Người dùng tới Board để tạo. Bấm dòng mở cùng Task Detail và giữ filter/scroll khi quay lại.

Ví dụ: chuyển Task sang Done khi đang lọc Chưa hoàn thành → báo “Đã chuyển sang Hoàn thành” → Task rời danh sách → có lối xem Done. Giao sang người khác cũng có thể rời danh sách; giải thích bằng kết quả thao tác thay vì báo lỗi. Không có việc phù hợp defaults khác với chưa từng được giao việc; tránh khẳng định toàn tài khoản không có Task từ một truy vấn lọc.

## 4. Task Detail và form tạo/sửa

Desktop mở từ danh sách dùng panel phải, có Mở toàn trang. Mobile và link trực tiếp dùng trang chi tiết. Close/Back trở về nguồn Board/My Tasks/Notifications; link trực tiếp có lối về Project sau khi xác thực context. Không tải toàn Board chỉ để mở một Task.

Thứ tự đọc: breadcrumb và status → title → description → người được giao/deadline → người tạo/ngày tạo/ngày sửa → Comments. Toàn trang desktop có thể đưa metadata sang cột phải; mobile giữ dòng metadata gọn, không buộc đi qua nhiều thông tin phụ trước nội dung chính.

| Quan hệ trong Workspace hiện tại, Project Active | Thao tác |
|---|---|
| Owner hoặc Task Creator | Nội dung, phân công, deadline, status, xóa |
| Chỉ là Assignee | Chỉ status; metadata/nội dung chỉ đọc |
| Member khác | Đọc Task; thêm Comment theo baseline BE hiện có |
| Project Archived | Tất cả thao tác ghi Task/Comment bị khóa |

Quyền tạo Task/thêm Comment đang được BE triển khai cho Member Active; các đoạn SRS cũ vẫn gọi là baseline. Phân tích layout này không tự chuyển baseline thành quyết định đã duyệt. Quyền sửa/xóa/status đã chốt được giữ nguyên. FE dùng permissions từ response để dựng controls, BE vẫn kiểm mỗi request.

Tạo Task: title bắt buộc; description editor chung, assignee và deadline tùy chọn. Theo contract tạo hiện tại, status ban đầu là Todo; không dựng dropdown tạo trực tiếp Done rồi âm thầm gọi hai mutations. Sửa nội dung dùng cùng trường và Save/Cancel; status là thao tác riêng, tránh gửi kèm form nội dung qua endpoint không hỗ trợ.

Title hiện giới hạn 300 UTF-16 code units; description tối đa 10.000 ký tự hiển thị theo grapheme, Comment 5.000. Bộ đếm description/Comment phải khớp cách đếm BE, phân biệt số từ và giới hạn ký tự. Đây là guardrail hiện hành, không tự chốt product limits dài hạn. Editor có heading 1–3, paragraph, lists, quote, bold/italic/underline/strike/code, hyperlink và emoji bằng Unicode; không thêm upload, bảng hoặc shapes chưa được hỗ trợ.

Deadline nhập ngày và giờ tới phút; nhãn rõ Giờ Việt Nam, chuyển UTC khi gửi. Hạn quá khứ được lưu với cảnh báo; Done không overdue. Reopen có thể trở lại overdue và bỏ assignee đã rời theo response BE; không giữ người cũ bằng dữ liệu form stale.

Assignee picker chỉ chọn thành viên hiện tại, có Chưa phân công. Task Done giữ assignee đã rời hiển thị tên + nhãn Đã rời; không đưa người đã rời thành lựa chọn mới trong picker. Khi sửa trường khác mà không đổi assignee, gửi patch các trường thay đổi để tránh xác nhận lại assignee đã rời như một phân công mới. Khi tái gia nhập, nhãn dựa membership hiện tại theo nghiệp vụ đã chốt.

## 5. Comments trong Task

Composer riêng, editor cùng schema nhưng toolbar gọn; Enter xuống dòng, nút Gửi rõ ràng, không thêm shortcut gửi mà chưa xử lý bộ gõ tiếng Việt. Nhập mới và sửa Comment không nhập chung form Task.

Hiển thị mới nhất trước theo API hiện hành, Tải bình luận cũ hơn ở dưới; không đảo từng trang rồi ghép thành thứ tự giả. Mỗi Comment có author/avatar, thời gian và nhãn Đã chỉnh sửa khi updatedAt khác createdAt. Chỉ Author thấy Sửa/Xóa; Owner không có quyền xóa Comment của người khác. Delete có xác nhận, không đặt thành nút dễ bấm nhầm cạnh Gửi.

Gửi/sửa giữ nội dung nếu mạng lỗi; ngăn submit lặp. Timeout tạo Comment không tự retry khi chưa có idempotency, vì có thể đã được lưu. Sau thành công refresh/merge theo ID để tránh duplicate, cập nhật count; không hứa email đã tới inbox chỉ vì Comment lưu thành công.

## 6. Conflict, mất quyền và nội dung chưa lưu

expectedVersion hiện có cho sửa/status/xóa. Nếu người khác lưu trước, hiển thị conflict và giữ nội dung đang nhập trong tab để sao chép; tải bản mới có cảnh báo sẽ thay nội dung form. Không lấy version mới rồi tự gửi lại bản cũ, không auto-merge. Đổi status khi form Task đang dirty cần xử lý tuần tự hoặc tạm khóa để không gây conflict với chính mình.

Đóng panel/rời route khi dirty có nhắc bỏ thay đổi; browser navigation dùng cơ chế phù hợp. Chưa cam kết draft phục hồi sau đóng tab/thiết bị khác; không lưu nội dung công việc vào localStorage theo mặc định.

Nếu Task đã xóa, Project archived hoặc membership mất: dừng mutations và tải lại trạng thái. Mất quyền đọc thì bỏ dữ liệu nội bộ đã tải, đưa màn không khả dụng và lối về hợp lệ; không giữ nội dung chỉ vì muốn bảo toàn draft. Token/session lỗi xử lý theo auth flow. Lỗi tải Comments không làm mất phần Task đã tải hợp lệ; mỗi vùng có Thử lại riêng.

## 7. Nhu cầu dữ liệu/API suy ra từ cụm này

| Nhu cầu | Hiện trạng | Cần làm khi chuẩn bị FE |
|---|---|---|
| Board/My Tasks search, time, totals, cursor | Đã có | Nối đúng phạm vi/cursor, bỏ response stale |
| Task permissions, assigneeLeft, overdue, version | Đã có | Render theo quyền; refresh sau mutation |
| Tên/avatar Creator/Assignee/Comment Author | Responses hiện chỉ có IDs | Bổ sung identity tối thiểu sau kiểm quyền, kể cả người đã rời; không trả email/private profile |
| Tên Workspace/Project ở My Tasks | Đã có | Đủ cho dòng danh sách |
| Breadcrumb khi mở Task trực tiếp | Task có IDs; Workspace/Project có GET | Dùng GET đã có sau kiểm quyền; không bắt buộc endpoint mới |
| Picker thành viên toàn Workspace | Member list chỉ phân trang, chưa có search | Bổ sung server search hoặc duyệt đủ trang, không xem trang đầu là toàn bộ |
| Tạo Task/Comment retry an toàn | Chưa có idempotency | Pending khóa submit; không auto retry timeout, ghi gap riêng |
| Realtime khi người khác sửa | Chưa có push contract | Chưa thiết kế trạng thái “đang đồng bộ trực tiếp”; refresh/focus phải giữ dirty draft |

Không cần thêm priority, label, subtasks, checklist, activity timeline hoặc attachment chỉ để lấp khoảng trống bố cục; các mục đó chưa có yêu cầu và contract được chốt. Storage tiếp tục Upcoming.

## 8. Wireframe cần dựng sau review

Board desktop/mobile, empty và filtered; My Tasks default/Done/Archived; Task Detail Owner/Assignee/Member/Archived; form tạo/sửa; Comment composer/edit/delete; conflict và unavailable. Dữ liệu mẫu phải có title dài, description tiếng Việt/English, emoji/link, người đã rời, Task không deadline và hạn quá khứ.

Cụm tiếp theo: Members, Invitations và quản lý Workspace — đánh giá luồng nhóm trước khi quay lại các màn xác thực/cài đặt.
