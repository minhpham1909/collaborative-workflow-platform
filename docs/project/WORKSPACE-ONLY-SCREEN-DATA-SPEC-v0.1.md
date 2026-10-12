# Workspace-only — khung hiển thị và dữ liệu BE v0.1

12/10/2026. Phân tích theo yêu cầu user: từ **khối UI → thông tin người dùng cần → nguồn dữ liệu → contract BE**, không chỉ quyền/nghiệp vụ. Chưa sửa UI/BE/data. Tên DTO/API dưới đây là đề xuất, không mô tả endpoint mới đã tồn tại. Đi cùng [business spec](WORKSPACE-ONLY-BUSINESS-SPEC-v0.1.md) và [BE/UI contract](WORKSPACE-ONLY-BE-UI-CONTRACT-v0.1.md).

## 1. Cách đọc và nguồn kiểm

Đã đọc HTML local Stitch: Home dashboard, Workspace collection, Kanban, Task detail/comment, My Tasks, Notifications và create Workspace. Đối chiếu `BE/src/workspaces/response.js`, `query-store.js`, `work/mongo-store.js`, reopen stores và UI consumer. Đây là phân tích source/design, không nghiệm thu browser hoặc inventory DB live. Mockup có nội dung mẫu, không là bằng chứng dữ liệu hoặc policy hiện tồn tại.

- **Lưu:** nội dung người dùng nhập hoặc state chính thức: name, summary, rich description, preset IDs, membership, Task status/dueAt/completedAt.
- **Tính ở BE:** counts, progress, overdue, checklist summary, current role/access, setup readiness, pending requests. Có định nghĩa/scope/asOf; không tính tổng từ page FE.
- **Trình bày ở FE:** relative time, initials, truncate/expand, layout/grid/list, ngày theo GMT+7 và locale, màu/icon từ preset; không lưu các chuỗi “hôm qua”, “còn3ngày”.
- **State của FE:** draft/pending/empty/error/uncertain/loading; không giả các state này thành domain state trong Mongo. Readonly/capabilities từ BE.

Mỗi field phải có nghĩa rõ: null = chưa có/không áp dụng;0 = đã đếm và không có; field omitted = contract không cung cấp. Lỗi tải count dùng “—/Chưa tải được”, không0. Request khác nhau có thể khác asOf, không tuyên bố realtime hoặc snapshot chung.

## 2. Shell và navigation

| Khung UI | Dữ liệu cần | BE/FE và giới hạn |
| --- | --- | --- |
| Header account | id/displayName/avatar; tùy chọn UI locale/theme | Account DTO hiện có; FE fallback initials lọc Unicode letter/number, không sửa tên gốc |
| Badge Inbox | unreadCount, asOf | BE đếm toàn Inbox hiện được xem, không items.length; unavailable notification theo policy redaction |
| Pinned Projects | id/name/icon/workspace minimal/readOnly/available | API pins hiện có; mất quyền chỉ unavailable marker, không tên/ảnh cũ; gỡ pin vẫn được |
| Breadcrumb | resource IDs/names/canOpenParent | BE context tối thiểu; Guest không nhận Workspace management context; FE không làm link khi parent không được mở |
| Sidebar | route, active state, pins | FE layout; bỏ block “Không gian của bạn” và Org route theo kế hoạch; không cần API cho block thay thế |

## 3. Home — mỗi khối có nguồn riêng

| Khối | Trường đích đề xuất | Nguồn và điều kiện |
| --- | --- | --- |
| Greeting + ngày | Account.displayName, asOf/timeZone | FE format ngày GMT+7; ảnh hero preset local là minh họa, không dữ liệu hoạt động |
| Hôm nay / quá hạn | dueTodayOpenCount, overdueOpenCount, dueTodayWorkspaceCount | Assigned current-access Tasks, non-trash, Project/Workspace Active cho CTA làm việc; Done loại khỏi open counts. Nếu muốn gồm Archived phải đổi label và scope explicit |
| Notification tile | unreadCount | Cùng định nghĩa với badge; không đồng nhất số events và số Tasks |
| Công việc ưu tiên | items tối đa3–5: id/code/title/status/priority/dueAt/overdue/project context/checklistSummary/permissions | Endpoint/query bounded riêng; đề xuất nhóm quá hạn trước, đến hạn hôm nay tiếp, rồi ưu tiên cao sắp tới; tie-break dueAt/createdAt/id. Phải chốt sort, không gọi “ưu tiên” khi chỉ lấy newest3 |
| Workspace collection | paged WorkspaceListItem, total, facets | Truy vấn BE đã có counts/roleCounts/stateCounts, cần đổi scope bỏ Org và bổ sung metadata; chỉ group user có quyền hiện tại |
| Empty Home | collectionTotal + overview results | Chưa có nhóm khác với không kết quả filter; CTA tạo chỉ nơi phù hợp. Một khối lỗi không làm cả Home trắng |

