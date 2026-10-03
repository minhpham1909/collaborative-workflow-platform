# Đặc tả nội dung và bố cục màn hình v0.2

Ngày 03/10/2026. Review dựa trên SRS/use-cases.json (35 UC), quyết định đã chốt và BE tại commit c4b569b. Chủ dự án yêu cầu phân tích màn hình trước, chưa trả phí hoặc tạo thiết kế trong Figma. Đây là đề xuất UX để review, không tự phê duyệt branding, layout, route FE hoặc NFR. Nghiệp vụ đã duyệt được giữ nguyên.

Tài liệu hiện hành: [flow v0.2](SCREEN-FLOWS-v0.2.md), [gaps BE/UI](UI-API-GAPS-v0.1.md). Tài liệu v0.1 là nguồn lịch sử; những dòng pending cũ về My Tasks, conflict, verification và invitation không còn phản ánh quyết định hiện tại.

## 1. Nguyên tắc kiến trúc thông tin

Ba lớp: public/auth; khu vực cá nhân; context Workspace → Project → Task. Một màn được xác định bởi mục đích người dùng, không phải mỗi endpoint BE. Tạo/sửa cùng đối tượng dùng chung form; leave/remove/archive/transfer/delete là dialog xác nhận, không phải trang điều hướng chính. Comments nằm trong Task Detail; không tạo một module Comments độc lập.

Home giúp chọn nhóm; My Tasks giúp xử lý việc được giao. Không biến Home thành dashboard thống kê chưa có BE. Workspace chứa Projects/Members/Invitations/Settings; Board là trang Project chính, không thêm Project Dashboard trống rồi bắt người dùng click lần nữa. Notification là đường vào Task/Invitation, không giữ một bản dữ liệu Task riêng.

Desktop: sidebar cố định bên trái, header cho breadcrumb/notification/user menu, nội dung chính ở phải. Mobile: sidebar thành menu mở; header giữ tên khu vực + chuông + user menu, breadcrumb có thể gọn nhưng vẫn có đường về Project/Workspace. Không nhồi mọi Workspace/Project vào sidebar; Workspace switcher hỗ trợ truy cập nhóm gần nhất từ danh sách đã tải, không giả search toàn bộ khi BE chưa hỗ trợ.

Sidebar: Trang chủ, Công việc của tôi, Thông báo, vùng Workspace hiện tại (Projects, Members; Invitations và Settings nhóm chỉ Owner), Settings cá nhân ở user menu. Menu context Workspace có “Email của tôi trong nhóm” cho mọi Member; không lẫn với Settings nhóm. Không đặt logout cạnh delete/leave. Public/auth có logo, Việt/English và policy links; không mang sidebar công việc vào trang login.

```text
DESKTOP
[Sidebar 224–256] [Breadcrumb / Notification / User menu]
[personal links] [Tên màn + mô tả ngắn             CTA]
[workspace      ] [Bộ lọc nếu màn có danh sách          ]
[context links  ] [Danh sách / Board / nội dung          ]
                 [Task panel bên phải khi mở từ list]

MOBILE
[Menu] [Tên khu vực]                         [Chuông]
[Tên màn + CTA đúng quyền]
[Search / lọc rút gọn + số filter đang áp dụng]
[Danh sách thẻ hoặc một cột Board đang chọn]
[Tải thêm / trạng thái danh sách]
```

Kích thước chỉ là đầu vào wireframe, chưa chốt pixel. Không cần mua tool hoặc dựng production FE để review các khối này.

## 2. Danh mục màn hình và UC

