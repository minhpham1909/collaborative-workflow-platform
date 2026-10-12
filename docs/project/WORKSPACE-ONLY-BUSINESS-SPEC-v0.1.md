# Workspace-only — phân tích nghiệp vụ chi tiết v0.1

12/10/2026. Đặc tả để chốt trước triển khai, không là báo cáo chức năng đã hoàn thành. Hướng bỏ lớp Organization/Studio; user đã chọn **Owner / Manager / Member** trong từng Workspace, Guest riêng từng Project. Manager không phải quản trị hệ thống. Không đổi code/data hoặc gửi email trong lượt phân tích.

## 1. Những gì đã chốt và những gì còn mở

| Nội dung | Trạng thái |
| --- | --- |
| Workspace → Project → Task/Comment; không Organization parent | Hướng tái cấu trúc theo yêu cầu user |
| Owner / Manager / Member; Guest riêng Project | Đã chốt tên và phạm vi vai trò |
| Một Owner, nhiều Manager theo bổ nhiệm | Đã chốt: Owner bổ nhiệm từng Manager |
| Owner+Manager mời Member, chỉ Owner bổ nhiệm Manager | Đã chốt |
| Tạo Workspace chỉ tên bắt buộc; có bước thiết lập tiếp cho thông tin khác | Đã chốt |
| Member xem các Project trong Workspace; Guest từng Project | Giữ phạm vi hiện tại; không thêm private Project/custom RBAC vào lần đầu |
| Project Lead là người phụ trách Project, không role Workspace | Đề xuất giữ nghiệp vụ Lead hiện có; cần rà ma trận task/reopen trước chốt |
| Tên UI “Nhóm làm việc”/Team | Đề xuất cũ, chưa chốt; tài liệu dùng Workspace |

Ba quyết định về số Manager/quyền mời/create required fields đã được user xác nhận trong lượt phân tích. Các mục khác ghi “đề xuất” vẫn cần review, không hiểu là user đã duyệt.

## 2. Mục đích và ranh giới

Workspace là đơn vị cộng tác và kiểm soát quyền độc lập cho nhóm đồ án, nhóm sản phẩm hoặc đội làm việc. Một Account tham gia nhiều Workspace với vai trò khác nhau; không đổi bản chất hoặc quyền toàn hệ thống của Account. Manager nhóm A không có quyền nhóm B. Owner vẫn có thể tự tạo nhiều nhóm.

Độ sâu nghiệp vụ giữ ở phân quyền, giao việc, checklist/labels/priority, phê duyệt mở lại, lịch sử/CAS, invitations/ban, lifecycle và thông báo. Bỏ Organization không phải bỏ các nghiệp vụ này.

Lần thay đổi này không thêm phòng ban, billing, domain SSO, ACL tùy biến, file upload hoặc Google Calendar integration. Storage upload đã được user để Upcoming. Dùng bộ ảnh/icon mẫu cho nhận diện; không trộn avatar Google của Account thành logo Workspace.

## 3. Đối chiếu hiện trạng — khoảng thiếu thực tế

| Cụm | Code hiện tại | Thiết kế đích |
| --- | --- | --- |
| Workspace ownership | Standalone có ownerId; attached ownerId=null, managerId đơn, organizationId | Mọi Workspace có một ownerId; quản lý scoped qua membership, không phụ thuộc Organization |
| Membership | workspace_memberships không có role; quyền suy từ ownerId/managerId/Org | Vai trò quản lý rõ, active/inactive và các guard thống nhất |
| Tạo nhóm | API name+description optional; Home form tên | Form thông tin đầy đủ, preview nhận diện, atomic create+Owner membership |
| Metadata/settings | Settings đổi name/description; chưa có summary/nhận diện lưu theo lựa chọn | Mục tiêu ngắn, mô tả dài, icon/màu/cover, ownership, thông tin lifecycle |
| Người dùng/Guest | Có invitation/kick/ban, Org admission/exit, Project Guest | Admission trực tiếp từng Workspace; Guest tách biệt từng Project |
| Lifecycle | Workspace/Project Archive, Task trash30days đã có | Giữ dữ liệu và các trạng thái riêng; khóa nội dung, cho phép bảo vệ quyền |
| Audit | Org/workspace lifecycle/project access/task activity/moderation rời rạc | Nhật ký Workspace cho đổi metadata/role/ownership/admission/invitation/ban/lifecycle |
| UX | Mode toolbar tách, compact chỉ font/padding, refresh lặp | Toolbar thống nhất, hai cấu trúc đọc, invalidation/refetch bảo vệ draft |

