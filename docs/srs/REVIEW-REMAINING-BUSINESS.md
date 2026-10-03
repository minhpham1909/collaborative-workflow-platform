# Sáu nhóm nghiệp vụ còn lại — bản đề xuất để review

Ngày 01/10/2026. Chủ dự án yêu cầu tiếp tục phân tích cả sáu nhóm. Tài liệu này chưa ghi nhận phê duyệt; không thay đổi SRS/JSON hoặc các quyết định đã chốt. Những câu hỏi đã gửi về My Tasks, quyền nền và conflict vẫn chưa có câu trả lời.

Cập nhật cùng ngày: chủ dự án đã duyệt nhóm 1–2, xác nhận chỉ Workspace Owner gửi lời mời, và đồng ý phương án nhóm 3. Các nhóm 4–6 vẫn là đề xuất. Trạng thái ban đầu ở đoạn trên giữ làm lịch sử; quyết định hiện tại xem DECISION-REGISTER.md và SRS mục 13.

## 1. My Tasks và quyền nền

Vấn đề: phân biệt việc được giao với việc tạo Task; tránh Task Done/Archived biến mất mà không rõ lý do.

Đề xuất: My Tasks chỉ gồm Task có assignee là User hiện tại, trong Workspace còn tham gia. Mặc định Project Active và Task chưa Done; cho xem Done/Archived qua bộ lọc có nhãn rõ. Task do mình tạo nhưng giao người khác xem trong Project, không tự thêm vào My Tasks. Mọi kết quả vẫn sort thời gian tạo mới nhất trước, có search động và lọc thời gian như đã yêu cầu.

Member được tạo Task và thêm Comment trong Project Active. Chỉ Owner quản lý Workspace, Project, lời mời, thành viên và chuyển ownership. Workspace có đúng một Owner; chuyển cho Member hiện tại, Owner cũ thành Member; Owner muốn rời phải chuyển trước. Membership cho phép xem mọi Project trong Workspace, không có quyền Project riêng trong bản đầu. Archived chỉ đọc theo quy tắc đã chốt.

Kiểm chứng: tạo Task rồi giao người khác không xuất hiện trong My Tasks của Creator; Done bị loại bởi filter mặc định nhưng xem lại được; mất membership không còn kết quả; Member không gọi được thao tác quản lý Project.

## 2. Sửa đồng thời

Vấn đề: An và Bình cùng mở một Task, An lưu trước; lần lưu sau của Bình có thể mất thay đổi của An.

Đề xuất: từ chối cập nhật từ bản cũ của Workspace/Project/Task/Comment; báo có thay đổi mới, giữ nội dung đang nhập để sao chép, cho tải bản mới và sửa lại. Không tự gộp hoặc ghi đè. Đổi status cũng kiểm tra như sửa Task. Chọn lại cùng status không tạo event mới.

Quyền và trạng thái Active được kiểm tra lại lúc ghi. Nếu mất quyền, giao diện không hiển thị thêm dữ liệu máy chủ; nếu đối tượng bị xóa thì báo không còn khả dụng. Nội dung chưa lưu chỉ giữ trong giao diện đang mở, không hứa lưu sau reload/đóng tab. Xóa và các lệnh ownership/membership có quy tắc cạnh tranh riêng ở SDS.

Kiểm chứng: hai cập nhật cùng phiên bản chỉ một cập nhật thành công; lần bị từ chối không tạo notification/email; không phục hồi assignee đã được hệ thống bỏ.

## 3. Tài khoản, xác minh và phiên đăng nhập

Đề xuất: User chưa xác minh được đăng nhập, dùng Profile/Personal Settings và gửi lại email xác minh; phải xác minh trước khi tạo hoặc gia nhập Workspace. Đăng ký cần chấp nhận Terms, lưu phiên bản và thời điểm chấp nhận; không tự yêu cầu chấp nhận lại ở mọi lần đăng nhập.

Password dự thảo 12–128 ký tự, cho khoảng trắng và không trim; không bắt buộc mẫu phối hợp chữ hoa/số/ký hiệu. Đổi password yêu cầu password hiện tại, giữ phiên đang thực hiện và thu hồi các phiên khác. Reset thành công thu hồi mọi phiên cũ, yêu cầu đăng nhập lại. Verification hết hạn sau 24 giờ, recovery sau 30 phút; token chỉ dùng một lần; gửi lại thành công vô hiệu token cũ cùng mục đích. Khi email chưa gửi được, phải có trạng thái thử lại, không thông báo gửi thành công giả.

Đổi email và xóa tài khoản nằm ngoài bản đầu. Nội dung Terms/Privacy, thời hạn lưu dữ liệu và trách nhiệm vận hành cần hoàn thiện trước phát hành công khai; việc chưa viết nội dung cuối không chặn soạn SDS.

Kiểm chứng: chưa verified không tạo/join được; token cũ/hết hạn/đã dùng không hoạt động; các phiên bị thu hồi không dùng tiếp được.

## 4. Lời mời trước gia nhập

Đề xuất: người có URL lời mời hợp lệ được xem preview tối thiểu tên Workspace, người mời, loại lời mời và hạn; không thấy danh sách thành viên, Project/Task hoặc email người nhận. Đây là dữ liệu cố ý chia sẻ cho người giữ URL. Chấp nhận yêu cầu đăng nhập và xác minh; EMAIL phải khớp email tài khoản, LINK theo cơ chế đã chốt. Giữ đích lời mời qua đăng nhập/đăng ký/xác minh.

