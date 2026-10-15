# P3b — Team, lời mời, ownership và vòng đời Workspace

15/10/2026. Browser native Workspace-only với DB/API và bốn tài khoản riêng; không Organization adapter, không dữ liệu dev/SMTP/worker/deploy.

## Ca kiểm tra

- Owner bổ nhiệm Member thành Manager qua UI có lý do; Workspace có đồng thời hai Manager. Manager không có CTA bổ nhiệm hoặc chuyển Owner.
- Manager tạo LINK invitation qua dialog. Link chỉ hiển thị ở kết quả; tài khoản đã xác minh chấp nhận qua service và nhận Member. Thu hồi link qua service khiến preview từ chối INVITATION_UNAVAILABLE, không thu hồi membership đã cấp.
- Chuyển Owner qua Team: nút gửi khoá trước khi nhập đúng tên Workspace. Sau chuyển, người nhận là Owner, Owner cũ là Member; role-audit có các sự kiện. Nhật ký UI tải và hiển thị lý do bổ nhiệm.
- Owner mới gỡ Member qua Team: quyền truy cập Workspace mất, tài khoản vẫn tồn tại.
- Owner mới tạo một Project active và một Project archived riêng qua service. Lưu trữ Workspace qua UI cần tên chính xác và lý do; Task bên trong chuyển readonly. Mở lại qua UI giữ Project active/archived như trước, Task của Project active có quyền sửa trở lại.
- Light/VI1440 và Dark/EN375; không pageerror hoặc overflow trong các trang được kiểm tra. Script FE/scripts/check-product-workspace-team.mjs, log .local/p3b-*-final.log.

Không sửa code sản phẩm trong patch này: các ca trên đạt với logic hiện tại. Không chạy lại build hoặc toàn bộ suite vì chỉ thêm browser acceptance và tài liệu.

## Còn lại P3c

- Email preferences trong nhóm; Ban/unban và cleanup; kiểm thử lỗi ghi/CAS/mất quyền trong dialog role/ownership/lời mời.
- Email invitation, Guest invitation thuộc Project, pagination dài và quyền thông tin audit cần nghiệm thu riêng; ca LINK admission/revocation hiện gọi service, không chứng minh toàn bộ UI của các luồng này.
- Chưa đóng toàn bộ P3 hoặc công bố sản phẩm sẵn sàng deploy.
