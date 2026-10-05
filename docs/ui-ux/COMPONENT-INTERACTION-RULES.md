# P2 — Quy ước component và phản hồi

Cập nhật 05/10/2026. P2 đạt gate trong phạm vi ứng dụng hiện có; bằng chứng tại [QA P2](../qa/FE-COMPONENTS-CHECK.md). Giữ React/JSX, CSS nội bộ và nền Stitch/Jakarta/kem-tím. Không thêm thư viện hoặc dựng lại wireframe.

## Chọn cách phản hồi

| Tình huống | Quy tắc và component |
|---|---|
| Nhập sai tên/title/password/confirmation | `FormField`/`PasswordField`, lỗi sát ô, aria-invalid/describedby; sửa ô xóa lỗi local. Không dùng toast thay lỗi cần sửa |
| Email/consent/select/date | Label gắn control native; required/type/maxLength/step do browser kiểm trước submit. Khoảng ngày sai có InlineMessage ngay sau vùng filters, không hiển thị empty như một truy vấn hợp lệ. BE kiểm lại mọi input |
| Nội dung rich text sai/quá dài | Counter trong editor; lỗi cạnh editor/form. Không xóa nội dung đang nhập. Counter không dùng loading hoặc toast |
| Tải dữ liệu | `LoadingState`, role=status, chỉ rõ đang tải gì. Nút đang thao tác bị khóa; pending ref chặn requestSubmit lặp. Có thể giữ kết quả cũ trong lúc tải, nhưng dùng aria-busy; không coi loading là empty |
| Danh sách rỗng | `EmptyState` sau GET thành công; phân biệt chưa có dữ liệu với không khớp filters. Có hướng dẫn đổi/xóa filter khi phù hợp |
| GET thất bại | `InlineMessage`, role=alert, cạnh dữ liệu. Retry/Làm mới chỉ đọc lại; không tự gửi mutation. Picker có vùng lỗi riêng |
| Request bị từ chối / mất quyền / CAS | `InlineMessage` cạnh form/dữ liệu, giữ bản nhập khi form vẫn có quyền tồn tại. Scope/session bị thu hồi có thể buộc ẩn nội dung; draft guard không vượt quyền BE |
| Timeout/5xx sau mutation | Nói rõ kết quả chưa xác định, khóa gửi lại, hướng dẫn đóng/tải lại để kiểm dữ liệu. Không tự retry hoặc thông báo thành công trước xác nhận |
| Read-only | `InlineMessage` tone=info cho Project Archived/Task/Owner-only settings/invitations; badge bổ sung trạng thái. Editor readOnly, mutation CTA ẩn/khóa theo quyền; không chỉ đổi màu |
| Thành công ngắn | NotificationProvider toast, tối đa 4, tự đóng 6 giây, có nút đóng và live region |
| Kết quả cần giữ để tiếp tục | `InlineMessage` tone=info hoặc vùng kết quả trong form. Email đã xếp hàng không đồng nghĩa đã tới Inbox. LINK lời mời hiển thị một lần, cho sao chép trước đóng |
| Bỏ draft/thao tác cần xác nhận | confirmDialog của ứng dụng; các hành động phá hủy có title/label/tone cụ thể. Guard điều hướng dùng “Ở lại”/“Bỏ thay đổi” |
| Nhập đường dẫn | inputDialog; kiểm link an toàn ở editor, từ chối scheme không hỗ trợ và giữ editor draft |
| Refresh/đóng document có draft | beforeunload của browser; ngoại lệ có chủ đích vì app không thay được hộp cảnh báo cấp trình duyệt |

## Nền component

