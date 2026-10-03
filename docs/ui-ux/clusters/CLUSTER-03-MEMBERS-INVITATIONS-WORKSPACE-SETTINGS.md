# Cụm 03 — Thành viên, Lời mời và Quản lý Workspace

Ngày 03/10/2026. Tiếp tục kế hoạch phân tích từng cụm. Chủ dự án đồng ý bổ sung mobile UI: website responsive, cùng dữ liệu/quyền và chức năng cốt lõi với desktop; không mở thêm dự án native app. Layout, vị trí và cách trình bày dưới đây vẫn là đề xuất review.

Nguồn: [SRS](../../srs/SRS-v0.2.md), [screen spec](../SCREEN-SPEC-v0.2.md), [Workspace contract](../../sds/WORKSPACE-INVITATIONS-API-v0.1.md), [Notifications contract](../../sds/NOTIFICATIONS-EMAIL-API-v0.1.md) và BE/src/workspaces. Các đoạn “increment tiếp theo” trong contract cũ là lịch sử; triển khai hiện hành đã có Task/Notifications.

## 1. Câu hỏi người dùng và ranh giới màn hình

- Thành viên: ai đang trong nhóm, ai là Owner, tôi có thể rời nhóm ở đâu?
- Lời mời: Owner mời ai, bằng cách nào, lời mời còn hiệu lực không?
- Cài đặt nhóm: Owner sửa tên và mô tả Workspace ở đâu?
- Email của tôi trong nhóm: bản thân muốn nhận những loại email nào ở riêng Workspace này?

Không dùng role Admin/Manager hoặc quyền ủy quyền mời chưa có. Owner là người duy nhất gửi và quản lý lời mời. Member vẫn xem danh sách thành viên và chỉnh own overrides; không bị buộc vào màn cài đặt Owner để làm việc cá nhân.

## 2. Thành viên

### Bố cục và dữ liệu

Header breadcrumb + Thành viên; Owner có Mời thành viên. Search tên hiển thị và lọc ngày gia nhập đặt trước danh sách, mới gia nhập trước. Mỗi dòng gồm avatar, display name, Owner/Member, joinedAt và menu theo quyền. Không hiện email mặc định vì response chỉ cung cấp identity tối thiểu.

Desktop dùng bảng gọn; mobile dùng card với tên/vai trò nổi bật, ngày gia nhập phụ và menu rõ nhãn. Tên dài wrap, không làm menu biến mất. Tải thêm giữ vị trí đọc. Không gọi số dòng đã tải là tổng thành viên; chỉ hiển thị tổng khi BE bổ sung total.

Không có remove Owner hoặc dropdown đổi role tùy ý. Owner thấy menu Loại khỏi nhóm/Chuyển quyền sở hữu ở thành viên khác. Chuyển quyền là hành động riêng cần xác nhận, không đặt thành một thay đổi dropdown dễ bấm nhầm.

### Loại thành viên

Dialog ghi tên người bị loại và Workspace, thông báo mất quyền truy cập; Task chưa Done bị bỏ assignee ở cả Active và Archived; Task Done giữ người cũ với nhãn Đã rời. Không hứa xóa Task/Comment do họ tạo. Confirm → lưu theo membership version → refresh danh sách và context liên quan. Không đoán số Task ảnh hưởng khi chưa có endpoint đếm.

Nếu membership đã đổi vì người đó vừa rời/gia nhập lại, tải bản mới và yêu cầu thao tác lại trên tình trạng hiện tại; không lấy version mới rồi tự loại người vừa rejoin bằng xác nhận cũ.

### Chuyển quyền sở hữu

Chọn một thành viên hiện tại khác bản thân, có search/pagination toàn Workspace. Confirm ghi rõ người mới trở thành Owner và người thao tác trở thành Member, mất quyền quản lý nhóm/lời mời. Chuyển quyền không tự rời nhóm; nếu muốn rời phải làm bước riêng. Lời mời còn hiệu lực được giữ và Owner mới quản lý.

Sau thành công, tải lại Workspace role, member list và navigation; đóng màn/form Owner không còn quyền. Nếu request timeout, kiểm trạng thái hiện tại trước khi đưa lại hành động; không giả định chuyển thất bại và không tự retry mutation stale.

### Rời Workspace

