# Nhóm review 02 — Kanban, My Tasks và conflict

Ngày: 01/10/2026. Trạng thái: OD-04 đã duyệt ba status cố định, chuyển trực tiếp, thứ tự mới tạo trước và không sắp thủ công; OD-05/06 vẫn là đề xuất. Tải thêm/pagination review riêng. OD-01/02/03 đã chốt ở nhóm 01.

Phân tích chi tiết hai phần đầu, các vấn đề, bố cục và tình huống nghiệm thu tại [KANBAN-MY-TASKS-DESIGN-v0.1.md](../ui-ux/KANBAN-MY-TASKS-DESIGN-v0.1.md). Kanban và My Tasks đều đã chốt thời gian tạo mới nhất trước; Tải thêm và default/filter My Tasks vẫn là đề xuất.

## OD-04 — Status và Board

Quyền đã chốt riêng từ phân tích của chủ dự án: Owner/Creator/Assignee đổi status, Assignee chỉ đổi status nếu không là Owner/Creator; Member khác không được sửa chỉ vì membership. Status transitions và thứ tự đã được duyệt; UI/pagination vẫn cần thiết kế riêng.

Đã duyệt ba trạng thái cố định Todo / In Progress / Done; cho chuyển trực tiếp giữa bất kỳ hai trạng thái, kể cả Todo → Done hoặc Done → Todo. Không tùy biến cột và không lưu thứ tự kéo thả trong cùng cột ở bản đầu. Giao diện tiếng Việt hiển thị Chưa làm / Đang làm / Hoàn thành; tên lưu/API sẽ chốt ở SDS.

Board và Task Detail dùng cùng quy tắc status, assignee, deadline và quyền. Task trong Archived chỉ xem. Người dùng có cách đổi status bằng bàn phím và lựa chọn trong Task Detail. Thứ tự hiển thị mặc định, phân trang/tải thêm theo cột cần thiết kế ở SDS/RV-12, không tự xem đã được duyệt từ việc chọn status.

Tiêu chí nếu duyệt: các chuyển trạng thái trực tiếp cho cùng kết quả trên hai màn hình; reopen áp dụng OD-01/03; khi backend từ chối, card không nằm sai cột; không có điều khiển tùy biến cột hoặc lưu vị trí giả.

### Ma trận chuyển trạng thái đã chốt

Trạng thái ban đầu đề xuất là Chưa làm. Người có quyền đã chốt (Owner/Creator/Assignee hiện tại) được thực hiện các chuyển sau khi Project Active:

| Từ / Đến | Chưa làm | Đang làm | Hoàn thành |
|---|---|---|---|
| Chưa làm | Không thay đổi | Cho phép | Cho phép |
| Đang làm | Cho phép | Không thay đổi | Cho phép |
| Hoàn thành | Cho phép, reopen | Cho phép, reopen | Không thay đổi |

Chọn lại cùng status không tạo thay đổi nghiệp vụ hoặc event mới. Chuyển sang Hoàn thành không bắt buộc thêm assignee/deadline. Reopen giữ deadline cũ và kiểm tra assignee theo OD-01/03. Hoàn thành không archive Project hoặc khóa quyền sửa Task.

### Quyết định thứ tự card

Chủ dự án đã chọn tự sắp theo thời gian tạo, mới nhất trước trong mỗi cột. Không sắp thủ công; sửa nội dung hoặc chuyển status không đổi thời gian dùng để sắp xếp. Bảng dưới giữ phương án so sánh để truy vết; phương án thủ công không thuộc bản đầu đã chọn. Khi thời gian tạo trùng nhau, SDS cần khóa phụ ổn định cho tải lại/phân trang, không thêm quyền sắp tay.

| Phương án | Hành vi | Phạm vi cần thiết kế |
|---|---|---|
| Tự sắp, đã duyệt | Mỗi cột Task mới tạo trước; không lưu vị trí thả | Thời gian tạo không đổi khi sửa/chuyển status; thứ tự ổn định khi tải lại |
| Người dùng sắp thủ công | Kéo trong cột để thay thứ tự và lưu lại; tải lại/thiết bị khác thấy thứ tự đã lưu | Quyền thay thứ tự dùng chung, lưu vị trí, concurrent reorder và xử lý dữ liệu chưa tải; cần review thêm nếu chọn |

