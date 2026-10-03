# Traceability SRS v0.2

Tạo từ SRS-v0.2.md và use-cases.json bằng scripts/check-srs.ps1 -WriteTraceability. Chỉ phản ánh tham chiếu tài liệu, không phải kết quả nghiệm thu hoặc phê duyệt.

## FR → UC

| FR | UC | Giai đoạn |
|---|---|---|
| FR-01 | UC-01 | Bản đầu |
| FR-02 | UC-02, UC-03, UC-34 | Bản đầu |
| FR-03 | UC-04, UC-05 | Bản đầu |
| FR-04 | UC-06, UC-07 | Bản đầu |
| FR-05 | UC-08 | Bản đầu |
| FR-06 | UC-09 | Bản đầu |
| FR-07 | UC-10, UC-11 | Bản đầu |
| FR-08 | UC-12 | Bản đầu |
| FR-09 | UC-13, UC-14, UC-15, UC-16 | Bản đầu |
| FR-10 | UC-17, UC-18, UC-19, UC-20 | Bản đầu |
| FR-11 | UC-17, UC-19 | Bản đầu |
| FR-12 | UC-21 | Bản đầu |
| FR-13 | UC-22 | Bản đầu |
| FR-14 | UC-23, UC-24 | Bản đầu |
| FR-15 | UC-25 | Bản đầu |
| FR-16 | UC-26, UC-01, UC-34 | Bản đầu |
| FR-17 | UC-27 | Bản đầu |
| FR-18 | UC-28, UC-34 | Bản đầu |
| FR-19 | UC-29 | Bản đầu |
| FR-20 | UC-30, UC-31 | Bản đầu |
| FR-21 | UC-32 | Bản đầu |
| FR-22 | UC-33 | Bản đầu |
| FR-23 | UC-17, UC-19, UC-23, UC-32 | Bản đầu |
| FR-24 | UC-01, UC-08, UC-19, UC-30, UC-31, UC-33 | Bản đầu |
| FR-25 | UC-19, UC-32, UC-33 | Increment Nhắc hạn |
| FR-26 | Chưa có UC chi tiết | Increment Browser push |
| FR-27 | Chưa có UC chi tiết | Upcoming sau phần lõi, đã xác nhận 03/10/2026 |
| FR-28 | UC-34 | Bản đầu |
| FR-29 | UC-35 | Capability đã chốt; phase/quota cần review |

FR-25 có tham chiếu trong UC core để giữ ranh giới increment; chưa cần nghiệm thu reminder ở bản đầu. FR-26/27 chưa có UC chi tiết và cần phụ lục trước triển khai.

## UC → FR/BR/AC

| UC | Tên | FR | BR | AC chính |
|---|---|---|---|---|
| UC-01 | Đăng ký tài khoản | FR-01, FR-16, FR-24 | BR-16, BR-25 | AC-01 |
| UC-02 | Đăng nhập | FR-02 | BR-21 | AC-02 |
| UC-03 | Đăng xuất | FR-02 | BR-21 | AC-03 |
| UC-04 | Xem các Workspace đang tham gia | FR-03 | BR-02, BR-12 | AC-04 |
| UC-05 | Tạo Workspace | FR-03 | BR-01, BR-02 | AC-05 |
| UC-06 | Chỉnh sửa Workspace | FR-04 | BR-04, BR-26 | AC-06 |
| UC-07 | Xem thành viên Workspace | FR-04 | BR-03, BR-16 | AC-07 |
| UC-08 | Quản lý lời mời | FR-05, FR-24 | BR-14, BR-15, BR-20 | AC-08 |
| UC-09 | Gia nhập Workspace qua lời mời | FR-06 | BR-02, BR-14, BR-15 | AC-09 |
| UC-10 | Rời Workspace | FR-07 | BR-06, BR-12, BR-13, BR-18 | AC-10 |
| UC-11 | Loại thành viên | FR-07 | BR-04, BR-12, BR-13, BR-15 | AC-11 |
| UC-12 | Chuyển ownership | FR-08 | BR-01, BR-05 | AC-12 |
| UC-13 | Xem danh sách và thông tin Project | FR-09 | BR-03, BR-11 | AC-13 |
| UC-14 | Tạo Project | FR-09 | BR-04 | AC-14 |
| UC-15 | Chỉnh sửa Project | FR-09 | BR-04, BR-11, BR-26 | AC-15 |
| UC-16 | Archive hoặc mở lại Project | FR-09 | BR-04, BR-11 | AC-16 |
| UC-17 | Tạo Task | FR-10, FR-11, FR-23 | BR-07, BR-08, BR-11, BR-17 | AC-17 |
| UC-18 | Xem chi tiết Task | FR-10 | BR-03, BR-11, BR-12 | AC-18 |
| UC-19 | Cập nhật Task | FR-10, FR-11, FR-23, FR-24, FR-25 | BR-07, BR-08, BR-09, BR-11, BR-13, BR-17, BR-26 | AC-19 |
| UC-20 | Xóa Task | FR-10 | BR-09, BR-11 | AC-20 |
| UC-21 | Theo dõi Project qua Kanban Board | FR-12 | BR-08, BR-09, BR-11, BR-26 | AC-21 |
| UC-22 | Theo dõi My Tasks | FR-13 | BR-22, BR-23 | AC-22 |
| UC-23 | Thêm Comment | FR-14, FR-23 | BR-11, BR-17 | AC-23 |
| UC-24 | Chỉnh sửa hoặc xóa Comment của mình | FR-14 | BR-10, BR-11, BR-26 | AC-24 |
| UC-25 | Xem giới thiệu sản phẩm | FR-15 |  | AC-25 |
| UC-26 | Đọc chính sách ứng dụng | FR-16 |  | AC-26 |
| UC-27 | Bắt đầu sử dụng sau đăng nhập | FR-17 | BR-02 | AC-27 |
| UC-28 | Xem và chỉnh sửa Profile | FR-18 | BR-16 | AC-28 |
| UC-29 | Đổi password | FR-19 | BR-21 | AC-29 |
| UC-30 | Khôi phục password | FR-20, FR-24 | BR-21, BR-25 | AC-30 |
| UC-31 | Xác minh email | FR-20, FR-24 | BR-25 | AC-31 |
| UC-32 | Xem và xử lý In-app Notifications | FR-21, FR-23, FR-25 | BR-17, BR-18, BR-24 | AC-32 |
| UC-33 | Thiết lập tùy chọn Email Notifications | FR-22, FR-24, FR-25 | BR-19, BR-17 | AC-33 |
| UC-34 | Đăng nhập hoặc liên kết tài khoản Google | FR-02, FR-16, FR-18, FR-28 | BR-16, BR-21 | AC-34 |
| UC-35 | Xem và quản lý thông báo chung có ghim của Workspace | FR-29 | BR-04, BR-12, BR-26 | AC-35 |
