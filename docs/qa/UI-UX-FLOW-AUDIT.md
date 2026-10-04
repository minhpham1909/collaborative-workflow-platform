# P1 — Audit luồng và bố cục từng cụm màn hình

Ngày 04/10/2026. Mốc bắt đầu `dba605d`, theo [kế hoạch P1–P6](../project/UI-UX-UPGRADE-PLAN.md). Phạm vi gồm cả đúng/sai nghiệp vụ, thiếu chức năng, trạng thái và vị trí UI. **Kết quả audit đã được lập; P1 hiện Cần sửa, chưa chuyển P2** do lỗi điều hướng có thể mất bản nháp.

## Phương pháp và mức độ bằng chứng

- Đọc toàn bộ feature FE: Auth/AccountFlow, Home/highlights, Workspace/Team/Invite/settings, Project/Board/Task/Comments/My Tasks, Notifications và Account Settings; đối chiếu App/routes, components, SRS và các hợp đồng BE.
- Trình duyệt đang đăng nhập: quan sát Project, Workspace, Members, Workspace Settings, My Tasks và Account Security. Không sửa dữ liệu thật, đăng xuất tài khoản thật hoặc gửi email từ phiên này.
- Chạy lại 46 BE integration tests và 12 FE tests: đạt. BE dùng replica set riêng; mail/Google verifier trong test là fixture.
- Kiểm React/Express/Mongo cô lập cho Auth, Settings/Google fixture, Workspace Settings, Team/Invitations, Inbox và Board/Task/Comments. Trạng thái visual/roles được kiểm thêm ở 1440/1280/390px trong các fixture có coverage tương ứng; không suy thành mọi màn/state đã được kiểm ở mọi kích thước.
- Ký hiệu: **Đạt** = phạm vi ghi trong ô đã có bằng chứng; **Cần sửa** = đã có vấn đề; **Chưa kiểm** = không có bằng chứng cho nhánh đó; **N/A** = không áp dụng, kèm lý do.

## A — Tài khoản và authentication

| Luồng | Bình thường / validation | Loading / lỗi / hủy | Quyền / stale / mạng | Đánh giá và cần nâng cấp |
|---|---|---|---|---|
| Login email | Đạt: login, restore/refresh/logout theo API tests và fixture | Có disabled/loading/error trong code; hủy login qua route thuộc NAV-01 | BE verified/session/replay Đạt; double Enter/login đang chờ cần rà tiếp theo chuẩn P2 | Giữ Email → Password → Login; recovery/register ngay dưới form; Google sau divider. Bổ sung show/hide password và lỗi gần field ở P2/P6 |
| Đăng ký hệ thống | Đạt: consent ban đầu chưa chọn, email unique, password confirmation; chưa verified | Đạt: lỗi validation và success chờ gửi; 503 sau commit đã bổ sung chặn gửi lại | Đạt: DB chỉ một account ở fault fixture; rời form dirty chưa được bảo vệ chung | Không nói email đã đến inbox. CTA login sau thành công đúng; cần luồng tiếp tục xác minh rõ, dirty navigation theo NAV-01 |
| Xác minh email | Đạt: token scrub, thao tác xác nhận rõ, token replay/reload | Có error thiếu/hết hạn token; resend và reload có trạng thái | Đạt BE token/session; SMTP Inbox/Spam Chưa kiểm | Đã đưa actions xác minh vào Invite để giữ lời mời khi reload account; phản hồi lỗi resend hiện còn dùng status, chuyển inline alert theo P2 |
| Recovery/reset | Đạt: thông điệp generic, confirm password, reset revoke, replay | Có loading/error/success; uncertain dùng chung cho 5xx | Đạt fixture recovery/reset; mất phản hồi riêng reset Chưa kiểm bằng fault injection | Giữ một tác vụ chính/form; CTA yêu cầu link mới và login có. Lỗi cần link tiếp tục ở vị trí cạnh form |
| Google login/link | Đạt BE cùng email/proof/nonce/unique; Đạt GIS fixture wrong-email → chọn lại → linked và Google-only | Đã sửa nút Google cũ còn tồn tại sau lỗi/hủy; không tái dùng callback đã bị vô hiệu | Provider thật Chưa kiểm lại; nhánh mạng Google callback riêng Chưa kiểm | Thiếu Google signup mới trên FE so với mục tiêu sản phẩm; hiện copy giải thích chưa mở. Chốt policies/consent trước release, không tự auto-link |
| Change password | Đạt sai password, đổi đúng, CSRF/rotation/reload; Google-only ẩn form | Đã khóa gửi tiếp khi kết quả chưa xác nhận; fault riêng change password Chưa kiểm | BE thu hồi phiên Đạt; không suy kết quả request thất bại là password chưa đổi | Phương thức đăng nhập ở trên, form đổi mật khẩu bên dưới là đúng; cần nút show/hide, rules/help và bề rộng form thống nhất |

