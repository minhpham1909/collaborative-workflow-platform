# Nhóm 6 — giới hạn và nghiệm thu

Ngày 03/10/2026. Trạng thái: đề xuất chờ review, OD-12/RD-05; retention/backup liên quan OD-08/11. Nhóm 1–3 đã duyệt; nhóm 4–5 tạm chốt.

## A. Nhập liệu

Cập nhật sau yêu cầu mới 03/10/2026: đề xuất cũ 2.000 ký tự Workspace/Project được thay bằng Workspace 20.000 và Project 10.000 ký tự hiển thị. Chủ dự án yêu cầu đủ dài, chưa duyệt con số cụ thể. File quota/type/count và announcement pin limit review tại docs/sds/AVATAR-STORAGE-RESOURCES-REVIEW.md; bảng cũ dưới đây giữ để truy vết.

Bổ sung từ chủ dự án 03/10/2026: editor cần link, emoji, tiếng Việt, đếm chữ/ký tự, toolbar và kiểu Title/Subtitle/Body. Xem [CONTENT-EDITOR-v0.1.md](../ui-ux/CONTENT-EDITOR-v0.1.md). Giới hạn ký tự cho rich text phải dựa trên nội dung hiển thị, không đếm markup; quy tắc cụ thể còn là đề xuất cần chốt trước SDS/contracts.

| Trường | Giới hạn đề xuất |
|---|---|
| Display name | 2–80 ký tự |
| Tên Workspace/Project | 1–120 |
| Mô tả Workspace/Project | 0–2.000 |
| Tiêu đề Task | 1–200 |
| Mô tả Task | 0–10.000 |
| Comment | 1–5.000 |

Tên và nội dung bắt buộc không chỉ có khoảng trắng; thông báo lỗi cụ thể tại trường. Hỗ trợ tiếng Việt; cách đếm Unicode thống nhất client/server chốt SDS. Password 12–128 đã duyệt ở nhóm 3, không hỏi lại. Các con số này là giới hạn mỗi trường, không phải quota Workspace/User.

## B. Danh sách và thao tác thử lại

Đề xuất Task/Comment/Notification/Project mặc định 20 mỗi lần tải, tối đa 100 ở API. Board mỗi cột tải ban đầu 20, có tổng số khớp filter và Tải thêm độc lập. My Tasks tải 20 rồi Tải thêm; sort/search/time đã chốt giữ nguyên. Có trạng thái loading/lỗi/thử lại và phân biệt chưa có dữ liệu với filter không có kết quả. Tổng phản ánh lúc tải, không cam kết realtime ở bản đầu.

Retry cùng một thao tác tạo Task/Comment chỉ tạo một đối tượng/event; tạo mới chủ động vẫn được trùng nội dung. Sau timeout, UI xử lý kết quả chưa rõ thay vì báo chắc chắn thất bại. Cách định danh thao tác và thời hạn chống trùng thuộc SDS, phải đặc tả trước triển khai.

## C. Mục tiêu vận hành

Tổng dataset đo: 10 Workspace/100 Project/10.000 Task, 20 User đồng thời. API đọc p95 <1 giây, ghi p95 <1,5 giây; p95 nghĩa là ít nhất 95% request trong phép đo nằm dưới ngưỡng. SDS định nghĩa phân bố/kích thước dữ liệu, workload, warmup và cấu hình máy đo; không lấy số này làm quota sản phẩm.

In-app được tạo sau commit, khả dụng khi tải lại trong <5 giây ở vận hành bình thường. Không hứa tự cập nhật trên tab đang mở khi chưa chọn cơ chế realtime. Lần thử gửi email đầu <60 giây, không bảo đảm tới inbox trong 60 giây. Email lỗi không rollback Task; chống xếp hàng trùng. Cam kết không gửi email trùng trong tình huống mất phản hồi của provider phụ thuộc idempotency provider, cần chốt SDS và ghi giới hạn nếu không có.

UI dùng được ở 360/1440 px, bàn phím và đổi status không cần kéo thả. Board có thể cuộn ngang có chủ đích. Tiêu chí auth/quyền/conflict/notification là kiểm thử hành vi bắt buộc sau có ứng dụng; kiểm tra tài liệu hiện tại không thay thế chúng.

## D. Retention và phục hồi

Chưa đề xuất số ngày tùy tiện cho purge/notification/backup. Chọn theo môi trường vận hành và chi phí ở SDS, ghi rõ các mục chưa chốt trước public release. Bắt buộc có backup và thử restore; cần mục tiêu mất dữ liệu tối đa (RPO), thời gian phục hồi (RTO), cách xóa bản đã hết hạn và ảnh hưởng backup lên dữ liệu đã xóa.

## Đề nghị quyết định

1. Duyệt giới hạn nhập liệu A.
2. Duyệt pagination/tải thêm và chống trùng thao tác B.
3. Giữ C làm mục tiêu để thiết kế và đo; đưa D cùng môi trường đo/provider sang SDS để hoàn thiện trước phát hành.

Duyệt ba mục không tự đóng retention, RPO/RTO hoặc giới hạn provider chưa được xác định. Có thể chuyển sang SDS với checklist còn mở rõ ràng; chưa tự tạo baseline SRS v1.0.
