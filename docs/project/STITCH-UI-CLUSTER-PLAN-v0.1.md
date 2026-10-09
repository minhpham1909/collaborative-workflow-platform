# Plan UI theo từng cụm — Stitch local + ui-ux

05/10/2026. Yêu cầu trực tiếp: dùng skill ui-ux, theo thiết kế Stitch đã import, sửa từng cụm và nghiệm thu trước khi chuyển cụm. Lượt này lập plan/đối chiếu nguồn, **chưa sửa UI**. Plan này tiếp U1/U2 của core expansion; không mở lại wireframe hoặc thay brand đã chọn.

## Nền BE và phạm vi

Core C1–C4 và C5-A đã có API/kiểm scoped quyền; C6-A/B local rehearsal đạt65 unit/113 integration, fixture backup/restore/rollback/đo tải và runbook. Đủ nền để nối UI hiện có. Không đồng nghĩa toàn bộ mockup đã có API hoặc production ready.

Manual purge, Workspace transfer vào Org vẫn chưa mở; retention legacy chưa backfill, workers/provider production chưa nghiệm thu. Storage/upload, Sprint/lịch họp, billing/custom domain, realtime presence, mentions, 2FA/SSO và các module mới cần nghiệp vụ riêng. Không coi screenshot là quyền hoặc dữ liệu thật.

Nguồn [core plan](CORE-EXPANSION-PLAN.md), [C6 QA](../qa/CORE-C6-OPERATIONS-CHECK.md), [API C4](../sds/TASK-REOPEN-C4-API-v0.1.md), [API C5](../sds/ARCHIVE-TRASH-C5-API-v0.1.md). QA P1–P3 cũ giữ làm regression nền, không suy đã đạt UI mới.

## Audit và cách áp skill

- FE React19/Vite8, JS/JSX, CSS thuần; Tiptap3. Không có Tailwind/Radix/shadcn/chart/date library. Giữ stack; không copy CDN Tailwind/scripts từ export Stitch hoặc cài thêm thư viện chỉ để giống HTML.
- Đã có AppHeader/Footer, Avatar, Icon, StudioCover, FormField, PasswordField, FilterPanel, MemberPicker, WorkspacePicker, NameDialog, Feedback, NotificationProvider/useDialogFocus, RichEditor/EditorCore, DescriptionPreview, PersonProfile. Mỗi vai dùng một component, không dựng mỗi cụm một bộ mới.
- CSS hiện Jakarta local, kem/tím, gradient nhẹ; audit đếm tín hiệu glass2/gradient2 files trong FE/src, không kết luận toàn app glass. Chưa có semantic token layer đầy đủ, nhiều hex rải trong styles.css.
- Chữ UI hiện Vi; User.locale đang dùng email preferences, chưa có bộ dịch toàn UI. Route hiện có home/workspace/project/task/mine/shared/notifications/settings/auth/invite; chưa có Organization management và trash routes.
- Dùng Stitch làm bố cục đã chọn + skill để kiểm hierarchy, consistency, states, spacing, responsive. Không trung tính hóa multi-accent thành xám, không đổi Jakarta sang font mặc định skill.
- Quyết định trước của chủ dự án yêu cầu focus rõ, điều hướng/draft guard và nối BE thật được giữ. Không bỏ keyboard focus theo default skill; không dựng handler giả/placeholder vì bản HTML chỉ minh họa. Kanban **3 cột** theo nghiệp vụ, không thêm cột thứ4 từ mẫu generic skill.
- Thực hiện audit → screen contract → sửa cụm → probe/browser/QA → ghi kết quả. Đây là áp dụng UI đã chọn, không yêu cầu chọn lại wireframe.

## Nguồn Stitch đã kiểm

