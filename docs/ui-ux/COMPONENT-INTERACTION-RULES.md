# P2 — Quy ước component và phản hồi

Ngày 04/10/2026. Giữ React/JSX, CSS nội bộ và nền Stitch/Jakarta/kem-tím. Không dựng lại wireframe; áp dụng từng phần vào ứng dụng thật. P2 đang làm, chưa chuyển P3.

## Chọn cách phản hồi

| Tình huống | Cách xử lý |
|---|---|
| Dữ liệu nhập sai | Lỗi cạnh field, liên kết bằng aria-describedby; aria-invalid và focus về ô sai nếu có thể. Không dùng toast thay lỗi cần sửa |
| Request bị từ chối / mất quyền / CAS | Lỗi cạnh form hoặc dữ liệu liên quan, giữ nội dung nhập; chỉ rõ cần tải lại/kiểm quyền. BE vẫn quyết định quyền và validation |
| Timeout/5xx sau mutation | Kết quả chưa xác định; khóa gửi lại và hướng dẫn kiểm dữ liệu. Không tự retry mutation |
| Lưu thành công | Phản hồi ngắn qua NotificationProvider; cập nhật dữ liệu sau phản hồi xác nhận |
| Bỏ draft / thao tác cần xác nhận | Dialog của ứng dụng; tên action diễn đạt tác động. Navigation dùng “Ở lại” / “Bỏ thay đổi” |
| Refresh/đóng document còn draft | beforeunload của browser; giới hạn theo QA điều hướng |
| Tải danh sách lựa chọn | Trạng thái riêng cạnh picker, retry chỉ GET; không nhập lỗi này vào lỗi lưu form |

## Component đã áp dụng

- `FormField`: ID duy nhất, label gắn control, một dòng hint/error có chiều cao tối thiểu; màu lỗi dùng chung, field lỗi có viền và nội dung chữ. Áp dụng tiêu đề Task, tên Project trong NameDialog và các ô MemberPicker. Các form khác chưa migrate.
- `MemberPicker`: tìm theo tên bằng API Members, debounce 250ms và cursor server; không lọc trên trang đã tải. Giữ ID/tên người đã chọn riêng với kết quả tìm kiếm. Có loading/no-result/error/retry/clear/load-more. Phản hồi query cũ không thay kết quả query mới; tải thêm đang chạy không được gọi lặp. Select native giữ bàn phím chuẩn, không dựng combobox riêng.
- Tìm kiếm/thử tải thành viên không đánh dấu Task là draft; thay title/assignee/deadline/description mới đánh dấu. Không tự bỏ assignee khi không có trong kết quả tìm kiếm; BE kiểm membership khi lưu. Với Task Done có assignee đã rời, giữ tên/nhãn hiện có, không suy luận “đã rời” từ một trang kết quả thiếu người.
- `NotificationProvider`, `NameDialog`, `ProjectIconPicker`, `RichEditor` tiếp tục dùng nền tương tác có sẵn. Không tạo một hệ dialog/toast thứ hai.
- `PasswordField` (05/10): dùng FormField, mặc định ẩn; toggle độc lập từng ô, type=button, label nói rõ hiện/ẩn ô nào và aria-pressed. Áp dụng Login/Register/Reset/đổi mật khẩu/liên kết Google; không trim password, không đưa giá trị vào storage. Lỗi độ dài/xác nhận nằm cạnh ô; lỗi xác thực từ BE còn ở vùng lỗi form.
- Team: nút submit ghi Tạo lời mời/Loại thành viên/Chuyển quyền sở hữu/Rời Workspace/Thu hồi lời mời/Thử gửi lại email. Escape/Đóng lời mời dirty hỏi qua guard chung. Rời nhóm thành công chỉ chuyển route sau khi busy đã kết thúc, để guard không chặn điều hướng sau thao tác hợp lệ.

## Coverage và việc tiếp theo

| Phần | Trạng thái |
|---|---|
| MemberPicker trong Task tạo/sửa; lỗi title/name/description cạnh dữ liệu | Đã triển khai, QA fixture ghi tại FE-COMPONENTS-CHECK |
| Auth/Settings/Workspace/Team field errors và mật khẩu hiện/ẩn | PasswordField + lỗi password/confirmation đã áp dụng; các field còn lại tiếp tục P2 |
| Team labels cho remove/transfer/revoke/leave; dialog layout chung | Labels và đóng invite dirty đã sửa, lifecycle QA đạt; dialog layout chung chưa migrate |
| Workspace picker trong My Tasks | Chưa có search server nối vào picker; PICKER-01 mới xử lý phần assignee |
| Loading/empty/error/read-only và toast trên mọi cụm | Chưa nghiệm thu toàn bộ |

Không coi việc có FormField là hoàn thành P2. Chỉ chuyển P3 khi các tiêu chí trong kế hoạch nâng cấp có bằng chứng đủ phạm vi. Không thêm số liệu giả, ảnh, dark mode hoặc thư viện mới trong increment này.
