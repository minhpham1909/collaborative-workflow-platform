# S12 — Regression toàn ứng dụng

09/10/2026 — đang thực hiện. S1–S11 đạt gate cụm; tổng vẫn11/12. Chưa nghiệm thu S12/toàn site Vi-En/production.

## S12a — SMTP thật, kiểm tra đường gửi

Theo yêu cầu mới của chủ dự án, bổ sung email thật vào S12. Giới hạn cũ về hàng đợi dev vẫn giữ: không bật worker hoặc gửi các job cũ.

- Thêm `BE/scripts/check-live-smtp.js`: opt-in `--preview` hoặc `--send-to ONE_EMAIL`; không import database/dispatcher/worker, chỉ gọi production `createMailProvider` đúng1 lần. Kiểm tra mode SMTP/TLS/config và recipient đơn, không auto retry. Không thêm package/runtime dependency.
- Syntax +preview PASS. 09/10/2026:1 thư gửi tới địa chỉ thử đã được user cho phép; SMTP accepted, mã `d37f13ea`,1 attempt. Nội dung có nhãn KIỂM THỬ SMTP S12, tiếng Việt có dấu và link trang chủ local, không token/password/Google credential hoặc dữ liệu Task thật. Subject dùng template work hiện có: “Cập nhật công việc”.
- Report cục bộ ignored: `.local/s12-smtp/{runId}.json`, chỉ metadata/trạng thái, không lưu recipient/credentials/token. Ghi intent trước khi gửi; response mất không tự gửi lại.
- **Inbox: chủ dự án đã xác nhận nhận thư mã `d37f13ea` trong Inbox ngay phiên kiểm thử.** Đây là bằng chứng SMTP → mailbox cho1 thư smoke; không suy deliverability mọi recipient. Chưa có bằng chứng email từ nghiệp vụ auth/invitation/outbox đã đi đủ luồng trong increment này.
- Template hiện có là plain text. Kiểm tra thật dùng đúng provider và builder hiện có, không tự tuyên bố email HTML đã hoàn thiện.

## Các gate S12 còn lại

1. Email nghiệp vụ thật có kiểm soát: verification/single-use/expired link, reset/revoke sessions, invitation accept/correct-account/expiry; assignment/preferences/workspace overrides, cancellation khi mất quyền/Archive. Tách sinh job/dispatch/nhận thư/link action, chỉ job thử mới tới mailbox được phép. Chốt cách giữ môi trường test cho link email hoạt động trước khi gửi token thật; không gửi link trỏ nhầm database tạm hoặc đọc/gửi hàng đợi cũ.
2. Cross-scope2 Org +standalone/Guest/current capabilities, navigation/history/draft guards, nested dialog/notification layering và stale responses.
3. Kiểm bản dịch toàn route Việt/Anh, responsive/focus/keyboard/empty/error/read-only/success; asset/performance/bundle và các deferred records.
4. Ghi rõ automation fixture vs provider thật vs xác nhận Inbox. S12 chỉ đạt khi các gate cần thiết có bằng chứng và hạn chế còn lại được ghi đúng.

## Chạy kiểm tra SMTP từng thư

Từ thư mục BE, dùng Node runtime đã cấu hình:

```text
node --env-file=.env scripts/check-live-smtp.js --preview
node --env-file=.env scripts/check-live-smtp.js --send-to YOUR_AUTHORIZED_EMAIL
```

Lệnh thứ hai gửi1 email thật mỗi lần chạy. Không đặt vào CI hoặc test suite mặc định. Nếu kết quả chưa rõ, kiểm tra report/mailbox trước khi chủ động chạy lại. Không dùng `mail:once`/worker để thay thế vì chúng có thể chọn job dev cũ.

## S12b — Email nghiệp vụ và hành động qua link

09/10/2026: thêm `FE/scripts/check-mail-lifecycle.mjs`. Default không gửi thư, chỉ preflight full React/Express/MongoMemoryReplSet. Chế độ `--send-to ONE_EMAIL` opt-in gửi tối đa4 thư qua production dispatchers/provider tới đúng1 mailbox đã được cho phép, không tự retry. FE riênglocalhost5188/API port tạm/test keys/database tạm, giữ dev5173/4000/27018 và OS Mongo27017. Kiểm tra port trước khi chạy và đóng môi trường thử sau kiểm.

