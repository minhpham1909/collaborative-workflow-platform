# Search động và bộ lọc thời gian dùng chung

Ngày: 01/10/2026. Chủ dự án yêu cầu cả Kanban/My Tasks có bộ lọc thời gian và search động. Đây là thiết kế được assistant cụ thể hóa theo yêu cầu; năng lực search/time filter đã được yêu cầu, các business defaults khác ở OD-05 vẫn giữ trạng thái riêng.

## Phạm vi và thứ tự

- Áp dụng cùng quy tắc cho Kanban Project và My Tasks, cả kiểu danh sách/thẻ của bản mẫu.
- Search chỉ trong tập Task người dùng có quyền xem: Kanban trong Project hiện tại; My Tasks trong tập được giao và Workspace còn membership.
- Search/bộ lọc thu hẹp tập kết quả, không đổi sort thời gian tạo mới nhất trước. Kanban giữ ba cột và sắp trong từng cột; My Tasks giữ thứ tự toàn danh sách.
- Kết hợp đồng thời search, Workspace/status/vòng đời/quá hạn nếu màn hình hỗ trợ và thời gian. Không tự nới filter để có kết quả.
- Lọc/search trên toàn tập dữ liệu được phép ở backend, không chỉ các card/dòng đã tải; thay tiêu chí bắt đầu lại pagination và cập nhật tổng số từng cột/danh sách. Thiết kế index/query và con số pagination thuộc SDS/NFR.

## Search động

- Ô tìm theo title hoặc description Task; không tìm nội dung Comment hoặc dữ liệu ngoài phạm vi quyền. Workspace/Project dùng bộ lọc/ngữ cảnh.
- Kết quả tự cập nhật sau khi ngừng nhập khoảng 300 ms, không cần Enter. Xóa query cập nhật ngay với các filter còn lại; reset tổng trở về defaults và xóa search/thời gian.
- Không phân biệt hoa/thường hoặc dấu tiếng Việt khi tìm; chuẩn hóa Đ/đ, khoảng trắng, Unicode. Chia query thành từ, yêu cầu mọi từ có trong title/description, không bắt buộc cùng thứ tự.
- Query là văn bản; ký tự regex không trở thành phép truy vấn tùy ý. Không tự đổi tên/nội dung gốc trong dữ liệu hoặc trên giao diện.
- Query rỗng không giới hạn tìm kiếm. Hiển thị loading/đang cập nhật, no-results và lỗi riêng; giữ kết quả gần nhất khi request lỗi nhưng nói rõ chúng chưa cập nhật theo tiêu chí mới.
- Khi nhập nhanh, chỉ kết quả của bộ query/filter hiện tại được phép hiển thị; response cũ không ghi đè kết quả mới. Mock local chỉ minh họa debounce, không chứng minh pipeline/API thật.

## Bộ lọc thời gian

| Điều khiển | Thiết kế |
|---|---|
| Trường thời gian | Ngày tạo hoặc Deadline, chọn một trường cho một khoảng |
| Khoảng nhanh | Không giới hạn / Hôm nay / 7 ngày gần đây / 30 ngày gần đây / Tùy chọn |
| Tùy chọn | Từ ngày, Đến ngày; được bỏ trống một đầu |
| Múi giờ | Asia/Ho_Chi_Minh, thống nhất deadline đã chốt |
| Biên ngày | Từ 00:00 ngày bắt đầu đến trước 00:00 ngày sau ngày kết thúc; bao trọn ngày kết thúc |
| Khoảng không hợp lệ | Từ sau Đến: báo lỗi cạnh trường, không áp dụng khoảng sai hoặc giả trả 0 kết quả |
| Task không deadline | Vẫn có ở Ngày tạo hoặc khi không giới hạn thời gian; bị loại khi đang lọc một khoảng Deadline thực tế |
| Trạng thái Done/Archived | Search/time filter không cấp quyền ghi hoặc tự thay đổi định nghĩa overdue |

“7 ngày gần đây” gồm hôm nay và sáu ngày trước; “30 ngày gần đây” gồm hôm nay và 29 ngày trước, theo giờ Việt Nam. Nếu chọn Deadline, các preset vẫn là khoảng lịch tương ứng, không âm thầm trở thành “7 ngày sắp tới”. Deadline tương lai có thể lọc bằng Tùy chọn; thêm preset sắp tới chỉ khi có nhu cầu rõ.

Khi có ngày sai, giữ kết quả gần nhất và báo bộ lọc chưa áp dụng. Các tiêu chí mới khác không được giả đánh dấu là đã áp dụng trong khi khoảng đang sai. Cơ chế query/request concrete thuộc SDS.

## Bố cục

Ô search nằm trên kết quả, dùng chung phong cách ở hai màn hình. Các filter cơ bản nằm bên dưới; nút Thời gian mở vùng Trường thời gian/Khoảng nhanh/Từ/Đến. Khi đóng vẫn hiển thị tóm tắt khoảng đang áp dụng. Khoảng mở/đóng không xóa giá trị đang có.

Mobile: các trường xuống dòng, không tạo một toolbar dài phải cuộn ngang. Kết quả giữ kiểu thẻ gọn với Workspace → Project, status, deadline và ngày tạo phụ. Không biến bộ lọc thời gian thành nút sort hoặc ưu tiên deadline.

## Tiêu chí nghiệm thu

- Gõ title/description, có dấu/không dấu và khác hoa thường cho kết quả phù hợp; query nhiều từ kết hợp AND; xóa query không xóa filter khác.
- Search kết hợp thời gian/status/quá hạn/membership, không lộ Task ngoài quyền; backend không giới hạn tìm trong trang đã tải.
- Kiểm tra ngày bắt đầu, đúng ngày kết thúc, ngay sau biên kết thúc; input thiếu một đầu và Từ > Đến; UTC/giờ Việt Nam nhất quán.
- Task không deadline đúng hành vi khi lọc ngày tạo/Deadline; filter không làm sort đổi thành deadline hoặc relevance.
- Query cũ trả sau query mới không làm UI quay lại kết quả cũ; request lỗi hiển thị trạng thái rõ. Các kiểm tra mạng cần API thật sau triển khai.
- Kanban tổng số/card và My Tasks tổng số/dòng phản ánh cùng tiêu chí; pagination bắt đầu lại khi search/filter đổi.