Nguồn kiểm: BE/src/models/workspaces.js, workspaces/service.js, workspaces/response.js, organizations/workspace-access.js; FE WorkspaceSettings/Home/Organizations và collection-view.css. Đây là audit source, chưa inventory DB live/mapping dữ liệu cụ thể.

## 4. Hồ sơ Workspace và validation

| Trường | Yêu cầu đề xuất | Quyền sửa |
| --- | --- | --- |
| ID | Server sinh, ổn định; không sửa | Không có UI sửa |
| Tên | Bắt buộc,1–200 ký tự theo quy tắc tên hiện có; không ký tự điều khiển | Owner/Manager khi Active |
| Mục tiêu/mô tả ngắn (summary) | Tùy chọn; nếu nhập1–500 ký tự, phục vụ card/onboarding; không rich text | Owner/Manager khi Active |
| Mô tả chi tiết | Rich text hiện có: tiêu đề/list/link/emoji, tối đa20.000 ký tự | Owner/Manager khi Active |
| Icon và màu | Preset allowlist, có default; preview ngay trong form | Owner/Manager khi Active |
| Banner/cover | Preset local allowlist; upload riêng Upcoming | Owner/Manager khi Active |
| Owner | Một Account active, verified; tự thiết lập lúc tạo | Chỉ ownership transfer |
| Managers/thành viên | Derived từ membership, không nhận danh sách role tùy ý trong create DTO | Theo ma trận role |
| Trạng thái | Active/Archived và actor/time/reason/version | Owner cho Workspace lifecycle (đề xuất) |
| Thời gian/ngôn ngữ | GMT+7 theo hệ hiện có; UI locale/email locale theo Account | Thông tin hệ thống/cài đặt cá nhân, không ép cả nhóm đổi UI language |
| Ngày tạo/cập nhật | Server-owned, thể hiện trong About | Không sửa |

FE/BE dùng cùng giới hạn/ký tự hợp lệ; BE là nguồn validation/authorization. Reject ownerId/role/state/version giả trong create. Summary mới không được tự bịa cho dữ liệu cũ: cho Owner/Manager bổ sung, có thể gợi ý từ description để người dùng xác nhận; không khóa đọc Workspace cũ vì thiếu summary.

Tên Workspace không unique toàn hệ thống; ID là định danh. Avatar initials lọc ký tự đặc biệt, giữ chữ/số/dấu Việt, fallback icon nếu không có ký tự hợp lệ; tên gốc, search text và lịch sử không bị đổi theo initials.

## 5. Luồng tạo Workspace

1. Account đã verified chọn Tạo Workspace. Chỉ name bắt buộc. Form vẫn trình bày summary/mục tiêu và nhận diện (icon/color/cover preset); mô tả dài có thể mở rộng. Có bước thiết lập tiếp có thể bỏ qua/quay lại, preview card phản ánh dữ liệu thật; không rút form về một ô tên đơn độc.
2. Validate các trường trước submit; lỗi cạnh trường, không chỉ toast. Create transaction ghi Workspace Active và active Owner membership. Owner lấy từ authenticated subject.
3. Không gửi lời mời trong cùng transaction tạo. Create thành công mở Workspace với checklist thiết lập: thêm mô tả/nhận diện, mời người, tạo Project đầu tiên. Các bước đã đủ có trạng thái rõ, không tỷ lệ “hoàn thiện hồ sơ” bịa.
4. Invite bổ sung sau tạo, retry không tạo Workspace thứ hai. Timeout/lost response chưa được coi là thất bại chắc chắn; giữ form và readback/operation outcome trước khi gửi lại. Không dùng tìm tên trùng làm bằng chứng chắc chắn Workspace đã tạo.
5. Cancel có draft guard; initial/loading/validation/server failure/unknown outcome/success có trạng thái cụ thể. Không reset form khi refetch nền.

Khi triển khai cần contract chống duplicate-create (request ID/operation outcome hoặc cơ chế tương đương), vì name không unique và không thể dựa vào tên để retry an toàn.

## 6. Ma trận quyền Workspace đề xuất

