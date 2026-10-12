# Workspace-only — draft contract dữ liệu đọc và form v0.1

12/10/2026. **Thiết kế đề xuất, chưa implement hoặc duyệt tất cả policy**. Cụ thể hóa [screen data spec](../project/WORKSPACE-ONLY-SCREEN-DATA-SPEC-v0.1.md). Không thay thế API đang chạy; không là OpenAPI hoàn chỉnh. Contract write bảo mật/lifecycle và migration có gate riêng.

## 1. Quy ước và lựa chọn tương thích

Giữ ID string24hex hiện có; timestamps ISO8601 UTC; date filter YYYY-MM-DD tính biên GMT+7; timeZone trả `+07:00`. Count integer≥0, percentage0–100, version safe integer≥0. Null ghi rõ theo field; BE không trả relative date/localized messages để FE dịch. Name dùng rule hiện có, không đổi tên gốc khi tạo initials.

**Đề xuất canonical DTO:** giữ `role`, `readOnly` boolean, `permissions`, flat `memberCount`/`activeProjectCount` trên Workspace list để giảm thay đổi consumer. Thêm `readOnlyReason`; không đồng thời đưa `effectiveRole`, `readOnly.value` và `counts.activeMembers` vào API. Ví dụ nested DTO trong screen spec chỉ minh họa, draft này chọn format để review. UI không đọc organizationId/managerId/leadId để suy quyền.

Permission=false không nhất thiết lỗi tài nguyên; chỉ trả blocking reason hữu ích và không lộ dữ liệu của người bị Ban. ReadOnlyReason enum đề xuất `workspace_archived|project_archived|null`; mất quyền trả lỗi/redaction theo endpoint, không trả detail đầy đủ với reason `access_lost`.

## 2. Workspace collection và detail

### GET /workspaces — giữ route, sửa projection/scope

Query giữ `q,from,to,state=all|active|archived,role=all|managed|member,limit,cursor`. Default state/role=all, limit20,max100 như hiện có; FE có thể dùng12. `managed` gồm Owner/Manager, không từ Org. Sort createdAt DESC,id DESC; **không hiện sort hoạt động gần đây nhất** nếu chưa có sort key/contract. Search literal AND trên name/summary/description.plainText; summary là nguồn mới cần index/query review.

| WorkspaceListItem field | Type / nullable | Ý nghĩa |
| --- | --- | --- |
| id/name | string/string | ID và tên gốc, không initials string thay tên |
| summary | string≤500 hoặc null | Plain mục tiêu ngắn, null khi chưa nhập; đề xuất input whitespace-only normalize null |
| icon/color/coverId | allowlist string | Preset default; không URL upload tùy ý |
| role | owner/manager/member | Current role trong Workspace, không role Account |
| state | active/archived | State Workspace |
| readOnly/readOnlyReason | boolean/enum hoặc null | Khóa nội dung do lifecycle; permissions quản lý vẫn riêng |
| memberCount | integer | Unique active eligible memberships, gồm Owner; không Guest |
| activeProjectCount/archivedProjectCount | integer/integer | Project state riêng, chỉ Projects được xem; Workspace Archived không làm count Active biến thành0 |
| createdAt/updatedAt | timestamp | Không gọi updatedAt là lastActivityAt; current DTO thiếu updatedAt cần bổ sung |
| version/permissions | integer/object | Resource version; bounded actions open/edit/createProject/leave tương ứng naming hiện tại |

Không rich description trong card mặc định. Nếu cần excerpt, field `descriptionExcerpt` plain bounded≤240, FE dùng khi summary null; không giả lưu summary. Member avatarPreview optional chỉ thêm sau chốt nhu cầu/privacy/budget, không phải required core.

Envelope `{items,nextCursor,total,roleCounts,stateCounts,asOf}`. `nextCursor:string|null` opaque; total sau mọi filters. Role facets áp q/date/state nhưng bỏ role filter của chính facet; state facets áp q/date/role nhưng bỏ state filter. Facet `all` cộng từ cùng scope, không tổng toàn account khi q đang lọc. Behavior này bám hướng facet hiện tại.

### GET /workspaces/:id — detail không bao toàn Workspace

Trả `{workspace}` với metadata trên (counts optional endpoint-defined), thêm canonical rich description, owner `{id,displayName,avatar}`, archivedAt/archivedBy minimal, setup booleans, membershipVersion và scoped permissions. Không full members/projects/invitations/audit array. `emailOverrides` có thể giữ DTO cá nhân hiện có; không emailOverride của người khác.

Setup đề xuất `{hasDescription,hasCustomIdentity,hasOtherMembers,hasProject}`; không một phần trăm “hoàn thiện”. hasDescription true nếu summary hoặc rich text có nội dung; customIdentity dựa khác default/explicit choice theo model đã chốt, không suy mọi default cover là đã customize. Các bước tùy chọn có CTA khi capability tương ứng true.

