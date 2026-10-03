# Wireframe lõi — batch đầu

[Mở core.html](core.html). Mẫu HTML độc lập, dữ liệu giả trong memory, không dependencies/API/storage/mail. Reload trở về dữ liệu mẫu. Đây là prototype bố cục, không phải FE production hoặc nghiệm thu BE.

Các màn: Home Workspace cards, Workspace Projects/Active/Archived, Board ba cột desktop/tab mobile, My Tasks filter default, Task panel desktop/page mobile, Comments và forms tạo/sửa mẫu. Thử Owner/Member ở header để kiểm quyền, dữ liệu có Creator/Assignee/người đã rời và Task Archived. Các màn còn lại dựng batch sau.

## Kiểm tra 03/10/2026

Đã chạy browser checks bằng Playwright/Edge headless với profile tạm, không dùng phiên browser cá nhân: Home → Workspace → Board; search/Close giữ filter; reset; Assignee không sửa nội dung; Archived khóa status/composer; Comment text được escape; My Tasks loại Done; tạo Workspace mẫu; mobile tab và không tràn ngang ở 390px/360px. Không có browser script error trong các luồng kiểm. Đã xem ảnh desktop/mobile để review bố cục.

[Ảnh desktop](preview-desktop.png), [ảnh mobile](preview-mobile.png). Đây là kiểm prototype với mock; không thay integration tests, toàn bộ accessibility/IME/dirty-history hoặc kiểm tất cả error/conflict states.

Search/date/filters trong prototype chỉ trên tập dữ liệu giả đầy đủ, không chứng minh truy vấn server. Editor tạm textarea/toolbar placeholder; chưa rich-text/Unicode counting/IME đầy đủ. Forms chưa idempotency/CAS, error/conflict/loading frames bổ sung batch states; không dùng mẫu này làm bằng chứng quyền/delivery thật.

Chạy bằng mở file trong browser hoặc static server local. URL hash giúp mở Home/mine/workspace:w1/board:p1/task:t1; browser Back giữa Task và danh sách giữ filters đã mở trong tab. Route trực tiếp Task có background fallback Board. Colors/font là tạm, chưa chốt branding/library.