Gốc: `assets/ui_design/stitch_workflow_collaborative_workspace_design/`; DESIGN.md ở `studio_workspace_system/`. Có13 cặp code.html/screen.png, trong đó12 ảnh đọc được; Task detail PNG invalid, phải đọc code.html và render trước khi lấy làm chuẩn. Popup Task screenshot cắt mất phần đầu/cuối, HTML là nguồn bổ sung cho overlay.

| Reference folder | Cụm dùng |
|---|---|
| trang_ch_b_ng_i_u_khi_n_c_ng_vi_c | Shell/Home, greeting, KPI có nguồn, danh sách chú ý, card |
| c_ng_ch_n_studio_t_ch_c_t_i_u_h_a_ui_ux; popup_kh_i_t_o_studio_ho_c_t_ch_c_m_i | Organization selector/create; entry không bắt nhóm nhỏ tạo Org |
| kh_ng_gian_l_m_vi_c_qu_n_l_workspace; popup_t_o_m_i_workspace | Workspace collection/card/create, archived/read-only |
| qu_n_l_th_nh_vi_n_ph_n_quy_n_studio | Team table, invitation area, quyền theo scope |
| b_ng_kanban_animated_micro_interactions | Project header/description/filter/3-column Board |
| chi_ti_t_task_th_o_lu_n_b_nh_lu_n; popup_t_o_task_m_i_trong_d_n | Task drawer/full-page/form/editor/checklist/comments |
| c_ng_vi_c_c_a_t_i_qu_n_l_nhi_m_v_c_nh_n | MyTasks group-by-deadline, compact toolbar/task rows |
| trung_t_m_th_ng_b_o_ho_t_ng_m_i | Inbox/read state/target actions |
| h_s_c_nh_n_c_i_t | Settings sections, profile/security/email |
| workflow_logo | Logo hiện có; không tạo nhận diện mới |

## Hợp đồng nền dùng chung — không redesign cả app cùng lúc

| Thành phần | Hướng chốt cho đợt này |
|---|---|
| Màu/chữ | Nền #FFF8F5, surface trắng/kem theo DESIGN.md; indigo là CTA chính; coral/mint/amber/blue theo entity/status có chữ/icon. Jakarta local, một họ font; token cho hierarchy, không rải mã mới từng page |
| Nút/input | Form40px desktop/44px hẹp, vùng bấm icon tối thiểu40px; một CTA chính mỗi nhóm; danger tách rõ; hover/focus/busy/disabled thống nhất |
| Card/list | Card có media/icon/metadata phục vụ lựa chọn; toàn vùng card bấm được khi là navigation, tránh nested anchor/button; skeleton giữ nhịp và fallback ảnh |
| Badge/status | Một mapping vi/en+icon+tone cho role/status/priority. Overdue độc lập Priority; Done không overdue; request pending không là trạng thái thứ4 |
| Filter | Search động; quick chips thường dùng; thời gian + advanced popover; applied chips/xóa lọc/counts. Không trải tất cả controls ra một khối form |
| Dialog/drawer | Dùng NotificationProvider/focus trap/escape/restore focus/inert nền; giữ draft khi lỗi; Task drawer và full-page dùng cùng nội dung |
| Feedback | Toast phản hồi ngắn, inline lỗi cần xử lý; no-op/success/unknown outcome phân biệt. Không window.alert/confirm/prompt; không retry mutation mù |

Header/sidebar/footer là shared infrastructure, chỉ sửa phạm vi cần cho cụm đang làm. Không thêm slider, ảnh trang trí hoặc số liệu không có nguồn chỉ để lấp chỗ mockup.

## Trình tự sửa và bảng theo dõi

Chỉ **một cụm Đang làm**. Tối đa một màn chính + các dialog/sections của luồng đó trong một increment; cụm có nhiều màn thì tách increment. Không vừa sửa Board vừa sửa Settings/Org Team trong cùng lượt.

