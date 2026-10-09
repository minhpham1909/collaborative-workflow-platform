# F0/S1 — Shell và Home theo Stitch

07/10/2026. Theo [cluster plan](../project/STITCH-UI-CLUSTER-PLAN-v0.1.md), skill ui-ux và bộ Stitch local đã chọn. **Đạt gate pilot F0/S1**, không nghiệm thu toàn U1/U2; S2 Organization kế tiếp.

## Phạm vi hoàn thành

- Foundation semantic tokens theo kem/indigo/Jakarta, CSS thuần; tái dùng Icon/Avatar/Feedback/NotificationProvider/FilterPanel/StudioCover. Logo lấy SVG gốc từ export workflow_logo, không vẽ brand mới.
- Sidebar desktop, header/account menu, footer; menu hẹp dùng focus trap/inert/Escape/restore focus và đóng khi chuyển route hoặc resize sang desktop. Giữ các route đã có, chưa thêm link Organization chưa dựng.
- Home hero/ngày VN; 3 chỉ số thật: đến hạn hôm nay, overdue và unread. Không Sprint/meeting/presence/billing mock. Khu công việc chú ý lấy tối đa3 overdue +3 today từ MyTasks, loại trùng id, giữ attribution/code/dueAt thật; đây không là thuật toán xếp năng suất.
- Workspace cards có cover/icon minh họa theo id, name/description preview, role thật, members/activeProjects từ API, archived/read-only; click toàn vùng qua stretched real link. Có grid/list, search động/Ctrl-K, trạng thái/quyền/time filters, totals và paging đúng.
- Create giữ validation/draft/uncertain-outcome guard; success hoặc uncertain-close reset filters để không che Workspace mới rồi dẫn tới tạo trùng. Query mới bỏ rows scope/filter cũ, late results bị bỏ qua; load-more error giữ trang đã có.
- Dictionary Vi/En slice nền, nhưng UI **vẫn Vi**, không dùng User.locale email-only để tự đổi UI. Dịch/activate English toàn route thuộc S10. Các page Board/Task/Settings không được redesign ở đây; chịu shell mới nên đã regression các luồng nền.

## BE read contract bổ sung cho Home

GET /workspaces thêm `state=all|active|archived`, `role=all|managed|member`; defaults all giữ compatibility. Managed gồm standalone Owner, attached Manager và Org Owner/Admin hiện hành, không là role nâng quyền từ request. Member chỉ phần eligible không thuộc managed.

Response thêm `total`, `roleCounts:{all,managed,member}`, `stateCounts:{all,active,archived}`. Total áp dụng cả q/time/role/state trước cursor; roleCounts áp dụng q/time/state trước role, stateCounts áp dụng q/time/role trước state. Summary không chứa raw Org/membership data. Counts facet tách khỏi page documents để tránh rich-text pages chạm facet16MiB.

Trạng thái legacy thiếu state là active. Scope/Ban/membership filters đi trước totals/paging, memberCount chỉ WS membership hiện hành; Org Admin không có WS membership vẫn quản trị nhưng không cộng giả vào số thành viên thực hiện. No activity sort/custom domain/global search mới.

## Bằng chứng kiểm

- **BE66 unit pass**,14 dedicated suites skip trong unit; **113/113 isolated integration** và targeted Workspace/Org21/21. Unit mới reject role/state injection, giữ defaults và date semantics.
- **FE13 unit pass**, build **119 modules**. Browser mới `FE/scripts/check-stitch-home.mjs`: real API/Mongo fixtures Owner/Member/Org Admin không WS membership/Archived/hidden private WS, role/state counts, grid/list, Ctrl-K, invalid date, create trong search filter, error/retry, late query race,20-item pagination (header20 trong khi page12), mobile keyboard/resize, stretched card navigation.
- Existing Interaction browser **PASS**: Home dialog/validation/nested discard/focus/draft, Workspace/Project long descriptions, Board/create/editor/comments, author/assignee/CAS/Archived/load-more, no overflow/page errors. Locator submit cập nhật đúng scope dialog vì CTA và submit cùng accessible name.
- Chụp và nhìn ảnh thật ở **1440/1280/1024/768/375px** và list view. Ảnh trong `.local/stitch-home/home-*.png`; fixture data, không account/user data thật.
- Chạy probe.mjs của skill trên fixture ở cùng5 widths. Copy dưới `.local` chỉ đổi browser launch sang Edge và auth/API routing fixture; measurement code giữ nguyên, mỗi context login mới để không reuse refresh token. Report `.local/stitch-home/probe/report.json`.

