# Kế hoạch nâng cấp UI/UX theo giai đoạn

Ngày 04/10/2026. Theo yêu cầu chủ dự án: đánh giá từng bước hoàn thành đến đâu rồi mới chuyển bước tiếp theo. Mốc code khởi đầu: `29c8ffa` trên dev.

Yêu cầu bổ sung: dùng skill ui-ux để rà và tối ưu trực tiếp màn hiện có, bỏ wireframe. [Increment giao diện đã thực hiện](../qa/UI-DESIGN-REVIEW-2026-10-04.md) giữ brand, có kiểm 6 màn ở 1440/375px. Sau đó [regression điều hướng](../qa/FE-DRAFT-NAVIGATION-CHECK.md) đã sửa NAV-01 và đóng gate audit P1 trong phạm vi kiểm; P2 tiếp theo đã đạt gate theo [QA component](../qa/FE-COMPONENTS-CHECK.md); chưa nghiệm thu P3–P6 hoặc toàn sản phẩm.

## Cách triển khai và đánh giá

- Đi lần lượt P1 → P2 → P3 → P4 → P5 → P6. Mỗi bước gồm xác định phạm vi, thực hiện, kiểm chứng và cập nhật kết quả trước khi chuyển bước.
- Trạng thái: Chưa bắt đầu / Đang làm / Chờ quyết định / Cần sửa / Đạt. Có component hoặc test cũ không đồng nghĩa cả giai đoạn đã Đạt.
- Chỉ chuyển bước khi tất cả tiêu chí bắt buộc có bằng chứng, không còn lỗi chặn thuộc phạm vi bước đó. Vấn đề chuyển sang backlog phải ghi lý do, ảnh hưởng và giai đoạn xử lý; không chuyển lỗi mất dữ liệu/mất quyền sang phần trang trí.
- Không cần xin duyệt lại những quyền hoặc quyết định đã được chủ dự án xác nhận. Chỉ hỏi khi xuất hiện lựa chọn nghiệp vụ mới chưa có căn cứ; ghi rõ đề xuất và tác động.
- Sau mỗi bước báo: đã làm gì, tiêu chí nào đạt/chưa đạt, lỗi còn lại, bằng chứng và bước tiếp theo. Nếu bước chưa đạt, tiếp tục sửa trong bước đó.
- Kiểm thử theo phạm vi thay đổi. Kế hoạch này không tự cho phép gửi mail dev cũ, bật worker thật, triển khai public hoặc thêm storage.

## Bảng theo dõi hiện tại

| Bước | Kết quả cần có | Trạng thái hiện hành | Nền hiện có / khoảng trống |
|---|---|---|---|
| P1 — Audit luồng | Ma trận hành vi và danh sách lỗi có ưu tiên | Đạt gate audit | [Audit P1](../qa/UI-UX-FLOW-AUDIT.md) và [QA điều hướng](../qa/FE-DRAFT-NAVIGATION-CHECK.md): lỗi chặn đã sửa trong phạm vi fixture; giới hạn tương thích và provider live được ghi riêng |
| P2 — Component dùng chung | Form/dialog/picker/feedback thống nhất | Đạt gate P2 | [Quy ước](../ui-ux/COMPONENT-INTERACTION-RULES.md) và [QA](../qa/FE-COMPONENTS-CHECK.md): FormField/password/pickers, nền dialog và feedback đã áp dụng; 8 browser fixtures, 12 tests/build đạt; native controls và phạm vi kế tiếp được ghi rõ |
| P3 — Tương tác và nội dung dài | Vùng bấm, focus, thu gọn mô tả, bố cục dễ dùng | Chưa nghiệm thu giai đoạn | Đã có preview mô tả và click toàn thẻ Workspace/Project/Task; còn kiểm toàn hệ thống theo gate P3 |
| P4 — Điều hướng và bản nháp | Back/Forward/hash/link giữ đúng dữ liệu và context | Chưa nghiệm thu giai đoạn | Guard chung đã triển khai để sửa NAV-01; còn quy ước filters/context và giới hạn fallback history |
| P5 — Thiết kế khôi phục Task | Quy tắc và thiết kế restore được chốt | Chưa bắt đầu; có quyết định mới cần chốt | Soft delete đã có; chưa có thùng rác/restore/retention/purge |
| P6 — Hoàn thiện visual | Các cụm màn đồng bộ theo Stitch và được review | Chưa bắt đầu giai đoạn | Có nền Jakarta/kem-tím và màn Stitch; chưa nghiệm thu visual toàn hệ thống |

Các ghi nhận 46 BE tests, 12 FE tests, build và fixture flows ở increment trước là bằng chứng của mốc khởi đầu. Lượt lập kế hoạch này đọc lại tài liệu và trạng thái Git, không chạy lại các tests hoặc nghiệm thu thêm luồng.

