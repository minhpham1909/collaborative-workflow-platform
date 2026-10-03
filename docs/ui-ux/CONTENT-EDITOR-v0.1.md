# Trình soạn nội dung v0.1

Ngày 03/10/2026. Trạng thái: yêu cầu bổ sung từ chủ dự án về hyperlink, emoji, dấu tiếng Việt, bộ đếm và toolbar/kiểu nội dung đã được ghi nhận. Phạm vi trường và bộ định dạng cụ thể dưới đây là đề xuất thiết kế, chưa duyệt toàn bộ. Không thêm upload hoặc thay đổi quyền ghi đã chốt.

## 1. Phạm vi đề xuất

Cập nhật 03/10/2026: chủ dự án duyệt áp dụng chung editor cho mô tả Task, Comment và mô tả Workspace/Project. Phạm vi bảng dưới đã chốt; cách hiện toolbar có thể gọn hơn theo vị trí nhưng dùng chung bộ format, representation và validation. Website Việt/Anh; nhãn toolbar/heading/bộ đếm theo ngôn ngữ giao diện, không dịch nội dung người dùng. Các chi tiết bộ định dạng/counting còn là đầu vào thiết kế đề xuất.

| Trường | Cách nhập |
|---|---|
| Display name, tên Workspace/Project, tiêu đề Task | Văn bản một dòng, hỗ trợ tiếng Việt/emoji, không toolbar rich text |
| Mô tả Task | Editor đầy đủ bộ định dạng bản đầu |
| Comment | Cùng editor, toolbar gọn/mở rộng khi cần, cùng bộ định dạng |
| Mô tả Workspace/Project | Cùng editor/bộ định dạng, phạm vi đã duyệt |

Tiêu đề Task là tên đối tượng dùng trên Board/search; heading bên trong mô tả là cấu trúc nội dung, không thay tiêu đề Task. Title/Subtitle/Body là kiểu trình bày nội dung, không phải shape hình vẽ. Không tự đưa shape, Word import/export, ảnh hoặc file đính kèm vào bản đầu từ yêu cầu này.

## 2. Toolbar và kiểu nội dung đề xuất

- Kiểu đoạn: Tiêu đề lớn, Tiêu đề nhỏ, Nội dung thường; dùng cấu trúc heading/paragraph nhất quán, nhãn Việt/Anh theo ngôn ngữ giao diện.
- Đậm, nghiêng, gạch chân, gạch ngang; danh sách chấm và đánh số; trích dẫn.
- Chèn/sửa/bỏ hyperlink có nhãn hiển thị; link không cần có cùng nội dung với URL. Nhận diện URL gõ/paste trong văn bản thông thường, cho bỏ liên kết.
- Nút chọn emoji và hỗ trợ nhập/paste emoji từ bàn phím hệ điều hành.
- Undo/redo và xóa định dạng vùng chọn; toolbar phản ánh định dạng đang chọn, không mất vùng chọn khi bấm nút.
- Phím tắt phổ biến cho đậm/nghiêng/undo/redo; mọi nút có tên truy cập được và thao tác bàn phím.

Màu tùy ý/font tùy ý, bảng, shape hình vẽ và tài liệu phân trang chưa thuộc bộ đề xuất bản đầu. Nếu có nhu cầu, cần đặc tả riêng; editor dùng style sản phẩm thống nhất để dễ đọc trên điện thoại và notification.

## 3. Tiếng Việt, emoji và bộ đếm

Không làm mất dấu, nhảy con trỏ hoặc chặn chữ đang ghép bằng bộ gõ tiếng Việt. Chỉ áp validation sau khi hoàn tất composition; không sửa văn bản người dùng chỉ để phục vụ search. Emoji nhiều thành phần như màu da/gia đình phải hiển thị và giữ nguyên khi lưu/tải lại.