**Đề xuất tách** Home personal overview và Workspace collection: filter Workspace collection không tự làm các tile cá nhân biến đổi. “7việc hôm nay” phải tương ứng query khi bấm CTA, không dẫn đến nhóm số khác. Overview personal response nên có appliedScope/asOf/timeZone. Reuse My Tasks query semantics, không một định nghĩa thứ hai trong Home.

## 4. Workspace card/row — payload nhẹ, dữ liệu thật

| Vùng | Dữ liệu | Hành vi thiếu/ý nghĩa |
| --- | --- | --- |
| Cover/icon/color | coverId/icon/colorKey thuộc preset allowlist | Default preset nếu chưa chọn; image failure fallback. Chưa upload storage |
| Tên/mục tiêu | id/name/summary | Summary optional; không tự generate nội dung. Description plain excerpt chỉ fallback trình bày có kiểm soát, không lưu thành summary |
| Badge | effectiveRole/state/readOnlyReason | Workspace role không là global account role; Archived có badge và CTA đọc |
| Thành viên | activeMemberCount; tùy chọn memberPreview tối đa3 và remainingCount | Đếm active eligible memberships, Owner cũng là1người; unique user, Guest không tính. Preview scoped bằng cùng rule Team, không trả email/danh sách toàn nhóm trong card |
| Dự án | activeProjectCount/archivedProjectCount | Theo **state riêng của Project** mà user được xem; Workspace Archived không làm activeProjectCount=0. Readonly hiển thị riêng, không đánh đồng state con với quyền thao tác |
| CTA/quick actions | canOpen/edit/createProject hoặc permissions tương đương | Click card mở cùng đích link; nút con không kích navigation; version metadata không đủ cho mọi mutation target |
| Card/list mode | Cùng payload | Card có ảnh/mô tả/metrics; row cô đọng tên/role/state/counts/actions. Không giữ một card khổng lồ và chỉ giảm font |

Hiện `query-store.js` chỉ đếm active Projects cho Workspace không Archived; vì vậy card Archived có thể nhận0 dù Project state còn Active. Refactor cần chốt semantics như bảng trên và test, không mang hành vi này sang UI mới như số chính xác. Preview avatars là **bổ sung** chưa xác nhận đã có trong list DTO.

## 5. Workspace detail và Project collection

| Khung | Dữ liệu cần | BE phải cung cấp |
| --- | --- | --- |
| Header/about | name/summary/rich description/presets/state/owner minimal/createdAt/updatedAt/version | Detail DTO; FE expand long text, giữ CTA và Board dưới gọn |
| Setup checklist | detailsConfigured/identityCustomized/hasAdditionalMembers/hasProject + từng CTA capability | Derived boolean từ dữ liệu thật; optional steps không khóa làm việc; preset default không coi là user đã customize |
| Tabs | available tabs và counts có nghĩa rõ | Team count=eligible active members; invite pending count chỉ management scope; không trả pending email count cho Member |
| Overview | Project counts và có thể Task totals nếu khối cần | Full permitted scope, non-trash; active-only vs all Projects ghi rõ. Tránh tile không giúp hành động |
| Project card/row | id/name/icon/summary hoặc description excerpt/state/effective readonly/createdAt/taskSummary/isPinned/permissions | Existing taskSummary whole_project đã có. Bổ sung cover/summary là field mới nếu chọn dùng, không giả đã tồn tại |
| Filter toolbar | q/state/date field/range/sort/layout; applied filters/facets | Server search full-set; cursor/page tie-break; filter options không chỉ từ page12rows |

Task progress = done non-trash / total non-trash ×100, rounded thống nhất. total0: hiển thị “Chưa có công việc”, không “0% thất bại”. Progress của Project Archived vẫn là số liệu lịch sử hiện tại; không gọi Sprint progress. Workspace progress nếu thực sự cần là **weighted done/total** trên scope Projects được chọn, không trung bình % các Projects.

