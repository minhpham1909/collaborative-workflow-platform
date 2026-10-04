# P2 — Nghiệm thu nền component và phản hồi

05/10/2026, hoàn thiện sau `6b34d5d` trên dev. **Đạt gate P2 → P3** trong phạm vi component/tương tác của ứng dụng hiện có. Không sửa BE hoặc đổi quyền nghiệp vụ; không gửi SMTP/Google thật và không xử lý hàng đợi mail cũ.

## Kết quả hiện hành

- Đã thống nhất focus/Tab/Shift+Tab/Escape/inert/khóa cuộn và trả focus qua useDialogFocus cho cả 4 loại dialog. Giữ layout chung có giới hạn viewport; confirm danger có variant riêng. Không còn keyboard handlers tự khóa `.shell` riêng cho từng form.
- InlineMessage/LoadingState/EmptyState áp dụng Shell/Auth/Home/Workspace/Project/Team/Settings/Task/Comments/Inbox, loading editor và verification actions. Read-only có thông điệp và quyền CTA/editor riêng. Home không hiển thị kết quả cũ/empty khi khoảng ngày đang sai.
- Quy tắc field validation, toast/inline success, native controls và ngoại lệ có lý do tại [quy ước hiện hành](../ui-ux/COMPONENT-INTERACTION-RULES.md). Không coi migrate mọi input thành một wrapper là tiêu chí thay cho semantic/validation đúng.

| Regression chạy lại | Bằng chứng |
|---|---|
| check-interaction-flows.mjs | Focus đầu vào Home; Shift+Tab/Tab wrap bỏ qua control hidden và fieldset disabled; dialog cha inert khi confirm mở; Escape chỉ hủy confirm và giữ tên draft; đóng hết trả focus CTA/mở khóa nền. Input link/editor, toast, Task/Comment, CAS, quyền, Archived/read-only/delete vẫn đạt |
| check-picker-flows.mjs | >20 Members/Workspaces, server search, no-result, retry GET 503, response cũ, selection ngoài page/reset/count đạt. Remove assignee qua service sau chọn: BE từ chối, không tạo Task, giữ title/assignee. Rejoin qua LINK rồi remove Workspace: picker giữ scope, refresh My Tasks trả empty, không hiện Task hoặc tự mở rộng scope |
| check-account-flows.mjs | Signup/consent/verify/recover/reset/replay/token scrub; password toggles/names; Login gửi lặp bị chặn và busy giữ form |
| check-settings-flows.mjs | Profile/preferences/CAS/503-after-commit, password/CSRF/rotation, Google GIS/verifier fixture, lỗi và draft giữ nguyên |
| check-team-flows.mjs | EMAIL queue/retry, LINK one-time/login intent/accept, membership CAS/remove, transfer/revoke/leave, dialog result và responsive |
| check-navigation-flows.mjs | Back/Forward/hash/link/refresh/logout, toàn bộ các draft hiện có, dialog invite Escape và in-flight write giữ đúng hành vi. Giới hạn fallback history vẫn P4 |
| check-network-flows.mjs | Workspace/Project/Task/Comment đã commit nhưng mất/503 response: khóa keyboard/form resubmit, không tự retry, mỗi thao tác đúng 1 record; đóng/tải lại đối soát |
| check-screen-layout.mjs | Thêm Inbox loading giữ GET → 503 → retry GET thật → empty; không hiển thị empty khi đang tải hoặc lỗi. 7 màn ở 1440/375px không overflow hoặc page errors |
| FE unit/build | 12/12 tests đạt; production build 113 modules đạt |

Các fixture dùng browser headless Edge, API Express và Mongo replica set riêng; chạy tuần tự để không tranh bộ nhớ. Không tác động dữ liệu dev. Mất membership được kiểm giữa lần chọn và lưu/tìm tiếp/refresh; stale response được kiểm bằng response giữ lại riêng. Không khẳng định push realtime tự ẩn nội dung nếu chưa có request/refresh.

## Visual và giới hạn

Đã xem ảnh Task form desktop, My Tasks mobile và confirm xóa Task mobile tại `.local/p2-components/` / `.local/system-dialog-390.png`; ảnh layout 7 màn tại `.local/design-review/`. Không chụp password đang hiện. Probe helper đo geometry/contrast trên Task form và picker; không phải full hover/popup/sweep. Báo cáo còn cờ shell/header, chữ phụ 10px, native date, xuống dòng cuối mô tả My Tasks; toolbar editor mobile có B/I/U dưới target 32px (không dưới floor của probe). Những mục này được ghi P3/P6, không công bố toàn probe sạch hoặc mọi trạng thái đã visual QA.

Một số lần kiểm đầu không đạt: harness còn kiểm `.shell.inert` trực tiếp thay vì inert ở ancestor; selector empty text cũ sau thêm hướng dẫn; fixture thử updateOne bị model guard chặn và kỳ vọng nhầm My Tasks trả lỗi thay vì empty. Đã sửa harness để kiểm tác động thực tế, sử dụng remove/rejoin qua service và chạy lại đạt. Không tính các lần thất bại là pass. Không sửa guard/model/API để làm test qua.

## Gate P2 → P3

- [x] Có quy tắc chọn toast/inline/confirm/input và states, phạm vi/ngoại lệ rõ.
- [x] Các cụm màn đã áp dụng nền chung; native labels/controls, editor counter và inline success có lý do giữ riêng.
- [x] Dialog focus/Tab/Escape/inert/nested và validation giữ bản nhập qua regression.
- [x] Busy chống gửi lặp; uncertain không tự gửi lại; 8 browser fixtures và FE tests/build đạt.

P3 là bước kế tiếp; P4 navigation/context, P5 restore và P6 visual chưa nghiệm thu. Google/SMTP thật, screen reader đầy đủ, English/policies và release gate vẫn riêng.

## Lịch sử các increment P2 (không phải trạng thái hiện hành)

### FormField và MemberPicker

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