| Mốc | Cụm | Nội dung từng increment | Gate cụ thể | Hiện trạng |
|---|---|---|---|---|
| F0 | Nền dùng chung, pilot Home | Audit/token roles/component contract; shell desktop/hẹp; strings Vi/En nền; không thay toàn bộ control ở các trang cũ cùng lúc | Shared visual không phá auth/nav/dialog/draft; pilot1440/375; token/component reuse được kiểm | Đạt gate pilot07/10: token/shell/shared roles và Home dict slice; chưa toàn app translation |
| S1 | Home cá nhân | Home greeting/ngày Việt Nam, chú ý hôm nay, Workspace standalone/direct-entry, search/time/cards/footer. Dùng shell F0 | KPI có nguồn; chỉ hiện mục truy cập được; cả card mở đúng Workspace; filter/counts đúng scope | Đạt gate S107/10 theo UI-STITCH-S01-CHECK.md |
| S2 | Organization selector & Workspace list | 2a selector/create Org; 2b Org workspace collection/create attached WS. Thêm route được kiểm, giữ standalone Home | Không bắt user tạo Org; Owner/Admin nhìn đúng toàn scope; Member không tự nhìn WS khác; Guest vào Shared Projects | Đạt S207/10 theo UI-STITCH-S02-CHECK.md; Team/full RBAC UI vẫn ở S4/S5 |
| S3 | Workspace detail / Project collection | Description preview/edit; Project cards/icon/create/edit; Archive/Unarchive WS; giữ Project own state | Editable theo role + parent; archive typed name/reason/CAS; mở lại không tự đổi Project; navigation/long content | Đạt 07/10 — QA S03 |
| S4 | Organization Team | 4a members/invitations; 4b scoped role/Manager/ownership/audit. Dùng khuôn bảng Stitch | Owner/Admin matrix, không self-elevate qua FE; membership assignment đúng; stale/lost-role handling | 4a/4b đạt 07/10 — QA S04 |
| S5 | Workspace Team / an toàn quyền | WS members/invites/leave/remove; Ban preview/job/retry/unban theo scope; riêng từng flow | Kick khác Ban; cleanup đúng preview/cutoff, warnings có số thật; không cấp lại quyền khi Unban | Đạt 07/10 — QA S05 |
| S6 | Project / Kanban | 6a header/description/filter/3 cols; 6b Task create/edit/priority/labels, Lead/Project Guest management | Sort newest không manual ordering; pagination từng cột/filter counts đúng; Guest read-only Task; Project archived đúng | 6a/6b đạt 09/10 — QA S06 |
| S7 | Task detail / thảo luận | 7a drawer/full page/editor/checklist/comments/activity; 7b request/review/direct reopen | Assignee tick không sửa cấu trúc; Done incomplete confirm; reopen reason/independent review/rates/CAS; Comment author/moderator đúng | 7a và7b đạt 09/10 |
| S8 | My Tasks | Rows/groups overdue/today/upcoming/no deadline/completed; compact workspace/status/priority/label/time filters | Assigned/current membership only; groupCounts full-filter không đếm trang; overdue/Done/Vietnam bounds; tới Task giữ origin context | Đạt09/10 — QA S08 |
| S9 | Notifications / invitation entry | 9a Inbox/read-all/search/time; 9b WS/Org/Project public invitation variants | Không lộ target mất quyền; đúng category/signed read-all; invite email/link rõ scope; intent qua auth/verify, token scrub | 9a/9b đạt09/10 — QA S09 |
| S10 | Settings + Auth | 10a profile/email/security/Google link; 10b login/register/verify/recovery/reset/personal locale | Không auto-link email; Google-only không bịa password requirement; email prefs/WS overrides giữ; Vi/En routes cần dịch đủ | Chưa bắt đầu |
| S11 | Trash & restore | Project trash list/detail/restore, expiry/legacy-unscheduled/parent readonly | Restore theo capability/current assignee/version; không replay; expired lý do rõ. Không CTA purge thủ công khi chưa có API/quyền | Chưa bắt đầu |
| S12 | Regression toàn bộ | Scope switch/Guest/2 Org+standalone, drawer routes/drafts, localization, responsive, assets/perf | Không blocker UX/data/privacy; điểm deferred có record; docs không claim production acceptance | Chưa bắt đầu |

