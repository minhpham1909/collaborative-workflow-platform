# M1 review — Theme, banner và mật độ nội dung

12/10/2026. Yêu cầu trực tiếp: phân tích và cập nhật task trước, chưa sửa giao diện. Các ảnh người dùng là bằng chứng lỗi hiện trạng, không phải chỉ dẫn nằm trong file. Lượt này chỉ cập nhật tài liệu; runtime/browser audit quan sát, không ghi nghiệp vụ hoặc chạy worker.

## Tiến độ sau khi user cho triển khai

R1–R3 đã sửa và đạt scoped gate12/10: shared surfaces, Task/comment/editor/dialog vàhit area Shared card;8fixture journeys +QA-account11dark screens. [QA repair](../qa/UI-M1-REPAIR-CHECK.md). R4/R5 vẫn pending. Phần phân tích dưới giữ như baseline trước sửa, không phải toàn bộ hiện trạng sau patch.

## Kết luận hiện trạng

M1a (thư viện/icon/metadata) vẫn giữ kết quả kiểm trước. M1b cơ chế System/Light/Dark hoạt động, nhưng gate visual phải mở lại. M1c slider hoạt động ở mức control, nhưng cách đặt một card riêng trong banner không đạt bố cục người dùng yêu cầu. Tạm ưu tiên R1–R5 trước M2 pin, M3 list modes, M4 calendar.

| Vấn đề | Bằng chứng / nguyên nhân | Hướng xử lý sau khi bắt đầu patch |
| --- | --- | --- |
| Shared Projects dark | Hero sáng + chữ rất nhạt, EmptyState nền trắng. SharedProjects.jsx dùng .hero/.empty chung; styles.css:202/823 gradient viết cứng, styles.css:280 background:white. Theme mới chỉ xử lý hero Home | Chuẩn hóa hero và empty dùng semantic background/foreground/border; kiểm populated/empty/no-result/error/Archived riêng |
| Task metadata dark | .detail-meta-grid kế thừa background:#f9f1ed và text màu cố định ở studio.css:1030. task-detail.css chỉ đổi layout/spacing, không đổi palette khu vực này | Token hóa cả surface, nhãn và giá trị; áp đầy đủ ở Task fullpage và panel, giữ status/assignee/deadline/capabilities |
| Comment empty dark | Comments dùng EmptyState chung, vì vậy nền trắng còn sót; audit trước mở Task có nhiều comment nên thiếu empty branch | Sửa component/shared style tại nguồn; kiểm 0 comment, có comment, composer/edit, validation/network error và readonly |
| Badge unread | .inbox-badge ở styles.css:711 có nền #e9ddfb cố định; chữ có thể kế thừa màu menu/theme, ảnh5 và computed style xác nhận contrast số badge khoảng1.52:1 | Có cặp foreground/background riêng, kiểm 0/1/11/99+/loading/stale ở sáng–tối; giữ nguyên count và aria-label |
| Slider rời rạc | StudioCarousel là figure riêng, rộng220px, có border và hàng controls độc lập; Hero hiện chia thành copy/CTA/figure | Tích hợp ảnh vào lớp nền của thanh chào mừng, copy và CTA nằm lớp trên; bỏ card/khung/footer riêng |
| Khoảng trống desktop | Home main max-width1600px, Shared1440px, Task1120px; frame căn giữa tạo gutter ngoài padding. Thu browser xuống90% có thể làm viewport CSS lớn hơn trong khi cap vẫn giữ nguyên | Layout shell/collections rộng theo vùng khả dụng; tách giới hạn bề rộng đọc tài liệu khỏi bề rộng cả trang; grid tăng số cột khi đủ chỗ |

Đây là lỗi style/cascade và thiếu coverage theo trạng thái; chưa có bằng chứng lỗi quyền/API từ các ảnh. Không đổi nghiệp vụ để che lỗi giao diện.

## Vì sao lần trước chưa bắt được

check-ui-foundation kiểm theme attributes, persistence, OS change, overflow và metadata alignment; chụp6 route dark nhưng không assert contrast/surface từng trạng thái. Không có Shared Projects trong danh sách đó; Task dùng primary task có17 comments, không kiểm empty comment. Không được coi pageerror=0 hoặc sinh được screenshot là visual acceptance. Các PASS chức năng trước vẫn là bằng chứng đúng trong phạm vi của chúng; nhận định hoàn tất visual/theme được mở lại.

## R1–R5: task cần triển khai lần lượt