Đặt trong một khối “Tư cách thành viên của bạn” dễ tìm, tách khỏi menu loại người khác. Member có Rời Workspace; dialog giải thích mất truy cập và cleanup assignee/override. Thành công về Home, xóa cache nội dung nhóm; không tự vào lại nhóm bằng invitation cũ.

Owner thấy giải thích phải chuyển quyền trước và CTA Chuyển quyền sở hữu. Nếu không có thành viên khác, hiển thị cần mời người khác gia nhập trước; không cung cấp nút chuyển cho người chưa là Member. Không tự thêm xóa Workspace để giải quyết tình huống này khi chưa có contract.

## 3. Lời mời — chỉ Owner

### Danh sách

Header Lời mời + Tạo lời mời. Desktop bảng, mobile card. Một mục có EMAIL/LINK, email người nhận chỉ khi EMAIL, trạng thái hiệu lực, ngày tạo/hết hạn và trạng thái gửi email nếu có. LINK ghi “Liên kết tham gia”, không hiện người nhận giả.

Search đề xuất theo email người nhận đối với EMAIL; filter loại/trạng thái, thời gian theo ngày tạo hoặc ngày hết hạn. LINK tìm qua bộ lọc loại/ngày, không dùng raw token làm search. Mới tạo trước; Tải thêm; active/expired/accepted/revoked thể hiện riêng với pending/processing/sent/failed/cancelled của email.

Ví dụ: lời mời còn hiệu lực nhưng gửi email thất bại là hai thông tin cùng tồn tại, không biến invitation thành revoked. “Sent” chỉ nghĩa dịch vụ gửi đã nhận, không chứng minh người nhận đọc hoặc email nằm trong Inbox.

### Tạo EMAIL

Chọn Mời qua email → nhập một email → Tạo lời mời. Hạn hiện hành 7 ngày, không có date picker tự chọn hạn. Kết quả queue nói “Đã tạo lời mời, email đang chờ gửi”; ALREADY_MEMBER nói người này đã trong nhóm. Không yêu cầu email đó phải có tài khoản từ trước và không mở tra cứu toàn bộ Users.

EMAIL dùng một lần, chỉ tài khoản verified khớp email được nhận. Không cho Owner copy token email từ response. Nếu gửi failed và invitation active, có Thử gửi lại; retry giữ hạn cũ, không nói gia hạn hoặc tạo lời mời mới. Pending/processing khóa nút retry, sent không hứa gửi lại bằng endpoint hiện hành.

### Tạo LINK

Chọn Mời bằng liên kết → Tạo liên kết → màn kết quả có URL, Copy và thời điểm hết hạn. LINK dùng nhiều lần trong hạn cho người có tài khoản verified. Giải thích ai có link hợp lệ có thể xin gia nhập qua luồng accept; không thêm chế độ Owner duyệt từng người chưa có nghiệp vụ.

URL chỉ được trả một lần khi tạo, nên giữ màn kết quả cho tới khi người dùng đóng. Copy thất bại có chọn/copy thủ công, đặc biệt trên mobile. Không lưu raw URL vào localStorage, telemetry hoặc danh sách invitation; sau đóng không có nút Copy lại giả. Có thể tạo link mới và thu hồi link cũ nếu cần.

### Thu hồi

Active có Thu hồi và confirmation. Thu hồi ngăn gia nhập về sau, không loại người đã vào Workspace và không thu lại email đã gửi. Expired/accepted/revoked không có action thu hồi active. Request stale hoặc mất Owner quyền → reload/đóng nội dung quản lý; không giữ email người nhận trên màn Member sau khi role thay đổi.

## 4. Người nhận mở lời mời

Một kiểu card dùng cho URL và invitation từ Notifications: tên Workspace, người mời, loại, thời điểm hết hạn và một CTA đúng trạng thái. Preview không lộ danh sách thành viên/Project/Task hoặc email người nhận.

| Tình trạng | Hành vi |
|---|---|
| Chưa login | Login/Register, giữ invitation intent hợp lệ |
| Login chưa verified | Hướng xác minh rồi quay lại lời mời |
| Verified, được nhận | Tham gia Workspace |
| Đã là Member | Mở Workspace sau response ALREADY_MEMBER |
| EMAIL không khớp account | Giải thích cần đúng tài khoản, có đổi tài khoản; không tiết lộ email đích |
| Link không còn hiệu lực | Màn lời mời không khả dụng và về Home; không dựng lý do expired/revoked cụ thể nếu BE chỉ trả lỗi chung |

