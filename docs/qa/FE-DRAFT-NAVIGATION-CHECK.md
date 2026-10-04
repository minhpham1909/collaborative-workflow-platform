# P1 — Bảo vệ bản nháp khi điều hướng

Ngày 04/10/2026. Sửa NAV-01 sau mốc `a278e7c`; phạm vi là luồng điều hướng và dữ liệu chưa lưu, không thêm autosave/storage hoặc đổi quyền nghiệp vụ.

## Hành vi

- Các form đăng ký bản nháp/đang lưu vào một cơ chế chung. Back, Forward, thay hash và liên kết được kiểm trước khi React chuyển route và tháo form.
- Dialog dùng “Ở lại” / “Bỏ thay đổi”. Ở lại hoặc Escape giữ nguyên form, nội dung và URL nguồn. Chấp nhận mới chuyển sang URL đích. Thao tác liên tiếp dùng chung một prompt, không xếp nhiều dialog hỏi bỏ bản nháp.
- Đang lưu: không rời route hoặc đăng xuất; phản hồi ngắn yêu cầu chờ kết quả. Không chặn những request chỉ đọc để tải danh sách.
- Đăng xuất chủ động kiểm bản nháp trước khi thu hồi phiên. Lỗi mạng khi logout vẫn giữ thông điệp kết quả chưa được xác nhận; không biến xác nhận bỏ draft thành xác nhận đã logout thành công.
- NotificationProvider chỉ hủy dialog khi route đã commit. Hash tạm đổi trong lúc chờ xác nhận không làm dialog biến mất.
- Refresh/đóng tab/rời document dùng `beforeunload` của trình duyệt. Đây là cảnh báo chuẩn của trình duyệt, không thay bằng dialog React. Hiệu lực phụ thuộc quy định trình duyệt và việc người dùng đã tương tác.
- Không ghi draft, password, token vào localStorage/sessionStorage/history state. Token email vẫn được scrub theo cơ chế hiện có.

## Phục hồi lịch sử

Dùng key của history entry do Navigation API cung cấp để trở lại đúng vị trí khi hủy Back/Forward; key vẫn đại diện cho slot khi URL/state bị replace. Cơ chế này theo [tài liệu Navigation API của Chrome](https://developer.chrome.com/docs/web-platform/navigation-api), được kiểm bằng Edge cài trên máy.

Feature detection: nếu thiếu API, hoặc entry cũ đã bị loại khỏi nhánh lịch sử do một lần chuyển URL tiếp theo trong lúc prompt đang mở, thay URL hiện tại về nguồn và giữ nguyên React tree. Fallback này **bảo vệ draft/URL nhưng không bảo toàn nguyên vẹn các slot Back/Forward**. Không công bố hỗ trợ đầy đủ mọi trình duyệt; Firefox/Safari chưa chạy thực tế. URL có thể tạm hiển thị đích trong lúc hỏi, vì hash của trình duyệt đã đổi trước khi React nhận sự kiện.

## Kiểm chứng

`FE/scripts/check-navigation-flows.mjs` chạy React/Express/Mongo và browser riêng, dữ liệu synthetic, không sử dụng tài khoản/DB dev hoặc gọi SMTP/Google thật:

| Phạm vi | Kết quả |
|---|---|
| Task tạo: Back, Forward, hash trực tiếp, link; hủy/Escape/chấp nhận | Giữ draft khi hủy; bỏ draft đúng khi chấp nhận; Back/Forward tiếp tục hoạt động |
| Task sửa; bình luận tạo/sửa | Nội dung còn nguyên sau Back bị hủy |
| Project đổi tên/mô tả | Form/modal và nội dung còn nguyên |
| Home tạo Workspace | Tên chưa tạo còn nguyên |
| Workspace tên/mô tả, own email overrides | Nội dung và lựa chọn còn nguyên |
| Hồ sơ, email preferences, password form | Nội dung/lựa chọn còn nguyên; không đổi mật khẩu trong test navigation |
| Lời mời, đăng ký, khôi phục, reset | Form còn nguyên; không gửi lời mời/đăng ký/reset từ test navigation; token reset không nằm trên URL |
| Logout bị hủy | Không thu hồi phiên; hồ sơ đang sửa vẫn còn |
| Refresh bị hủy qua beforeunload | Draft Task còn nguyên |
| Task đã commit, response đang bị giữ | Back bị chặn; sau nhận response có đúng một record |
| History có sẵn trước App mount | Hủy Back trở về form cũ, draft còn nguyên |
| Navigation API bị tắt trong fixture | Fallback giữ URL và draft |
| Hash đổi lần nữa khi prompt mở, entry nguồn bị dispose | Fallback giữ draft, không có pageerror |

Các scripts account/settings/interactions/network được chạy lại để kiểm token scrub, CAS, uncertain 503, nested dialogs, quyền và điều hướng sau thành công. FE build và 12 unit tests đạt. Không sửa BE, không cần lặp lại BE integration suite cho thay đổi này; 46 BE integration tests trong audit trước vẫn là bằng chứng của mốc trước.

## Giới hạn và bước tiếp

NAV-01 đã sửa trong phạm vi trên; P1 có thể chuyển sang P2 theo gate audit. Các vấn đề picker, field errors, dialog labels và trạng thái UI vẫn nằm P2. Khôi phục filters/presets thuộc P4; fallback history nêu trên chưa đồng nghĩa P4 đã hoàn thành. Không phải backup draft/autosave, không chống mất dữ liệu khi process bị kill hoặc trình duyệt không phát beforeunload. Thu hồi phiên/mất quyền từ hệ thống vẫn có ưu tiên bảo mật, không bị draft guard cản lại.
