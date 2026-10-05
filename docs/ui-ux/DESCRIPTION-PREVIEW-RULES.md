# P3 — Quy ước xem mô tả và vùng tương tác

05/10/2026. Component chung DescriptionPreview dùng cho Workspace header và Project scope.

- Nội dung tối đa 280 ký tự và tối đa 3 dòng: hiển thị rich text trực tiếp.
- Nội dung dài: excerpt plainText 2 dòng; nút Đọc toàn bộ mô tả luôn hiển thị. Đây là preview, không cắt hoặc thay document lưu.
- Khi mở: toàn bộ rich text trong region có tên, tabindex=0, focus rõ và max-height min(360px,50dvh). Cuộn bằng chuột/touch/Tab + phím cuộn, có hướng dẫn. Thu gọn/sửa nằm ngoài region để không phải tìm đến cuối tài liệu.
- Toggle dùng aria-expanded/aria-controls. Việc mở/thu gọn không tạo draft, không tự lưu và không thay quyền sửa. Workspace chỉ Owner; Project theo quyền hiện hành Owner/Creator còn membership và Active.
- Text/link dài wrap anywhere; giữ heading/list/link/dấu Việt/emoji. Editor read-only có aria-readonly. Description của Task/Comments trên trang chi tiết giữ flow đọc riêng.
- Card dùng anchor + stretched surface, CTA độc lập có lớp ưu tiên. Không dùng div onClick thay link. Inbox nhiều actions giữ từng CTA, tránh lớp phủ che buttons.
- Focus field/region có outline tím 2px. Toolbar tối thiểu 40px desktop/44×44px mobile, có accessible name; controls hidden/disabled giữ cơ chế focus P2.
- Nút Đi đến nội dung chính chỉ focus/scroll main, không đổi hash nên không kích hoạt discard draft. Điều hướng/khôi phục context thuộc P4.

Bằng chứng và giới hạn tại [QA P3](../qa/FE-P3-INTERACTION-CHECK.md).