Áp dụng khi membership active, tài khoản verified, không bị Ban; content writes yêu cầu Workspace/Project Active. “Member” dưới đây bao gồm quyền làm việc nền của Owner/Manager.

| Thao tác | Owner | Manager | Member | Guest Project |
| --- | --- | --- | --- | --- |
| Xem Workspace/các Project trong nhóm | Có | Có | Có | Chỉ Project được cấp và context tối thiểu |
| Đổi tên/summary/description/nhận diện | Có | Có | Không | Không |
| Tạo Project; sửa tên/icon/Archive Project | Có | Có | Không | Không |
| Sửa mô tả/mục tiêu Project | Có | Có | Creator hoặc Lead theo quyền hiện có | Không |
| Tạo/nhận Task | Có | Có | Có | Không |
| Quản lý Task toàn Workspace | Có | Có | Creator/Assignee/Lead theo quyền Task | Không |
| Invite Member/thu hồi lời mời | Có | Có; lời mời chỉ cấp Member | Không | Không |
| Bổ nhiệm/hạ Manager | Có | Không | Không | Không |
| Kick/Ban Member, Project Guest trong phạm vi | Có | Có, không nhắm Owner/Manager | Không | Không |
| Xử lý Manager khác | Có; role/lifecycle guards | Không | Không | Không |
| Transfer Owner | Có | Không | Không | Không |
| Archive/Unarchive Workspace | Có (đề xuất) | Không | Không | Không |
| Xem audit quản lý | Có | Có | Không; lịch sử công việc theo quyền hiện có | Không; chỉ lịch sử Project được phép |
| Email riêng, My Tasks/Calendar/pins của mình | Có | Có | Có | Cá nhân/pins; không có assigned Tasks |
| Sửa/xóa bình luận người khác | Không sửa lời tác giả | Không sửa lời tác giả | Chỉ bình luận của mình khi được phép | Chỉ bình luận của mình khi Project cho phép |

Quyền xóa bình luận không được mở rộng âm thầm thành quyền quản lý nội dung. Ban+cleanup spam theo cơ chế đã yêu cầu là ngoại lệ riêng: preview/range/confirm/reason/audit; không sửa lời tác giả và không mở worker tự động. Rà chức năng gỡ comment hiện tại với quyết định user trước khi giữ/bỏ trong refactor.

Task Creator/Assignee vẫn là quan hệ trên Task, không membership role. Assignee chỉ đổi status/tick checklist theo rule hiện có; không tự sửa cấu trúc/checklist/deadline/nội dung/xóa. Project Lead nếu giữ chỉ trong Project đó, phải là active Workspace member; không tự cấp quyền Workspace. Chính sách reopen/approval/cooldown hiện có được kiểm lại, không mất vì bỏ Organization.

## 7. Membership và ownership

User chốt nhiều Managers để phân công vận hành, không bắt thay một managerId trước mọi thao tác rời nhóm. Workspace vẫn có đúng một Owner. Manager/Member có thể rời; Owner phải transfer trước khi rời. Rời/kick/Ban phải là thao tác khác nhau.

Data model đề xuất: Workspace.ownerId là nguồn sở hữu duy nhất; membership giữ role manager/member, Owner là effective role từ ownerId + active membership. Không global role trên User. Không cần một managerId singular nếu chốt nhiều Manager. Transfer phải cập nhật nguyên tử và ghi audit: người nhận là active verified member, không bị Ban trong phạm vi liên quan; người cũ trở thành Member mặc định hoặc Manager theo lựa chọn explicit đã kiểm quyền. Không tự khôi phục một quyền quản lý ngầm chỉ vì người đó từng giữ role.

Role change do Owner thực hiện với target/version/reason và guard pending/CAS; Manager không tự nâng mình, cấp Manager khác hoặc đổi Owner. Membership inactive không quản lý bất cứ tài nguyên nào; quay lại dùng Member, không tự phục hồi Manager/Project Lead/email overrides/task assignment đã bỏ.

Khi exit: unfinished Tasks unassign kể cả Archived; Done giữ lịch sử/assignee cũ, profile tooltip nêu đã rời; reopen kiểm lại assignee. Creator/comment/history giữ ID/tác giả, không xóa dữ liệu làm việc. Project Lead và grants Guest cùng Workspace của người rời cần thu hồi để không đi vòng trở lại; rejoin cần admission mới. Guest độc lập chưa là Member không bị kéo thành Member.