Empty state cho login/register/password N/A vì là form, không phải danh sách. Owner/Member N/A cho thao tác tài khoản cá nhân; session/verified vẫn áp dụng.

## B — Workspace, nhóm và lời mời

| Luồng | Bình thường / empty | Loading / lỗi / hủy | Quyền / stale / mạng | Đánh giá và cần nâng cấp |
|---|---|---|---|---|
| Home / chọn nhóm | Đạt: card link, metrics có nguồn, highlights/date VN; có empty/search-no-result | Có loading/error và unknown summary; create cancel/nested dialog Đạt | Aggregate scoping BE Đạt; create lost-response Đạt | Giữ hero/search → cards → highlights/footer. Link highlights hiện mở My Tasks chung, chưa mang filter hôm nay/quá hạn: FILTER-02 |
| Workspace / Project list | Đạt: role, tabs, active/archived/search/time, empty CTA Owner | Có loading/error/mất scope; description empty và edit CTA có | Member xem/Owner quản lý Đạt; description Editor/CAS Đạt | Workspace hero đang chiếm nhiều chiều cao; mô tả dài cần preview. Project card chưa mở toàn card như Home: LAYOUT-02 |
| Cài đặt nhóm | Đạt Owner name/rich description read-back; Member không có edit | Đạt dirty tab cancel, reload/CAS giữ draft; 503 sau commit khóa submit | Đạt mất Owner/membership; scope bị mất xóa snapshot | Để Save/Cancel dưới editor; phần thông tin chung không lặp editor ở header. Thu gọn mô tả header theo P3 |
| Email theo Workspace | Đạt inherit/on/off/reset và effective state | Có loading/error/reset confirm; Đạt CAS/reset fixture | Chỉ sửa override chính mình Đạt; rời nhóm reset BE Đạt | Tách rõ setting cá nhân với quản trị nhóm. Có link/giải thích kế thừa; form cần dùng nền component P2 |
| Members / transfer / remove / leave | Đạt search/date, transfer trước leave, assignee cleanup và Done history | Đạt modal/CAS không xóa khi stale, reload/mất quyền | BE race/role Đạt; generic modal đóng được nhưng invite dirty chưa hỏi | Hành động nguy hiểm đang cạnh nhau trên card; đưa vào menu quản trị, kèm tên người/tác động ở confirm. Không suy Owner được sửa Comment người khác |
| Invitations EMAIL/LINK | Đạt Owner-only, LINK hiển thị một lần, revoke/retry và scope | Đạt create/result/copy fallback, expired/revoked BE; empty có | Đạt queue fixture, LINK login intent/accept; delivery thật Chưa kiểm | Filter fragment có thể bỏ bộ đếm filter ẩn: FILTER-01 đã sửa. Tên nút confirm còn chung ở Team, đổi theo hành động P2 |
| Invite preview/accept | Đạt token preview và membership accept theo fixture | Token thiếu/hết hạn có error; 5xx đã chuyển uncertain | Verified gate Đạt; proof quyền accept BE Đạt | Trước sửa user chưa verified chỉ có lời giải thích; đã thêm resend/reload tại màn, giữ token trong route hiện tại |

Không có Workspace Archived, Workspace delete hoặc storage/resources trong scope đã triển khai; không thêm tab giả để khớp mockup. Empty state thành viên có Owner bình thường không rỗng; trạng thái tìm kiếm không kết quả đã có.

## C — Project, Task, Board và My Tasks

