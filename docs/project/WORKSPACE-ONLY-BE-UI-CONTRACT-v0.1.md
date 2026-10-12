# Workspace-only — phân tích BE và nhu cầu UI v0.1

12/10/2026. Phân tích, chưa triển khai code hoặc migration. Bổ sung [business spec](WORKSPACE-ONLY-BUSINESS-SPEC-v0.1.md). User chốt bỏ Organization và Project Lead; Owner/Manager/Member, nhiều Managers do Owner bổ nhiệm, Owner+Manager mời Member, Guest theo Project, tạo chỉ tên bắt buộc. User cũng chốt Owner/Manager direct reopen có lý do/nhật ký khi chưa pending; có pending phải xử lý request và không tự duyệt. Các quyền thay thế/API khác dưới đây là đề xuất để review.

## 1. Bỏ Lead nhưng không bỏ nghiệp vụ quản lý

Lead hiện không chỉ là nhãn: `work/project-access.js`, `mongo-store.js`, `reopen-store.js`, `trash-store.js` dùng isLead cho quyền; model Project trong `models/tasks.js` có leadId; HTTP/service/input có PATCH lead; ProjectManagement có dialog và picker Lead. Có cả lịch sử lead_changed và profile association. Không chỉ xóa field rồi để hành vi thay đổi ngoài ý định.

| Chức năng | Quy tắc đích đề xuất khi bỏ Lead | UI tương ứng |
| --- | --- | --- |
| Quản lý mọi Task trong nhóm | Owner/Manager; Member Creator quản lý Task mình tạo theo quyền hiện có | Edit/delete/restore dựa capabilities, không so role string tự viết |
| Status và checklist | Owner/Manager/Creator; Assignee đổi status chưa Done và tick checklist, không sửa cấu trúc | Status picker, checklist tick và editor là các quyền riêng |
| Nhãn Project | Owner/Manager tạo/sửa/lưu trữ; Member đọc/chọn nhãn đang dùng được khi có quyền sửa Task | Tab Nhãn; bỏ nút bổ nhiệm Lead |
| Mô tả/mục tiêu Project | Owner/Manager; Creator giữ quyền sửa mô tả hiện có; không suy ra quyền rename/Archive | Form mục tiêu có capability riêng |
| Guest Project | Owner/Manager mời/thu hồi trong Workspace; Member không cấp Guest | Tab Guest không lẫn với mời Member |
| Mở lại Done | Creator/Assignee gửi yêu cầu; Owner/Manager xử lý theo quyền hiện tại | Request dialog và queue phê duyệt, không biến thành kéo thả Done tự do |
| Restore Task | Owner/Manager toàn Project; Creator Task mình tạo, nếu parent Active và đủ điều kiện | Thùng rác trả eligibility/reason từng Task |

Đã chốt direct reopen của Owner/Manager có lý do/lịch sử riêng khi chưa pending, và review request không cho tự duyệt. Hai đường không được dùng để vượt quy tắc pending request. Contract phải chốt rõ nếu requester là Manager: Manager khác/Owner duyệt; nếu requester là Owner và không có reviewer hợp lệ, UI nói rõ thay vì chờ vô hạn. Đề xuất UI ưu tiên direct action cho Owner/Manager, không dẫn họ sang request flow khi chưa pending; request cũ của chính họ vẫn không tự duyệt. Không áp quota request lên direct quản lý một cách ngầm. Cooldown24giờ/3requests mỗi Task trong7ngày giữ chính sách đã chốt, giới hạn tính ở BE và trả thời điểm có thể tiếp tục. Cảnh báo checklist chưa đủ khi Done vẫn giữ.

Former Lead là Member nếu không được bổ nhiệm Manager độc lập. Không tự chuyển leadId thành role Manager vì quyền quản lý một Project khác quyền quản lý cả Workspace. Preserve historical lead_changed như sự kiện cũ, không cấp quyền từ lịch sử. Project createdBy cũng không phải Lead thay tên.

## 2. Màn hình quyết định contract BE