## P1 — Rà soát luồng và trạng thái

Phạm vi chia thành bốn cụm để không bỏ sót:

| Cụm | Màn hình/luồng phải rà |
|---|---|
| A — Tài khoản | Đăng ký/xác minh, login email/Google, refresh/logout, reset/đổi mật khẩu, liên kết Google |
| B — Workspace | Home, tạo/xem/sửa mô tả, members/invitations, transfer/remove/leave, email overrides |
| C — Công việc | Project/mục tiêu/archive, Board, Task CRUD/status, Comments, My Tasks/search/filters |
| D — Thông báo và cài đặt | Inbox/detail/read-all, target unavailable, hồ sơ, email preferences, dialog/toast |

Với từng luồng, ghi entry point, vai trò, điều kiện, tạo/xem/sửa/hủy, trạng thái loading/empty/error/read-only/success, mất quyền, stale và lỗi mạng. Trường hợp không áp dụng ghi N/A kèm lý do. Phân biệt thao tác bị từ chối với thao tác đã commit nhưng chưa nhận phản hồi.

Đầu ra: `docs/qa/UI-UX-FLOW-AUDIT.md`, gồm ma trận coverage và các lỗi có ID, bước tái hiện, kỳ vọng/thực tế, mức ưu tiên, hướng xử lý và bằng chứng. Bằng chứng có thể là test phù hợp, review code hoặc kiểm trên trình duyệt; ghi đúng phương pháp và giới hạn.

Tiêu chí chuyển P2:

- [x] Bốn cụm có ma trận, mọi trường hợp ghi rõ Đạt/Cần sửa/Chưa kiểm/N/A.
- [x] Các lỗi phát hiện đã được phân loại; lỗi chặn đã sửa và kiểm lại trong phạm vi audit/fixture ghi nhận.
- [x] Các cải tiến thuộc P2–P6 có nơi xử lý rõ ràng; giới hạn fallback history còn ở P4.
- [x] Auth/SMTP fixture và kiểm nhà cung cấp thật được phân biệt; live vẫn là điều kiện release riêng.

## P2 — Thống nhất component và phản hồi

Từ lỗi P1, chuẩn hóa form field/validation, buttons, dialog layout, picker, loading/empty/error/read-only và toast. Giữ các form có nghiệp vụ riêng nhưng dùng chung nền tương tác. Rà action labels, trạng thái đang lưu, lỗi cạnh field và thông điệp kết quả chưa xác định. Picker assignee cần hỗ trợ tìm thành viên theo API hiện hành nếu audit xác nhận khoảng trống.

Đầu ra: tài liệu quy ước component tại `docs/ui-ux/COMPONENT-INTERACTION-RULES.md`, component đã nối vào các màn thuộc phạm vi và bằng chứng QA.

Tiêu chí chuyển P3:

- [x] Có quy tắc chọn toast/inline error/confirm/input và cách dùng cho từng trạng thái.
- [x] Các màn được rà đã áp dụng quy tắc; khác biệt có lý do được ghi lại.
- [x] Dialog xử lý focus/Tab/Escape/khóa nền và dialog lồng; lỗi validation không mất bản nhập.
- [x] Loading không cho gửi trùng; phản hồi không xác định không tự gửi lại; các luồng bị thay đổi qua regression phù hợp.

## P3 — Vùng bấm, focus và nội dung dài

Rà card/link/icon/menu và trạng thái focus/hover/disabled. Thiết kế Workspace/Project description có phần xem trước và mở rộng/thu gọn; giữ nút chỉnh sửa dễ thấy, không cắt mất nội dung đã lưu. Kiểm rich text dài, xuống dòng, link dài, emoji/dấu Việt và layout Board khi mô tả mở rộng.

Đầu ra: thay đổi tương tác, quy tắc description preview và ảnh/bằng chứng tại 1440, 1280 và 390px.

Tiêu chí chuyển P4:

- [ ] Card và CTA không che nhau; vùng thao tác dùng được bằng chuột và bàn phím.
- [ ] Focus rõ, label cho icon buttons đầy đủ; trạng thái disabled/read-only dễ nhận biết.
- [ ] Mô tả dài thu gọn/mở rộng và chỉnh sửa được, không làm mất dữ liệu hoặc đẩy bố cục vỡ.
- [ ] Không tràn ngang ngoài vùng cuộn chủ đích; các thao tác cốt lõi dùng được ở ba kích thước kiểm.

## P4 — Điều hướng, lịch sử và bảo vệ bản nháp

Thiết kế cơ chế chung cho link, Back/Forward, hash trực tiếp, chuyển tab và refresh trang cha. Xác định hành vi khi sạch/dirty/đang lưu/kết quả chưa xác định; khôi phục route, filters và vị trí xem khi phù hợp. Đóng/reload tab vẫn dùng beforeunload của browser. Không tự lưu draft chứa dữ liệu công việc vào localStorage nếu chưa thiết kế vòng đời và xóa khi đổi tài khoản.