| Luồng | Bình thường / empty | Loading / lỗi / hủy | Quyền / stale / mạng | Đánh giá và cần nâng cấp |
|---|---|---|---|---|
| Project create/name/icon | Owner create/update/read-back có; Project empty có CTA | NameDialog giữ draft khi CAS/uncertain; cancel confirm đã có | BE Owner-only tên/icon/state Đạt; creator không được suy rộng | Tên/icon và vòng đời nằm trong header; đã đưa refresh cùng khu hành động. Description lúc tạo vẫn nhập sau khi vào Project, không phải mất trường trong DB |
| Project mục tiêu/description | Đạt edit/read-back; empty nói chưa có mô tả | Đạt giữ/cancel draft; 5xx đã có uncertain; error cạnh editor | Creator sau transfer còn member Đạt BE; Archived/mất member bị chặn | Một trường rich text cho mục tiêu+mô tả đúng scope; dài cần preview và expand ở P3 |
| Project archive/reopen | Đạt BE lifecycle; Task/Comment read-only, reopen | Có confirm tác động; lỗi giữ trạng thái đã đọc | CAS/scope BE Đạt; riêng mất response archive Chưa kiểm | Disable archive/rename/refresh khi tạo Task để không đóng form. Network state read-back cần chuẩn P2 |
| Board / Task create | Đạt ba cột/sort/filter/pagination/count, rich text/deadline; empty columns có | Đạt create lost-response/CAS; đã khóa parent refresh và tạo lần hai khi form mở | Đạt Member create, assignee current scope, archived read-only | Form tạo inline đẩy Board xuống; định vị form/panel thuộc P3/P6. Không công bố drag/drop hay drawer đã có |
| Task detail/edit/status | Đạt DTO/metadata/read-back, Owner/Creator edit, assignee status | Đạt CAS giữ draft, error/read-only, refresh; context reset qua reload | BE stale/leave/archive Đạt; đổi status mất phản hồi Chưa kiểm riêng | Đã đưa refresh vào header Task, metadata → description → discussion đúng thứ tự; layout dài/full-page còn P3/P6 |
| Task delete | Đạt cancel/confirm, deleted unavailable và DB soft delete | Dialog nói rõ giữ dữ liệu nhưng chưa restore | Owner/Creator/Active Đạt; Comments giữ DB/chặn parent | Không gộp Xóa với Archive. Thùng rác/restore/retention/purge thuộc P5, chưa có UI |
| Comments | Đạt add/edit/delete theo Author, rich text, pagination/empty | Đạt lost-response và nested confirm; refresh đã gom vào header thảo luận | Member add/Author only; Archived/mất parent BE Đạt | Composer đặt trong Discussion đúng. Thứ tự mới trước đã chốt; không tự đổi chat order. Delete lost-response riêng Chưa kiểm |
| My Tasks | Đạt assigned-to-me, open/active default, search/date/overdue/scoped pagination | Có loading/empty/error và refresh; H1 page đã sửa | BE queries/full-set count/privacy Đạt | Lọc Workspace chỉ tải 20 một lượt, có tải thêm; cần search picker. Filter/context khi quay lại và shortcut presets thuộc P4 |
| Editor chung | Đạt Việt/emoji/headings/link + roundtrip/counter trong fixture | Có lazy-loading và validation; input dialog link/cancel Đạt | BE validates structure/content/link, FE không thay BE | Chưa autosave; không hiển thị đã tự lưu. Toolbar/help/selected states cần P2/P6; rich text dài P3 |

## D — Notifications, Settings và shell

| Luồng | Bình thường / empty | Loading / lỗi / hủy | Quyền / stale / mạng | Đánh giá và cần nâng cấp |
|---|---|---|---|---|
| Inbox / detail | Đạt list/filter/read/direct reload/empty | Có loading/error/retry; masked target có explanation | Đạt recipient-only và masking/rejoin/delete | Đọc chính + hành động riêng là đúng; giảm metadata rời rạc, tăng hierarchy và vị trí CTA mở Task P6 |
| Read-all / accept invitation | Đạt cutoff không chạm thông báo mới; accept verified | Read-all confirm và success Đạt fixture | BE cutoff/category/scope Đạt; riêng lost response Chưa kiểm | Nút read-all cạnh reload nhưng cần mức độ nổi bật thấp hơn hành động chính; action label cần phản ánh filter hiện tại P2 |
| Profile / preferences | Đạt name/preferences/locale email/CAS read-back | Đã chặn submit sau network/5xx; profile 503-after-commit Đạt | Chỉ own user Đạt; dirty khi đổi tab có confirm | Giao diện chưa chuyển English; locale hiện cho email có giải thích đúng. English UI là khoảng trống sản phẩm P6 |
| Shell/header/footer | Đạt links/role context/menu ngoài-click/Escape theo code và observation | Badge unknown/stale có nhãn; route loading có | Session clear/revocation được kiểm, logout dirty chưa confirm | Cần cấu trúc focus/skip-to-main và nav tiếng Anh đồng bộ. Footer hiện có links nội bộ; policy/help thật chưa có |
| Confirm/input/toast | Đạt queue/cancel/Escape/inert/nested draft fixture | Inline errors còn cạnh form; success toast có ở một số luồng | Hashchange hủy dialog đang chờ; không thay navigation guard | Team/NameDialog còn form riêng là hợp lý nhưng nền/tên action chưa thống nhất. Toast chưa dùng đều, xử lý P2 |