EMAIL tạo một thông báo in-app nếu lúc tạo đã có tài khoản tương ứng, kể cả chưa verified; không áp điều kiện membership của thông báo công việc. Không tạo thông báo hồi tố khi sau đó mới đăng ký; người nhận dùng URL trong email. LINK không phát in-app cho mọi User. Lời mời hết hạn/thu hồi hiển thị không còn hiệu lực; membership được kiểm tra lại khi accept. Đã là thành viên thì mở Workspace, không tạo membership thứ hai.

Kiểm chứng: Visitor không thấy dữ liệu Workspace nội bộ; accept sai email bị chặn; hết hạn/revoke không join; accept lặp không sinh membership trùng.

## 5. Thông báo và xóa dữ liệu

Đề xuất dùng tập người nhận cho từng loại thay đổi, loại actor, trùng lặp và người không còn membership:

| Sự kiện | Người nhận đề xuất |
|---|---|
| Giao, đổi hoặc bỏ assignee | Creator, assignee cũ và assignee mới còn hợp lệ; chỉ khi assignee thực sự đổi |
| Comment mới | Creator và assignee hiện tại |
| Đổi nội dung/deadline/status | Creator và assignee sau lần lưu |

Ví dụ đổi từ Bình sang Chi đồng thời sửa title: Bình nhận thông tin thôi được giao; Chi nhận được giao và title mới; Creator nhận các thay đổi liên quan nếu không là actor. Cùng người nhận/cùng lần lưu tạo một mục in-app; email chỉ gồm loại họ bật. Assignment preferences bao gồm cả được giao và thôi được giao. Sửa/xóa Comment không tạo thông báo riêng ở bản đầu. Cleanup assignee khi thành viên rời không phát hàng loạt thông báo assignment.

Email queued kiểm tra lại quyền và setting trước mỗi lần thử gửi; đã tắt thì không gửi, đã mất membership hoặc Task đã xóa thì bỏ thông báo công việc đó. Email đã bàn giao cho dịch vụ gửi không thể thu hồi; không hứa setting thay đổi chặn được email đang chuyển phát. Email invitation/auth theo lifecycle riêng.

Xóa Task làm Task và Comments không còn truy cập ngay, không có thùng rác/khôi phục ở bản đầu. Xóa Comment làm nội dung không còn hiển thị. Thông báo cũ giữ thời điểm và read/unread nhưng thay nội dung bằng thông báo chung nếu Task bị xóa hoặc người xem mất quyền; không lộ title/comment/Workspace name cũ, không có liên kết mở đối tượng. Quy tắc áp dụng cả API trả danh sách và chi tiết. Tổng chưa đọc chỉ tính các mục được trả theo chính sách này.

Thời hạn purge, notification retention và backup retention vẫn cần lựa chọn khi xác định môi trường vận hành; hard/soft delete là thiết kế SDS. Bản đề xuất này chưa quy định số ngày và chưa đóng toàn bộ OD-08/11.

## 6. Giới hạn và nghiệm thu

Cập nhật 03/10/2026: chủ dự án tạm chốt nhóm 4–5 qua chat, bao gồm việc giữ hiệu lực lời mời khi chuyển Owner được bổ sung trong trao đổi. Nhóm 6 dưới đây tiếp tục là đề xuất, không suy thành đã duyệt từ câu “tạm chốt”.

Đề xuất giữ giới hạn trường tại SRS mục 11: display name 2–80, Workspace/Project name 1–120, description nhóm/dự án tối đa 2.000, Task title 1–200, Task description tối đa 10.000, Comment 1–5.000, Password 12–128 ký tự. Các trường bắt buộc không chỉ có khoảng trắng; quy tắc đếm Unicode cụ thể thuộc SDS.

Task/Comment/Notification/Project phân trang mặc định 20, tối đa 100. Board có tổng số theo bộ lọc và tải thêm độc lập từng cột, không coi card đã tải là toàn bộ kết quả. Tổng là tại lần tải, chưa cam kết cập nhật realtime.

Retry cùng một lần gửi tạo Task/Comment chỉ tạo một đối tượng và event tương ứng; lần tạo chủ động mới vẫn được phép trùng nội dung. Email lỗi không rollback thao tác đã lưu; ứng dụng chống xếp hàng trùng. Trường hợp nhà cung cấp đã nhận email nhưng ứng dụng mất phản hồi cần provider idempotency hoặc công bố khả năng trùng hiếm; không cam kết tuyệt đối trước khi chọn dịch vụ.

Giữ mục tiêu hiệu năng SRS: tổng bộ dữ liệu thử 10 Workspace/100 Project/10.000 Task, 20 User đồng thời; API đọc p95 dưới 1 giây, ghi dưới 1,5 giây. SDS phải định nghĩa kích thước nội dung, phân bố dữ liệu, workload và môi trường đo; đây chưa phải quota sản phẩm. In-app khả dụng dưới 5 giây ở điều kiện bình thường; lần thử gửi email đầu dưới 60 giây, không cam kết thời điểm tới inbox. Giao diện dùng được ở 360/1440 px, thao tác bàn phím và cách đổi status không cần kéo thả.

Backup phải thử restore trước phát hành. Mục tiêu mất dữ liệu tối đa/thời gian phục hồi và retention còn cần đặt theo môi trường phát hành; không đóng NFR-12 chỉ bằng việc có bản sao lưu.

## Cách chốt

Review theo nhóm 1–2, rồi 3–4, rồi 5–6 để tránh quá nhiều câu hỏi một lượt. Chỉ cập nhật trạng thái approved và đồng bộ SRS/JSON/AC khi có câu trả lời trực tiếp. Retention/backup và giới hạn email chưa thể được suy thành đã chốt từ việc duyệt các hành vi khác.