Đầu ra: `docs/sds/FE-NAVIGATION-DRAFT-GUARD.md`, cơ chế điều hướng chung và regression các chuyển trạng thái.

Tiêu chí chuyển P5:

- [ ] Hủy chuyển trang giữ route và draft; xác nhận bỏ draft đưa đến đúng đích.
- [ ] Back/Forward/hash không vòng lặp, không mở nhiều confirm hoặc âm thầm mất nội dung.
- [ ] Đang lưu và kết quả chưa xác định có cách xử lý rõ; tải lại kết quả không tạo bản trùng.
- [ ] Đăng xuất, hết phiên và đổi tài khoản không hiển thị draft của tài khoản trước.
- [ ] Filters/context quay lại đúng quy ước; các form liên quan được kiểm bằng chuỗi điều hướng thực tế.

## P5 — Chốt thiết kế thùng rác/restore

Đây là giai đoạn thiết kế nghiệp vụ và kỹ thuật, **chưa tự mở chức năng restore**. Cần chốt người xem/khôi phục Task, người tạo đã rời nhóm, Project Archived, assignee đã rời, Comments/Notifications sau khôi phục, version/concurrent restore, thời hạn giữ dữ liệu, purge và backup.

Đầu ra: phương án để chủ dự án quyết định, cập nhật SRS/SDS/API và luồng UI thùng rác; nếu chưa triển khai thì ghi rõ backlog và thông điệp sản phẩm hiện hành.

Tiêu chí chuyển P6:

- [ ] Các quy tắc mới cần quyết định đã được trả lời hoặc phạm vi restore được chủ dự án chọn giữ Upcoming.
- [ ] Quyền, lifecycle, assignee, Comments/Notifications và CAS có thiết kế nhất quán.
- [ ] Soft delete, restore, purge và backup được phân biệt; không hứa khả năng phục hồi chưa có.
- [ ] Nếu triển khai restore, lập increment riêng với kiểm thử quyền/concurrency trước khi đưa vào UI sản phẩm.

## P6 — Hoàn thiện visual và review toàn bộ

Giữ nguồn Stitch đã chọn, Jakarta/kem-tím, typography Việt/Anh và màu trạng thái. Thực hiện theo cụm: shell/Home → Workspace/team/settings → Project/Board/Task → My Tasks/inbox → Auth/account. Rà hierarchy, spacing, icon, ảnh phục vụ nội dung, chiều dài text và responsive cho cả các trạng thái đã định nghĩa ở P1. English UI cần được đối chiếu với yêu cầu hiện hành, không chỉ dịch tên nút ở mockup.

Đầu ra: design tokens/component variants được cập nhật, các màn đã áp dụng, ảnh so sánh và checklist review với chủ dự án.

Tiêu chí hoàn thành kế hoạch:

- [ ] Các cụm màn đồng bộ và có ảnh/bằng chứng review; các state quan trọng không còn style tạm.
- [ ] Typography, màu/focus, icon và nội dung dài kiểm được; layout responsive giữ chức năng.
- [ ] Không có nút giả, số liệu không có nguồn hoặc ảnh làm cản tác vụ; phạm vi ảnh/licensing có nguồn rõ khi bổ sung.
- [ ] Luồng bị ảnh hưởng qua regression và build đạt; lỗi chưa xử lý được ghi riêng, không công bố toàn sản phẩm đã release-ready.
- [ ] Chủ dự án review kết quả visual cụ thể, các điểm chỉnh sửa được xử lý hoặc ghi thành backlog đã thống nhất.

## Mẫu ghi nhận sau mỗi giai đoạn

| Mục | Nội dung cần cập nhật |
|---|---|
| Bước và trạng thái | Pn, Đang làm/Cần sửa/Chờ quyết định/Đạt |
| Hoàn thành | Các tiêu chí đã kiểm, link code/QA/ảnh tương ứng |
| Chưa hoàn thành | Tiêu chí thiếu, lỗi ID và ảnh hưởng |
| Quyết định | Quy tắc đã có hoặc câu hỏi mới thực sự cần chủ dự án chốt |
| Chuyển bước | Có/Không và căn cứ theo tiêu chí bên trên |

Bước hiện tại: P2 Đạt gate (05/10/2026), xem [QA hoàn thiện](../qa/FE-COMPONENTS-CHECK.md) và [quy ước](../ui-ux/COMPONENT-INTERACTION-RULES.md). Đủ điều kiện bắt đầu P3; chưa nghiệm thu P3. Native controls/editor counter/inline success giữ riêng có lý do. Toolbar editor mobile/skip link còn audit P3, shell/typography còn P6. P1 đạt gate audit; không coi guard bản nháp là autosave/backup hoặc nghiệm thu P4.