## 3. Home overview và priority slice — route mới đề xuất

`GET /home/overview` không nhận filter collection Workspace hoặc assignee/accountId. Response đề xuất:

```json
{
  "scope": "my_assigned_active_nontrash",
  "timeZone": "+07:00",
  "asOf": "2026-10-12T03:00:00.000Z",
  "day": "2026-10-12",
  "dueTodayOpenCount": 7,
  "dueTodayWorkspaceCount": 2,
  "overdueOpenCount": 5,
  "unreadCount": 11
}
```

Số chỉ fixture minh họa. Scope Task: current membership, assignment chính mình, không trash/missing parent/Ban, Project và Workspace Active. Inbox count dùng Inbox current-access/redaction policy riêng, không “assigned-only”. Một response có asOf không đồng nghĩa mọi aggregate cùng snapshot nếu không dùng snapshot read.

- dueToday: status khácDone và dueAt trong [startOfVietnamDay,endOfVietnamDay). Bao gồm overdue **trong ngày đó**. CTA MyTasks query phải open/active, timeField=dueAt/from=day/to=day.
- overdue: status khácDone, dueAt<asOf. Hai số có thể giao nhau; không cộng thành “tổng cần làm” nếu chưa distinct union query.
- dueTodayWorkspaceCount: distinct Workspace IDs trong đúng dueToday query; không tất cả nhóm user có.
- unreadCount: cùng định nghĩa badge shell; không list page length. Nếu một aggregate lỗi, UI block đó error, không0; có thể tách request Inbox khỏi Home envelope khi implement để partial failures không kéo cả overview down.

`GET /home/priority-tasks?limit=3` đề xuất bounded limit1–5, không pagination. Candidate = open assigned Active Tasks overdue hoặc dueToday; không gọi high-priority future/no-deadline Tasks là “hôm nay”. Sort: overdue group trước dueToday-nonoverdue; trong group priority high→medium→low, dueAt ASC,createdAt DESC,id DESC. Trả `{items,totalMatching,asOf,scope,selectionRule:'overdue_then_today_priority'}`. totalMatching là union không double-count, không items.length. Không random hoặc status toàn nhóm. Rule này còn là đề xuất sản phẩm, cần review trước triển khai.

## 4. Project list/detail và Board

`GET /workspaces/:id/projects` giữ query state/q/from/to/limit/cursor, createdAt DESC,id DESC. ProjectListItem: id/workspaceId/name/icon/descriptionExcerpt≤240/state/workspaceState/readOnly/readOnlyReason/createdAt/updatedAt/version/permissions/taskSummary. Chưa thêm Project summary/cover model chỉ để copy Workspace DTO.

`taskSummary={scope:'whole_project',total,done,progressPercent,asOf}` full non-trash; progress total0 trả0 nhưng FE label “Chưa có công việc”. Done≤total; progress round2decimals như hiện có. Archived không tự mất stats. Trả `isPinned` chỉ nếu batch derive cùng personal pins, không persist vào Project; có thể để FE reconcile bằng provider pins hiện tại.

`GET /projects/:id` giữ `{project}`, canonical description và context `{workspaceName,canOpenWorkspace}`, bỏ leadId/manageLead/accessRole=lead. Project permissions hiện tại tiếp tục field tên rõ từng action; lifecycle/matrix mới còn review. Không thêm participantCount vì chưa model/định nghĩa.

`GET /projects/:id/board` giữ `{project,columns,statistics}`. Keys columns=`todo|in_progress|done`; mỗi cột `{items,total,nextCursor}`. total theo Board filters; statistics scope=whole_project, không thay theo q/date/labels. Cursor độc lập từng cột; first Board request không dùng cùng cursor cho cả3cột, subsequent load dùng task list query status+cursor của cột đó. Không thêm arbitrary drag ordering trong lần này.

## 5. TaskListItem vs TaskDetail

| ListItem field | Type / nghĩa |
| --- | --- |
| id/workspaceId/projectId/code | IDs; code string hoặc null với legacy |
| title/status/priority | name; todo/in_progress/done; low/medium/high |
| assignee | PersonMinimal hoặc null; có scope relationStatus khi được phép |
| dueAt/completedAt/createdAt/updatedAt | timestamps; due/completed nullable |
| completionTimeKnown/overdue | boolean; Done không overdue, không fake completion timestamp |
| labels | bounded label objects id/name/color/archivedAt, không dùng array names mấtID |
| checklistSummary | `{total,checked}`; integers,checked≤total |
| commentCount | integer, chỉ comments tồn tại được phép thấy; field mới cần batch aggregation |
| version/permissions | Current action guards; context-specific readonly |
| workspaceName/projectName/readOnly/readOnlyReason | Trả ở MyTasks/Calendar context nơi cần; Board không lặp tên dài nếu đã có Project context |