- Preflight PASS, rồi live SMTP PASS:4 thư verify/reset/Workspace invite/assignment, mỗi event1attempt được SMTP accepted. Sinh outbox từ nghiệp vụ thật, claim/lease/context/revalidation thật; sent payload encrypted được xóa. Không kết nối MONGODB_URI của dev hoặc gọi dispatcher trên hàng đợi cũ.
- Trình duyệt mở URL từ cùng production mail payload đã đưa tới SMTP khi fixture còn hoạt động: signup qua FE → verification không tự consume khi chỉ mở, scrub token, click xác minh, reuse400; recovery → reset mật khẩu, login mật khẩu cũ bị từ chối, JWT phiên cũ vô hiệu; invitation → login bằng đúng email, không auto-accept, explicit accept → đúng Workspace; assignment → mở đúng Task.
- **Phát hiện và sửa lỗi BE link email công việc**: `/tasks/:id` không được router FE nhận, đổi sang `/#task/:id`. Thêm assertion integration chống tái phát. API `/tasks/:id` giữ nguyên; chỉ sửa web link trong thư.
- Negative gates không gửi thêm thư: token auth hết hạn bị cancelled; Member rời Workspace trước dispatch thì work job cancelled. BE27 integration PASS/0 skip gồm accounts/notifications/workspaces: prefs/override/event filtering, expiry/revoke/exact-email/single-use, leases/cancellation/session/auth/Origin và privacy.
- Page errors0; ảnh Task mở qua email ở `.local/mail-lifecycle/task-link.png`. Report ignored `.local/mail-lifecycle/{timestamp}.json` chỉ kết quả/metadata, không recipient/password/token/url bearer. Không ghi link/token vào Git/log.
- **Chủ dự án đã xác nhận đủ4 thư trong Inbox.** Test link lấy URL từ production send payload, không đọc/click hộp thư qua mail client. Không gọi đây là tự động kiểm toàn tuyến mailbox UI.
- Token/link dùng fixture riêng, đã tiêu thụ khi kiểm và môi trường đã đóng. Không yêu cầu user click lại link thử, không thay đổi tài khoản thật cùng địa chỉ email. Đây là regression nghiệp vụ +SMTP thật, chưa phải deployment production acceptance.

Chạy từ root dự án với Node/Playwright runtime đã cấu hình:

```text
node FE/scripts/check-mail-lifecycle.mjs
node --env-file=BE/.env FE/scripts/check-mail-lifecycle.mjs --send-to YOUR_AUTHORIZED_EMAIL
```

S12 vẫn đang thực hiện: Org/Project invitation variants đã có fixture regression nhưng chưa gửi SMTP thật trongS12b; whole-siteVi/En/navigation/performance còn gate. Không tự gửi thêm thư hoặc bật worker nền để hoàn thành các phần đó.

## S12c — Phạm vi quyền và điều hướng/draft

09/10/2026 — kiểm xong đợt regression này, S12 chưa toàn gate.

- `BE/scripts/run-integration.js test/core-e2e-mongo.test.js`:6 tests PASS/0 skip. HTTP chain2 Org+standalone+Guest, onboarding/current-role/no global elevation, labels/checklist/reopen/statistics, Archive/Ban/Org exit và independent scope, trash/restore/no replay. Retention/migration chỉ chạy trong DB fixture riêng, không dev27018/OS27017/outbox.
- `FE/scripts/check-stitch-organizations.mjs` PASS: Owner/Admin/Member, Org/WS search/total/cursor; không thấy Workspace chưa cấp quyền, cross-Org unavailable không lộ tên; role demotion được BE từ chối, không tự nâng quyền; breadcrumbs, empty/error/retry/stale search và5width.
- `FE/scripts/check-navigation-flows.mjs` PASS sau cập nhật selector Home từ “+ Tạo Workspace” sang “Tạo Workspace” đúng UI S1. Lượt đầu dừng do test selector cũ, không có bằng chứng product failure tại chỗ đó. Không đổi logic guard để làm test qua.
- Guard regression: Back/Forward/hash/link/reload/logout; giữ draft Task create/edit, Project name/description, Workspace create/settings/description/email override, profile/email/password, Comment create/edit, invite/register/recovery/reset; Escape/cancel/discard, busy write chưa nhận response, history tồn tại trước mount và fallback khi không có Navigation API. URL/token scrub và owning React tree được kiểm.
- Bổ sung vào `check-stitch-trash.mjs`: Board→trash tạo history thật; giữ restore request ở transport gate, Back phải quay lại URL trash và giữ component, header refresh bị khóa, thông báo busy hiện; release chỉ1 POST, Task được phục hồi đúng. Fixture cleanup luôn release gate cả khi assertion lỗi để không treo route handler. Cả S11 suite và5width PASS/0 page errors.
- Dữ liệu/accounts/providers trong fixtures độc lập. Không gửi thêm mail thật trongS12c hoặc chạy worker/dev backfill. SMTP S12a/b và xác nhận Inbox giữ nguyên bằng chứng lịch sử.