| ID | Ưu tiên | Phạm vi | Điều kiện hoàn tất |
| --- | --- | --- | --- |
| M1-R1 | P1 | Shared styles/token cho hero/empty/badge và các text/surface liên quan | Không còn surface sáng ngoài ý muốn trong dark; đọc rõ heading, empty message và unread count; Light không bị đổi vai màu; test tại component và route dùng lại |
| M1-R2 | P1 | Task fullpage/panel: metadata, comments, editor/checklist/activity/reopen/dialog/profile | Cả dữ liệu rỗng/có dữ liệu/readonly/lỗi đều đọc được; form không mất draft khi đổi theme; trạng thái API và quyền giữ nguyên |
| M1-R3 | P1 | Audit flow/theme + bổ sung visual checks | Ma trận bên dưới có bằng chứng theo state, assert màu/contrast cho text quan trọng, kiểm route load đầu và chuyển theme trong trang; không chỉ no-error/overflow |
| M1-R4 | P2 | Home hero có slider tích hợp | Ảnh là nền trong chính banner, một khối thống nhất; greeting/day/KPI/CTA vẫn đọc được; controls nhỏ gọn về hình nhưng vùng bấm đủ; không layout jump khi đổi/lỗi ảnh; bàn phím và reduced motion |
| M1-R5 | P2 | Density và chiều rộng desktop/mobile | Có baseline trước/sau cùng dữ liệu; main collections/Board dùng hết vùng thích hợp; ít gutter ngoài ý muốn; tăng nội dung nhìn thấy ở100%; không thu nhỏ cả app hoặc nhét dữ liệu giả |

R1 là nền dùng chung; R2 sửa các vùng Task chưa được bao phủ; R3 kiểm lại và đóng gate theme. Sau đó mới làm R4 và R5 theo từng patch, commit và kiểm riêng. Không bắt đầu feature pin/calendar trong lượt analysis này.

## Hướng banner tích hợp

Banner là một container có radius/overflow duy nhất. Ảnh nằm lớp nền về bên phải hoặc phủ container, có mask/gradient chuyển tiếp vào nền. Lớp nội dung bên trái gồm lời chào, ngày/tóm tắt có dữ liệu thật và CTA tạo Workspace đặt gần nội dung. Nút trước/sau và chỉ báo vị trí đặt nhẹ ở góc banner; không có figure-card phụ với footer riêng. Chuyển ảnh chỉ thay lớp nền, không thay số liệu hay khiến lời chào/CTA dịch vị trí.

Sáng/tối có scrim/mask riêng để giữ tương phản; mobile crop ảnh và ưu tiên text/CTA, không che bằng ảnh. Giữ vận hành thủ công hiện tại; nếu bật autoplay sau này cần pause/interaction/reduced-motion riêng. Ảnh là minh họa, không giả làm dự án của người dùng. Chưa tạo prototype/wireframe hoặc code slider mới ở lượt này.

## Hướng mật độ gần trải nghiệm90%

Dùng100% browser làm thiết kế chuẩn, giữ quyền zoom của người dùng. Đề xuất để đo ở patch R5: sidebar220–224px (hiện244), header68–72px (hiện78), padding main20–24px (hiện32 hai bên), gap12–16px. Điều chỉnh tiêu đề/card/header padding có mục tiêu, giữ body khoảng14px và vùng bấm thường44px; không nhân toàn bộ font/control với0.9.

Collection/Board: frame fluid, grid số cột theo card min-width, dự kiến4 card ở màn1920 nếu tên/mô tả còn đọc được; không giữ cap1600 rồi căn giữa toàn khối khi vùng chính rộng hơn. Task/tài liệu: giữ bề rộng đọc nội dung phù hợp nhưng xem bố trí metadata/checklist/activity cạnh nội dung trên màn lớn; mobile/panel giữ một cột. Auth forms vẫn có bề rộng hợp lý, không kéo form nhập dài để lấp chỗ trống.

CSS zoom tác động magnification/layout; transform:scale không tính lại layout. Vì vậy hai cơ chế đó không thay cho việc sửa cap/grid/spacing. [MDN zoom](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/zoom). Viewport CSS2133px là phép khảo sát màn rộng, không được ghi thành browser zoom90% thật. Chưa chọn giá trị density cuối trước khi so cùng nội dung ở1440/1920 và zoom thực tế.

## Ma trận flow phải kiểm trước khi đóng gate