| ID | Màn hình | UC phủ | BE hiện tại |
|---|---|---|---|
| P01 | Landing | UC-25 | Nội dung FE tĩnh, chưa viết |
| P02 | Terms / Privacy (hai trang cùng template) | UC-26 | Nội dung/version pháp lý chưa hoàn thiện |
| A01 | Login | UC-02, UC-34 | API có |
| A02 | Register | UC-01, UC-34 | API có, không tự login sau đăng ký password |
| A03 | Verification gate / kết quả verify | UC-31, UC-27 | API có |
| A04 | Forgot / Reset password (hai trạng thái cùng flow) | UC-30 | API có |
| A05 | Invitation preview / accept | UC-09 | API token preview/accept và EMAIL accept ID có |
| H01 | Personal Home / Welcome | UC-04, UC-05, UC-27 | Workspace list/create có |
| H02 | My Tasks | UC-22 | API đầy đủ filters/search/pagination |
| W01 | Workspace Projects / overview | UC-13 | GET Workspace + Project list có |
| W02 | Workspace Members | UC-07, UC-10, UC-11, UC-12 | APIs có; historical identity gap |
| W03 | Workspace Invitations | UC-08 | Owner APIs có |
| W04 | Workspace Settings | UC-06 | Owner update + own email override có |
| W05 | Workspace Announcements | UC-35 | Capability đã ghi nhận, BE chưa triển khai; phase riêng |
| J01 | Project Board / info | UC-13, UC-15, UC-16, UC-21 | APIs có |
| T01 | Task Detail + Comments | UC-18, UC-19, UC-20, UC-23, UC-24 | APIs có; cần enrich identity |
| N01 | Notifications | UC-32 | List/detail/read/read-all + masking có |
| S01 | Personal Settings — Profile | UC-28 | API có |
| S02 | Personal Settings — Account | UC-29, UC-34 | Change/link có; thiếu account capabilities cho UI |
| S03 | Personal Settings — Email / Language | UC-33, UC-28 | Global preferences + Workspace overrides có |
| D01 | Create/edit Workspace/Project/Task và confirmations | UC-05, UC-06, UC-10, UC-11, UC-12, UC-14, UC-15, UC-16, UC-17, UC-20, UC-24 | Dùng các API đối tượng hiện có |
| X01 | Logout / session-expired / unavailable state | UC-03 | Auth/guards có; FE chưa viết |

21 nhóm màn/form phủ đủ 35 UC. Một nhóm có thể có nhiều route/state; số lượng này không có nghĩa 21 frame đủ để nghiệm thu mọi trạng thái. Announcements phải được phân tích nhưng không hiện nút hoạt động giả trong increment lõi. Storage/resources/files tiếp tục Upcoming.

## 3. Public và Auth

### P01 Landing

Mục đích: hiểu sản phẩm và đi vào đăng nhập/đăng ký. Header logo + ngôn ngữ + Login/Register; hero ngắn với lời giới thiệu nhóm nhỏ quản lý công việc; hình minh họa Board bằng dữ liệu giả; 3 khối Workspace/Task/Comments, footer Terms/Privacy. Một CTA chính Đăng ký, phụ Đăng nhập; có phiên thì CTA Vào ứng dụng. Mobile xếp một cột. Không pricing, testimonial số liệu giả, danh sách Workspace thật hoặc chức năng AI/upload chưa có.

### P02 Terms / Privacy

Template đọc: tiêu đề, version/ngày hiệu lực, mục lục desktop, nội dung có heading, liên hệ và đường quay lại. Mobile mục lục thu gọn. Xem policy không tự chấp nhận Terms; checkbox acceptance chỉ ở flow đăng ký/Google mới. Nội dung thật và bản Việt/English còn blocker public release; draft local phải được gọi đúng là draft, không dùng Lorem ipsum để coi là hoàn thiện.

### A01 Login

Form giữa màn, desktop có vùng giới thiệu gọn, mobile bỏ phần phụ. Email, password có show/hide, nút Login, Forgot password, Google sign-in và Register. Không thêm Remember me khi session hiện tại chưa có tùy chọn tương ứng. Lỗi credential chung; loading ngăn submit lặp, rate limit báo thời gian thử lại; Google popup đóng/cancel không hiện thành lỗi password.