Gate còn: coverageVi/En toàn app, dialog/toast layering kiểm riêng, responsive/performance/assets và kết quả nghiệm thu tổng hợp. Những guard tests đạt không phải lời khẳng định bảo vệ mọi thao tác rời trang/browser crash.

## S12d1 — Việt/Anh cho shell và nhãn shared dialog/toast

10/10/2026 — đạt increment này, chưa full-site language gate.

- Header/sidebar/mobile navigation/footer dùng dictionary shell riêng và cùng UI locale hiện có. Breadcrumb scope label/menu/skip-to-content/account actions/unread badge accessibility được dịch. `lang` trên shell subtree phản ánh ngôn ngữ đang chọn; tên user/Workspace/Task không chạy qua dictionary.
- Locale provider bọc NotificationProvider để default dialog title/URL input/cancel/confirm/apply và toast dismiss label đổi ngôn ngữ. Không dịch máy nội dung confirm động hoặc thông báo nghiệp vụ chưa có dictionary; không claim toàn bộ dialog body/feature đã English. Giữ item/promise/input/focus-stack hiện có, không thay logic dialog/toast layering trong increment này.
- FE18 unit PASS: interpolation giữ nguyên tên có dấu/placeholder/dollar characters và unread count; build159 PASS. Entry chunk501.70kB, gzip141.38kB: Vite còn warning>500kB, chưa performance gate; không nới ngưỡng.
- `check-settings-locale.mjs` cập nhật EN navigation selectors, kiểm shell `lang`/nav/footer/keyboard skip focus/English dialog metadata, mobile English menu. Full Settings/unknown/CAS/password/Google fixture regression PASS,3tabs/5width; UI locale không đổi email locale hay dữ liệu draft. Name “Mật khẩu” giữ nguyên; persistence/read-only email giữ.
- Installed skill probe5width0 Hỏng. Ảnh `.local/settings-locale/shell-menu-en-375.png`, `*-en-{width}.png`; xem trực tiếp menu English375 không overflow/CTA bị mất. Gu exceptions warm borders/focus rings/mobile shadow/skip-link header measurement giữ theo brand/accessibility, không claim mọi heuristic sạch.
- C2 invitation browser regression PASS; Auth Vi/En regression PASS trên5 flows/5width do thay provider hierarchy. Không SMTP/Google thật/worker/dev data trong increment này. FE local5173 đã khởi động lại vì đầu phiên chưa có server; lỗi đầu tiên connection refused là môi trường, không product regression.

Coverage còn thiếu: Home/highlights/Org/Team/Workspace/Project/Task/My Tasks/Inbox/invitation bodies, rich-editor/pickers/validation/role/time copy, dynamic confirmation/feedback. Kiểm dialog-toast layering và bundle split/error recovery là các bước kế tiếp, không tính S12 hoàn thành.

## S12d2 — Home và tổng quan cá nhân Việt/Anh

10/10/2026 — đạt scope Home, giữ layout/media/component Stitch hiện có.