Thứ tự S9/S10 nằm sau visual cụm công việc nhưng auth/invite hành vi được regression **mỗi lần sửa shell/router/shared dialog**, không đợi cuối mới kiểm.

## Khi nào cụm được ghi Đạt

1. Có bảng màn/CTA → API/body → capability → state, gồm readonly/mất quyền, loading/empty/error/success và ca tên/mô tả dài.
2. Visual đối chiếu Stitch bằng screenshot/render thực tế: typography/spacing/icon/hierarchy/ảnh, không chỉ đọc JSX. 1440 desktop,1280/1024 với sidebar,768 và375px; page không tràn ngang, Board có scroll có chủ ý trên hẹp.
3. Keyboard Tab/focus/Enter/Escape, touch hit area, reduced motion; drawer/dialog không che CTA, focus trở lại nơi mở. Giữ yêu cầu focus của dự án dù default skill khác.
4. FE validate + BE errors/CAS/permission recheck; draft không mất ở retry/lỗi; unknown outcome không gửi trùng. Deep link/Back/Forward/switch scope giữ đúng context và bỏ dữ liệu scope cũ.
5. Không API sai scope, mock counts/presence/roles, bịa trạng thái hoặc mutation không có contract. Filter phía BE trước count/pagination; không lấy một page để tính KPI toàn hệ thống.
6. Chạy FE build/unit phù hợp + browser fixture của cụm và regression đường chạm shared; BE test nếu thay API. Không viết test chỉ mirror CSS hoặc chạy lại toàn bộ BE vì đổi spacing.
7. Ghi ảnh/QA, lỗi đã sửa, remaining/deferred, update status. Còn blocker thì ở lại cụm, không chuyển trang kế tiếp để che lỗi.

## Phần Stitch dùng ngay / điều chỉnh / để sau

| Chi tiết | Xử lý theo core thực tế |
|---|---|
| Warm surfaces/Jakarta/sidebar/header/card/icon/ảnh/compact filters | Dùng làm visual foundation; ảnh local/fallback, không copy external runtime/scripts |
| Project progress/Done count/Task code/priority/labels/checklist | Dùng API C4; mã thật WF-xxxxxx-N, không cố #TK mock; stats whole_project phân biệt filter counts |
| Người rời nhóm | PersonProfile theo scope; không tag dài lặp lại trong card/dòng như mockup |
| Task create có chọn cột status và checklist tick sẵn | Create hiện chỉ todo và checklist mutation riêng. Không tự chuỗi create→status/checklist rồi báo một success atomic nếu backend không hỗ trợ. Nối thêm CTA khi Task đã tạo; mở gap contract nếu cần tạo atomic |
| MyTasks tạo Task cá nhân / task ở ngoài Project | Không có personal-task entity. Nếu cần CTA, chọn Project còn create capability; không tạo Task không parent |
| Recent Done một nút undo/reopen | Theo request/direct management có reason/self-review/rates, không toggle Done→open tự do |
| Org Guest/Collaborator/Core Member/custom RBAC | Org chỉ Owner/Admin/Member, WS Manager/Member, Project Lead/Guest. Không thêm role theo labels mockup |
| Org domain/cover/bio/job title/handle/custom avatar upload | Chỉ dùng fields hiện có. Google avatar/initials nền; không upload/change domain chức danh giả. UI-only visual icon phải rõ chỉ trang trí |
| Sprint/calendar/meeting/online/last-seen/timer/review completion/personal productivity | Deferred, không lấy current Task count để giả Sprint/năng suất/presence |
| @mention/reply quick/accept assignment/deadline extension workflow/digest08:30/push/Slack | Deferred; dùng event categories và actions đang có, không menu trống/hứa thao tác chưa có |
| Billing/Pro/seats/SSO/2FA/API keys/bots/export reports/custom domains | Không dựng CTA hoạt động hoặc badge chứng nhận chưa có module |
| Trash manual permanent delete/Workspace transfer | Giữ ngoài UI vì chưa chốt quyền/API; không suy từ icon thùng rác của mockup |