Project summary và Workspace summary không cùng field. Đề xuất Phase core Workspace summary trước; Project hiện dùng description plain excerpt, thêm summary riêng chỉ khi cần mục tiêu ngắn có editor riêng. Không duy trì hai mục tiêu mâu thuẫn mà không định nghĩa chúng.

## 6. Create/settings/Team — dữ liệu phục vụ form

| Khung | Read contract | Write contract / phản hồi |
| --- | --- | --- |
| Create Workspace | Presets và constraints có nguồn thống nhất | name + optional summary/description/icon/color/coverId; operation identity; saved Workspace+version, field errors. Role/owner/state server-owned |
| Info settings | Current saved values/constraints/version/permissions | PATCH allowlist+expectedVersion; result saved values. Dirty local không bị refetch đè |
| Team row | user minimal/membershipId/role/state/joinedAt/version/actions | role/kick/ban target-specific; target version khác Workspace version; Owner role derived, không có hai Owner rows |
| Member picker | active eligible people + search/cursor, selected identity | Chỉ người có thể được giao Task/nhận ownership theo action; không nạp toàn bộ Team để search FE |
| Invitations | id/type/recipient-safe/createdBy/createdAt/expiresAt/state/delivery/version/actions | Invite Member vs Guest scope riêng; URL token chỉ lúc tạo link, không list lại; SMTP accepted khác Inbox received |
| Email overrides | stored inherit/on/off, effective preference và nguồn kế thừa, version | Không hiển thị inherit như off. Lưu/reset trả effective result; auth/security emails không bị tắt |
| Transfer/lifecycle | current Owner, eligible target, state/version, impact preview | Typed confirmation/reason; impact là counts hiện tại, không claim preview giữ nguyên đến confirm; revalidate trong transaction |
| Audit row | id/actor/action/target/time/reason/change summary | Paged, lọc server; không cần full old/new rich documents mỗi row; actor departed vẫn có identity tối thiểu |

Impact preview Archive phải nói rõ **read-only toàn bộ nội dung**, không Task bị xóa; số active/archived Projects riêng. Ban cleanup preview có phạm vi thời gian/matchingCount/asOf và cảnh báo irreversible comment deletion, không cùng form Archive.

## 7. Kanban — ba cột không có nghĩa ba bộ dữ liệu tùy tiện

| Khung | Trường cần | Phạm vi |
| --- | --- | --- |
| Project header | context/name/icon/description/state/version/permissions/readOnlyReason | Detail current access; bỏ Lead |
| Progress strip | total/done/overdue/progressPercent/asOf/scope | Whole Project non-trash, độc lập filter Board; nếu filtered thì label phải đổi |
| Toolbar/chips | filters/options/matchingTotal/overdue facet | Facet under defined filters, không lấy column page length; labels options có active/archived state |
| Column | status/items/total/nextCursor | Total **filtered** mỗi status; cursor độc lập cột; sort createdAt desc,id desc hiện tại giữ |
| Task card | id/code/title/status/priority/labels tối thiểu/assignee minimal/dueAt/overdue/checklistSummary/commentCount/permissions/version | List DTO nhẹ: không full description/checklist/comments/activity; commentCount bổ sung aggregate nếu khối hiển thị |
| Inline create | target Project/status và create permission | Không mặc định Creator có quyền Project management; saved row và counts invalidate |

BE hiện taskResponse còn trả rich description và toàn checklist cho list; cần xem tách TaskListItem và TaskDetail để tránh Board/Calendar tải dữ liệu không hiển thị. Checklist summary={total,checked}; full checklist chỉ detail. Không nạp comments từng card để đếm. Không có Project members chính thức riêng hiện nay: badge “4người cộng tác” của Stitch **chưa có định nghĩa**. Không đếm assignees rồi gọi toàn bộ người tham gia; dùng Workspace member count với đúng label hoặc thiết kế participant model riêng sau.

## 8. Task detail/panel và comment

