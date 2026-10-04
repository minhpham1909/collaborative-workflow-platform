# P2 — FormField và MemberPicker

Ngày 04/10/2026, sau `2f699d8`. P2 đang triển khai; increment này xử lý assignee search và lỗi nhập cạnh field. Không sửa BE/quyền/API hoặc gọi nhà cung cấp thật.

## Đã kiểm

- `FE/scripts/check-interaction-flows.mjs`: React/Express/Mongo riêng, chọn Lan → tìm không có kết quả vẫn giữ assignee → tìm Lan bằng server → xóa query. Lỗi GET 503 giữ người đã chọn, khóa lựa chọn và cho retry; retry thành công. GET Minh được giữ response, GET Lan hoàn thành trước: response Minh đến muộn không ghi đè kết quả Lan.
- Title toàn khoảng trắng: aria-invalid=true và lỗi cạnh field; sửa lại thì xóa lỗi. Task create/edit, rich text/comments, CAS, quyền, archived/read-only và xóa/unavailable tiếp tục qua regression hiện có.
- `FE/scripts/check-navigation-flows.mjs`: Back/Forward/hash/link/refresh/logout, các form dirty và mutation đang chạy đạt sau thay MemberPicker. Không lưu dữ liệu draft/password/token xuống storage.
- 12 FE unit tests đạt; production build 109 modules đạt.
- Screenshot Task form desktop 1440px/mobile 375px tại `.local/p2-components/`; đã xem trực tiếp. Không tràn ngang, controls không đè chữ. Dữ liệu/avatar là fixture, không đưa số liệu mẫu lên sản phẩm.
- Đã chạy hàm đo `measureInPage` của skill `ui-ux/scripts/probe.mjs` trên trang fixture thật qua adapter local, ở hai kích thước; báo cáo `.local/p2-components/probe-measurements.json`. Đây là phần đo geometry/contrast/control, không phải toàn bộ probe hover/popup/sweep. Không có lỗi tương phản, vùng bấm nhỏ, field lệch hoặc overflow trong lần đo này.

## Các cờ và giới hạn

Probe còn cờ header desktop (gom các nút khác vùng thành một hàng), chữ “Tài khoản cá nhân” 10px và datetime-local native. Header chia brand/navigation/account có chủ đích; cần nghiệm thu shell riêng ở P6. Chữ phụ 10px còn backlog P6. Giữ date picker native trong increment này; không tự viết calendar. Không công bố toàn bộ probe đã sạch.

Pagination/load-more có cơ chế dùng cursor và khóa request; lần QA này chưa dựng Workspace >20 thành viên hoặc test bỏ quyền đúng lúc tìm. Membership/CAS vẫn do BE kiểm khi lưu. Workspace picker, show/hide password, field migration toàn bộ và Team action labels còn P2; xem [quy ước component](../ui-ux/COMPONENT-INTERACTION-RULES.md).

Một lần chạy song song không khởi động được Mongo fixture; một lần build thiếu bộ nhớ. Chạy lại đã đạt. Một lần harness đóng toast theo index cũ timeout; đổi sang đóng phần tử đầu hiện có và chạy lại đạt. Không tính các lần lỗi này là pass, không tác động DB dev/SMTP.

## Increment tiếp theo — 05/10/2026

Sau `9d1f412`: PasswordField nối vào Login/Register/Reset/Security/link Google; lỗi password/confirmation cạnh field. Team submit dùng tên hành động cụ thể, Escape/Đóng invite dirty hỏi trước khi bỏ nội dung. Login khóa gửi lặp bằng pending ref và guard busy.

