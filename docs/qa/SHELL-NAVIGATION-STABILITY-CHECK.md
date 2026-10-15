# Khung điều hướng ổn định khi chuyển trang

15/10/2026.

## Nguyên nhân và thay đổi

- Điều hướng hiện tại dùng hash; shell nằm ngoài RouteFrame. Không phát hiện reload tài liệu khi chuyển Home → Workspace → My Tasks trong kiểm thử browser.
- ProjectPinsProvider xoá items trước mọi lần revalidation theo route/focus, khiến danh sách ghim biến mất rồi xuất hiện. Giữ kết quả đã xác nhận khi request đang chạy; lỗi vẫn xoá items để không giữ link có thể đã mất quyền. Không cache hoặc bỏ kiểm tra quyền nội dung trang.
- Header dùng grid với vùng nhãn co giãn, vùng chuông/tài khoản riêng; nhãn dài ellipsis. Header sticky; sidebar desktop giữ sticky sẵn có. Document dành sẵn gutter thanh cuộn để trang ngắn/loading/dài không làm đổi bề rộng.
- Tải trước module màn hình trên pointer/focus intent ở liên kết trong shell. Chỉ tải code, không gọi API hoặc đổi route; bỏ qua khi trình duyệt bật Save-Data. Lỗi prefetch không chặn navigation; route error vẫn xử lý như trước.
- Không giữ màn hình/form ẩn giữa các route; loading dữ liệu vẫn cần thiết, chỉ nằm ở nội dung. Không tuyên bố hết mọi thời gian chờ mạng hoặc giữ draft xuyên route.

## Kiểm chứng

- Browser isolated Light/VI và Dark/EN: DOM header/sidebar giữ nguyên khi chuyển route, không request document mới, tọa độ chuông/tài khoản/chiều cao header không đổi giữa Home/Workspace/My Tasks.
- Kiểm thử nhãn dài và sticky tại 375/768/1440; collection layout/contrast/no overflow ở 375/768/1024/1280/1440.
- FE 35/35 PASS. Build/budget PASS: initial 423834/425000 bytes.
- Không thay đổi BE hoặc dữ liệu dev, không SMTP/worker/deploy.

Log: .local/shell-stability-*.log, .local/shell-units.log, .local/shell-build.log. Ảnh: .local/collection-views.