- Home dùng UI locale cho greeting, filters/grid-list/role/state/counts, cards fallback/CTA, loading/empty/error/create validation/confirm/success, compact overview/attention/notification summary. Date/date-time hiển thịvi-VN hoặcen-GB nhưng giữAsia/Ho_Chi_Minh; query/role/state IDs/time bounds/count source không đổi.
- Tên người dùng/Workspace, description có dữ liệu, Task title/code/project/Workspace names không dịch; greeting dùng replacement callback để `$&`/`{name}` trong tên không bị xử lý như replacement syntax. Count1 dùngperson/project/task/workspace singular. Created/date là một text template để spacing không bị tách bởi flex layout.
- FilterPanel có locale prop mặc địnhvi; Home truyền locale, các cụm chưa chuyển giữ hành vi/copy cũ. Không tự bật English cho feature chưa dịch. Error text hiển thị theo locale; giữ raw errors trong state để không đóng băng language khi đổi locale.
- `check-stitch-home.mjs` PASS: toànS1 scope/roles/Archive/counts/search-time-race/grid-list/card-navigation/empty/network/retry/create/pagination20; bổ sungEN greeting tên “Mật khẩu $& {name}”, protected Task title,5width/no overflow, blank-name validation, nested cancel giữ draft, invalid date, empty/search, network error/retry, tạoWorkspace tên “Đăng xuất” qua API không dịch name và success toast English.
- Installed skill probe English ở375/768/1024/1280/1440:0 Hỏng; mỗi width một default-limiter fixture mới, không nới rate limit. Ảnh `.local/stitch-home/home-en-{width}.png`, `probe-en-{width}/report.json`; xem trực tiếp375. Gu exceptions native date/select/focus/warm borders/card hierarchy/mobile shadow/layout measurements giữ theo brand, không claim mọi heuristic sạch.
- FE18 unit PASS; build160 PASS, entry507.66kB/gzip143.27kB còn warning>500kB, performance gate chưa đạt. `check-interaction-flows.mjs` PASS do thay sharedFilterPanel; không BE schema/API/providers/SMTP/queue/dev data trong increment.

Coverage tiếp: Organizations/Team, Workspace/Project/Task/My Tasks/Inbox/invitations và rich controls/feedback; dialog-toast layering và performance. Home đạt không đồng nghĩa toàn siteEnglish/S12 đạt.

## S12d3a — Danh sách Tổ chức và Workspace trực thuộc Việt/Anh

10/10/2026 — đạt2 màn Organizations/Organization và form tạo tương ứng; Organization Team quản lý quyền chưa chuyển English trong increment này.

- Dịch hero/path/breadcrumb/section navigation/search-role-date-state/counts/cards/fallback/empty/loading/error/create/success. Role Owner/Admin/Member có locale argument với mặc địnhvi để các caller Team chưa dịch giữ hành vi cũ. Dates vẫnVietnam timezone; resource names/descriptions/initials và query enums giữ nguyên.
- NameDialog thêm locale prop mặc địnhvi: hint/name validation/cancel/saving/error/discard message và guard labels theo caller locale. Org truyền locale/title/label/submitLabel; không reset input khi mở nested confirm, không sửa quyền/expectedVersion/POST body.
- `check-stitch-organizations.mjs` PASS: S2 scope/role/current Admin demotion/cross-Org/read-only/totals/search/race/paging16/empty/error/retry/create. Bổ sungEN directory+attachedWS5width; name validation/nested cancel giữ draft/createOrg vàWorkspace tên Việt; sau create filter reset và tìm lại Org cũ; Owner denied private Org không lộ tên; Member English chỉ thấy Workspace được cấp, không có CreateWorkspace và không thấy Workspace khác.
- Xem trực tiếp ảnh375: `.local/stitch-organizations/selector-en-375.png`, `workspaces-en-375.png`;5width mỗi màn không overflow/page errors. Increment này không chạy lại installed probe English, không claim probe0; S2 probe lịch sử là bằng chứng riêng.
- FE18 unit PASS, build161 PASS; entry512.47kB/gzip144.41kB còn warning>500kB, chưa performance gate. `check-interaction-flows.mjs` PASS do thay shared NameDialog. Không BE/API/schema/providers/SMTP/dev data/queue/backfill.

Tiếp Organization Team/invite/role/ownership/Manager/allocation/audit copy theo từng phần; Workspace/Project/Task/My Tasks/Inbox và global feedback/layering/performance còn mở. Gate UI toànS12 vẫn chưa đạt.

## S12d3b — Team members/invitations Việt/Anh và kiểm thử sau gián đoạn

10/10/2026 — đạt scope danh sách thành viên/lời mời, form mời vàoOrg, revoke và permission guide. ManageDialog role/Workspace/ownership và Audit body chưa chuyển English trong increment này.