Sau login: giữ đích Task/Invitation hợp lệ; chưa verified vào A03; verified tiếp tục intent hoặc H01. ACCOUNT_LINK_REQUIRED: giải thích tài khoản email đã có, yêu cầu đăng nhập bằng password rồi liên kết từ S02; không auto-link hoặc gọi user “đăng nhập Google thành công”. Google không được cấu hình thì ẩn/vô hiệu CTA có giải thích, dựa /auth/capabilities.

### A02 Register

Form: display name, email, password, confirm password (FE kiểm, không gửi field thừa), checkbox Terms + link chính sách/version, CTA Tạo tài khoản, Login và lựa chọn Google. Hint password bám rule BE hiện hành; không tự thêm yêu cầu chữ hoa/số/ký hiệu.

Password register trả REGISTRATION_ACCEPTED/email queued nhưng không trả session. Kết quả: “Tài khoản đã được tạo; kiểm tra email và đăng nhập để tiếp tục”, có Login/verification instructions; không tự vào màn resend đòi session hoặc giả đăng nhập. Khi có email verify link, A03 có thể xác minh không cần phiên. Nếu muốn auto-login là thay đổi implementation phải review riêng.

Google account mới: nếu TERMS_REQUIRED, mở consent rõ ràng và tiếp tục Google sau đồng ý; không chấp nhận hộ. Không yêu cầu tạo password cho Google-only. Có thể dùng Register page để thu Terms trước nút Google; Login phải vẫn xử lý Terms-required mà không mất invitation intent.

### A03 Verification

Gate cho đã login chưa verified: tên/email bản thân, lời giải thích, Gửi lại, kiểm tra lại trạng thái, đổi tài khoản/logout; Profile, Settings cá nhân và Invitation notifications vẫn có đường vào. Không tải nội dung Workspace/Task phía sau lớp gate. Gửi lại chỉ báo “đã xếp hàng gửi”, không cam kết Inbox.

Verify-link state: đang kiểm, thành công, invalid/expired/used, đã verified. Thành công có session thì tải lại user/verified state rồi tiếp tục intent; không session thì Login. Link lỗi không có session thì hướng Login để resend, không tạo API resend công khai giả. Không show token hoặc secret trong UI. Nút Quay về vẫn có khi invitation đồng thời hết hạn.

### A04 Forgot / Reset password

Forgot: email + nút Yêu cầu khôi phục, thông báo chung dù email không tồn tại/Google-only; link Login/Google. Không dùng response để xác định tài khoản có tồn tại. Reset: new/confirm password, validity state, kết quả “đổi thành công, đăng nhập lại”. Không cần password hiện tại. Token invalid/expired/used có CTA yêu cầu lại; reset thu hồi phiên cũ, không tự giữ session.

### A05 Invitation

Card gọn: tên Workspace, người mời, EMAIL/LINK, expiresAt, một CTA theo trạng thái. Không render email người nhận/member/project/task list trước khi gia nhập. Guest: Login/Register giữ intent. Unverified: xác minh rồi quay lại. Verified: Tham gia; ALREADY_MEMBER → Mở Workspace. Sai email: giải thích dùng đúng tài khoản, CTA đổi tài khoản, không tiết lộ email đích. Expired/revoked: không còn hiệu lực, về Home; không còn nút Accept.

Từ URL: token fragment, dùng preview/accept token. Từ inbox EMAIL: metadata tối thiểu trong notification và accept bằng ID; không cố lấy lại token đã bị xóa sau gửi. Giao diện cùng kiểu card cho hai nguồn. Sau accept thành công refresh Workspace list/badge, mở W01; không ép tạo Workspace mới.

## 4. Khu vực cá nhân và Workspace

### H01 Home / Welcome

Header “Workspace của bạn”, tên người dùng phụ, CTA Tạo Workspace cho account verified. Danh sách dạng card: tên, mô tả tóm tắt 2 dòng, vai trò Owner/Member, Mở Workspace; Tải thêm theo API. Không hiện member count/activity/progress chưa có nguồn dữ liệu. Lối My Tasks/Notifications đặt trong navigation chung, không sao chép thành dashboard đầy số liệu.