Đề xuất hiển thị cả số từ và ký tự; giới hạn lưu dựa trên ký tự người dùng nhìn thấy (grapheme cluster), không tính thẻ định dạng, URL ẩn đằng sau nhãn hyperlink hoặc metadata editor. Đếm xuống dòng như một ký tự, bỏ đoạn rỗng cuối do editor tự sinh; không trim nội dung có chủ đích. Cách tách từ tiếng Việt phải được mô tả, số từ là tham khảo và không là giới hạn lưu. Emoji được tính vào ký tự, không dùng chúng làm số từ tin cậy.

Hiện bộ đếm dạng “1.240 / 10.000 ký tự · 210 từ”; cảnh báo gần ngưỡng, báo vượt ngưỡng và không cho lưu. Không âm thầm cắt bỏ nội dung đang nhập. Chặn nội dung chỉ có khoảng trắng/đoạn rỗng khi trường bắt buộc. Client/backend dùng chung quy tắc đếm được đặc tả ở SDS; raw document/URL cũng có giới hạn kích thước riêng ở SDS để ký tự hiển thị không trở thành giới hạn duy nhất.

## 4. Link, paste, đọc và search

Link đề xuất hỗ trợ http/https/mailto; chỉ mở khi người dùng chủ động, dùng nhãn rõ và hiển thị URL để review khi chỉnh. Không thực thi script hoặc nhận HTML tùy ý thành nội dung được tin cậy. Backend kiểm tra cấu trúc/loại node/mark/URL; viewer chỉ render bộ định dạng được cho phép.

Paste từ Word/web giữ text, xuống dòng và các định dạng được hỗ trợ; bỏ định dạng/font/style lạ và không tự upload ảnh. Có lựa chọn dán văn bản thuần. Link và dấu/emoji không bị mất sau lưu/tải lại. Clipboard HTML không thay thế validation server.

Board/card, search và email dùng bản text trích xuất phù hợp; search title/description đã chốt không tìm các thẻ/metadata. Với hyperlink, bản đầu đề xuất search theo nhãn hiển thị, chưa mở rộng sang URL ẩn. Email/notification tuân theo event và quyền đã chốt, không gửi toàn bộ rich text ngoài phạm vi người nhận được phép.

## 5. Các trạng thái UI và quyền

Editor có normal/focus/dirty/saving/saved/error/over-limit/conflict/read-only. Archived và người không có quyền sửa dùng viewer; Assignee-only không được sửa nội dung qua editor. Conflict giữ cả nội dung và định dạng đang nhập trong giao diện đang mở để sao chép; không giả hứa autosave hoặc phục hồi sau đóng tab.

Mobile gom toolbar thành nhóm/more menu, giữ bộ đếm và lỗi dễ thấy. Undo chỉ áp dụng lịch sử chỉnh sửa tại editor đang mở; không tương đương audit history nghiệp vụ.

## 6. Kiểm chứng trước nghiệm thu

1. Nhập tiếng Việt bằng bộ gõ, emoji ghép, link có nhãn và các heading; lưu/tải lại không mất nội dung hoặc định dạng.
2. Bold/undo/paste và toolbar không làm mất vùng chọn; bàn phím/mobile dùng được.
3. Đếm nhất quán client/server với tiếng Việt dạng Unicode khác nhau, emoji ghép, xuống dòng, link và đoạn rỗng tự sinh; giới hạn không phụ thuộc markup.
4. Paste nội dung có HTML/style/URL không hợp lệ chỉ giữ phần được phép; không chạy nội dung chủ động.
5. Viewer Archived, permission checks, conflict, search/card/notification tuân theo quy tắc đã chốt.

## 7. Đầu vào SDS còn cần quyết định

Chọn editor library sau khi xác định stack và kiểm chứng IME/accessibility; chưa chọn thư viện. SDS cần schema rich-text có version, allowlist node/mark, validation/size limits, plain-text extraction phục vụ search/preview/count, migration và API contract. Không mặc định lưu HTML hoặc text thuần rồi bỏ định dạng.