| Cụm | Trạng thái cần bao phủ |
| --- | --- |
| Auth/verify/reset/invite | Initial/loading/validation/error/success, nhập form, dialog, link-token flow; cả theme |
| Home/Studio/Workspace | Hero, có dữ liệu, empty/no-result, filters/paging, create/edit/cancel, Archived |
| Shared Projects | Empty hiện tại, có Guest Project, Archived, no-result, loading/error/retry, quyền bị thu hồi |
| Project/Kanban/management | 3 cột, empty cột, labels/priority, forms/dialog, Archived/mất quyền |
| Task fullpage/panel | Có/không description, metadata/chưa phân công/đã rời, checklist/reopen/history, busy/error/readonly |
| Comments/editor | Empty/populated/paging/create/edit/cancel/delete confirm, validation/network error, readonly; focus/link/emoji toolbar |
| My Tasks | Nhóm hạn, empty/no-result, filters/invalid dates/paging, return route, unreadable chip regression |
| Notifications | Empty/populated/masked/detail, read/filter/paging, unread/loading/stale badges và drawer/menu |
| Settings/Team/Trash | Profile/security/preferences, pickers, empty/populated, archived/restore/confirmation/error; không thực thi worker |

Vi–En; Light/Dark/System; desktop1440/1920, các viewport375/768/1024/1280; browser zoom90/100/125 thực tế khi nghiệm thu. Text thường tối thiểu4.5:1, text lớn3:1 theo [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); tính nền thực/scrim/alpha, không chỉ so màu token. Focus rõ, popup không tràn, datetime cùng hàng, touch targets giữ được. Chưa tuyên bố WCAG toàn app.

Các trạng thái không có trong tài khoản QA (ví dụ Shared populated Guest, lời mời nhận và một số role) cần fixture riêng ở patch kiểm thử; không tạo Guest grant/account/bans vào dữ liệu người dùng chỉ để lấp màn. Các lỗi source được khẳng định dựa trên ảnh + code; route/state chưa có bằng chứng để trạng thái chưa kiểm.

## Bằng chứng audit

Ảnh người dùng1–4/8 xác nhận lỗi composition và light surfaces trong dark; ảnh5 là badge đã đo; ảnh6/7 là cùng một bố cục wide/90% được cung cấp, không phải hai phép đo before/after độc lập. Code source và browser computed style được đối chiếu tại .local/theme-audit/; authenticated audit hoàn tất24 mẫu route (12 màn×2 theme) và2 khảo sát viewport Home. Identity guard yêu cầu .shell, mỗi browser context dùng Session QA riêng, thu hồi finally. Không tính fallback Login thành màn nghiệp vụ.

Browser computed style xác nhận:

- Shared dark: hero vẫn gradient rgb(240,231,251)→rgb(255,240,232); empty rgb(255,255,255), foreground rgb(245,238,244). Contrast text rỗng khoảng1.14:1, dưới4.5:1.
- Task empty dark: metadata rgb(249,241,237), foreground container rgb(245,238,244); empty comment trắng giống Shared. Màu từng nhãn/value còn chịu selector con, cần kiểm riêng; không suy toàn bộ metadata có cùng contrast.
- Sidebar badge dark: foreground rgb(192,181,200), background rgb(233,221,251), contrast khoảng1.52:1. Đây là lỗi đọc số, không phải lỗi count/API.
- 1920 CSSpx: Home1600/available1676, gutter38px mỗi bên; Shared1440/1676,118px mỗi bên; Task1120/1676,278px mỗi bên. Các cap đang áp chung cả frame, không chỉ text.
- Viewport CSS2133px: Home1600/available1889, gutter144.5px mỗi bên chưa tính padding. Đây là đo viewport CSS; chưa chạy zoom90% thật. Không document overflow ở các route quan sát, nhưng điều đó không chứng minh không có lỗi màu/state.

Các route quan sát: Home, Organizations, Organization detail, Workspace, Project, My Tasks, Shared Projects, Inbox, Settings, Task có comment, Task empty comment, Trash. Loading/error/readonly/Guest-populated/composer và dialog không được suy là PASS từ các mẫu này; vẫn nằm trong ma trận R3. Không sửa FE/BE trong lượt này.


## Follow-up management — 12/10/2026

Ảnh mới của user cho thấy Workspace tabs/membership/settings/email còn nền trắng trong dark. Đã sửa CSS tại nguồn sang semantic palette, kiểm Workspace độc lập/trực thuộc, Organization Team/audit/management, Project management, Settings và các route chính. [QA đồng bộ màu](../qa/UI-COLOR-CONSISTENCY-CHECK.md). R4 slider trong banner và R5 density chưa thực hiện trong patch màu này.
