# Review SRS v0.2

Ngày: 01/10/2026. Trạng thái: phân tích dự thảo, đã nhận ba lựa chọn của chủ dự án trong chat hiện tại. Nguồn: SRS-v0.2.md và use-cases.json trong dự án local; chưa có bản v0.1 để đối chiếu.

Cập nhật tổng quan: OD-01/02/03/04 và quyền RD-03/06 đã chốt; OD-05 chốt sort, bố cục được assistant chọn theo uỷ nhiệm; RD-07 search/time đã được yêu cầu và có thiết kế cụ thể. Các ghi nhận ban đầu dưới đây giữ để truy vết; trạng thái hiện tại và phần còn chặn baseline xem [SRS-READINESS.md](SRS-READINESS.md) và decision register.

Đã duyệt: OD-01/02/03 gồm cả chi tiết nhóm 01. RV-01/02/06 đã được xử lý trong yêu cầu; RV-07/08 đã chốt vòng đời/overdue, còn filter My Tasks ở OD-05. Bảng dưới giữ phát hiện ban đầu và hướng xử lý để truy vết, không yêu cầu duyệt lại quyết định đã chốt.

## Mức hoàn thiện

| Hạng mục | Kết luận |
|---|---|
| Phạm vi/actors | Có khung và phân biệt bản đầu với increment |
| FR/BR/UC/AC | 27 FR, 26 BR, 33 UC, 20 AC xuyên chức năng; cần review ngữ nghĩa |
| Quyết định | D-01 đến D-10 được ghi nhận; OD-01/02/03 đã duyệt; các OD khác còn mở |
| UI/UX | Có screen inventory và SCREEN-FLOWS-v0.1 mapping đủ 33 UC; chưa có wireframe hoàn chỉnh |
| SDS/ứng dụng | Chưa có thiết kế đã duyệt hoặc code chạy được |
| Setup local | Đã tạo cấu trúc và công cụ kiểm tra tài liệu |

## Các vấn đề cần giải quyết

