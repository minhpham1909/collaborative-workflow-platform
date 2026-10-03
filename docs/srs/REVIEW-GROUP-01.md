# Nhóm review 01 — Membership, email settings và deadline

Ngày: 01/10/2026. Trạng thái: **chủ dự án đã duyệt cả ba nhóm chi tiết trong chat ngày 01/10/2026**. Các lựa chọn đã được đồng bộ vào SRS/JSON và decision register. Các phần được ghi rõ thuộc OD-05/06/09/10 vẫn còn mở. File này giữ ví dụ và cơ sở review, không thay thế SRS.

## 1 Assignee và vòng đời membership

Đã duyệt: khi thành viên rời/bị loại, Task chưa Done bỏ assignee; Task Done giữ người cũ với nhãn đã rời; khi reopen phải bỏ assignee không còn membership.

| Tình huống | Hành vi đã duyệt |
|---|---|
| Task chưa Done trong Project Active | Bỏ assignee khi rời/bị loại |
| Task chưa Done trong Project Archived | Vẫn bỏ assignee do thay đổi membership; đây là cập nhật vòng đời hệ thống, không cấp quyền sửa cho người dùng |
| Task Done trong Project Active hoặc Archived | Giữ assignee cũ, hiển thị nhãn đã rời khi User không còn membership |
| Chỉ sửa title/description/deadline của Task Done trong Project Active | Cho phép theo quyền hiện tại và giữ nguyên assignee lịch sử; không coi đây là phân công mới |
| Chọn assignee khác hoặc tạo phân công mới | Chỉ chọn thành viên hiện tại |
| Reopen Task Done trong Project Active | Kiểm tra membership tại lúc lưu; nếu assignee đã rời thì bỏ assignee |
| Reopen Task trong Project Archived | Từ chối; Owner phải mở lại Project trước |
| Người cũ tái gia nhập | Không tự phục hồi phân công của Task chưa Done đã bị bỏ. Với Task Done vẫn giữ User ID đó, nhãn đã rời biến mất vì họ đã là thành viên hiện tại |
| Task Done giữ assignee, người đó tái gia nhập rồi reopen Task | Giữ assignee vì User đã có membership hiện tại tại lúc reopen |

Ví dụ: An có Task A đang làm và Task B đã Done. An rời nhóm: A không có assignee, B vẫn ghi An (đã rời). An vào lại: A vẫn chưa giao cho ai; B ghi An, không còn nhãn đã rời. Việc B xuất hiện trong My Tasks phụ thuộc filter OD-05, chưa duyệt trong nhóm này.

Nhãn đã rời được tính từ membership hiện tại, không phải bản ghi lịch sử từng lần ra/vào. Creator và Comment Author vẫn tham chiếu User ID; tái gia nhập không tạo lại Task hoặc Comment.

### Tiêu chí đã đưa vào SRS; chưa kiểm thử

- Rời/bị loại xử lý assignee nhất quán ở cả Active và Archived; thao tác ghi Task thủ công trong Archived vẫn bị từ chối.
- Sửa nội dung Task Done được phép với assignee lịch sử giữ nguyên; chọn phân công mới cho người đã rời bị từ chối.
- Tái gia nhập không tự khôi phục phân công đã bỏ; nhãn và khả năng reopen theo membership hiện tại.
- Nếu leave và sửa nội dung xảy ra đồng thời, cập nhật nội dung không phục hồi assignee bị hệ thống bỏ. Cơ chế conflict/version cụ thể thuộc OD-06 và SDS.

## 2 Email chung và override theo Workspace

Đã duyệt: Personal Settings chứa setting chung toàn tài khoản và override từng Workspace ngay bản đầu.

Đã duyệt override theo **từng loại sự kiện**, thay vì sao chép toàn bộ bộ setting sang Workspace:

| Thành phần | Hành vi đã duyệt |
|---|---|
| Setting chung | Có lựa chọn bật/tắt cho assignment, comment, content update, status update |
| Mặc định tài khoản mới | Bật assignment; tắt comment/content/status |
| Override của một loại event trong Workspace | Ba lựa chọn: Theo setting chung / Bật / Tắt |
| Chưa đặt override | Theo setting chung |
| Đổi setting chung | Chỉ ảnh hưởng các loại đang kế thừa; override Bật/Tắt giữ nguyên |
| Reset một lựa chọn | Trở về Theo setting chung |
| Reset cả Workspace | Mọi loại event trong Workspace trở về Theo setting chung |
| Rời/bị loại khỏi Workspace | Bỏ override của Workspace đó; dừng thông báo công việc theo membership |
| Tái gia nhập | Bắt đầu kế thừa setting chung, không phục hồi override cũ |
| Email verification/recovery/invitation | Không chịu các setting email công việc |
| In-app | Không có switch; vẫn nhận sự kiện liên quan theo membership |