Zero workspace: hướng dẫn tạo nhóm hoặc mở lời mời đang có; có CTA xem Invitation notifications nếu account có các mục đó. Không có “Join by code” hoặc thư mục Workspace công khai. Error tải danh sách khác trạng thái chưa có nhóm. Mô tả đầy đủ đọc ở W01; description dài không làm card cao vô hạn. Workspace creation là D01, không wizard nhiều bước.

### H02 My Tasks

Header + “Mới tạo trước”; không có CTA tạo Task thiếu Project context. Desktop danh sách theo hàng: title, Workspace → Project, status, deadline/overdue, createdAt phụ; không lặp avatar assignee vì mọi Task assigned-to-me. Mobile card giữ đúng thứ tự toàn danh sách, không grouping làm đổi sort.

Search title/description; filter Workspace/status/lifecycle/overdue; vùng Thời gian mở thêm createdAt/dueAt, presets/from/to. Default Active/chưa Done; filter để xem Done/Archived. Không mặc định loại Task không deadline. Show total kết quả từ BE và Tải thêm, không gọi số trang đang thấy là tổng. Search/filter trên toàn tập được phép; empty việc được giao khác no-results, no-results có Về mặc định.

Click mở T01 với đường về đúng danh sách/filter/cursor đã tải. Đổi status/sửa ở Task Detail trong bản đầu, chưa thêm editable cell làm phát sinh một form khác. Không dùng deadline-first sort hoặc reorder tay.

### W01 Workspace Projects / overview

Header breadcrumb + tên + badge vai trò; description viewer thu gọn với Xem thêm, không dùng editor luôn mở. Nội dung chính Projects: Active/Archived/All, total theo filter hiện tại, card Project gồm name/description tóm tắt/state; Owner có Tạo Project và action menu edit/archive/reopen. Member chỉ mở. Project card mở thẳng J01.

Description/edit là W04; Members là W02. Không tạo một màn Overview chỉ có lại các nút điều hướng. Announcements pinned chỉ có vùng khi increment đó đã nối BE; không giữ khối trống “thông báo nhóm” giống dữ liệu chưa tải. Search/time cho Project và Workspace thuộc thiết kế mở rộng danh sách nhưng chưa có server support: ghi ở gap log, không đặt ô search như đã hoạt động toàn tập.

### W02 Members

List/table: avatar, display name, Owner/Member, joinedAt; không email mặc định. Owner có menu Remove/Transfer cho Member hợp lệ; không nút Remove Owner. User có Rời Workspace dưới vùng quản lý, kể cả Member; Owner mở hướng dẫn chuyển quyền trước, không gửi leave chắc chắn lỗi.

Transfer chọn Member hiện tại và xác nhận việc mất quyền Owner; remove ghi rõ ảnh hưởng quyền/assignee, leave ghi rõ bản thân mất quyền. Không dùng role dropdown “Admin/Manager” chưa có. Form recheck role/version; stale membership do rejoin yêu cầu tải lại, không loại người dựa bản cũ. Danh sách có Tải thêm; chưa có total count/search toàn bộ Members.

### W03 Invitations — Owner

Header quản lý lời mời + Tạo lời mời. Table: type, recipient email chỉ Owner cho EMAIL, created/expires/state, email delivery state và actions. Create dialog chọn EMAIL hoặc LINK; EMAIL nhập email, LINK không nhập người nhận. EMAIL queue success ≠ gửi thành công; pending/processing ghi đang xử lý, failed mới có retry khi backend cho phép. Sent ghi “dịch vụ gửi đã nhận”, không “người nhận đã đọc”.