| Cụm màn hình | UI cần thể hiện và thao tác | BE cần cung cấp/đảm bảo |
| --- | --- | --- |
| Home / Workspace collection | Card/row, nhận diện, summary, số members và Projects active, vai trò, trạng thái, tìm/lọc/sort trong một toolbar | Preset metadata; current effective role/capabilities; counts toàn scope được phép, không từ một page; paging/search/sort server; counts không lộ nhóm khác |
| Create / setup | Name required, optional summary/description/icon/color/cover, preview; thiết lập tiếp sau tạo | Validation thống nhất; atomic Workspace+Owner membership; operation identity chống duplicate-create; setup dựa dữ liệu thật, không chỉ cờ client |
| Workspace / Projects | Header ngắn, mô tả mở rộng, project cards/rows, progress, tạo và quản lý | Workspace context/version/readonly reason; Project taskSummary full non-trash; danh sách projects có cursor; không snapshot một page làm progress |
| Workspace info settings | Sửa metadata từng khối, preview, save/cancel, field errors, conflict | PATCH allowlist + expectedVersion; trả saved resource/version; không cho Member gửi ownerId/role/state hoặc sửa bất chấp Archived |
| Team / roles | Search/filter/paging; role, join date, profile; bổ nhiệm/hạ Manager, leave/kick/ban | Active membership + scoped role; target-specific capabilities; protect Owner/peer Manager; atomic role change và audit; Member không thấy controls quản lý |
| Invitations | Email/link, Member vs Guest khác wording; pending/expiry/delivery/revoke/accept | Hashed tokens; current rights và Ban; list không trả raw token; one-time link display có copy; delivery state không giả là đã đến Inbox |
| Lifecycle / ownership | Preview ảnh hưởng, typed confirmation, reason, transfer/Archive/Unarchive | Owner-only Workspace lifecycle đề xuất; version/transaction guards; điều kiện người nhận; mở Workspace không mở các Project riêng đang Archived |
| Kanban / Project management | 3 trạng thái, filter, labels, Guest và reopen queue; không Lead section | Project permissions tách editDescription/manageProject/manageLabels/manageAccess/manageReopen; effective readonly; Board cursor/count nhất quán từng column |
| Task detail / comments | Mã Task, Creator/Assignee profile, hạn/status/priority/checklist/activity; edit/status/request/review/delete khác nhau | Task capabilities và reason; profile scoped/minimal, departed state; CAS, completion history, quota/pending request; author-only comment mutations theo policy |
| Trash | Task name/code/deletedAt/expiry, restore hoặc lý do không thể | Preserve30day policy; distinguish unscheduled legacy trash; parent/role/assignee checks, không phục hồi notifications hoặc assignment không hợp lệ |
| My Tasks / Calendar | Card vs concise row thật; deadline groups, month/day counts và drilldown | Assigned/current-membership-only queries dùng chung scope; fixed GMT+7; totals/full month khác paged rows; Guest không nhận Task |
| Notifications / pins | Full card vs concise Inbox rows; unread/time/action; pin quick Kanban | Current-access redaction, paged cursor, read-all cutoff; pin removal sau mất quyền; unread count độc lập page; không gửi lại event migration |
| Workspace audit | Quản lý thấy actor/action/target/time/reason và lọc | Paged scoped management events; bảo vệ actor/target dữ liệu liên quan; không expose Org audit nhóm khác |
| Thông báo chung/ghim | Khác Inbox cá nhân, bài ghim và nội dung đọc | Chưa có model/API; backlog riêng cần chốt publish/audience/read semantics, không tự mail broadcast hoặc đưa vào core refactor |

Card và list là hai cách trình bày cùng query/API, không tạo hai nguồn dữ liệu. Icon mode cùng filter/search/sort; preference theo account/scope ở client. Layout switch không reset query, không đổi quyền hoặc gọi BE ghi cấu hình chỉ để thay density.

## 3. DTO và tương tác đề xuất

Workspace context: id/name/summary/description/icon/color/coverId/state/owner/version/createdAt/updatedAt, effectiveRole, permissions, readOnly + reason. Owner display là thông tin tối thiểu, không full Account; overview counts phải có scope rõ. Không trả members hoặc mọi Task vào một context payload. Settings và list có thể dùng DTO khác kích thước nhưng cùng định nghĩa field.