## Gap API phải xử lý ở đúng cụm

- Org cards hiện chỉ có name/role/version; chưa có aggregate members/WS/Projects toàn scope. Không `items.length` của page để ghi tổng. S2/S4 dùng compact projection endpoint có scoped tests nếu thật sự cần, hoặc bỏ chỉ số đó.
- Org list hiện chưa hỗ trợ q/time; Workspace list có q/from/to nhưng chưa role/state tabs/server totals. S1/S2 phải bổ sung contract/filter/counts trước khi gắn tabs số lượng của Stitch; không lọc trên một page rồi gọi là tổng.
- Header search hiện chưa có global cross-entity search; đặt search theo màn hoặc làm launcher navigation, không giả omnibox tìm mọi Task/tài liệu. Default sort tạo mới giữ, không đổi sang activity sort chưa hỗ trợ.
- MyTasks has groupCounts theo query hiện tại; completed-in-period cho cá nhân chưa là Project stats. Dùng query status/time semantics đúng contract; nếu thêm completedAt filter phải có BE validation/range tests, không dùng createdAt/updatedAt thay.
- Project stats có API; không gọi N+1 unbounded cho tất cả card để giả Org progress. Có visible-page fetch cache/bounded hoặc thêm aggregate read nếu cần được review.
- User.locale hiện email-only trên UI; S10 thống nhất mô tả preference dùng giao diện/email khi nối Vi/En. Mỗi cụm đưa copy vào dictionary; không công bố chuyển UI sang English đầy đủ trước khi các route chính đã dịch.
- Shared routes/sidebar/scopes/drawer cần nối dần; không hiện link đến page chưa triển khai. Guard/hash mới phải giữ auth/invitation token scrub và không nhận return URL tùy ý.

Không lấy các gap trên làm lý do sửa BE toàn bộ một lượt. Chỉ bổ sung phần đọc hoặc contract cần cho **cụm đang làm**, có negative tests và QA riêng.

## Ticket đầu tiên — F0/S1 pilot

- Chỉ App shell và `#home`; chưa chỉnh Board/Task/Settings/Org Team.
- Chốt token semantic từ DESIGN.md và bảy component roles; tái dùng existing components, baseline screenshots/traces đang chạy.
- Home dùng warm hero ngắn, ngày đúng VN, search + quick filter/time advanced, Workspace cards click cả vùng, badge role thật, description preview, ảnh fallback, memberCount/activeProjectCount hiện có. Today attention từ MyTasks.groupCounts cho scope/query active; không meeting/Sprint/online fake.
- Chưa thêm Org card click vào route chưa có; S2 nối Organization picker/destination sau. Scoped readonly/empty/error/lost-access vẫn đầy đủ trên Home.
- Cập nhật QA riêng F0/S1 và chỉ chuyển S2 khi pilot đạt tiêu chí. Nếu source asset/aggregate thiếu thì ghi gap, không bịa để hoàn thiện screenshot.

## Nơi ghi tiến độ

Plan này là nguồn trạng thái mới cho đợt Stitch/core-expanded UI; kế hoạch P1–P6 cũ giữ lịch sử. Mỗi cụm có `docs/qa/UI-STITCH-Sxx-CHECK.md` khi bắt đầu thực hiện, ảnh/probe log ở `.local` được ignore. Không ghi `Đạt` ở lượt lập plan.

07/10/2026: F0/S1 triển khai và kiểm xong trong scope pilot: [QA](../qa/UI-STITCH-S01-CHECK.md), [screen contract](../ui-ux/HOME-S01-CONTRACT.md). Tiếp S2, không suy pilot thành full UI hoặc full English rollout.