LINK creation hiển thị URL một lần, Copy link + warning lưu link; list sau không có raw token. Không đặt nút copy lại trên mọi row nếu BE không trả URL; mất link tạo link mới và có thể revoke link cũ. Revoke có confirmation; expired/accepted/revoked không hoạt động như active. Delivery retry giữ invitation gốc/hạn, không nói tạo lời mời mới. Tab chỉ Owner; quyền vừa mất đóng nội dung Owner và về W01.

### W04 Workspace Settings

Tab Thông tin nhóm Owner-only: name + description editor chung, Save/Cancel, dirty state; loaded version lưu riêng. Description cho lượng nội dung dài theo guardrail hiện có, không nhập one-line. Không lẫn global profile/nickname/email người dùng vào form Workspace.

Workspace email override là setting của từng người: đặt tab “Email của tôi trong nhóm” có thể mở từ S03/W01, kể cả Member; không đặt vào vùng Owner-only khiến Member không có đường tới. Bốn loại sự kiện, mỗi loại Theo setting chung/Bật/Tắt và giá trị hiệu lực; Reset rõ ràng là trở về kế thừa. Owner không cấu hình hộ các thành viên.

### W05 Announcements — phase riêng

Capability đã chốt Owner đăng/ghim cho Workspace, nhưng thiếu APIs và chi tiết phase. Dự kiến vùng thông báo ghim ở W01 và list/compose trong Workspace; Member đọc, Owner quản lý theo quyết định nghiệp vụ. Chưa chốt editor limits/pin ordering/permissions chi tiết đủ để vẽ control hoạt động. Không nhầm ghim announcement với ghim inbox notification. Không đưa screen này vào prototype tích hợp lõi trước khi review và dựng BE; vẫn có trong inventory để không mất UC-35.

## 5. Project và Task

### J01 Project Board / info

Header breadcrumb Workspace → Project, tên + Active/Archived, mô tả ở vùng Info mở theo nhu cầu, Owner menu Sửa Project/Archive/Reopen. Không tách riêng Project landing buộc click Board. Tạo Task cho mọi Member khi Active. Archived: banner chỉ đọc, Owner có Mở lại; vẫn search/filter/read Tasks.

Filter bar chung với My Tasks nhưng bỏ filter Workspace/Project lifecycle vì context đã xác định. Search, status, overdue, Thời gian. Desktop 3 cột theo status cố định, mỗi cột tổng kết quả, cards và Tải thêm riêng. Card: title, assignee/chưa phân công, deadline/overdue và action đổi status nếu quyền. Không full description/comment preview hoặc progress % không có BE.

Mobile đề xuất tab Chưa làm/Đang làm/Hoàn thành với count từng cột; một cột dọc để đọc tốt ở 360px, giữ cùng query/count/sort. Đây là lựa chọn layout cần review, thay cho bắt cuộn ngang mặc định. Đổi status bằng menu có thể thao tác phím; drag desktop chỉ chuyển trạng thái, không sắp trong cùng cột. Chờ BE xác nhận, lỗi/stale không báo đã lưu hoặc để card ở cột sai.

### T01 Task Detail + Comments

Một route Task duy nhất, độc lập entry point. Mở từ Board/My Tasks: desktop panel bên phải giữ context + filters, có Mở toàn trang; mobile/full direct link dùng trang toàn màn. Browser Back/Close trở về nơi mở; nếu direct link không có background, về Project bằng dữ liệu context đã xác thực. Không cần fetch Board trước khi xem một Task từ notification.

Khối trên: title và status selector riêng; breadcrumb, Archived banner, overflow Delete nếu quyền. Nội dung: description viewer (Edit mới mở editor), metadata assignee/deadline/creator/created/updated; Comments bên dưới. Desktop toàn trang có cột metadata hẹp ở phải; panel/mobile xếp metadata gọn thành các hàng trước Comments.

Owner/Creator: Edit mở title/description/assignee/deadline với Save/Cancel; Assignee-only chỉ thấy status control, phần còn lại read-only. Member khác chỉ đọc. Done vẫn sửa nội dung trong Active; assignee đã rời có tên + nhãn nếu BE cung cấp identity; không đưa User ID lên UI. Reopen refresh assignee/deadline theo response BE. Past deadline warning không chặn lưu; không dùng nhãn overdue cho Done.