Project context bỏ leadId/accessRole=lead/manageLead. Task DTO giữ code/Creator/Assignee/history và permissions theo thao tác. Membership item gồm user identity tối thiểu, role/state/joinedAt/version và actions hiện tại trên target; UI không suy Manager có thể kick peer từ canManage chung.

Page response giữ items/nextCursor; total chỉ khi có truy vấn đếm thật. Offset hoặc cursor tùy collection, nhưng phải chốt cùng UI trước implement; không số trang giả từ số rows đã tải. Sort có tie-break ID; đổi filter reset cursor. Count và rows từ requests riêng có thể lệch khi có mutation, không tuyên bố cùng snapshot.

Validation có code/field/limit để đặt lỗi đúng ô; conflict trả mã rõ để đọc lại và so draft; mất quyền không đưa payload vượt quyền để FE so sánh. Archived là reason của read-only, khác Ban/removed/not-found. Saved result là nguồn cập nhật UI sau mutation; delayed response không được phục hồi controls cũ.

Create retry: dùng operation/request identity scoped Account, fingerprint canonical input; cùng key/cùng input trả lại cùng kết quả trong thời hạn contract; cùng key/khác input reject. Retention/idempotency store và semantics lúc key hết hạn phải thiết kế trước code. Không dùng tên để chứng minh duplicate hay retry mọi POST tự động.

## 4. Phạm vi API thay đổi

| Nhóm | Hướng xử lý |
| --- | --- |
| Workspace create/get/update/list | Mở metadata/presets/summary, roles/capabilities và create outcome; reuse resource paths hiện có |
| Workspace members/role/transfer | Thêm role-change contract nhiều Manager; transfer/exit không phụ thuộc managerId singular |
| Invitations/Ban/lifecycle/audit | Chuyển guards sang Workspace; giữ Member vs Project Guest; role/target/version checks |
| Project/Task/labels/reopen/trash/profile/statistics | Giữ resource IDs/paths; bỏ lead mutation và quyền Lead; sửa projection/queries/capabilities/tests |
| My Tasks/Calendar/pins/shared projects/notifications | Bỏ Org scope nhưng giữ giới hạn current access, assigned-only và redaction; test counts và cursors |
| Org routes và Project lead route | Không endpoint ghi tương thích tự nâng quyền; thiết kế trạng thái retired/old URL fallback, không chuyển một Org URL đến Workspace tùy tiện |

Đây là danh sách contract cần sửa, chưa phải OpenAPI đã chốt. Không mở API tổng hợp siêu lớn chỉ vì Home có nhiều cards. Có thể giữ nhiều read endpoint nhỏ và load song song; tránh per-card N+1 bằng aggregate scoped trong list.

## 5. Data và concurrency cùng FE

OwnerId canonical + active membership; membership manager/member, không role toàn Account. Một Workspace nhiều Manager. Remove organizationId/managerId/leadId khỏi mô hình quyền đích theo staged migration, không xóa dữ liệu ngay lúc đổi reader.

Read-only inventory thêm leadId và quyền trước/sau của từng former Lead; pending reopen reviewers không được lưu quyền cũ. Pending request không mất lịch sử/quota khi bỏ Lead; current Owner/Manager là reviewers đích sau chốt rule. Legacy audit giữ provenance nhưng không quyền ngầm. Bans/jobs/outbox/old invitations cần mapping riêng; không replay hoặc bật worker.

Role change/transfer/exit/Ban/Archive phải serialize với content writes, không chỉ kiểm membership trước transaction. Lưu nhiều Manager trong memberships không có nghĩa bỏ Workspace mutation fence. Concurrent Manager demotion + task edit phải cho một thứ tự hợp lệ; retry transaction vẫn kiểm quyền mới. CAS của form chống overwrite, chưa thay thế auth fence.

FE invalidation sau mutation confirmed; focus/reconnect chỉ refresh reads khi stale. Giữ filter, scroll, draft và cursor strategy; stale generation/account guards. Không window reload thường xuyên, không refresh đè dirty editor, không auto retry mutation outcome unknown. Giữ retry/readback ở error, không xóa nút rồi bỏ đường phục hồi.

## 6. Phân chia thực hiện và nghiệm thu