## Sổ phát hiện và nơi xử lý

| ID | Mức độ | Thực tế / tái hiện | Xử lý / trạng thái |
|---|---|---|---|
| FORM-01 | Chặn | Board → tạo Task → nhập title → refresh Project ở trang cha làm unmount form | Đã khóa refresh/rename/archive/edit-description của cha và create/refresh Board khi form mở; tránh hai editor đồng thời. Regression tracked Đạt |
| AUTH-01 | Chặn | Register HTTP 503 sau commit trước sửa cho gửi lại, hiểu nhầm rollback | AccountFlow dùng isUncertainMutation; requestSubmit/nút không gửi lại; DB một account. Đạt tracked fault fixture |
| SETTINGS-01 | Cao | Workspace Settings/Profile/password network/5xx có thể mở submit lại hoặc dùng thông điệp lỗi kết nối chung | Đã dùng uncertain/khóa form; Workspace+Profile 503-after-commit Đạt; fault password riêng Chưa kiểm |
| GOOGLE-01 | Cao | Chọn sai email → thử lại: nút GIS cũ còn trên trang khi callback cũ live=false, click bị bỏ qua | Cleanup target khi hủy/lỗi/unmount ở Login và Security; wrong-email → retry → linked Đạt fixture |
| INVITE-01 | Trung bình | Chưa verified ở Invite không có actions để xác minh mà giữ lời mời; 5xx chưa khóa retry | Đã thêm actions resend/reload và helper uncertain; verified gate/accept fixture Đạt; fault accept riêng Chưa kiểm |
| NAV-01 | Chặn, còn mở | Home → Workspace → Project → create Task nhập draft → browser Back: chuyển Workspace, input biến mất, không confirm | Đã tái hiện bằng fixture riêng. Cần cơ chế chung Back/Forward/hash/internal-navigation/logout dirty, không chỉ click guard. P1 chưa Đạt; giải quyết trước chuyển P2, thiết kế có liên quan P4 |
| FILTER-01 | Trung bình | Filters bên trong Fragment của Team không được tách/đếm như các field khác | Đã flatten Fragment/giữ keys, bổ sung aria-label cho selects; Team fixture chọn revoked có Bộ lọc (1) Đạt |
| FILTER-02 | Trung bình | Shortcut hôm nay/quá hạn mở #mine mặc định; trở lại danh sách mất filters | P4: route/query presets và khôi phục context; không thêm sort tay hoặc tìm client trên trang đã tải |
| PICKER-01 | Trung bình | Assignee và Workspace picker phụ thuộc tải từng trang, chưa search trực tiếp | P2: picker query/search/loading/no-result/lost-member; API server search đã có cho Members |
| LAYOUT-01 | Trung bình | Refresh Project/Task/Comments đứng riêng ngoài header; My Tasks chỉ có H2 | Đã gom refresh đúng header từng vùng; My Tasks có H1; giữ tên nút để không đổi thao tác |
| LAYOUT-02 | Trung bình | Description dài không thu gọn; Project card chỉ title/CTA mở, khác Workspace card; hero+scope đẩy Board xuống | P3: preview/expand, vùng bấm và keyboard; P6: giảm chiều cao trang trí, ưu tiên vùng công việc |
| UI-STATE-01 | Trung bình | Nhiều lỗi chung chưa chỉ field; Team “Xác nhận” cho cả remove/transfer; toast không đồng đều, thiếu skip link/show password | P2: chuẩn component/labels/feedback; P6 visual variants. Không thay quyền vì mockup |
| RELEASE-01 | Điều kiện release | Google signup FE, policies thật, English UI, SMTP Inbox/Spam chưa hoàn thiện/kiểm live | Giữ backlog/release gate riêng; không gửi hàng đợi cũ, không công bố release-ready |
| RESTORE-01 | Phạm vi mới | Task soft delete đã có nhưng không có restore/trash/backup policy | P5: chốt nghiệp vụ/thiết kế trước chức năng. Không purge tự động |

## Vị trí bố cục đã sửa và đề xuất theo từng màn