## 8. Invitations và Guest

Giữ EMAIL/LINK với hạn7ngày, hashed token/recipient canonical/current verified gate như hiện có. Tất cả lời mời Workspace chỉ vào Member; role Manager không nằm trong link/body accept, Owner nâng role sau admission. Không auto admit chỉ vì email cùng domain.

EMAIL đúng verified account dùng một lần; LINK có thể nhận nhiều Member trong thời hạn, quản lý tạo/thu hồi rõ. Kick có thể rejoin bằng link còn hiệu lực; Ban chặn accept/rejoin; Unban không tự thêm lại. Không chuyển lời mời Org cũ thành lời mời vào tất cả nhóm.

Guest mời theo Project bằng email/link đã có; chỉ xem/bình luận, không thấy Workspace members/settings/audit hoặc Project khác, không nhận Task. Workspace invite và Guest invite phải khác wording/preview/capabilities. Nếu user đã là Member thì quyền Member dùng theo membership hiện tại; exit/Ban/revoke không để Guest grant trở thành đường vòng giữ quyền.

Workspace Archived chặn create/accept invitations và content writes; revoke/role safety/ban và ownership handoff vẫn có đường quản lý phù hợp. Mở lại không tự gia hạn/khôi phục lời mời cũ; tạo mới theo ý định hiện tại.

## 9. Cài đặt cần đủ và phân vùng rõ

1. **Thông tin & nhận diện:** name/summary/description/icon/color/cover, preview, save/cancel/validation/CAS, last updated.
2. **Thành viên & quyền:** search/filter/pages, roles, joined date, promote/demote/kick/ban/leave; protected Owner/peer Manager actions.
3. **Lời mời:** EMAIL/LINK/pending/accepted/revoked/expired, tác giả/hết hạn, revoke, delivery outcome/retry đúng ý định. Không lộ lại token từ list.
4. **Nhật ký:** metadata/role/ownership/admission/exit/invitation/ban/Archive/Unarchive; actor/target/time/change/reason, paged and scoped; không giữ password/token/body comment đã xóa.
5. **Sở hữu & vòng đời:** Owner hiện tại, transfer và Archive/Unarchive, giải thích phạm vi ảnh hưởng trước confirm. Không đưa thao tác này vào form đổi tên thông thường.
6. **Tùy chọn cá nhân trong nhóm:** email overrides inherit/on/off/reset như đã chốt; không biến thành cấu hình ép cả Workspace. Locale UI theo Account; theme theo device/preference hiện có.

Không gom mọi thứ vào một form dài. Mỗi khối có action phù hợp, loading/empty/error/read-only/dirty/success; Member xem thông tin chung nhưng không thấy controls quản lý. Người mất quyền khi form mở giữ draft phục vụ copy, khóa submit và readback theo quyền hiện tại.

## 10. Chức năng Workspace ngoài form settings

- Project collection/search/filter/sort/paging, tiến độ từ đầy đủ dữ liệu khôngtrash; My Tasks và Calendar vẫn assigned/current access; pins cá nhân vẫn theo quyền hiện tại.
- Mô tả dài hỗ trợ editor thống nhất và tài nguyên/link trong nội dung. Không xây file storage/library upload trong phạm vi lần này.
- **Thông báo chung/ghim:** nhu cầu user đã nêu trước đây chưa thấy model/API ở workspace hiện tại. Đề xuất backlog ưu tiên sau nền RBAC/settings: Owner đăng/ghim, Member đọc; một bài ghim nổi bật ban đầu, body rich text/version/history. Không tự mở quyền publish cho Manager hoặc gửi email tới toàn nhóm trước chốt policy. Không coi Notifications cá nhân là bảng thông báo chung.
- Shared notifications có read/unread/redaction/CAS cutoff theo bản đã chốt; không phát lại thông báo hoặc email khi chuyển đổi dữ liệu.

## 11. Lifecycle, dữ liệu và an toàn

Active → Archived → Active. Workspace đóng làm toàn bộ nội dung con read-only; Project giữ trạng thái riêng khi mở lại. Archive Owner (đề xuất), typed name + preview ảnh hưởng + confirm/reason/version. Unarchive kiểm quyền hiện tại/parent tồn tại và current version, không tự khôi phục banned members/invitations/assignees.