## Probe và sửa trực quan

| Phát hiện | Xử lý | Nguồn |
|---|---|---|
| Cover còn khoảng trắng bên phải | Card bỏ flex-wrap cũ, media/content width100%, ảnh fill đúng slot, fallback gradient giữ chiều cao | Nhìn ảnh1440/375 |
| Emoji tiêu đề rơi thành dòng riêng | Giữ greeting ngắn không trang trí orphan, hierarchy hero/CTA rõ | Nhìn ảnh1440 |
| Mobile heading công việc bị bóp | Grid header icon/text, CTA ở hàng riêng; link/title hit area ≥32/36px | Nhìn ảnh375 + probeP1–P3 |
| Sidebar hover quá gần active | Hover nền lavender khác rõ; normal weight400, selected hệ thống, giữ keyboard focus | probeP4 |
| Overlay toast cản bấm card | Toast container không bắt pointer, chỉ controls có tương tác mới bắt | Browser click case |
| Drawer hẹp thiếu nổi/chữ metadata nhỏ | Thêm shadow ở mobile overlay và nâng metadata font12 | Probe Lệch hệ |

Lần probe cuối ghi **0 mục “Hỏng”**, còn28 nhóm Gu/đặc thù; các mục Gu còn lại phải đọc theo scope:

- Focus rings được giữ theo yêu cầu trực tiếp của chủ dự án và QA nền, dù default skill không vẽ.
- Cream borders/indigo accents thuộc brand Stitch đã chọn, không chuyển thành bảng xám generic. Cards17px/description13px giữ hierarchy nội dung theo pattern; không coi tên record là sidebar.
- Probe nhận links của cards pagination là sidebar: false classification, sidebar thật được kiểm riêng keyboard/resize.
- Panel-shadow Gu so modal với bóng của các layer/menu trong trang; đã có shadow + overlay/inert và xem ảnh mở375px. Không coi warning đo blur đơn thuần là blocker khi layer thực tế phân biệt rõ. KPI/card hover borders vẫn theo nhận diện Stitch, không là form validation.
- Native select/date đã là component convention của app; chưa cài/rewrite một date library ở pilot. Time inputs mở trong advanced panel, validation BE/FE giữ; custom date picker là cải tiến riêng nếu cần.

Không dùng câu “probe sạch toàn bộ”: công cụ còn Gu/default exceptions và không tự đo contrast của ảnh/gradient. Contrast overlay được nhìn lại trên ảnh; cover là minh họa, không mang giá trị nghiệp vụ.

## Vận hành và giới hạn

API4000/FE5173/replica dev27018 khởi lại sau phiên nghỉ; giữ `.local/mongodb-dev`, không đụng standalone27017. Test fixtures database tạm, không mail/Google/retention worker hoặc dữ liệu dev. Không seed hàng mẫu vào Home thật chỉ để giống screenshot.

F0 là foundation cho pilot, chưa chuyển toàn app sang token/component mới; quyền/scoped read-only vẫn do BE kiểm. Global search, Org aggregate/selector, full translation, auth visual, trash UI và các cụm sau chưa dựng. Tiếp S2 theo increment nhỏ, không đổi Board/Settings cùng lượt.
