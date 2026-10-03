# Ngôn ngữ sản phẩm — Việt/English

Ngày 03/10/2026. Chủ dự án yêu cầu website hỗ trợ tiếng Việt và tiếng Anh. Năng lực song ngữ là yêu cầu đã ghi nhận; chính sách mặc định/lưu lựa chọn dưới đây là thiết kế đề xuất, chưa phải quyết định nghiệp vụ được duyệt riêng.

## Phạm vi bắt buộc

- Giao diện và điều hướng, label/placeholder, tooltip, toolbar editor, status, bộ đếm và nút thao tác có đủ bản Việt/Anh.
- Validation, lỗi, loading/empty/no-results/conflict/read-only, auth và invitation có nội dung hai ngôn ngữ.
- Thông báo do hệ thống tạo, email auth/invitation/công việc và các trang public có nội dung Việt/Anh phù hợp. Terms/Privacy cần review cả hai bản trước phát hành; không coi dịch UI là hoàn thiện nội dung Policies.
- Đổi ngôn ngữ không dịch tên, mô tả, Comment hoặc nội dung người dùng nhập; không đổi quyền, status lưu, sort/search hoặc múi giờ deadline đã chốt.
- Editor hỗ trợ người dùng nhập Việt, Anh hoặc trộn cả hai, cùng format/schema; heading và toolbar chỉ đổi nhãn.

## Thiết kế đề xuất

Việt mặc định khi chưa có lựa chọn; bộ chọn Việt/English có ở public/auth và Personal Settings. Lưu lựa chọn khách trên trình duyệt, User đã đăng nhập theo tài khoản; lựa chọn tài khoản ưu tiên khi đăng nhập và dùng trên các thiết bị. Đổi ngôn ngữ khi đang nhập giữ nguyên bản nháp, vùng chọn và bộ lọc, không bắt đăng nhập lại.

In-app dịch mẫu hệ thống theo ngôn ngữ đang xem, giữ nguyên nội dung người dùng và quyền truy cập. Email cho User dùng ngôn ngữ tài khoản tại lúc tạo nội dung gửi; invitation gửi tới email chưa có User đề xuất theo ngôn ngữ người mời. Không gửi cả hai bản email cho cùng một sự kiện. Đây là chính sách đề xuất cần ghi rõ ở SDS trước triển khai email.

Ngày/giờ/số hiển thị theo locale, timezone vẫn Asia/Ho_Chi_Minh ở bản đầu cho cả hai ngôn ngữ. Số từ là tham khảo, quy tắc đếm ký tự Unicode thống nhất không đổi theo locale. Không suy từ ngôn ngữ rằng User ở Việt Nam hoặc được đổi timezone tự động.

## Đầu vào SDS/UI

Catalog bản dịch đầy đủ, mã lỗi ổn định thay vì backend chỉ trả câu Việt, template email và notification có dữ liệu/mẫu tách nhau; cơ chế fallback và phát hiện thiếu bản dịch. Không chọn thư viện i18n trong SRS. Thiết kế mobile kiểm tra độ dài nhãn cả hai ngôn ngữ.

## Nghiệm thu

Chuyển Việt/Anh trên public/auth, Task/Comment editor và các màn hình chính; không mất draft/filter hoặc đổi nội dung người dùng. Status có cùng ý nghĩa và quyền trong hai bản. Lỗi/notification/email dùng đúng bản dịch theo chính sách được chọn; không lộ nội dung khi mất quyền. Deadline chỉ đổi cách trình bày, không đổi thời điểm. Bộ đếm hỗ trợ tiếng Việt/Anh/emoji và giới hạn nhất quán.