Comments: vùng composer riêng khi Active, hỗ trợ editor gọn + Gửi; plain Enter xuống dòng, nút gửi hoặc shortcut rõ ràng, tránh gửi nhầm. Mỗi comment: author/avatar/time, viewer, edited indication nếu updatedAt khác createdAt, menu edit/delete chỉ Author. Edit comment inline với Save/Cancel; không nhập chung với form Task. Owner không có menu xóa Comment người khác.

Comments API mới nhất trước. Đề xuất hiển thị mới nhất trước và nút Tải bình luận cũ hơn phía dưới, label giải thích nếu cần; không lật mảng từng trang rồi ghép sai thứ tự. Nếu chọn oldest-first/chat thread ở bước review cần thiết kế pagination/query khác trước khi nối UI. Empty comments không lẫn error load; đang gửi giữ nội dung và không giả success trước response.

Task/Comment deleted hoặc mất quyền: bỏ nội dung nội bộ đã tải; vùng unavailable + đường về hợp lệ. Conflict: giữ bản người dùng đang nhập trong tab với Sao chép nội dung/Tải lại bản mới; không auto-merge/autosave hoặc hứa draft còn sau reload. Dirty Close/Back đổi workspace có confirmation, không mất form âm thầm.

### D01 Forms và confirmations

| Form | Trường | Bố cục/submit |
|---|---|---|
| Create Workspace | Name, description tùy chọn | Dialog rộng desktop/trang mobile; owner tự suy ra |
| Create/edit Project | Name, description tùy chọn | Dialog dùng chung; không chọn Workspace khi đã trong context |
| Create Task | Title, description, assignee optional, deadline optional | Dialog/panel rộng; Project cố định hiển thị; status ban đầu Chưa làm, không status custom |
| Edit Task | Title/description/assignee/deadline | Trong T01; status control tách request/version từ form |
| Invite | EMAIL + email hoặc LINK | W03 dialog; preview kết quả khác nhau |
| Confirm delete/archive/leave/remove/transfer | Đối tượng + hậu quả + Cancel/Confirm | Không auto-select Confirm, focus an toàn; disabled khi đang gửi |

Assignee picker cần tìm trong mọi Member hợp lệ, không chỉ trang 20 người đầu. Hiện chưa có server search; picker có thể tải thêm nhưng “không thấy người này” không có nghĩa không là Member. Gap P1 cần xử lý trước UI polished. Create Task không có idempotency key: disable submit khi pending; nếu timeout sau khi BE có thể đã lưu, không tự retry tạo, giữ draft và hướng kiểm tra Board trước gửi lại.

Editor dùng chung cho Workspace/Project/Task/Comment, toolbar rộng/gọn theo chỗ, schema giữ nhất quán. BE hiện hỗ trợ heading 1–3, paragraph, lists, quote, bold/italic/underline/strike/code, link và emoji text. Không đưa controls font tùy ý, table, shape, ảnh/file, highlight hoặc autosave khi chưa support. Viewer/link và counter dùng cùng normalized visible text, không render HTML tùy ý. FE limits khớp guardrails BE hiện tại, không dựa hạn cũ trong draft SRS.

## 6. Notifications và Settings

### N01 Notifications

Trang danh sách đầy đủ; chuông chỉ badge + link mở trang, chưa cần dropdown thứ hai sao chép mọi interaction. Filters all/unread/read, work/invitation; mỗi dòng icon/type, message localized, time/read state. Mark read riêng; Read all dùng cutoff của lần tải. Không display eventId/raw enums/worker attempts.

Work available: click mở T01, có thể mark read khi người dùng chọn mục; GET detail không tự mark. Invitation: click A05 theo ID. Unavailable: generic message + time/read state, không title/Workspace/actor/link cũ; vẫn mark read được và vẫn nằm trong count vì API trả record. Sau rejoin có thể hiện lại theo quyền hiện tại. Không thông báo giả “đã mất dữ liệu” chỉ vì bị che.