07/10/2026: S3 Workspace/Project collection đạt trong scope: [QA](../qa/UI-STITCH-S03-CHECK.md), [contract](../ui-ux/WORKSPACE-S03-CONTRACT.md). Tiếp S4 Organization Team; không mở rộng nghiệm thu sang S5/S6.

07/10/2026: S4a Team members/invitations đạt: [QA](../qa/UI-STITCH-S04-CHECK.md), [contract](../ui-ux/ORGANIZATION-TEAM-S04-CONTRACT.md). Tiếp S4b role/Workspace assignment/Manager/ownership/audit; chưa chuyển S5.

07/10/2026: S4b scoped role/allocation/Manager/ownership/audit đạt: [QA](../qa/UI-STITCH-S04-CHECK.md). S4 hoàn tất trong scope Organization Team; tiếp S5 Workspace Team/Ban/cleanup, không suy S4 thành full RBAC UI.

07/10/2026: S5 WS Team/Email+LINK/Kick/leave/standalone transfer/Ban preview/actions/retry/Unban đạt: [QA](../qa/UI-STITCH-S05-CHECK.md), [contract](../ui-ux/WORKSPACE-TEAM-S05-CONTRACT.md). Tiếp S6 Project/Board; không tự chạy moderation/SMTP/retention dev queue.

07/10/2026: S6a Project/header/description/filters/3-column Board đạt: [QA](../qa/UI-STITCH-S06-CHECK.md), [contract](../ui-ux/PROJECT-BOARD-S06-CONTRACT.md). Tiếp S6b priority/labels forms và Lead/Guest management; chưa chuyển S7.

09/10/2026: S6b Task priority/labels form + Project labels/Lead/Guest management đạt, S6 hoàn tất trong scope: [QA](../qa/UI-STITCH-S06-CHECK.md). Tiếp S7 Task detail/checklist/discussion/activity/reopen; không suy thành whole UI/production acceptance.

09/10/2026: S7a full-page/right-panel/checklist/discussion/activity đạt: [QA](../qa/UI-STITCH-S07-CHECK.md), [contract](../ui-ux/TASK-DETAIL-S07-CONTRACT.md). Tiếp S7b request/review reopen, chưa chuyển S8.

09/10/2026: S7b request/review/history/Project pending queue đạt, S7 hoàn tất trong scope: [QA](../qa/UI-STITCH-S07-CHECK.md). FE14/build141, BE reopen10, browser regression và5width/probe. Tiếp S8 My Tasks; không providers/queues/backfill dev.

09/10/2026: S8 My Tasks grouped rows/summary/compact and scoped filters/Task panel-fullpage return đạt: [QA](../qa/UI-STITCH-S08-CHECK.md), [contract](../ui-ux/MY-TASKS-S08-CONTRACT.md). FE15/build145, BE19, browser + core regression PASS,5width/probe0 Hỏng/console sạch. Tiếp S9a Notifications inbox; không queues/providers/backfill dev.

09/10/2026: S9a Inbox/read groups/search-time/signed read-all/unknown outcome/detail return đạt: [QA](../qa/UI-STITCH-S09-CHECK.md), [contract](../ui-ux/NOTIFICATIONS-S09-CONTRACT.md). FE16/build147, BE8, real browser/C2 regression,5width/probe0 Hỏng/console sạch. Tiếp S9b public invitation entry; không queues/providers/backfill dev.

09/10/2026: S9b public WS/Org/Project invitations đạt: [QA](../qa/UI-STITCH-S09-CHECK.md), [tiến độ](UI-UPGRADE-PROGRESS.md). FE16/build148, real browser/C2 regression,3 variants/5width, probe0 Hỏng/console sạch. S1–S9 đạt gate cụm; tiếp S10a Settings. Không BE/schema/queues/providers/backfill dev.