- Giữ enum/query/filter/expectedVersion, names/email/Workspace names và role checks. Copy/header/tables/mobile data-labels/date-time/empty/loading/error/invite/revoke/guide theo UI locale; timezoneVietnam. Không gửi email thật trongS12d3b; invitations chỉ queued trong database fixture.
- **Lỗi đã tái hiện**: sau tạo lời mời, Team đổi tab nhưng render vẫn nhận array thành viên cũ; status label undefined đi qua `.replace` khiến React crash. Sửa clear rows/total và bật loading ngay khi setTab (click/create completion/demotion fallback); active tab click làm refresh để không mắc loading, cùng helper bảo toàn non-string. Unit regression thiếu label ởvi/en được thêm; không sửa BE để né lỗi.
- Team revoke có busy draft-navigation guard: response đã commit nhưng bị giữ tại transport; Back phải trả về đúngTeamURL và giữ component, có busy feedback; release→rowRevoked, chỉ1POST. Existing CAS/unknown/no auto retry retained.
- `check-stitch-team.mjs` PASS: fullS4a role scopes/member search/total16/paging, invitation targetWorkspace/create/filter/revoke/lost create response/readback, Admin demotion denial/draft preserved/privateOrg isolation. English thêm names/search, member+invitation5width, cancel draft preserved, invite đúngWorkspace, single revoke/backguard và Member không có Invite/Invitations buttons;0page errors/overflow.
- Mỗi nhómVI/EN/revoke/member chạy default-limiter API fixture instance mới, cùng private testDB/auth keys; không nâng/tắt production rate limits. Đã quan sát429 ở lượt automation nhanh trước khi tách nhóm, ghi rõ là fixture traffic limit, không coi là testpass hoặc lỗi quyền.
- `check-stitch-team-management.mjs` PASS regressionS4b: role/CAS/draft, direct internal allocation, Archived Manager recovery, preservedOrgrole/audit/Admin matrix/typed transfer/current capabilities,5width. Đây là regression hành viVI, không claimManage/AuditEnglish.
- FE19 unit PASS, build161 PASS; entry518.79kB/gzip146.32kB vẫnwarning>500kB, chưa performance gate. Xem ảnh `.local/stitch-team/members-en-375.png`, `invites-en-375.png` và5width. Không chạy English probe mới trongscope này; không claimprobe0 choTeamEnglish.
- FE5173 đã khởi động lại khi resume vì server không còn chạy. Không real accounts/dev27018/OS27017/SMTP/moderation/retention/backfill; toàn test dùngMongoMemoryReplSet riêng.

Tiếp OrganizationManageDialog vàAudit copy, sau đó các Workspace/Project/Task/MyTasks/Inbox/invitation screens. Shared layering/performance/full language gate còn; S12 chưa tổng acceptance.

## S12d3c — Quản lý quyền và nhật ký Tổ chức Việt/Anh

10/10/2026 — đạt copy/flows OrganizationManageDialog vàOrganizationAudit. Không thay quyền, CAS, enums hoặc typed confirmation condition.

- Dịch role change/workspace admission/Manager replacement/ownership transfer labels, hints, confirmation/warnings/errors/success và guard copy. Member/Org/Workspace names được chèn sau template, không dịch. Nhập tênOrg vẫn so sánh chính xác cùngchuỗi có dấu; language chỉ thay presentation, không transform payload.
- Audit action labels/role labels/fallback/loading/empty/reload/paging được dịch; actor/target displayName vàhistorical references giữ nguyên, dates dùngVietnam timezone với locale format.
- `check-stitch-team-management.mjs` PASS: fullS4bVI gồm CAS/draft/unknown committed response lock/readback, Admin demotion denial, direct member assignment, Archived Manager replacement, role preservation/audit, typed transfer/capability loss. English thêm stale roleVersion rejection/draft retained, manager eligibility trongArchived vàAddMember bị khóa, Manager save, auditMinh→Lan unchanged, accent-mismatch transfer disabled/typed exact success/oldOwner no management; role/Manager/audit/transfer4views×5width không overflow/page errors.
- Default-limiter fixture app mới tại boundaryVI/EN/audit; không tăng/tắt limit hoặc sửa dev server data. FE19 unit vàbuild161 PASS; entry523.41kB/gzip147.61kB còn warning>500kB, chưa performance gate. Không English probe mới; visual trực tiếp `transfer-en-375.png`, ảnh `.local/stitch-team-management/{role,manager,audit,transfer}-en-{width}.png` làfixtureignored.
- KhôngrealSMTP/Google/dev27018/OS27017/moderation/retention/backfill. Provider/queues gates không chạy lại chỉ vì đổi copy.