| Màn | Giữ | Vị trí nên thay / hành động |
|---|---|---|
| Auth | Form và CTA chính, links recovery/register, Google sau divider | Help/error sát field; actions verify ngay trong màn chờ/Invite. Visual Auth theo P6, policies không giấu dưới CTA |
| Home | Hero + create, search, Workspace cards, highlights, footer | Highlights dùng links có preset P4; mô tả card/ảnh không vượt thông tin nhóm. Chưa đổi thứ tự theo sở thích chưa được kiểm |
| Workspace | Breadcrumb → heading/role → tabs → nội dung tab | Description preview ở header; edit CTA ngay vùng mô tả; actions Project chỉ trong tab Project; danger actions nằm menu Members |
| Project | Breadcrumb → project header → scope → Board | Refresh đã đặt cùng header actions. Scope thu gọn để Board gần tiêu đề hơn; create/filter thuộc Board, không đặt cạnh archive |
| Task | Header/title/actions → metadata → description → discussion | Refresh đã đặt trong header; các thao tác xóa không nổi hơn Save/Status. Comments refresh đã đặt cạnh heading discussion |
| My Tasks | Một list có Workspace/Project ở mỗi dòng và filter chung | Đã có H1; Workspace/Project state/overdue nâng thành presets phù hợp ở P2/P4, date details vẫn advanced |
| Inbox | Heading/actions → filters → list → target detail | Read-all thứ cấp; nội dung chính/CTA rõ hơn timestamp; unavailable không có CTA tới nội dung đã mất quyền |
| Settings | Hero → tabs → từng form → Save/Cancel/result | Dùng bề rộng đọc phù hợp; tránh card full width nhưng mọi nội dung dồn trái. Local/global/Workspace override phân biệt rõ |

## Bằng chứng chạy và giới hạn

- `node BE/scripts/run-integration.js`: 46 đạt, 0 skipped. `node --test FE/test/*.test.js`: 12 đạt. Vite production build cuối increment đạt, 105 modules. Không có thay đổi BE trong increment này.
- `FE/scripts/check-interaction-flows.mjs`: Đạt sau FORM-01 và gom header actions; includes card/description/editor/CAS/roles/archive/comments/soft-delete/responsive. Bổ sung assertion parent buttons disabled khi create draft mở.
- `FE/scripts/check-account-flows.mjs`: Đạt Auth chain và 503-after-register commit; dữ liệu/email synthetic, không worker thật.
- `FE/scripts/check-settings-flows.mjs`: Đạt profile/preferences/CAS/503, password rotation, Google wrong-email/retry/link và Google-only bằng GIS/verifier fixture.
- Fixture local đã chạy: `p1-workspace-fault-e2e.mjs`, `team-e2e.mjs`, `p1-team-e2e.mjs`, `p1-inbox-e2e.mjs`; Workspace CAS/overrides/503, Team lifecycle/counter filter, inbox cutoff/masking đạt. Các fixture local không nằm trong Git; không coi chúng là script CI có sẵn.
- Network regression tracked `FE/scripts/check-network-flows.mjs` chạy lại đạt sau thay đổi header/parent guards. Các scripts account/settings/interactions dùng Playwright qua WORKFLOW_PLAYWRIGHT_MODULE, browser qua WORKFLOW_BROWSER_EXECUTABLE và cần FE localhost:5173 đang chạy; fixtures có DB/API riêng.
- `p1-history-repro.mjs`: tái hiện NAV-01, cleanup replica set sau kiểm. Đây là bằng chứng lỗi còn mở, không đánh dấu test bảo vệ draft đạt.
- Một harness Settings cũ dùng menu/selector và native confirm cũ được điều chỉnh trước chạy. Một lần test Auth trong lúc sửa key/token remount đã mất success state; đã bỏ remount và chạy lại chuỗi đạt. Không gộp lần timeout thành bằng chứng luồng đạt.
- Không kiểm provider Google/SMTP thật, performance tập lớn, screen reader toàn bộ, every-state mobile, restore hoặc hoàn thiện English. Tests thành công không chứng minh UI hoàn chỉnh hoặc bảo vệ draft toàn diện.

## Gate P1 → P2

- [x] Có ma trận cả bốn cụm, phân biệt Đạt/Cần sửa/Chưa kiểm/N/A và bằng chứng.
- [ ] Không còn lỗi chặn: NAV-01 còn mở; cần sửa và regression trước chuyển bước.
- [x] Các khoảng trống đã có ID, mức độ, nơi xử lý P2–P6/release; không đưa NAV-01 sang phần visual để đóng audit.
- [x] Kiểm fixture và nhà cung cấp thật được tách; không phát hàng đợi mail cũ.

Bước kế tiếp: tiếp tục P1 xử lý NAV-01 và kiểm các form có draft khi Back/Forward/hash/đăng xuất chủ động. Chưa bắt đầu P2 hoặc redesign toàn bộ màn.
