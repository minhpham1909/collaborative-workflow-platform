# P3 — Vùng bấm, focus và nội dung dài

05/10/2026, sau `f9234ec`, nhánh dev. **Đạt gate P3 → P4** trong phạm vi component và màn hiện có. Giữ nền Stitch/Jakarta/kem-tím; không đổi BE, quyền, dữ liệu lưu hoặc mở tính năng restore.

## Rà và sửa theo cụm

| Cụm | Kết quả và quyết định |
|---|---|
| Shell/navigation/menu/footer | Thêm nút Đi đến nội dung chính bằng bàn phím, đưa focus vào main mà không đổi hash hoặc bỏ draft. Menu account giữ details native, Escape trả focus summary và pointer ngoài đóng. Footer links/links trong actions có vùng bấm 40px desktop, 44px mobile |
| Home/Workspace/Project cards | Giữ stretched anchor chuẩn để click toàn thẻ/Enter/Ctrl+click; CTA nằm trên lớp surface link. Fixture kiểm Workspace → Project → Task bằng Enter, kiểm elementFromPoint ở CTA Project và giữ regression click toàn card bằng chuột |
| Workspace/Project descriptions | Nội dung ngắn giữ nguyên; dài hơn 280 ký tự hoặc hơn 3 dòng có excerpt 2 dòng. Mở toàn bộ trong vùng cuộn có tên/Tab/focus, tối đa min(360px,50dvh), có hướng dẫn cuộn; CTA sửa và toggle nằm ngoài khung. Không cắt dữ liệu hoặc tự lưu khi xem |
| Task/Comments/editor | Các nút định dạng có aria-label/title dễ hiểu, group label theo editor; minimum 40px desktop, 44×44px mobile. Editor phản ánh aria-readonly; trạng thái Archived/quyền tác giả giữ nguyên. Task/Comments ở trang chi tiết đọc theo chiều dài nội dung, không áp khung cuộn của scope Board vào thảo luận |
| My Tasks/filters | Giữ click toàn task-row và focus card. Filter checkbox có label target cao 44px, search/select focus có viền 2px rõ; scope/search/paging từ P2 không đổi |
| Auth/Settings/Team/Inbox | Field focus chung rõ hơn; password eye và nút đóng toast lên 44px mobile với padding input đủ rộng. Native email/date/select/consent giữ keyboard semantics; dialog focus từ P2 và labels Owner/Member/read-only không đổi. Inbox là card nhiều action nên dùng từng link/button, không phủ surface link lên CTA |

## Kiểm chứng

- `check-screen-layout.mjs`: fixture Workspace và Project có nhiều đoạn tiếng Việt, emoji, xuống dòng và hyperlink dài. Mở/thu gọn ở **1440,1280,390px**; region có scrollHeight lớn hơn clientHeight, clientHeight tối đa 360px; focus + End cuộn được; URL nguyên vẹn; CTA sửa vẫn hiện. 7 màn Home/Workspace/Board/Task/My Tasks/Settings/Inbox không overflow/page errors; có ảnh collapsed/expanded tại `.local/design-review/`.
- Cùng fixture: skip-to-main giữ đúng URL hiện tại; card native Enter và CTA hit test đạt. Không coi màn offscreen là CTA bị overlay; harness cuộn CTA vào viewport trước đo.
- `check-interaction-flows.mjs`: toolbar mobile >=44×44px và có aria-label; Task/editor/link/Comments, quyền/CAS/Archived, dialog/toast và click card tiếp tục đạt. Đã xem ảnh Task form mobile và Board expanded mobile.
- `check-navigation-flows.mjs`, `check-settings-flows.mjs`, `check-account-flows.mjs`: draft routes, busy/CAS/uncertain, profile/preferences/password/Google fixture, signup/verify/reset đều đạt sau thay đổi.
- 12/12 FE unit tests, production build 113 modules và kiểm định dạng đạt. Không chạy lại BE integrations vì không sửa BE; không dùng dữ liệu dev trong các browser fixtures.
- Chạy helper geometry/contrast của skill ui-ux trên Task form 1440/375px: smallTapCount=0, không low contrast/field alignment/overflow trong mẫu đo. Đây không phải full hover/popup/sweep hoặc screen reader audit. Shell header grouping/chữ phụ 10px/native date và typography vẫn review P6.

Một lần kiểm không chạy vì FE dev server đã dừng; khởi động lại server local rồi kiểm. Harness ban đầu giả định Home phải có #home dù URL root hợp lệ và đo CTA ngoài viewport; đã sửa kỳ vọng cho hành vi thực tế. Selector H2 cũ được đổi theo accessible name mới. Regression sau đó phát hiện editor bình luận chưa mount khi truy cập editor.view.dom; đã cập nhật aria-readonly qua DOM thuộc component thay vì truy cập view chưa sẵn sàng, rồi chạy lại các luồng đạt. Không tính các lần thất bại là pass.

## Gate và giới hạn

- [x] Card/CTA không che nhau; chuột và keyboard dùng được trong luồng kiểm.
- [x] Focus rõ, toolbar/icon actions có nhãn; disabled/read-only giữ quyền và thông điệp.
- [x] Description xem đủ, mở/thu gọn/keyboard scroll được; link/dấu Việt/emoji không vỡ bố cục hoặc đổi dữ liệu.
- [x] Các thao tác cốt lõi và 7 màn ở 1440/1280/390px không document overflow.

P3 đạt trong phạm vi trên, không khẳng định mọi tổ hợp dữ liệu/trình duyệt hoặc toàn bộ WCAG đã nghiệm thu. Links inline trong văn bản vẫn theo flow đọc, không ép mỗi từ thành nút 44px. P4 tiếp tục route/context/filter/history; P5 restore; P6 visual/English/typography. Provider Google/SMTP thật và release gate riêng. Local FE/API/DB đã bật lại để review, không bật mail worker hoặc gửi hàng đợi cũ.