Organization directory/team/manage/audit đã cóVi/En trongscope hiện tại; không suy thành full-site acceptance. Tiếp Workspace detail/team/settings/email/Ban flows, Project/Task/MyTasks/Inbox/invitations, shared layering vàperformance.

## S12d4a — Workspace detail/Project collection/Archive Việt/Anh

10/10/2026 — đạt Workspace shell/Project collection +Archive/reopen confirmation, chưaWorkspaceTeam/settings/email/Ban body English.

- Dịch Workspace breadcrumb/header/role/state/description fallback/section tabs, Project search/date/state/counts/progress/read-only/CTA/create/edit/empty/loading. Names/descriptions vàicon enum không qua dictionary; progress lấy nguyênBE summary, timezoneVietnam, payloadqueries không thay đổi.
- WorkspaceStateDialog copy/hints/reason/validation/discard/unknown feedback theo locale; exactName check, reason.trim, expectedVersion vàstateactive/archived giữ nguyên. MởWorkspace không đổi state riêng củaProject.
- Shared NameDialog truyềnlocale vàoProjectIconPicker; picker enum keys giữ nguyên,labelsVI/EN. DescriptionPreview/RichEditor thêmlocale optionalvi default cho collapse/read-full/scroll hint/editor-loading, không đổiEditorJSON hoặc dữ liệu document. Các caller chưa chuyển vẫnVI.
- `check-stitch-workspace.mjs` PASS: fullS3VI quyềnstandalone/attached/member/Manager/Admin; summary excludes trash; longdescription/metadata/Project edit/create/stale-role denial/CAS/archive/lost committed response single-write lock/readback/independent projectstate/paging15. English bổ sung5widthdetail+archive, protectedWorkspace/Project/reason input, createProject tênVi+Engineering→code, exactname accent mismatch disabled, archive readonly/CreateProject absent/reopen preserves separatelyArchivedProject. Đã điều chỉnhtest tìmProject cũ bằngsearch saupaging vì item không luônởpage1.
- `check-interaction-flows.mjs` PASS do thayshared NameDialog/icon/description/editor-loading. FE19 unit/build162 PASS; entry528.94kB/gzip149.41kB cònwarning>500kB, khôngnới threshold/chưaperformancegate.
- 5width khôngoverflow/pageerrors; xem trực tiếp `.local/stitch-workspace/archive-en-375.png`, `workspace-en-{width}.png`, `archive-en-{width}.png`. KhôngEnglishprobe mới trongincrement; khôngclaimprobe0. KhôngBE/API/schema/devcollections/SMTP/moderation/retention/backfill.

Tiếp WorkspaceTeam/settings/email/moderation, sauđóProject/Task/MyTasks/Inbox/invitation body/feedback. Full-language/layering/performance gateS12 vẫn mở.

## S12d4b — Cài đặt Workspace/email override/editor Việt–Anh

10/10/2026 — đạt kiểm thử chức năng trong phạm vi này; chưa nghiệm thu giao diện tổng thể S12.