Token URL hiện nằm trong fragment, giữ tạm trong memory và bỏ khỏi address bar; không ghi vào log/analytics. Nếu reload đã mất token, hướng mở lại link gốc. Với EMAIL invitation in-app có thể accept theo ID, không tìm cách khôi phục token. Gia nhập thành công refresh Workspace list và mở Projects; không buộc tạo Workspace mới.

## 5. Cài đặt nhóm và email cá nhân trong nhóm

Thông tin nhóm chỉ Owner: tên, mô tả rich text dài, Lưu/Hủy. Name guardrail hiện 200 UTF-16 units, description 20.000 graphemes; dùng editor chung. Không trộn profile người dùng vào form này. Dirty guard, validation, conflict giữ nội dung trong tab và CAS version Workspace như đã phân tích.

“Email của tôi trong nhóm” là route/đích riêng cho mọi Member. Bốn hàng assignment/comment/content/status, mỗi hàng chọn Theo setting chung/Bật/Tắt và hiển thị giá trị hiệu lực. Lấy global preferences + own overrides để tính; Owner không đổi hộ thành viên.

Reset ghi “Trở về cài đặt chung”, không dùng label “Tắt tất cả”. Leave/remove xóa override, rejoin dùng setting chung. Save/reset dùng membership version; không dùng Workspace version. Global setting đổi thì hàng đang inherit phản ánh giá trị mới khi tải lại, không biến nó thành override cố định.

Mobile dùng label và control theo hàng dọc, CTA Lưu dễ tiếp cận khi bàn phím/editor mở; kiểm vùng safe area, không để nút che nội dung hoặc focus. Forms/dialog mobile có cuộn nội dung, không yêu cầu kéo ngang hoặc hover mới thấy action.

## 6. Trạng thái và dữ liệu còn thiếu sau phân tích

| Nhu cầu | BE hiện hành | Kết luận |
|---|---|---|
| Member identity/role/joinedAt/version | Có, list chỉ active và cursor | Đủ dòng thành viên; không dùng để tìm identity lịch sử Task |
| Member search/ngày gia nhập/total | Chưa có | Bổ sung scoped query, dùng chung cho picker transfer/assignee khi phù hợp |
| Invitation list và lifecycle/delivery | Có list/create/revoke/retry | Đủ nội dung, actions phải theo hai nhóm state |
| Invitation search/type/state/time/total | Chưa có server filters | Bổ sung truy vấn; không lọc riêng trang đã tải |
| Preview/accept token và EMAIL accept ID | Có | Dùng chung card, giữ auth intent; không cần reveal token |
| Workspace edit và own overrides/reset | Có | Tách quyền, đúng entity version; không cần endpoint Owner edit hộ |
| Member action permissions | Dựa current Workspace role và target identity | Dựng controls từ context, BE kiểm lại; không thêm roles mới |
| Invitation capabilities cho retry | List trả delivery state, không cờ canRetry | Có thể suy control từ active/EMAIL/failed rồi xử lý EMAIL_RETRY_UNAVAILABLE; đề xuất capability boolean nếu cần tránh control stale |

Loading/empty/no-results/error riêng cho từng list; mutation pending khóa đúng nút, error giữ dữ liệu nhập. Không render Owner content trước khi kiểm role. Cache/query phân biệt Workspace/User, xóa dữ liệu mất quyền. Expiry trên UI có thể tính từ expiresAt nhưng quyền accept/revoke luôn do BE quyết định; LINK reusable không cần “đã dùng” giả khi một người tham gia.

## 7. Wireframe và cụm kế tiếp

Cần Members Owner/Member/Owner không có người kế nhiệm; remove/leave/transfer dialogs; OwnerInvitations các lifecycle/delivery states; EMAIL/LINK create và one-time-copy; invitation guest/unverified/wrong account/unavailable; nhóm Settings và own overrides. Mỗi layout chính có desktop/mobile, tiếng Việt/English và thao tác bàn phím.

Cụm kế tiếp: Login/Register/Google/verification/recovery. Không cần mua tool hoặc dựng native mobile app để hoàn thành các wireframe này.