1. Direct reopen vs review đã chốt; tiếp chốt quyền thay thế Lead khác, quyền Workspace lifecycle và moderation exceptions; hoàn thành API/DB contracts trước implementation.
2. Read-only inventory/mapping Owner/Managers/members/former Leads/Bans/requests và permission diff; rehearsal DB tạm. Migration thật cần duyệt mapping cụ thể sau rehearsal.
3. BE nền role/metadata/create/target capabilities; tests nhiều account, race và validation. Tiếp BE Project/Task/Guest/reopen/trash và read models cá nhân.
4. FE theo cụm: shell/Home/create → Workspace/settings/team → Kanban/management → Task/trash → MyTasks/Calendar/Inbox/pins. Mỗi patch commit; không sửa đồng loạt để mất khả năng đối chiếu.
5. Nghiệm thu từng cụm: create/view/edit/cancel/permission loss/network failure và loading/empty/error/readonly/success; Light/Dark, Việt/Anh, desktop/mobile. Đóng cụm sau cả API và UI đạt, không chỉ màu đẹp hoặc unit tests pass.

Ví dụ acceptance bắt buộc: Manager A không quản lý Workspace B; former Lead Member không duyệt reopen; Creator chỉ sửa mô tả Project không rename; Assignee không sửa checklist cấu trúc; peer Manager không kick nhau; Guest không thấy Team/Workspace audit; Archived không content write; changed role khi editor mở giữ draft nhưng khóa submit; mode Inbox/MyTasks thật sự thay cấu trúc; total không bằng page length; migration không mở quyền từ Org Ban đã mất parent.

Chưa đổi BE/FE/data, chưa chạy migration/workers/SMTP/purge/backfill/deploy. Đề xuất refactor gắn UI đã đủ để chia cụm, nhưng chưa được coi tất cả policy đã duyệt.

## 7. Các tình huống phải đặc tả trước khi viết lại quyền

| Tình huống | Hành vi đề xuất | Trạng thái UI cần có |
| --- | --- | --- |
| Member tạo Task và tự giao cho mình | Creator được sửa nội dung; Assignee được làm việc; cả hai vẫn không thành người quản lý Project | Nút theo từng action; không badge Lead/Manager chỉ vì tạo Task |
| Task đổi Assignee sau khi gửi reopen | Kiểm lại requester còn là Creator/Assignee và current member; nếu không còn đủ điều kiện thì cancel có lý do | Lịch sử cancelled, không chỉ biến mất khỏi queue |
| Manager bị hạ Member khi đang mở review dialog | Recheck role và versions trong transaction, không duyệt bằng quyền lúc mở dialog | Giữ lý do đã nhập để copy, thông báo mất quyền, khóa submit |
| Hai Manager duyệt cùng yêu cầu | Chỉ một quyết định thắng CAS; bên còn lại đọc kết quả hiện tại | “Đã được xử lý”, không báo network failure hay gửi lại |
| Task trash hoặc parent Archive khi đang chờ duyệt | Cancel theo lifecycle hiện tại; mở lại parent/restore không resurrect request cũ | Đọc lịch sử và gửi yêu cầu mới nếu đủ điều kiện, giữ giới hạn chống spam |
| Done assignee đã rời | Lịch sử vẫn có tên/profile trạng thái; reopen kiểm lại assignment, không tự cấp membership | Báo cần phân công lại; không xóa tác giả hoặc nhãn dài phá layout |
| Owner gửi request nhưng không có người quản lý khác | Không tạo request chắc chắn không ai duyệt nếu policy cần reviewer khác; ưu tiên direct path đã chốt trước khi tạo request; pending của mình cần reviewer khác | Có hành động tiếp tục rõ; không spinner/pending vô hạn |
| Pending request do chính Manager gửi | Không dùng direct reopen để lách self-review; reviewer khác xử lý theo policy | Request của mình hiện read-only ở vùng review |
| Member còn Guest grant trong cùng nhóm khi rời | Exit thu hồi grant theo quyết định trước; Kick/Unban không tự khôi phục | Mất quyền context; pin unavailable vẫn gỡ được |
| Manager còn lại rời, Owner vẫn active | Không cần appoint thay thế để rời; Owner vẫn quản lý, request của người khác vẫn có reviewer | Empty Manager list hợp lệ; không khóa Workspace |
| Manager sửa metadata còn Member đang xem | Saved context cập nhật sau write confirmed, invalidate collection/header | Không reload toàn trang hoặc đè form draft của người khác |