- WorkspaceSettings dịch form tên/mô tả, validation, loading/readonly, discard/reload/save/unknown feedback và email override. Giữ đúng `inherit/on/off`, `membershipVersion`, reset cả4 sự kiện, dữ liệu tên và EditorJSON; lựa chọn ngôn ngữ UI không cập nhật `User.locale` dùng cho email.
- EditorCore nhận locale optional mặc địnhvi: toolbar/ARIA/link prompt/link error và word/character labels. Cập nhật aria-label khi label đổi, không reset content. Segmenter/grapheme limit/JSON/safeLink/heading/list/undo logic giữ nguyên.
- Bổ sung bản dịch Home breadcrumb còn thiếu ở Workspace. Các bodyTeam/moderation chưa chuyển locale trong increment này.
- `check-stitch-workspace.mjs` PASS toànS3VI +Englishdetail/Archive và thêm settings/email: blank-name validation, lưu tên/mô tả tiếng Việt+emoji nguyên vẹn, unsafejavascript link bị từ chối và không vào document,5width settings/email khôngoverflow, assignmentoverrideoff được ghi đúng, User email locale giữ nguyên, reset có explicitconfirm→inherit. Fixture thêm UsersService thật cho GET/users/me; không đọc devDB.
- `check-interaction-flows.mjs` PASS do thay shared editor: editor/link/dialog/draft/Board/comments/author/assignee/CAS/Archive regression. FE19 unit/build162 PASS; entry532.48kB/gzip150.75kB vàEditorCore395.77kB/gzip125.49kB, warning>500kB còn, khôngnới threshold.
- Ảnh `.local/stitch-workspace/settings-en-{width}.png`, `email-en-{width}.png`; xem trực tiếp375. KhôngEnglishprobe mới trongincrement này.
- **Quan sát còn cần sửa:** ở ảnh email375, nhiều success toast từ chuỗi thao tác nhanh chồng lên nội dung form. Chưa gọi visual/layering gate đạt; ưu tiên xử lý shared notification stack riêng trước khi tiếp tục nghiệm thu toàn ứng dụng. Screenshot không được dùng để tuyên bố mọi control đều unobstructed.
- KhôngBE/schema/APIproduction/providers/SMTP/devqueue/moderation/retention/backfill. WorkspaceTeam/Ban, Project/Task/MyTasks/Inbox và publicinvitations/body copy vẫn là các scope tiếp theo.

## S12e1 — Toast queue và phối hợp dialog

10/10/2026 — xử lý lỗi nhiều toast che form mobile đã ghi nhận ởS12d4b. Không thay inline form errors hoặc nghiệp vụ thông báo Inbox.

- Chỉ1toast hiện tại; queue tối đa4, error/warning ưu tiên hơninfo/success, cùngmessage+tone gộp lại. Lower-priority transient feedback có thể bị bỏ khi queue đầy; đây không phải lịch sửNotifications bền vững. Có nhãn số feedback tiếp theo.
- Dialog depth lấy từ chính useDialogFocus stack qua subscription, không đoán bằngDOM. Khi cómodal/nested confirmation, toast tạm không render và không chạy timeout; khi mọi modal đóng, feedback nhận lại6 giây hiển thị. Lỗi cần xử lý tại form vẫnInlineMessage, không bị đưa vào deferred toast.
- Hover theo tọa độpointermouse để text vẫn click-through, không tạo lớp bắtclick cheform; focus/hover giữ toast khi đọc, rời chúng bắt đầu lại6 giây. Close button44px/sticky, message dài cuộn trong tối đa180px/30dvh. Body dành khoảng trống theo chiều cao toast để action cuối trang cuộn lên trên toast. Một toast vẫn là lớp nổi, không claim không bao giờ phủ bất kỳ nội dung nào tại vị trí scroll hiện tại.
- App phát account-changed khi userID thay đổi/clear; Provider xóa feedback vàcancel pending prompts ở boundary này. Refresh cùngID không xóa feedback. Đây là cleanup phíaUI, không rollback request đã gửi hay thay server authorization; không claim giải quyết mọi stale response của hệ thống.
- `check-feedback-flows.mjs` PASS trên UI-only harness: burst chỉ1visible/countremaining, priorityerror/dedup, keyboardfocus vàmouse hover>6s giữ message, dialogdefer>6s/nestedEscape/focus/draft, account reset event, bottomaction scrollaboveToast,5width/nooverflow/pageerrors. Harness riêngkhôngAPI/DB/auth/provider; productionbuild không cóentry này.
- `check-stitch-workspace.mjs` PASS fullS3Vi-En/settings/email/reset, ảnh email375 chỉcòn1toast với sốpending thayvì4toast. `check-interaction-flows.mjs` và`check-c2-invite-flows.mjs` PASS do thay sharedfocus/NotificationProvider vàAppsession callback.
- FE20 unit/build163 PASS; entry534.08kB/gzip151.30kB vẫnwarning>500kB, khôngnới threshold. Ảnh `.local/feedback/feedback-{width}.png`, `.local/stitch-workspace/email-en-375.png` đãxem. KhôngEnglishprobe mới; khôngfull-site accessibility/production acceptance.
- KhôngSMTP/Google/liveaccounts/devdatabase/worker/backfill; harness gây feedbacksynthetic trongbrowsercontext riêng. TiếpWorkspaceTeam/Ban locale/cácfeature cònthiếu vàbundle performance; S12 chưahoàn tất.