Không thêm công tắc tổng trong đề xuất này để tránh quy tắc ưu tiên giữa nhiều công tắc. Có thể có thao tác tiện ích “Tắt tất cả email công việc” để đặt các loại thành Tắt; hành vi và UI này chưa cần coi là tính năng riêng đã duyệt.

Ví dụ: setting chung bật assignment và tắt comment. Workspace A đặt comment=Bật, các loại khác=Theo setting chung. A gửi cả assignment và comment; Workspace B chưa override chỉ gửi assignment. Sau đó tắt assignment chung: A vẫn gửi comment nhưng không gửi assignment.

Chỉ các Workspace đang tham gia xuất hiện để cấu hình. Kiểm tra membership khi lưu override và khi xử lý gửi; override không cấp quyền truy cập. Mốc áp dụng setting cho email đã xếp hàng cần chốt trong nhóm notification; email đã gửi không thu hồi được.

### Tiêu chí đã đưa vào SRS; chưa kiểm thử

- Override từng loại ưu tiên hơn setting chung; không có override thì kế thừa.
- Đổi setting chung không ghi đè override riêng; reset trả về giá trị kế thừa hiện tại.
- Không sửa được setting của User khác hoặc override cho Workspace không còn tham gia.
- Rời rồi tái gia nhập bắt đầu kế thừa, không tự phục hồi setting cũ.
- Reminder/push không có công tắc hoạt động giả trong bản đầu.

## 3 Deadline và overdue

Đã duyệt: deadline dạng ngày và giờ, bản đầu hiển thị múi giờ Việt Nam `Asia/Ho_Chi_Minh`.

| Tình huống | Hành vi đã duyệt |
|---|---|
| Độ chính xác nhập liệu | Đến phút; form ghi rõ múi giờ Việt Nam |
| Lưu và so sánh | Lưu thời điểm UTC; hiển thị theo Asia/Ho_Chi_Minh; không dùng timezone máy người xem làm nguồn sự thật |
| Task không có deadline | Hợp lệ; không overdue |
| Task chưa Done | Overdue khi thời điểm hiện tại lớn hơn deadline; bằng deadline thì chưa overdue |
| Task Done | Không overdue, giữ deadline để xem thông tin |
| Deadline đã qua khi tạo/sửa | Cho lưu, hiển thị cảnh báo và đánh dấu overdue nếu Task chưa Done |
| Bỏ deadline | Không còn overdue |
| Reopen Task Done có deadline đã qua | Trở thành overdue; không tự thay deadline |
| Project Archived | Vẫn tính overdue theo deadline/status khi xem hoặc lọc; chỉ đọc, không tạo reminder |

Ví dụ: hạn 10:00 ngày 02/10/2026 giờ Việt Nam được lưu tương ứng 03:00 UTC. Đúng 10:00:00 chưa overdue; sau thời điểm đó, Task chưa Done là overdue. Task Done không overdue dù deadline cũ đã qua.

Đây là quy tắc overdue của bản đầu. Mốc nhắc trước hạn, sát hạn, đổi deadline và chống nhắc lặp vẫn thuộc OD-10/increment Nhắc hạn; không được coi là đã duyệt từ nhóm này.

### Tiêu chí đã đưa vào SRS; chưa kiểm thử

- Hai client có timezone hệ điều hành khác nhau hiển thị cùng giờ Việt Nam và tính overdue từ cùng thời điểm.
- Kiểm tra trước/bằng/sau deadline; Done, không deadline, bỏ deadline, reopen và Archived.
- Form chấp nhận deadline quá khứ nhưng cảnh báo rõ; validation không ép đổi deadline khi reopen.
- My Tasks/Board/Task Detail dùng cùng định nghĩa overdue; mặc định filter vẫn chờ OD-05.

## Cách ghi nhận kết quả

Đã nhận câu trả lời rõ cho cả ba nhóm, cập nhật SRS/JSON, decision register, AC và traceability. Chỉ đóng RV/RD trong phạm vi được trả lời; không xem câu “tiếp tục” là duyệt các nhóm khác.