### Sai khác cần chốt về chống spam reopen

Source `reopen-store.js` hiện: một pending request mỗi Task; cooldown24giờ sau **rejection** theo Task+requester; tối đa3requests/7ngày cũng theo Task+requester, không tổng3requests của mọi người trên Task. Wording thảo luận trước chưa đủ chính xác để xem hai cách tính là một.

Đề xuất giữ quota Task+requester nhằm tránh một người làm mất quyền yêu cầu của cả nhóm; pending toàn Task chống gửi song song. UI cần nextAllowedAt và lý do cooldown/rate-limit, BE là nguồn tính. Nếu chốt tổng theo Task thì đó là thay đổi nghiệp vụ riêng cần test Creator/Assignee cùng gửi và history migration, không âm thầm sửa trong refactor Lead. Không miễn quota bằng đổi Assignee hoặc xóa record request cũ.

### Chính sách comment

User đã bỏ nhu cầu quản trị gỡ từng comment, nhưng giữ Ban kèm dọn spam theo khoảng thời gian. Đích đề xuất: chỉ tác giả sửa/xóa comment của mình khi parent cho phép; quản lý không sửa lời tác giả; cleanup là action bảo mật riêng có preview/range/confirm/audit. Không tái tạo moderation tab chung chỉ vì code cũ có hỗ trợ. Archived chặn tác giả viết/sửa/xóa nội dung; Ban cleanup ngoại lệ phải được mô tả rõ và test riêng, không dùng canManage để mở mọi write.

## 8. Thiết kế các lớp BE để UI không lệ thuộc DB

1. **Workspace access:** một policy dùng chung cho membership/Owner/Manager/Guest/Ban và target actions. Không sao chép check ownerId trong mỗi route hoặc trả quyền từ JWT cũ.
2. **Domain services:** metadata/create, membership/ownership, invitation/access safety, Project/Task lifecycle. Mỗi mutation recheck quyền/version và ghi audit/event đúng transaction; không ghi email trực tiếp từ controller.
3. **Read models:** collection summaries, overview, Board, Team, My Tasks/Calendar và audit. Scope phải tái dùng access policy; counts/search không lọt dữ liệu qua endpoint phụ dù detail đã khóa.
4. **Response contracts:** permissions từng thao tác + blocking reason, minimum profile, versions, cursor và validation. UI dựa contract thay vì biết organizationId/managerId/leadId hay cấu trúc Mongo.
5. **Events/invalidation:** mutation confirmed sinh event một lần theo policy; UI cập nhật/invalidate reads liên quan. Migration không là user mutation nên không phát email/notification cũ; không hứa realtime khi chưa có transport.

Không cần viết lại auth core, rich-text engine, Task code allocator hoặc calendar date logic chỉ vì bỏ hai lớp role. Refactor các điểm phụ thuộc có evidence; regression tests giữ invariants của phần còn lại. Cùng một patch BE đổi DTO phải có consumer FE tương ứng hoặc giai đoạn tương thích có thời hạn; không để UI gọi lead route đã nghỉ hoặc dùng role=organization_admin để hiện nút.

## 9. Quyết định bổ sung đã xác nhận

Owner/Manager direct reopen khi chưa có pending request, bắt buộc lý do và nhật ký. Khi có pending, dùng review request với current rights/CAS; không tự duyệt và không direct reopen để bypass. Member Creator/Assignee vẫn dùng request flow. Các quyền labels/restore/metadata/lifecycle, comment exceptions, quota precision và mapping migration còn là thiết kế đề xuất cần review.

## 10. Khung dữ liệu theo từng màn hình

Bảng contract ở trên được mở rộng thành [screen data spec](WORKSPACE-ONLY-SCREEN-DATA-SPEC-v0.1.md): từng khối/fields/source/scopes/null-states, list-vs-detail payload, metrics và các chức năng Stitch chưa có nguồn nghiệp vụ. Đây là đầu vào để chốt API schema trước refactor, không chỉ ma trận quyền.