| ID | Tham chiếu | Vấn đề và tác động | Hướng xử lý đề xuất; chưa duyệt |
|---|---|---|---|
| RV-01 | BR-07/13, UC-10/11/19, OD-01 | Task Done có thể giữ assignee đã rời; bước kiểm tra assignee hiện tại ở UC-19 có thể vô tình chặn sửa title của Task Done này. | Tách giữ nguyên assignee lịch sử khỏi phân công mới. Phân công mới phải là thành viên hiện tại; reopen bỏ assignee cũ theo OD-01. |
| RV-02 | BR-11/13, UC-10/11/16 | Project Archived chỉ đọc, nhưng leave/remove cần bỏ assignee Task chưa Done trong cả Project Archived. Chưa phân biệt ghi của người dùng và cập nhật vòng đời hệ thống. | Đặc tả ngoại lệ cleanup do membership lifecycle; không mở quyền sửa Task Archived cho người dùng. |
| RV-03 | UC-09, OD-14 | UC-09 yêu cầu đã đăng nhập nhưng luồng chính chứa đăng nhập/đăng ký; OD-14 chưa rõ Visitor có xem preview lời mời được không. | Phân biệt mở/preview invitation và thao tác accept; accept bắt buộc tài khoản xác minh. Chốt riêng dữ liệu preview và quyền Visitor. |
| RV-04 | Mục 7.1, UC-08/09/32 | Có in-app invitation trong ma trận nhưng thiếu mapping FR/UC chi tiết: ai nhận, thời điểm tạo, email chưa xác minh, lời mời bị thu hồi/hết hạn và target cũ. | Bổ sung vào UC-08/09/32 và AC; tách invitation khỏi eligibility membership của event công việc. |
| RV-05 | BR-17/18, UC-19, OD-09 | Reassignment chỉ báo assignee mới; gỡ assignee không báo người cũ. Khi đồng thời sửa title và đổi assignee, chưa rõ creator/assignee cũ/mới nhận những loại nào. | Lập bảng before/after và tập recipient cho mỗi loại thay đổi, gồm thao tác tự giao và no-op; review lựa chọn không báo người cũ. |
| RV-06 | OD-02, UC-33 | Đã chọn setting chung + override Workspace ngay bản đầu; thiếu quy tắc kế thừa/default, reset override và tái gia nhập. | Đề xuất Workspace kế thừa setting chung khi chưa override, override ưu tiên, có reset về kế thừa. Cần duyệt mức override toàn bộ hay từng loại event và xử lý tái gia nhập. |
| RV-07 | BR-12/13/18/23 | Giữ User ID lịch sử chưa đủ nói rõ tái gia nhập: nhãn đã rời có còn không, Task Done có xuất hiện lại ở My Tasks, Task chưa Done có tự giao lại không. | Đề xuất không tự phục hồi phân công đã bỏ; chốt danh tính lịch sử theo lần membership hay theo User hiện tại. |
| RV-08 | OD-03/05, BR-22/23, AC-X18 | Ngày giờ/múi giờ Việt Nam đã chốt nhưng AC-X18 nằm cạnh reminder; phép tính overdue cần cho bản đầu. Archived ở My Tasks cũng chưa rõ có gắn overdue không. | Tách AC overdue bản đầu khỏi reminder; chốt lưu UTC, độ chính xác giờ, past-due, Done, Archived và filter defaults. |
| RV-09 | BR-20, AC-X13, NFR-07 | Retry không tạo email trùng đang là yêu cầu tuyệt đối, kể cả trường hợp provider nhận email nhưng ứng dụng mất phản hồi. Chưa xác định khả năng idempotency của provider. | SDS cần chọn provider/cơ chế idempotency hoặc ghi rõ giới hạn delivery. Không tuyên bố đã bảo đảm chỉ gửi một lần khi chưa có bằng chứng. |
| RV-10 | BR-18, UC-32, AC-X15 | Mất quyền thì target unavailable nhưng notification đã lưu có thể chứa title/comment cũ; chỉ chặn mở target chưa bảo đảm không lộ nội dung ở danh sách. | Quy định cách ẩn/redact payload khi membership mất, read/unread count, email đang xử lý; giữ metadata nào cần review. |
| RV-11 | UC-17/23, AC-01, AC-X03/13 | Chống trùng membership/email có AC, nhưng retry sau timeout tạo Task/Comment chưa rõ có idempotency hay chấp nhận trùng. | Chốt hành vi submit/retry trong SDS với AC nghiệp vụ bổ sung; không suy ra mọi create đã chống trùng. |
| RV-12 | NFR-04/05, UC-21 | Board có thể bị pagination Task cắt mất card mà không báo. Bộ dữ liệu NFR cũng chưa xác định tổng hay theo Workspace, kích thước nội dung và môi trường. | Chốt phân trang theo cột hoặc tải thêm có tổng số; ghi dataset/workload/môi trường đo trước nghiệm thu. |

RV-01 đến RV-10 ảnh hưởng định nghĩa hành vi bản đầu; RV-11/12 cần chuyển thành yêu cầu rõ hoặc thiết kế có AC trước triển khai. Không phải tất cả đều là mâu thuẫn: một số là thiếu tình huống hoặc giới hạn bảo đảm chưa xác định.

## Thứ tự review

Chi tiết nhóm 1 và ví dụ đã duyệt tại [REVIEW-GROUP-01.md](REVIEW-GROUP-01.md). SRS/JSON đã đồng bộ; các phần riêng OD-05/06/09/10 vẫn còn mở.

1. Membership/Task, email preferences, deadline: OD-01/02/03 cùng RV-01/02/06/07/08.
2. Quyền Task/Comment, status, My Tasks, conflict, gộp event và invitation: OD-04/05/06/09/11/14 cùng RV-03/04/05/10.
3. Auth/session/Terms/token, NFR, email delivery và retry: OD-07/08/12/13 cùng RV-09/11/12.
4. OD-10 và đặc tả FR-26/27 để review khi bắt đầu increment tương ứng.

Ba lựa chọn đã nhận trong chat được cập nhật vào SRS/JSON và decision register đúng phạm vi trả lời. Chưa tạo SRS v1.0 vì còn các quyết định mở.

## Lịch sử review

| Ngày | Thay đổi |
|---|---|
| 01/10/2026 | Review bản bàn giao; thêm RV-01 đến RV-12 và nhóm quyết định; giữ nguyên yêu cầu v0.2 chờ trả lời |
| 01/10/2026 | Nhận trả lời OD-01/02/03, cập nhật phạm vi đã duyệt và tách các chi tiết còn mở |
| 01/10/2026 | Chủ dự án duyệt toàn bộ ba nhóm chi tiết; đóng OD-01/02/03, xử lý RV-01/02/06 và phần lifecycle/overdue RV-07/08; filter My Tasks chưa duyệt |