| Vùng UI | Dữ liệu cần | Null/state quy tắc |
| --- | --- | --- |
| Title/header | code/title/status/priority/labels/context/readOnlyReason/permissions/version | Legacy code null: hiển thị fallback hợp lệ, không backfill trong analysis |
| Metadata | assignee/creator, dueAt, createdAt/updatedAt/completedAt | dueAt null=không hạn; assignee null=chưa phân công; Done completedAt null=thời điểm không biết, không giả bằng updatedAt |
| Profile hover/focus | identity + relationStatus trong scope, public info tối thiểu | Đã rời/banned/unavailable phân biệt nội bộ phù hợp; không công khai lý do Ban/email riêng cho Guest |
| Rich description editor | canonical document+plainText/version/limits | FE word count trình bày; saved/draft/saving/error khác nhau; không “autosaved” nếu backend chưa lưu |
| Checklist | items stable IDs/text/checked/version, structure/tick permissions | 0items=chưa có checklist, không0% checklist. Partial tick CAS conflicts có readback |
| Reopen | pending request summary, request/review/direct eligibility, blocking reason/nextAllowedAt | Rule direct vs pending đã chốt; quota precision còn review; không chỉ boolean khiến người dùng không biết chờ đến bao giờ |
| Discussion header/rows | total/current page/cursor; author/content/times/edited flag/version/actions | count từ BE, delete làm count đổi; author-only rule; không lưu body deleted comment trong DTO/audit |
| Activity | paged typed events/actor/time/reason/changedFields | Reopen/completion lịch sử độc lập trạng thái hiện tại, không gán “người duyệt” cho mọi Done |

Panel và full page dùng cùng detail contract; panel có thể lazy-load comments/activity độc lập. Full-detail lỗi không reset thành Task rỗng. Permission loss clears protected saved data theo access policy; draft chỉ giữ để copy nếu không tiết lộ dữ liệu ngoài phiên/account boundary.

## 9. My Tasks, Calendar, Inbox và Trash

| Màn/khối | Read data | Quy tắc hiển thị và query |
| --- | --- | --- |
| My Tasks summary | matchingTotal/workspaceCount/groupCounts/asOf | Assigned-only current membership; metrics theo applied query, không global count trộn với filtered rows |
| Deadline groups | group key/total/items/cursor | Quá hạn/hôm nay/sắp tới/chưa hạn/Done theo definitions hiện tại; counts full-set. Nếu dùng group pagination cần contract riêng, không lấy global cursor giả làm cursor nhóm |
| My Tasks card/row | TaskListItem + Workspace/Project context | Full card có summary/tags; row giữ code/title/context/status/deadline và essential action. Không “Task cá nhân” độc lập Project khi model chưa có |
| Calendar month | month/timeZone/day counts/total/noDeadlineCount/asOf | Full month dates, không rows page; absent day count chỉ coi0 khi request thành công |
| Calendar selected day | day hoặc none/items/total/nextCursor | Same filters/scope với month; no-deadline độc lập month theo contract hiện tại; không meetings/Google Calendar |
| Inbox header/filters | unreadCount/filter totals/type categories/appliedQuery | Chỉ category phát sinh từ event taxonomy thật. Không tab Mentions nếu chưa event/parser Mention |
| Notification card/row | id/type/actor minimal/createdAt/readAt/target availability/safe content/action eligibility/version | Relative time FE; availablefalse không chứa tên/content cache cũ; quick reply/accept task/extension không hiện khi chưa contract |
| Trash row | id/code/title/deletedAt/purgeAt/deletedBy/version/restore eligibility/blocking reason | purgeAt null=legacy unscheduled, không fake30day countdown. Restore không replay old notification |

Calendar là lịch deadline Tasks đã có, **không lịch họp**. Inbox cá nhân không là team activity feed; audit quản lý cũng không là feed cho mọi Member. Nếu cần team feed phải thiết kế audience/event projection riêng, tránh đưa management audit lên Home.

## 10. Những khối Stitch học theo được và khối cần nghiệp vụ mới