Polling/realtime chưa chốt: bản đầu refresh khi mở/focus và có nút tải lại; không vẽ “live” hay cam kết badge dưới 5s trước khi kiểm NFR. Đọc tất cả không làm notification mới sau cutoff biến mất khỏi unread. Không tạo ghim inbox, mark-unread hoặc delete notification chưa có API.

Search/time dự kiến theo bảng dùng chung ở mục 7; Notifications chỉ được search nội dung còn quyền xem, không search title/Workspace đã bị che rồi để kết quả gợi ý dữ liệu đó. Cutoff read-all khi có search/time sau này phải bind thêm phạm vi filter nếu nghĩa là “đọc tất cả kết quả đang lọc”; hiện API chỉ bind category, không giả UI hỗ trợ scope mới.

### S01 Profile

Personal Settings có tab Profile/Account/Email và ngôn ngữ. Profile: Google avatar hoặc initials fallback, display name editable, email read-only, verification badge. Không upload/chọn ảnh/tự đổi email/nickname mỗi Workspace. Save/Cancel + conflict handling theo User version; đổi displayName không đổi Google identity. Avatar image load lỗi fallback chữ cái ngay.

### S02 Account

Hai section Đăng nhập và Password. Local-password user: current/new/confirm password, Save, giải thích đổi giữ phiên này và thu hồi phiên khác. Google-only: thông tin dùng Google, không form nhập current password giả hoặc nút Set password chưa được hỗ trợ. Google linked: label provider hiện tại; chưa liên kết local user có hành động Link Google với current-password proof và chọn Google.

BE chưa trả hasLocalPassword/providers nên trạng thái này là gap P0, không suy từ avatar/email hoặc thử API rồi dùng lỗi để đoán. Không vẽ unlink Google/change email/delete account/session-device list khi chưa có nghiệp vụ/API. Session-expired dẫn Login, password draft không giữ lâu sau hết phiên.

### S03 Email / Language

Global Email: 4 switches assignment/comment/content/status, nhãn dễ hiểu; assignment bao gồm được giao/thôi được giao. Default assignment bật, comment/content/status tắt; khi tải user phải dùng setting thật, không reset về default vì refetch lỗi. Save rõ ràng, không hứa email provider đã nhận chỉ vì setting saved. Khu Workspace overrides chọn nhóm đang tham gia và dẫn tab “Email của tôi trong nhóm”; hiển thị inherit/on/off cùng effective state từ global + override.

Language chọn Việt/English, giữ draft/filter khi đổi, không dịch nội dung người dùng và không đổi timezone. Mặc định Việt/guest preference vẫn là đề xuất UX; User locale vi/en/null đã có API. Không gộp global Save với Workspace Save thành một nút vì khác đối tượng/version; đổi global chỉ ảnh hưởng override inherit. Không show reminder/push/slack toggle chưa có API.

### X01 Session và navigation guards

App boot giữ loading khi khôi phục phiên, không nhảy Welcome/Login rồi mới trở lại Task. Access memory + refresh cookie là implementation; UI chỉ thấy đang tải/đăng nhập lại. Ưu tiên: target intent hợp lệ → gate verification khi cần → Home. Invitation luôn có preview công khai; Profile/Settings/Invitation inbox không bị verification gate quá rộng.

Logout thành công xóa dữ liệu riêng của user khỏi UI/cache, về Login/Landing theo layout chọn; đổi tài khoản không giữ Workspace/Task cached của người cũ. Không dùng Return URL tùy ý; FE chỉ cho local known routes. Mất membership trong tab cũ clear content + reload context; không giữ breadcrumb chứa tên nhóm bị mất quyền. Draft người dùng tự nhập có thể cho sao chép riêng trong tab, không kéo thêm dữ liệu server mất quyền.

