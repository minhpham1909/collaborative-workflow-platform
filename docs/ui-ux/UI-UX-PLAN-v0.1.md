# Kế hoạch UI/UX — cập nhật trước wireframe

03/10/2026. Chủ dự án chọn phân tích kỹ màn hình trước; chưa mua tool hoặc tạo thiết kế Figma. BE core đã có contracts/tests; UI không được coi là đầy đủ chỉ vì có API. [Screen spec](SCREEN-SPEC-v0.2.md), [flows](SCREEN-FLOWS-v0.2.md), [gaps](UI-API-GAPS-v0.1.md) là đầu vào hiện hành.

## Các bước

Chủ dự án đồng ý bổ sung mobile UI ngày 03/10/2026: thiết kế website responsive cho desktop/mobile, cùng nghiệp vụ và dữ liệu, bố cục/thao tác thích ứng. Không mở scope native app hoặc offline/PWA từ quyết định này. Layout cụ thể vẫn review theo từng cụm.

1. Review kiến trúc thông tin, mục đích từng màn, field/actions/quyền, entry/back/deep link và states. Giữ quyết định nghiệp vụ đã duyệt; review riêng layout mới đề xuất.
2. Wireframe local shell/Home/Workspace/Board/Task/My Tasks, rồi Auth/Invitation/Settings/Notifications; desktop/mobile, Việt/English, dữ liệu giả. Wireframe có nhánh lỗi và quyền, không chỉ happy path.
3. Rà gaps Account capabilities/identity/Member picker/search-time với BE trước nối các control. Search/time mọi list cần server scope đúng, không lọc trang đầu.
4. Chọn visual direction và foundations/components sau review bố cục. Không khóa typography/palette/library từ một mock chưa review.
5. Figma là bước sau khi cấu trúc rõ và quyền tài khoản cho phép; không yêu cầu trả phí từ kế hoạch này. Tài liệu/canvas không làm thay requirements hoặc security guards.
6. FE JS/JSX theo module và contracts: Auth/Profile → Workspace/Invitations → Project/Task/Comments → My Tasks/Notifications/Settings; shell/navigation chung từ đầu. Kiểm responsive, bàn phím, labels dài, conflict và permission changes trên API thật.

## Kết quả cần review

Sitemap và flow, screen specification, shared forms/components, mobile arrangements, state matrix, API gap log và prototype critical journeys. Announcements là phase riêng, storage Upcoming; policy text/worker production/NFR/retention còn kiểm trước release.

Bản phân tích là đề xuất cụ thể để chủ dự án đánh giá, không tự xem là toàn bộ màn hình/visual đã được duyệt. Không mở lại quyền nền/My Tasks defaults/status/concurrency chỉ vì tài liệu v0.1 trước đây có dòng pending.