| Khối trong design | Quyết định đề xuất cho lần refactor |
| --- | --- |
| Nhận diện, summary, member count, Project counts, avatars preview | Dùng hướng visual; bổ sung field/read model có giới hạn, nguồn thật |
| Priority Tasks, progress Project, deadline groups, calendar | Dùng nguồn Task hiện có; priority query và summary DTO cần chốt |
| Sprint số42/tiến độ tuần/mục tiêu sprint | Chưa có Sprint entity/timebox/scope Task; không đổi tên project progress thành Sprint. Backlog riêng |
| +18% tuần trước/năng suất/đạt chỉ tiêu | Cần metric definition/history/time window; không suy từ current Done. Hoãn |
| Lịch họp/Meet/participants/tham gia | Cần Meeting/integration/time/calendar rules riêng. Hoãn |
| @mention/quick reply/nhận Task/xin gia hạn | Cần parser/event/workflow và action contract; không decorative CTA. Backlog từng nghiệp vụ |
| Tệp/Figma links/attachments count | Link rich text hiện có; chưa structured attachment/storage model. Không đếm URL rồi gọi files |
| Project participants/templates/export report | Model và semantics riêng; không fake counters/CSV export không đúng scope |
| Public/internal Organization access, Org switcher, Lead | Không mang sang Workspace-only đã chốt |
| Pro/VND/billing, trực tiếp/đồng bộ realtime | Không có billing/realtime contract tương ứng, không dùng badge làm claim |

## 11. API và DTO cần đặc tả tiếp

Đề xuất giữ resource routes hiện có, thêm Home overview/priority read nếu cần. Tách:

1. Account/session và unread badge/pins: shell reads nhẹ.
2. PersonalOverview + priority slice: nguồn các tile/CTA Home, có scope/asOf/timeZone.
3. WorkspaceListItem vs WorkspaceDetail vs settings/membership rows: không full-description/member-array trên mọi card.
4. ProjectListItem với taskSummary vs ProjectDetail/BoardResponse: progress scope riêng filter.
5. TaskListItem vs TaskDetail; comments/activity/reopen riêng có pagination.
6. Calendar aggregate vs selected-day items; Inbox rows vs event detail; Trash eligibility.

Ví dụ **DTO đề xuất**, các số minh họa không ghi vào DB:

```json
{
  "id": "workspace-id",
  "name": "Nhóm thiết kế",
  "summary": null,
  "identity": { "icon": "palette", "color": "lavender", "coverId": "creative-board" },
  "state": "archived",
  "effectiveRole": "manager",
  "counts": { "activeMembers": 8, "activeProjects": 2, "archivedProjects": 1 },
  "readOnly": { "value": true, "reason": "workspace_archived" },
  "permissions": { "open": true, "editInfo": false, "createProject": false },
  "version": 4
}
```

Không đồng thời giữ role/effectiveRole hoặc flat/nested counts hai cách không có thời hạn. OpenAPI cần chốt tên, enum, nullability, constraints và HTTP errors để FE nối, ví dụ trên không là schema cuối cùng. Constraint presets có thể là shared package/static allowlist versioned, không nhất thiết thêm API cho mọi constant. Mỗi screen data contract gắn query budget/bounded projection/batch aggregation; không per-card requests lấy profile/comments/counts.

## 12. Gate đủ dữ liệu trước implementation

- Mỗi khung có tên/câu hỏi người dùng/fields/source/action/null/loading/empty/error/readonly; không có button hoặc số không nguồn.
- Chốt metric và facet scopes, Active/Archived semantics, “priority hôm nay”, participation badge và quota precision trước API code.
- Chốt DTO list/detail, presets, query/sort/cursor, version/errors; UI contract không lộ DB parent fields đã bỏ.
- Kiểm fixtures: empty Workspace; nhiều members/projects/tasks; duplicate names; Unicode/punctuation-only name; long text; null due/code/completedAt; departed assignee; legacy trash; Archived; unavailable pin/notification; partial network failure.
- API tests verify counts độc lập page size, filters không làm sai overview khác scope, payload list không full rich document/checklist, role change/ban không leak qua aggregate; UI verify CTA dẫn đúng dataset/count và modes thật khác cấu trúc.

Trước sửa code, chuyển bảng này thành API schema + screen checklist có coverage. Read-only data inventory/rehearsal vẫn là bước riêng; không chạy migration/SMTP/purge/backfill hoặc thêm chức năng từ mockup ngoài scope đã chốt.

## 13. Draft API và checklist tiếp theo

[Read API draft](../sds/WORKSPACE-ONLY-READ-API-DRAFT-v0.1.md) cụ thể hóa fields/types/nullability/query/counts/errors. Draft chọn giữ role/readOnly boolean/memberCount flat để giảm đổi consumer; ví dụ nested ở mục11 chỉ minh họa, không áp song song hai format. [Checklist DATA-01–22](../qa/WORKSPACE-ONLY-SCREEN-DATA-ACCEPTANCE-v0.1.md) đều pending, chưa chạy. Chốt contract/policy rồi mới schema/implementation và fixture tests.