## 7. Quy tắc responsive và trạng thái dùng chung

Yêu cầu search động và lọc thời gian được cụ thể hóa cho các màn danh sách phù hợp dưới đây. Chỉ Task/Board/My Tasks đã có query backend tương ứng; các hàng khác là đầu vào bổ sung BE trước nối FE, không client-filter trang đầu. Không đặt search/time vào form Login/Profile hoặc trang đọc policy vì không có tập kết quả để lọc.

| Danh sách | Search dự kiến | Thời gian dự kiến | Trạng thái BE |
|---|---|---|---|
| Workspace Home | Name/description của nhóm đang tham gia | Ngày tạo | Thiếu q/time và matching total |
| Projects trong Workspace | Name/description, giữ filter lifecycle | Ngày tạo | Thiếu q/time |
| Members | Display name, không tìm email riêng tư | Ngày gia nhập hiện tại | Thiếu q/time/total |
| Invitations Owner | Type/email recipient trong phạm vi Owner | Ngày tạo hoặc ngày hết hạn | Thiếu q/time/state query |
| Task/Board/My Tasks | Title/description | Ngày tạo hoặc deadline | Đã có; preset FE đổi thành from/to |
| Notifications | Mẫu/nội dung được phép hiển thị, không payload đã che | Ngày tạo | Thiếu q/time và cutoff bind filter mở rộng |

Đề xuất dùng cùng SearchFilterBar: search debounce, panel Thời gian, khoảng lịch Việt Nam và reset. Trường khác nhau theo đối tượng, không ép mọi nơi có deadline. Mở rộng Notification search cần mapping ngôn ngữ/template và authorization trước count/pagination; không sao chép query Task trực tiếp vào payload inbox. Chi tiết từng query mới cần contract/test BE, không tự xem là đã triển khai từ bảng này.

Desktop/mobile dùng cùng actions và semantics. Primary action dễ thấy nhưng chỉ hiện khi có quyền; permission read-only có nhãn giải thích khi cần. Form label không chỉ placeholder; lỗi cạnh field và summary khi submit lỗi; validation FE giúp nhập, BE vẫn quyết định cuối. Không gọi mọi 409 là conflict: VERSION_CONFLICT, PROJECT_ARCHIVED, TRANSFER_REQUIRED và ASSIGNEE_NOT_MEMBER cần thông điệp/action khác nhau.

Loading khác empty; loaded list + refetch lỗi giữ kết quả gần nhất và nói chưa cập nhật, trừ mất quyền thì phải che/clear. Search invalid date giữ filter chưa áp dụng rõ, không giả trả 0. Tải thêm giữ vị trí cuộn và không lặp phần tử; totals tại lần tải, không hứa snapshot nhiều requests.

Focus: mở dialog tới heading/field thích hợp, Cancel đóng về trigger; Task panel có accessible close và không để keyboard vào background đang inert. Delete confirmation không có hành vi Enter bất ngờ trên nút nguy hiểm. Board có keyboard status menu. Trước gọi NFR đã đạt phải kiểm tại 360/1440, bàn phím, label dài cả Việt/English và editor emoji/accent round-trip.

## 8. Phần cần review bố cục trước wireframe

Đề xuất cụ thể để chủ dự án xem: Home riêng với My Tasks; Project mở thẳng Board; Task panel desktop/full-page mobile; Mobile Board chọn cột bằng tab; Comments mới trước; Workspace email override dành cho bản thân được truy cập bởi cả Member; không dashboard KPI hoặc nút cloud storage/announcements hoạt động giả. Đây là review UX, không mở lại quyền/status/deadline đã chốt.

Sau review: wireframe local cho shell → Home → Workspace/Board → Task → My Tasks, rồi Auth/Invitation/Settings/Notifications cùng checklist states. Figma là bước sau khi cấu trúc đủ rõ; không có yêu cầu mua Full seat hoặc ghi canvas trong lượt này.