- `FormField`: ID duy nhất, label gắn control, hint/error có chiều cao tối thiểu, viền lỗi và nội dung chữ. Đã áp dụng tên đăng ký/hồ sơ/Workspace/Project, title Task, password và picker.
- `PasswordField`: mặc định ẩn, toggle độc lập từng ô, type=button, aria-label và aria-pressed. Không trim hoặc lưu password vào storage.
- `MemberPicker`/`WorkspacePicker`: server search debounce 250ms, cursor, loading/error/retry/no-result/load-more, chặn phản hồi cũ. Selection lưu riêng với kết quả; query tìm lựa chọn không tạo Task draft hoặc tăng filter count. Reset My Tasks xóa selection/query và thu gọn tìm kiếm.
- Người đã chọn không xuất hiện trong kết quả tìm kiếm không đồng nghĩa đã rời nhóm. Không tự bỏ assignee hoặc mở rộng Workspace scope. BE quyết định membership khi lưu/tải. Đã kiểm remove qua service thật giữa chọn và lưu; My Tasks mất membership trả danh sách rỗng trong scope đã chọn khi làm mới.
- `useDialogFocus`: nền tương tác duy nhất cho Home create, NameDialog, TeamAction và SystemDialog. Chỉ dialog trên cùng nhận Escape/Tab; focus đầu tiên, wrap Tab/Shift+Tab trong các control nhìn thấy và không disabled; không có control thì focus panel. Khóa nền bằng inert ở portal siblings, khóa cuộn body, khôi phục giá trị trước khi mở và focus khi đóng. Dialog lồng trả quyền tương tác cho form cha; chỉ đóng hết mới mở khóa trang.
- Layout `.dialog` và `.system-dialog` dùng chung giới hạn viewport/scroll/padding; confirm danger có emblem và màu riêng theo brand. Footer actions dùng `.buttons`; form submit dùng `.primary` và nhãn nghiệp vụ. Không dựng Button library khác chỉ để bọc thẻ button.
- `Feedback.jsx`: InlineMessage/LoadingState/EmptyState dùng cùng CSS và semantic role. Không thay handler, quyền/CAS hoặc vòng đời token bởi việc migrate UI.

## Coverage theo cụm

| Cụm/màn | Áp dụng và kiểm chứng |
|---|---|
| Shell/Login/Register/Verify/Recover/Reset | Loading/error chung; names/password field; native email/consent; token scrub và busy giữ form. Account + navigation fixtures |
| Home/Workspace/Project | Create/name dialog chung; filter errors/loading/empty; description errors sát editor; read-only và Owner CTA; interaction/network/layout fixtures |
| Members/Invitations/Invite | Team dialog chung, action labels đúng tác động, one-time LINK/result/copy, mất quyền, busy, dirty-close; Team/navigation fixtures |
| WorkspaceSettings/Profile/Email/Security | FormField names/password, description errors, loading/error/info, reload/CAS/uncertain; settings/navigation fixtures |
| Board/My Tasks/Task/Comments | Picker chung, task/name/editor errors, empty từng cột/danh sách, loading/read-only/CAS/draft; interaction/picker/network fixtures |
| Notifications/inbox/detail | Loading/error/info/empty; unavailable không lộ payload, retry qua Tải lại; fixture Inbox loading→503→retry→empty và layout. Quyền/cutoff nghiệp vụ giữ nguyên |
| Public policies | N/A cho mutation/dialog/picker; trang văn bản tĩnh và navigation giữ nguyên. Nội dung policies thật là release gate riêng |

## Khác biệt có chủ đích và phạm vi kế tiếp

- Không ép mọi control vào FormField: nested label cho email, search, checkbox, select, datetime đã có liên kết semantic hợp lệ và validation native. Lỗi BE liên quan nhiều field (credentials, CAS, scope) nằm cạnh form; không gán sai lỗi vào một ô. Counter/editor và picker hints có semantic riêng.
- Giữ select/date native để dùng bàn phím và nhập thời gian ổn định; không thêm calendar/combobox mới trong P2. Styling và vùng bấm toàn hệ thống tiếp tục P3/P6. Native consent required vẫn là điều kiện submit.
- Inline success dành cho Settings/Task/Auth/Inbox vì người dùng cần biết kết quả trong ngữ cảnh; toast dành cho phản hồi ngắn. Team LINK phải giữ kết quả đến khi người dùng đóng, không dùng toast biến mất.
- Confirm bỏ draft đơn giản có thể dùng fallback “Hủy”/“Xác nhận” kèm thông điệp nói rõ tác động; các action nguy hiểm và guard route có nhãn cụ thể. Không đổi ngữ nghĩa confirm vì thống nhất style.
- [P3 đã đạt gate](../qa/FE-P3-INTERACTION-CHECK.md), gồm skip-to-main và toolbar editor mobile; P4 còn filters/context và fallback history; P5 restore/retention/purge; P6 hierarchy/typography/visual và English. Đây không phải lỗi chặn nền component P2.
- Google/SMTP thật, screen reader đầy đủ, mọi tổ hợp trạng thái ở mọi kích thước và performance dữ liệu lớn chưa nghiệm thu. P2 đạt không đồng nghĩa toàn sản phẩm release-ready.