List không full description/checklist/content/comments/activity/request reason. Detail giữ fields nghiệp vụ hiện có, full checklist/canonical rich description/Creator/Assignee và pendingReopenRequestId; bổ sung action blocking reasons/nextAllowedAt sau chốt quota. Rich text luôn normalized BE, không raw HTML.

Comments/activity/reopen histories load riêng limit/cursor; count header từ aggregate, không số rows đang load. Comment DTO giữ author/content/createdAt/updatedAt/version/actions; edited flag derived từ thực tế cập nhật nội dung, không tự mọi updatedAt kháccreatedAt là sửa text nếu model còn hoạt động khác.

## 6. My Tasks/Calendar/Inbox giữ scope và sửa DTO

MyTasks giữ query status/state/workspaceId/projectId/q/priority/labelId/timeField/from/to/overdue + limit/cursor; hiện groupCounts toàn query, global rows paged. Groups `overdue|today|upcoming|no_deadline|completed`: Done trước; null due→no_deadline; due<asOf→overdue; due<endOfToday→today; còn lại upcoming. upcoming **mọi tương lai**, không tự label “trong7ngày”. Today group loại overdue trong ngày, khác dueToday tile ở Home.

Đề xuất core giữ global cursor + counters loaded/total theo group; chưa thêm pagination từng group cho UI nếu endpoint chưa hỗ trợ. Row/card switch cùng data/query; hoàn thành7ngày cần completedAt filter riêng, không from/to createdAt giả thành completed.

Calendar giữ [M4 contract](PERSONAL-CALENDAR-M4-API-v0.1.md), đổi assigned pipeline bỏ Org và day items sang TaskListItem. Month counts không cursor/limit; noDeadlineCount không giới hạn tháng; current scoped permissions rechecked trên detail. Inbox giữ query read/category/q/from/to + limit/cursor và signed read-all cutoff hiện có; không đưa workspaceId filter vào UI khi BE chưa nhận. Retired organization_invitation cần legacy policy riêng, không âm thầm map sang Workspace invitation. Không thêm category mentions khi chưa có event.

## 7. Form contracts và lỗi UI

Workspace POST/PATCH đề xuất name/summary/icon/color/coverId/canonical description. PATCH thêm expectedVersion; omitted=giữ, summary null=xóa; icon/color/coverId không null, reset bằng default allowlist. owner/roles/state không đi trong metadata mutation. Members role-change endpoint mới cần own DTO/version/target safeguards, không reuse PATCH Workspace cho cả danh sách role.

| HTTP/status | Code/metadata đề xuất | FE tiếp tục |
| --- | --- | --- |
| 400 | INVALID_INPUT; optional fieldErrors=[{field,code,limit}] | Lỗi cạnh trường, giữ draft; không expose raw validator/DB error |
| 401 | Mã auth hiện có | Auth boundary, không đưa protected context vào lỗi |
| 403/404 | ACCESS_BANNED/forbidden/RESOURCE_UNAVAILABLE theo current policy | Xóa stale protected data, chặn submit; không tự retry write |
| 409 | VERSION_CONFLICT | Readback có quyền; giữ draft để so/copy; không response toàn record nếu mất quyền |
| 409 | Archived/parent/request-state codes hiện có | Giải thích đúng action; không chung “thử lại” |
| 429 | Rate/cooldown code + optional retryAfterSeconds/nextAllowedAt | Thời điểm retry từ BE; không countdown bịa |
| timeout/5xx sau write | Outcome unknown, chưa chứng minh thất bại | Readback/operation outcome, không POST mù lần2 |

Hiện error envelope chỉ `{error:{code}}`; fieldErrors/retry metadata là mở rộng cần controller/FE mapper cùng patch. Request IDs/idempotency cần contract auth-scoped riêng, không tự thêm header mà Origin allow-headers hiện chưa hỗ trợ. Có thể dùng body requestId cho create sau chốt strict DTO/store/TTL/outcome policy; route mới không coi là đã có.

## 8. Chuyển đổi và gate

List/detail projection split làm thay đổi consumer; test adapter tất cả Board/MyTasks/Calendar/panel/detail. Không đưa DTO lean ra trước rồi để FE đọc checklist.length lỗi. Nếu cần tương thích tạm, versioned consumer rollout/capability marker có thời hạn; không giữ forever cả full và summary fields.

Phần đã chốt: bỏ Org/Lead, roles/nhiều Manager/quyền invite/name required và direct reopen policy. Draft chọn API naming/paging/defaults trong phạm vi kỹ thuật; activeProjectCount semantics, Home priority rule, lifecycle permissions/comment/quota precision/legacy mappings còn review. Tiếp schema OpenAPI/migration inventory khi scope được chốt; không chạy live migration/workers/SMTP/purge/backfill từ tài liệu này.