Workspace/Project chỉ Archive trong scope hiện đã chốt; Task có trash30ngày, restore theo parent/role/CAS, kiểm lại assignee và không replay events. Không mở hard delete Workspace hoặc bật purge/SMTP/backfill dev trong lượt này. Comment lifecycle và Ban cleanup theo quyết định trước, không giả vờ soft delete =backup.

Tất cả đọc/ghi kiểm workspace membership + Ban + session/verified hiện tại ở BE; FE capabilities chỉ để bố trí controls. Signed JWT không chứa quyền Workspace vĩnh viễn. Data/cache phân account/resource/filter, reply trễ bị hủy; role/ownership changes serialize với child writes. Auto refetch chỉ read/invalidate sau mutation confirmed, focus/reconnect nếu stale; không overwrite draft, không retry mutation mù hoặc đổi signed read-all cutoff lúc confirm.

## 12. Migration: giữ chức năng, không tăng quyền ngoài ý định

- Inventory read-only: Workspace standalone/attached; Org owners/admins/members; managerId; active/inactive memberships; active bans; Guest grants; pending invitations/outbox/moderation jobs; audit và legacy rows.
- Standalone giữ ID/Owner/membership. Attached có ownerId=null nên không thể chỉ bỏ organizationId: phải chốt Owner cho từng Workspace, Manager-role membership, active staff và ngoại lệ.
- Candidate OrgOwner→WorkspaceOwner, old manager→Manager. OrgAdmin không auto Manager/membership mọi Workspace: mapping explicit để không tăng quyền nhận Task hoặc hồi sinh người đã rời. Bans/Org exits không được mất tác dụng khi bỏ parent layer.
- Workspace/Project/Task/Comment IDs, task codes, due/completion/history, pins và email preferences giữ nguyên; không gộp nhóm hoặc sửa tên/summary bằng dữ liệu giả.
- Legacy Org invitations/notifications/outbox/jobs/URLs: đóng/redact hoặc chuyển theo mapping đã duyệt, giữ audit provenance; không issue/send mail hoặc replay events tự động. Audit Org không liên quan Workspace không được công khai cho Manager của một nhóm mới.
- Rehearsal DB tạm, pre/post counts + permission diff, concurrency + restore/backup rehearsal. Giữ records cũ recoverable trước cutover. Chỉ chạy migration thật sau kết quả mapping/rehearsal reviewable và user duyệt phạm vi. Không động Mongo hệ thống27017 hoặc chạy workers.

## 13. Gate trước phát triển và nghiệm thu

W0: ba quyết định đã chốt; tiếp review Project Lead/matrix/lifecycle/announcements scope, cập nhật SRS addendum/SDS/API/DB plan. W1: audit/mapping/dry-run. W2: BE RBAC/membership/lifecycle/refactor+các test có nhiều accounts. W3: tạo/settings Workspace đầy đủ. W4: toolbar/mode/initials/shared refetch. W5: nghiệm thu toàn luồng trên web trước deploy.

Tests bắt buộc: create atomic/duplicate outcome; Manager chỉ nhóm được cấp; forbidden promotion/owner removal; simultaneous transfer/leave/role/Task writes; Guest isolation; invitation accept/revoke/ban; exit unfinished/Done/Archived; Archive/restore; stale settings draft; query full-set/paging/calendar/pins; migration no unauthorized grants/notification replay. UI acceptance cần xác nhận hai cấu trúc đọc khác nhau có ích, không dùng thay font/padding để đóng mốc.

## 14. Tổng kết quyết định mới12/10

- Đã chốt: Owner/Manager/Member, nhiều Manager do Owner bổ nhiệm, Owner+Manager invite Member, create chỉ tên bắt buộc; thông tin còn lại có bước thiết lập tiếp. Mô tả không bắt buộc nhưng UI/form/settings phải đủ và rõ, không chỉ một ô tên.
- Quyền sở hữu/danger actions, Project Lead, member Project visibility, announcement publish và migration mapping cần review tiếp. Ma trận trong spec là đề xuất cụ thể để review, không code đã đổi.
- Không mở rộng biểu mẫu bằng các trường doanh nghiệp không phục vụ cộng tác. Ưu tiên thông tin/mục tiêu/nhận diện, thành viên/lời mời, quyền, audit và lifecycle.