- Account regression đạt: toggle giữ giá trị, không bật đồng thời ô xác nhận; register/verify/recover/reset/token scrub. Bổ sung Login đã nhận response nhưng còn giữ trước FE: requestSubmit hai lần vẫn đúng một POST, link recovery không tháo Login; nhận response xong vào Home.
- Settings regression đạt sau sửa constraint width cũ: nút eye nằm trong input (assert geometry), show/hide giữ giá trị; password rotation/reload, profile/preferences/CAS/uncertain 503 và Google GIS/verifier fixture vẫn đạt. Screenshot Security 1440/375px đã xem, không overflow; không chụp password đang hiện.
- Navigation regression đạt thêm Escape invite dirty → Ở lại giữ email và dialog; labels mới không làm đổi guard của form khác.
- `FE/scripts/check-team-flows.mjs` mới được đưa vào Git từ fixture local: EMAIL outbox/retry, LINK một lần, login intent/accept, membership CAS/remove, transfer/revoke/leave và responsive đạt. Không chạy worker SMTP. Dùng WORKFLOW_PLAYWRIGHT_MODULE/WORKFLOW_BROWSER_EXECUTABLE như các fixture khác.
- Team lifecycle lần đầu phát hiện rời Workspace đã commit nhưng guard busy cản về Home. Đã chuyển route trong effect sau busy=false, chạy lại toàn lifecycle đạt. Đây là bổ sung coverage sau audit P1, không chỉ đổi nhãn.
- Production build 110 modules và 12 FE unit tests đạt. Không sửa BE hoặc đổi quy tắc liên kết Google.

P2 vẫn đang làm: field migration ngoài password, Workspace picker, dialog layout/common states và coverage >20 members/mất quyền chưa đủ. Không chuyển P3, không công bố nhà cung cấp thật đã nghiệm thu.

## Workspace picker và tên — 05/10/2026, sau 44bd73c

WorkspacePicker nối My Tasks, lỗi tải ở picker riêng, không thay lỗi/dữ liệu Task. Search được mở khi cần; reset xóa selection/query và thu gọn. FormField áp dụng thêm tên đăng ký/hồ sơ/tạo Workspace/cài đặt Workspace; local validation và description limit báo cạnh nội dung. Hủy thật form tạo Workspace xóa tên chưa tạo, không tái hiện draft đã xác nhận bỏ.

- `FE/scripts/check-picker-flows.mjs`: fixture 22 Workspaces và 23 members, phân trang qua mốc 20; search Members và Workspaces qua BE, giữ selection ngoài trang kết quả, no-result, GET 503/retry, response query cũ đến sau query mới, reset/counter Bộ lọc và 1440/375px đạt. Không gửi worker/Google/SMTP.
- Account/Settings/Navigation/Interactions chạy lại đạt: tên toàn khoảng trắng được báo aria-invalid, sửa tên xóa lỗi; draft/CAS/503/account/security/editor/roles còn giữ đúng hành vi. Native consent required cần được chọn trước khi fixture đo custom name validation; lần harness chưa chọn consent không chạy submit, đã chỉnh setup và chạy lại đạt.
- Picker fixture có một lần kiểm Task trước response tải bộ lọc tới (count 0); đã chờ request hiển thị dữ liệu trước assertion, chạy lại đạt. Không coi timeout/race của harness là pass.
- 12 FE unit tests và production build 111 modules đạt. Không đổi BE hoặc quyền nghiệp vụ.
- Đã xem ảnh expanded và compact tại `.local/p2-components/workspace-picker-*` / `workspace-filter-compact-*`. Căn controls từ đầu hàng, tránh các bộ lọc khác bị dồn xuống đáy picker; không overflow. Chạy measureInPage của skill trên fixture, lưu `workspace-probe.json`: không contrast/target/field alignment/overflow errors. Còn cờ shell/header, chữ phụ 10px, native date và một từ cuối dòng ở mô tả My Tasks mobile; ghi P6, không công bố toàn probe sạch hoặc đã chạy đầy đủ hover/sweep.

P2 còn nền dialog chung, states/feedback và field migration ngoài tên/password. Fixture mất quyền đúng giữa picker request chưa thêm; quyền vẫn do BE kiểm. Chưa chuyển P3 hoặc nghiệm thu live providers.