Ví dụ cho phương án tự sắp: Task A tạo lúc 09:00 và B tạo lúc 10:00. Khi cùng ở Đang làm, B nằm trước A. Kéo A sang cột này không đưa A lên đầu theo thời điểm kéo hoặc vị trí thả. Nhãn thứ tự trên Board cần thể hiện rõ “Mới tạo trước”.

Đề xuất mỗi cột có tổng số và Tải thêm độc lập; tổng số là kết quả ở lần tải, không hứa realtime. Thứ tự và chuyển trạng thái đã đồng bộ SRS/JSON sau câu trả lời. OD-06/conflict và pagination NFR/SDS vẫn review riêng.

## OD-05 — My Tasks

Đã chốt theo yêu cầu mới: My Tasks dùng thứ tự thời gian tạo mới nhất trước giống Kanban. Bỏ đề xuất ưu tiên deadline riêng. Chủ dự án giao assistant xem xét bố cục: chọn danh sách phẳng, từng Task ghi rõ Workspace → Project; deadline là thông tin và filter, không thay đổi sort. Các đề xuất eligibility/default/filter dưới đây chưa được suy thành đã duyệt từ yêu cầu bố cục.

Đề xuất mặc định chỉ Task được giao cho User, trong Workspace còn membership, Project Active và status chưa Done. Cho lọc Workspace, status, overdue và vòng đời Project; người dùng có thể chủ động xem Done hoặc Archived với nhãn rõ. Đặt bộ lọc mặc định phải nhìn thấy được, tránh hiểu nhầm Task biến mất.

Archived luôn chỉ đọc và vẫn tính overdue theo OD-03. Tái gia nhập có thể thấy Task Done còn giữ User ID khi bật filter phù hợp; không tự phục hồi các Task đã bỏ assignee. User không còn membership không thấy Task Workspace đó dù là Creator/assignee lịch sử.

Tiêu chí nếu duyệt: mặc định Active/chưa Done; đổi filter xem Done/Archived; empty khác no-results; mất quyền sau khi tải bị chặn khi mở; không có collection/bản sao My Tasks riêng.

## OD-06 — Sửa đồng thời

Đề xuất mọi thao tác sửa nội dung Workspace, Project, Task và Comment phải kiểm tra phiên bản. Khi bản người dùng mở đã cũ, từ chối lưu và báo có thay đổi mới; không âm thầm ghi đè hoặc tự merge. Giữ nội dung đang nhập trên giao diện để người dùng sao chép trước khi tải bản mới, sau đó họ có thể sửa và lưu lại.

Ví dụ: An và Bình cùng mở Task v1. An lưu title mới thành công. Bình lưu từ v1: nhận conflict, thay đổi của An còn nguyên; nội dung Bình đang gõ không bị xóa ngay. Board đổi status cũng phải xử lý conflict như sửa Task Detail.

Backend vẫn phải kiểm tra membership, role, trạng thái Project và assignee hiện tại tại lúc ghi. Kiểm tra phiên bản Task không thay thế kiểm tra quyền/Archived. Cơ chế transaction và xử lý các cuộc đua transfer/leave/accept/revoke thuộc SDS; hành vi nghiệp vụ vẫn theo các AC đã đặc tả. Xóa và lệnh vòng đời cần thiết kế xác nhận/trạng thái riêng, không suy ra toàn bộ đã có cùng một cơ chế version.

Tiêu chí nếu duyệt: hai người sửa từ cùng phiên bản thì tối đa một lần sửa thành công; lần stale không tạo event/email mới; nội dung đang nhập còn để sao chép; UI có lối tải lại; bản mới vẫn giữ đúng cleanup assignee và trạng thái Archived.

## Các quyết định vẫn tách riêng

Quyền xóa Task/Comment và retention OD-11/RD-03; recipients/gộp event/email đã xếp hàng OD-09/RD-04; invitation preview OD-14; auth/Terms/token/NFR. Chọn OD-04/05/06 không tự phê duyệt các mục này.
