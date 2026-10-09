# Đặc tả yêu cầu Collaborative Workflow Platform

> 05/10/2026: mô hình mở rộng D1–D5 được tổng hợp tại [CORE-EXPANSION-v0.3](CORE-EXPANSION-v0.3.md). Bản v0.2 dưới đây giữ nền/lịch sử; Approved của delta định hướng thay thế các quyền và vòng đời được chỉ rõ. Proposed/Open không tự ghi đè quyết định cũ. use-cases.json và implementation chưa được chuyển toàn bộ sang mô hình tổ chức; xem [kế hoạch core](../project/CORE-EXPANSION-PLAN.md).

Phiên bản: 0.2 | Ngày: 01/10/2026 | Trạng thái: Chờ rà soát và thông qua

Cập nhật review local 01/10/2026: chủ dự án đã duyệt OD-01/02/03 gồm chi tiết assignee/Archived/tái gia nhập, email override từng loại/kế thừa/reset và deadline/overdue. Các quyết định khác vẫn cần duyệt; chưa lập baseline v1.0.

Tài liệu dành cho chủ dự án và người triển khai, dùng để thống nhất phạm vi, quyền, luồng nghiệp vụ và tiêu chí nghiệm thu trước SDS. Phiên bản này tổng hợp các quyết định trong cuộc trao đổi; các đề xuất chưa được duyệt được đánh dấu riêng. Đây chưa phải baseline đã phê duyệt để triển khai toàn bộ nghiệp vụ.

## 1 Mức độ hoàn thiện và cách duyệt

| Hạng mục | Trạng thái |
|---|---|
| Tầm nhìn và nhóm chức năng | Đã có phạm vi để review |
| Quyết định mới về tên, lời mời, thông báo, avatar | Đã ghi nhận |
| Vai trò và phân quyền | Có ma trận dự thảo |
| Functional Requirements và 33 Use Cases | Được tổng hợp trong bản này |
| Luồng ngoại lệ và Acceptance Criteria | Có bản dự thảo để duyệt |
| Quy tắc deadline, assignee lịch sử, setting email | Đã duyệt OD-01/02/03 và chi tiết nhóm review 01; chưa triển khai |
| NFR và giới hạn dữ liệu | Có mục tiêu đề xuất, chưa được đo hoặc duyệt |
| Policies và nghiệp vụ tài liệu ở increment sau | Chưa đủ để phát hành các chức năng tương ứng |
| SDS, schema, API và thiết kế UI | Chưa hoàn thiện; thực hiện sau khi duyệt yêu cầu liên quan |

Không gán một tỷ lệ phần trăm vì chưa có bộ trọng số được thống nhất. Mốc hiện tại là bản SRS đủ cấu trúc để review một lượt, chưa phải SRS đã thông qua. Người duyệt nên đọc mục 3, 4, 5 và 12 trước, sau đó kiểm tra Use Cases và tiêu chí nghiệm thu.

## 2 Mục tiêu và thuật ngữ

Sản phẩm hỗ trợ nhóm nhỏ tổ chức công việc theo Workspace và Project, phân công Task, theo dõi Kanban, trao đổi trong Comment và nhận thông báo liên quan. Mục tiêu portfolio là thể hiện nghiệp vụ cộng tác, kiểm tra quyền và tính nhất quán dữ liệu; không tích hợp AI trong phạm vi đang đặc tả.

| Thuật ngữ | Ý nghĩa |
|---|---|
| User | Tài khoản dùng chung trên ứng dụng |
| Workspace | Không gian làm việc của một nhóm |
| Membership | Quan hệ hiện tại giữa User và Workspace, có role |
| Owner | Một người quản lý Workspace |
| Member | Thành viên cộng tác trong Workspace |
| Workspace Member | Actor bao gồm cả Owner và Member |
| Project | Dự án thuộc đúng một Workspace |
| Task | Công việc thuộc đúng một Project |
| Creator và Assignee | Người tạo và người được giao Task; là quan hệ dữ liệu, không phải role |
| Active và Archived | Trạng thái vòng đời Project |
| In-app | Thông báo nằm trong giao diện ứng dụng |
| Browser push | Kênh thông báo của trình duyệt hoặc hệ điều hành |
| Increment | Đợt bổ sung chức năng trong roadmap hoàn thiện sản phẩm |

## 3 Phạm vi và các quyết định đã ghi nhận

### 3.1 Quyết định được người dùng xác nhận

| ID | Quyết định |
|---|---|
| D-01 | Một display name chung toàn bộ ứng dụng; không có nickname theo Workspace |
| D-02 | Hỗ trợ cả lời mời email và liên kết chia sẻ |
| D-03 | Lời mời có hạn 7 ngày, Owner được thu hồi; email dùng một lần, link dùng cho nhiều người; gia nhập thành Member và tài khoản phải xác minh email |
| D-04 | In-app luôn hiển thị sự kiện liên quan đã đặc tả; không có setting bật/tắt in-app |
| D-05 | Setting nhận email đặt trong Settings cá nhân; có setting chung toàn tài khoản và override từng Workspace ngay bản đầu, được duyệt 01/10/2026 |
| D-06 | Cập nhật 03/10/2026: Google sign-in ngay bản đầu, avatar Google nếu có; chữ cái đầu fallback, không upload avatar riêng |
| D-07 | Increment Communication & Documents sẽ xây nền tảng file chung cho avatar, Task Attachments và Workspace Documents |
| D-08 | Giữ nhắc deadline trong roadmap, triển khai sau thông báo theo sự kiện |
| D-09 | Loại email tổng hợp hằng ngày khỏi phạm vi |
| D-10 | Browser push là phần triển khai sau, cần quyền trình duyệt của người dùng |

### 3.2 Bản chạy đầu tiên

Đăng ký, đăng nhập, đăng xuất, xác minh email, khôi phục và đổi password; Profile; Landing và Policy pages; Personal Home và first-use state; Workspace và thành viên; hai hình thức lời mời; chuyển ownership; Project Active/Archived; Task và Kanban; My Tasks; Comments; in-app và email theo sự kiện; Settings email.

Các tính năng cốt lõi kể trên là baseline dự thảo kế thừa để người dùng duyệt, không tự coi toàn bộ chi tiết nghiệp vụ là đã được xác nhận.

### 3.3 Phạm vi hoàn thiện sau bản đầu

| Increment | Chức năng | Mức đặc tả hiện tại |
|---|---|---|
| Nhắc hạn | Nhắc deadline qua in-app và email | Deadline/timezone đã chốt; mốc nhắc và các trường hợp sát hạn còn mở OD-10 |
| Browser push | Thêm kênh gửi cho sự kiện được chọn | Chưa chốt event mapping và quy tắc đăng ký thiết bị |
| Communication & Documents | Upload avatar, Task Attachments, Workspace Documents | Đã chốt ý định; chưa chốt quyền, quota, loại file, retention |

Các increment thuộc mục tiêu hoàn thiện sản phẩm nhưng không chặn nghiệm thu bản chạy đầu tiên. Không coi checkbox setting hoặc thư mục rỗng là chức năng đã hoàn thành.

### 3.4 Ngoài phạm vi hiện tại

Email tổng hợp hằng ngày; AI; direct messaging và gửi file trực tiếp; Project Membership và Project Manager; System Admin; thanh toán; CMS cho Policy; ban thành viên; tùy biến cột Kanban; task dependency và lịch sử chỉnh sửa đầy đủ. Đổi email và xóa tài khoản là quyết định mở, chưa thuộc chức năng đã duyệt.

## 4 Actors và phân quyền

Visitor chưa đăng nhập. Authenticated User đã đăng nhập. Workspace Member có membership hiện tại. Role Owner/Member được xác định riêng trong từng Workspace. Owner không được sửa Profile hoặc password của Member.

| Thao tác | Visitor | User chưa thuộc Workspace | Member | Owner |
|---|---|---|---|---|
| Landing, Policies, đăng ký và đăng nhập | Có | Có | Có | Có |
| Profile và Settings của chính mình | Không | Có | Có | Có |
| Tạo Workspace hoặc nhận lời mời | Không | Có | Có | Có |
| Xem Project, Task, Board và thành viên | Không | Không | Có | Có |
| Sửa Workspace, quản lý lời mời và ownership | Không | Không | Không | Có |
| Tạo, sửa tên/icon, archive hoặc mở lại Project | Không | Không | Không | Có |
| Sửa mô tả/mục tiêu Project Active | Không | Không | Nếu là Creator còn membership | Có |
| Tạo Task trong Project Active | Không | Không | Có, đã duyệt 01/10/2026 | Có |
| Đổi status Task trong Project Active | Không | Không | Nếu là Creator hoặc Assignee hiện tại | Có |
| Sửa nội dung/phân công Task trong Project Active | Không | Không | Nếu là Creator | Có |
| Xóa Task trong Project Active | Không | Không | Nếu là Creator | Có |
| Viết Comment trong Project Active | Không | Không | Có | Có |
| Sửa hoặc xóa Comment trong Project Active | Không | Không | Nếu là Author | Nếu là Author |
| Rời Workspace | Không | Không | Có | Sau khi chuyển ownership |
| Loại Member | Không | Không | Không | Có |

Project Archived chỉ đọc đối với thao tác người dùng: không tạo/sửa/xóa Task hoặc Comment. Owner được mở lại Project. Ngoại lệ hệ thống đã duyệt OD-01: khi thành viên rời/bị loại, vẫn bỏ assignee Task chưa Done trong Archived; không cấp thêm quyền ghi cho người dùng. Quyền phải được kiểm tra ở backend tại thời điểm thực thi, không suy ra từ việc nút thao tác đang hiển thị hay URL từng truy cập được.

## 5 Business Rules dự thảo

| ID | Quy tắc | Trạng thái |
|---|---|---|
| BR-01 | Mỗi Workspace có đúng một Owner hiện tại | Dự thảo cốt lõi |
| BR-02 | Một User chỉ có một membership hiện tại trong mỗi Workspace | Dự thảo cốt lõi |
| BR-03 | Thành viên Workspace được truy cập tất cả Project của Workspace; không có Project Membership | Dự thảo cốt lõi |
| BR-04 | Chỉ Owner quản lý Workspace, thành viên, lời mời, ownership và vòng đời Project | Dự thảo cốt lõi |
| BR-05 | Chuyển ownership chỉ tới Member hiện tại; Owner cũ trở thành Member; thay đổi phải nhất quán | Dự thảo cốt lõi |
| BR-06 | Owner không được rời nhóm khi vẫn giữ ownership | Dự thảo cốt lõi |
| BR-07 | Task có 0 hoặc 1 assignee; phân công mới chỉ cho thành viên hiện tại | Dự thảo cốt lõi |
| BR-08 | Task có ba trạng thái cố định Chưa làm (Todo), Đang làm (In Progress), Hoàn thành (Done); cho phép chuyển trực tiếp giữa mọi trạng thái theo quyền BR-09 | Đã duyệt OD-04, 01/10/2026 |
| BR-09 | Owner/Task Creator còn membership được sửa nội dung/deadline/phân công, đổi status và xóa Task trong Active; Assignee hiện tại chỉ có thêm quyền đổi status, không edit/phân công/xóa nếu không đồng thời là Owner/Creator; Member khác chỉ có quyền xem theo membership | Đã duyệt quyền Task 01/10/2026 |
| BR-10 | Comment chỉ do Author còn membership sửa/xóa trong Project Active; Owner không có quyền sửa/xóa Comment người khác chỉ từ role Owner | Đã ghi nhận từ chủ dự án 01/10/2026 |
| BR-11 | Project Archived chỉ đọc với thao tác người dùng; ghi đang mở trước archive bị từ chối; cleanup assignee do membership vẫn thực hiện theo BR-13 | Dự thảo cốt lõi; ngoại lệ OD-01 đã duyệt |
| BR-12 | Rời hoặc bị loại chấm dứt quyền hiện tại; vẫn giữ được ý nghĩa Creator và Comment Author | Dự thảo cốt lõi |
| BR-13 | Rời/bị loại bỏ assignee Task chưa Done ở cả Active/Archived; Done giữ User ID cũ với nhãn theo membership hiện tại; sửa nội dung Done được giữ assignee lịch sử; reopen bỏ assignee không còn membership; tái gia nhập không tự phục hồi phân công đã bỏ | Đã duyệt OD-01 và chi tiết, 01/10/2026 |
| BR-14 | Lời mời tuân theo D-02/D-03; không cấp Owner, không tạo membership trùng | Đã chốt cơ chế |
| BR-15 | Loại Member không phải ban; link còn hiệu lực vẫn cho họ gia nhập lại | Đã chốt cơ chế |
| BR-16 | Display name chung; avatar Google từ identity xác thực nếu có, chữ cái đầu fallback; User ID vẫn là định danh nội bộ | Cập nhật đã chốt 03/10/2026 |
| BR-17 | In-app không bật/tắt; chỉ gửi cho người liên quan; loại actor, loại trùng và gộp cùng một lần lưu | Cơ chế đã chốt; mapping dự thảo |
| BR-18 | Rời Workspace thì ngừng thông báo công việc mới; lịch sử không cấp quyền truy cập | Dự thảo |
| BR-19 | Email công việc dùng setting chung và override từng loại theo Workspace; email xác minh/recovery/invitation không chịu setting công việc | Đã duyệt phạm vi/quy tắc OD-02 |
| BR-20 | Lỗi email không rollback thao tác nghiệp vụ đã lưu; retry không tạo email trùng | Dự thảo |
| BR-21 | Token mời, xác minh và recovery không được ghi đầy đủ vào log; token có hạn và quyền dùng phù hợp | Dự thảo |
| BR-22 | Quá hạn khi có deadline, Task chưa Done và now > dueAt; áp dụng cả Archived; deadline nhập đến phút, lưu UTC/hiển thị giờ Việt Nam; cho lưu hạn quá khứ với cảnh báo | Đã duyệt OD-03; overdue được tính, không là nguồn sự thật riêng |
| BR-23 | My Tasks chỉ gồm Task được giao cho User trong Workspace còn membership; Archived có nhãn và chỉ đọc | Đã duyệt OD-05, 01/10/2026 |
| BR-24 | Notification chỉ do chính người nhận đọc hoặc đánh dấu đã đọc | Dự thảo |
| BR-25 | Xác minh/recovery token dùng một lần; hết hạn, đã dùng hoặc thu hồi không còn tác dụng | Đã duyệt OD-13, 01/10/2026 |
| BR-26 | Lần sửa stale không được âm thầm ghi đè thay đổi mới; trả trạng thái cần tải lại | Đã duyệt OD-06, 01/10/2026 |

### 5.1 Chi tiết membership và deadline đã duyệt

Sửa title/description/deadline của Task Done trong Project Active được giữ nguyên assignee lịch sử dù người đó đã rời; mọi phân công mới chỉ cho thành viên hiện tại. Task Archived không reopen trực tiếp. Khi tái gia nhập, Task chưa Done đã bỏ assignee không tự được giao lại; Task Done vẫn tham chiếu cùng User ID, nhãn đã rời biến mất và reopen được giữ assignee nếu membership hiện tại hợp lệ. My Tasks mặc định Active/chưa Done, cho lọc Done/Archived theo OD-05 đã duyệt.

Cleanup do leave/remove phải tránh để lần lưu nội dung đồng thời phục hồi assignee đã bỏ. Cơ chế phiên bản/conflict/transaction thuộc OD-06 và SDS; không coi toàn bộ OD-06 đã được duyệt.

Deadline tùy chọn, nhập đến phút theo Asia/Ho_Chi_Minh, lưu thời điểm UTC. Task không deadline hoặc Done không overdue. Task chưa Done overdue khi now > dueAt, bằng dueAt chưa overdue. Deadline quá khứ được lưu với cảnh báo; bỏ deadline hết overdue; reopen với hạn cũ đã qua trở thành overdue, không tự thay hạn. Project Archived vẫn tính overdue khi xem/lọc, chỉ đọc và không tạo reminder. Nhắc trước hạn/sát hạn/chống nhắc lặp vẫn thuộc OD-10.

### 5.2 Quyền Task/Comment được chủ dự án làm rõ

Owner Workspace và Task Creator còn membership được quản lý Task trong Project Active. “Người được uỷ quyền” trong lời chủ dự án chính là Assignee, không có người thứ ba hoặc cơ chế cấp quyền riêng. Assignee chỉ đổi status; không sửa nội dung/deadline/phân công/xóa nếu không đồng thời là Owner/Creator. Quyền được cộng theo các quan hệ hiện tại; khi đổi assignee, người cũ mất quyền riêng từ phân công nhưng vẫn có quyền nếu là Owner/Creator. Member khác không có quyền sửa Task chỉ từ membership. Không dùng một quyền edit chung cho status, nội dung, phân công và xóa. Comment chỉ do chính Author sửa/xóa; Task Creator/Assignee/Owner không thừa hưởng quyền Author của người khác. Chi tiết tại TASK-COMMENT-PERMISSIONS.md. Các quyền tạo Task/thêm Comment vẫn là baseline draft chưa được chốt từ câu trả lời này.

## 6 Functional Requirements

Mỗi FR trong bảng có tối thiểu một UC và tiêu chí nghiệm thu tương ứng tại mục 9. Các FR thuộc increment sau không được đánh dấu đã hoàn thành trong bản đầu.

| ID | Yêu cầu | UC | Giai đoạn |
|---|---|---|---|
| FR-01 | Tạo tài khoản bằng display name, email và password; không trùng email | UC-01 | Bản đầu |
| FR-02 | Đăng nhập và kết thúc phiên hiện tại bằng đăng xuất | UC-02, UC-03, UC-34 | Bản đầu |
| FR-03 | Xem Workspace đang tham gia và tạo Workspace với mình là Owner | UC-04, UC-05 | Bản đầu |
| FR-04 | Owner sửa name/description; thành viên xem danh sách và vai trò | UC-06, UC-07 | Bản đầu |
| FR-05 | Owner tạo, xem và thu hồi lời mời email hoặc link | UC-08 | Bản đầu |
| FR-06 | Gia nhập theo điều kiện từng loại mời; bảo toàn ý định sau đăng nhập | UC-09 | Bản đầu |
| FR-07 | Member rời nhóm; Owner loại Member | UC-10, UC-11 | Bản đầu |
| FR-08 | Chuyển ownership cho Member hiện tại | UC-12 | Bản đầu |
| FR-09 | Xem Project Active/Archived; Owner tạo, sửa và archive/mở lại; Creator còn membership được sửa riêng mô tả/mục tiêu trong Active | UC-13, UC-14, UC-15, UC-16 | Bản đầu |
| FR-10 | Tạo, xem, sửa và xóa Task theo quyền | UC-17, UC-18, UC-19, UC-20 | Bản đầu |
| FR-11 | Phân công Task, đặt/bỏ deadline và thay trạng thái | UC-17, UC-19 | Bản đầu |
| FR-12 | Board nhóm Task theo status, mới tạo trước trong mỗi cột, không sắp thủ công; có search động và lọc thời gian dùng chung với My Tasks; cùng quyền cập nhật Task | UC-21 | Bản đầu |
| FR-13 | My Tasks theo người được giao, filter Workspace/status/overdue/vòng đời, search động và lọc thời gian; mới tạo trước giống Kanban, không sắp thủ công | UC-22 | Bản đầu |
| FR-14 | Thêm Comment, Author sửa/xóa Comment | UC-23, UC-24 | Bản đầu |
| FR-15 | Landing có giới thiệu sản phẩm và CTA đăng ký/đăng nhập | UC-25 | Bản đầu |
| FR-16 | Terms và Privacy công khai, có phiên bản/ngày hiệu lực và liên kết từ đăng ký | UC-26, UC-01, UC-34 | Bản đầu |
| FR-17 | Điều hướng first-use hoặc Personal Home theo trạng thái User | UC-27 | Bản đầu |
| FR-18 | Xem/sửa display name; avatar Google khi có, fallback chữ cái đầu | UC-28, UC-34 | Bản đầu |
| FR-19 | Đổi password có kiểm tra password hiện tại | UC-29 | Bản đầu |
| FR-20 | Khôi phục password và xác minh email bằng token có hạn dùng | UC-30, UC-31 | Bản đầu |
| FR-21 | Danh sách in-app, số chưa đọc, đọc từng mục/đọc tất cả và mở đối tượng | UC-32 | Bản đầu |
| FR-22 | Lưu setting email chung và override từng loại sự kiện theo Workspace trong Settings cá nhân | UC-33 | Bản đầu |
| FR-23 | Tạo thông báo assignment, comment, content/status update sau khi lưu thành công | UC-17, UC-19, UC-23, UC-32 | Bản đầu |
| FR-24 | Gửi email xác minh, recovery, invitation và công việc theo setting | UC-01, UC-08, UC-19, UC-30, UC-31, UC-33 | Bản đầu |
| FR-25 | Nhắc deadline cho assignee đủ điều kiện; chống gửi trùng và cập nhật lịch | UC-19, UC-32, UC-33 | Increment Nhắc hạn |
| FR-26 | Đăng ký/hủy browser push và tôn trọng quyền trình duyệt | Chưa có UC chi tiết | Increment Browser push |
| FR-27 | Đính kèm Task và quản lý tài liệu Workspace; avatar dùng Google/fallback, upload avatar riêng chưa thuộc scope mới | Chưa có UC chi tiết | Upcoming sau phần lõi, đã xác nhận 03/10/2026 |

| FR-28 | Đăng nhập/liên kết Google, avatar profile nếu có; BE verify identity, không auto-merge theo email | UC-34 | Bản đầu |
| FR-29 | Member xem thông báo chung Workspace; chỉ Owner đăng/quản lý/ghim, không pin cá nhân | UC-35 | Capability đã chốt; phase/quota cần review |

## 7 Notifications và điều hướng

### 7.1 Ma trận sự kiện

| Sự kiện | Người nhận | In-app | Email |
|---|---|---|---|
| Assignment, reassignment hoặc bỏ assignee | Creator, assignee cũ và mới còn membership, loại actor và trùng | Luôn có | Theo setting |
| Comment mới | Creator và assignee hiện tại, loại actor và trùng | Luôn có | Theo setting |
| Sửa title, description hoặc deadline | Creator và assignee sau lần lưu, loại actor và trùng | Luôn có | Theo setting |
| Đổi status | Creator và assignee sau lần lưu, loại actor và trùng | Luôn có | Theo setting |
| Invitation email | Email được mời; in-app khi lúc gửi đã có tài khoản tương ứng, không hồi tố; LINK không phát in-app cho mọi User | Có nếu có User | Email lời mời |
| Xác minh email | Chủ tài khoản | Không cần | Email xác minh |
| Recovery password | Chủ tài khoản | Không cần | Email recovery |
| Deadline reminder | Assignee hiện tại đủ điều kiện | Luôn có | Theo setting; increment sau |

Đối với sự kiện công việc, người nhận phải còn membership ở thời điểm xử lý gửi. Sửa Comment cũ, xóa Comment, thay Profile và tạo link chia sẻ chưa có sự kiện thông báo riêng trong baseline này.

Một lần lưu nhiều thay đổi được gộp thành một thông báo cho mỗi người nhận. Đề xuất email tổng hợp trong một lần lưu được gửi khi người nhận bật ít nhất một loại sự kiện áp dụng, nội dung email chỉ chứa các loại họ bật; in-app có đầy đủ thay đổi liên quan. Quy tắc này được tạm chốt OD-09 ngày 03/10/2026; không phải email tổng hợp hằng ngày.

In-app cập nhật khi mở danh sách hoặc tải lại, chưa yêu cầu realtime. Nội dung không còn quyền truy cập phải hiển thị trạng thái không thể mở, không tiết lộ thêm dữ liệu Workspace. Setting email ở Settings cá nhân, có setting chung toàn tài khoản và override từng loại sự kiện theo Workspace ngay bản đầu (đã duyệt 01/10/2026). Mặc định chung bật assignment, tắt comment/content/status. Không có switch cho in-app.

Override từng loại có ba giá trị Theo setting chung/Bật/Tắt. Chưa override thì kế thừa; override Bật/Tắt ưu tiên, không bị đổi khi sửa setting chung. Reset một loại hoặc cả Workspace trở về kế thừa giá trị chung hiện tại. Khi rời/bị loại, xóa override của Workspace đó; tái gia nhập bắt đầu kế thừa. Chỉ cấu hình Workspace đang tham gia; kiểm tra membership khi lưu và gửi. Không thêm công tắc tổng email công việc trong quy tắc đã duyệt này. Tạm chốt 03/10/2026: email queued kiểm tra quyền/settings trước mỗi lần thử gửi; bỏ email công việc khi mất membership hoặc Task bị xóa; email đã bàn giao dịch vụ gửi không thể thu hồi.

### 7.2 Danh sách màn hình và trạng thái

| Màn hình | Người dùng và trạng thái cần có |
|---|---|
| Landing | Visitor; giới thiệu và CTA; không phải banner quảng cáo bên thứ ba |
| Auth | Đăng ký/đăng nhập, lỗi form, loading, tiếp tục invitation |
| Verification và Recovery | Token hợp lệ, hết hạn, đã dùng; gửi lại có giới hạn |
| Terms và Privacy | Đọc được trước đăng nhập; ngày hiệu lực/phiên bản |
| Welcome và Personal Home | Chưa có Workspace: tạo/gia nhập; đã có: danh sách và My Tasks |
| Workspace | Danh sách Project, thành viên; empty/loading/không quyền |
| Workspace Settings | Chỉ Owner sửa và quản lý invitation/ownership |
| Project Board | Active/Archived, không có Task, đang tải, cập nhật thất bại |
| Task Detail | Nội dung, phân công, deadline, Comments; bị xóa hoặc không quyền |
| My Tasks | Bộ lọc, không có kết quả, Workspace không còn truy cập |
| Notifications | Chưa đọc/đã đọc, không còn target, đọc tất cả |
| Personal Settings | Profile, Account, Email Notifications |

Website hỗ trợ hai ngôn ngữ chính tiếng Việt và tiếng Anh ngay bản đầu, theo yêu cầu chủ dự án 03/10/2026. Phạm vi gồm UI, editor, validation/lỗi/trạng thái, thông báo hệ thống, email và các trang public; nội dung do User nhập không bị dịch tự động. Chuyển ngôn ngữ không đổi quyền, nội dung, sort/search hoặc thời điểm deadline; múi giờ vẫn Asia/Ho_Chi_Minh đã chốt. Chính sách mặc định/lưu lựa chọn/email locale đề xuất tại docs/ui-ux/LANGUAGE-v0.1.md, chốt khi thiết kế SDS. Deep link invitation được bảo toàn sau đăng nhập, không cho điều hướng tới địa chỉ ngoài ứng dụng do tham số tự do.

## 8 Use Cases

Search động và bộ lọc thời gian cho UC-21/22 là yêu cầu mới của chủ dự án 01/10/2026. Thiết kế dùng chung tại docs/ui-ux/TASK-SEARCH-TIME-FILTERS.md: tìm title/description, tự cập nhật sau khi ngừng nhập; khoảng Ngày tạo/Deadline, múi giờ Việt Nam, filter kết hợp, không đổi sort và không giới hạn tìm trong dữ liệu của một trang đã tải. Chi tiết UX/query được assistant cụ thể hóa; defaults My Tasks vẫn review riêng OD-05.

Danh mục và đặc tả 35 UC được bổ sung tự động từ use-cases.json bởi công cụ xuất tài liệu. Mỗi UC gồm actor, trigger, tiền/hậu điều kiện, luồng chính, ngoại lệ và tiêu chí nghiệm thu. UC về quyền Workspace luôn kế thừa mục 4 và Project Archived luôn kế thừa BR-11.

### UC-01 Đăng ký tài khoản

Actor: Visitor.

FR: FR-01, FR-16, FR-24. BR: BR-16, BR-25.

Trigger: Chọn Đăng ký.

Tiền điều kiện: Chưa đăng nhập.

Luồng chính:

1. Nhập display name, email, password và chấp nhận Terms theo OD-08.

2. Hệ thống kiểm tra dữ liệu và tạo User với email chưa xác minh.

3. Tạo yêu cầu email xác minh; hướng dẫn bước xác minh và đăng nhập.

Luồng thay thế và ngoại lệ:

- Email trùng hoặc dữ liệu sai: không tạo tài khoản trùng, báo lỗi phù hợp.

- Email provider lỗi: tài khoản vẫn tồn tại; cho phép gửi lại có giới hạn.

Hậu điều kiện: User tồn tại duy nhất; chưa tự có membership.

Tiêu chí nghiệm thu: AC-01: email hợp lệ chưa dùng tạo đúng một User; password không xuất hiện trong response; retry không tạo trùng.

### UC-02 Đăng nhập

Actor: Visitor.

FR: FR-02. BR: BR-21.

Trigger: Gửi form đăng nhập.

Tiền điều kiện: Có tài khoản.

Luồng chính:

1. Nhập email và password.

2. Hệ thống xác thực, tạo phiên.

3. Tiếp tục invitation nếu có; nếu không tới Personal Home hoặc Welcome.

Luồng thay thế và ngoại lệ:

- Thông tin sai: không tạo phiên, hiển thị lỗi chung.

- Chưa xác minh: xử lý quyền hạn theo OD-07; có hướng dẫn xác minh.

Hậu điều kiện: Phiên hợp lệ, không tự cấp quyền Workspace.

Tiêu chí nghiệm thu: AC-02: credential đúng đăng nhập được; sai không truy cập được tài nguyên cần phiên; invitation intent được giữ.

### UC-03 Đăng xuất

Actor: Authenticated User.

FR: FR-02. BR: BR-21.

Trigger: Chọn Đăng xuất.

Tiền điều kiện: Có phiên hiện tại.

Luồng chính:

1. Yêu cầu kết thúc phiên.

2. Hệ thống vô hiệu phiên hiện tại và xóa trạng thái đăng nhập phía client.

3. Điều hướng tới màn hình công khai.

Luồng thay thế và ngoại lệ:

- Phiên đã hết hạn: vẫn đưa về trạng thái chưa đăng nhập.

Hậu điều kiện: Phiên vừa đăng xuất không tiếp tục dùng được.

Tiêu chí nghiệm thu: AC-03: dùng lại credential của phiên vừa kết thúc không đọc được API bảo vệ; phạm vi là phiên hiện tại.

### UC-04 Xem các Workspace đang tham gia

Actor: Authenticated User.

FR: FR-03. BR: BR-02, BR-12.

Trigger: Mở Personal Home.

Tiền điều kiện: Đã đăng nhập.

Luồng chính:

1. Hệ thống tải Workspace có membership hiện tại.

2. Hiển thị tên và vai trò của User.

3. User chọn Workspace để mở.

Luồng thay thế và ngoại lệ:

- Không có Workspace: hiển thị Welcome.

- Membership mất sau khi tải: mở Workspace bị từ chối và cập nhật danh sách.

Hậu điều kiện: Không đổi dữ liệu.

Tiêu chí nghiệm thu: AC-04: chỉ Workspace đang tham gia xuất hiện; rời nhóm làm Workspace biến mất khi tải lại.

### UC-05 Tạo Workspace

Actor: Authenticated User.

FR: FR-03. BR: BR-01, BR-02.

Trigger: Chọn Tạo Workspace.

Tiền điều kiện: Đăng nhập, xác minh email theo OD-07.

Luồng chính:

1. Nhập name và description.

2. Hệ thống kiểm tra, tạo Workspace cùng membership Owner của người tạo một cách nhất quán.

3. Mở Workspace vừa tạo.

Luồng thay thế và ngoại lệ:

- Dữ liệu sai: yêu cầu sửa.

- Tạo membership thất bại: không để Workspace mồ côi.

Hậu điều kiện: Workspace có đúng một Owner.

Tiêu chí nghiệm thu: AC-05: tạo thành công có Workspace và Owner; failure giữa hai thao tác không tạo trạng thái thiếu Owner. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-06 Chỉnh sửa Workspace

Actor: Owner.

FR: FR-04. BR: BR-04, BR-26.

Trigger: Lưu Workspace Settings.

Tiền điều kiện: Owner hiện tại.

Luồng chính:

1. Xem dữ liệu hiện tại.

2. Sửa name/description và gửi lưu.

3. Hệ thống kiểm tra quyền hiện tại, validation và cập nhật.

Luồng thay thế và ngoại lệ:

- Ownership đã chuyển: từ chối.

- Bản cũ bị thay đổi: xử lý conflict theo OD-06.

Hậu điều kiện: Workspace được cập nhật hợp lệ.

Tiêu chí nghiệm thu: AC-06: Owner sửa được name; Member gọi cùng thao tác bị từ chối. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-07 Xem thành viên Workspace

Actor: Workspace Member.

FR: FR-04. BR: BR-03, BR-16.

Trigger: Mở Thành viên.

Tiền điều kiện: Membership hiện tại.

Luồng chính:

1. Tải các thành viên hiện tại.

2. Hiển thị display name, avatar Google nếu đã liên kết và có ảnh hợp lệ, nếu không dùng chữ cái đầu; role theo quyền hiện tại.

Luồng thay thế và ngoại lệ:

- Đã rời nhóm: từ chối.

- Danh sách thay đổi: tải lại hiển thị dữ liệu mới.

Hậu điều kiện: Không đổi dữ liệu.

Tiêu chí nghiệm thu: AC-07: có đúng một Owner; không hiển thị password hoặc token; không công khai email mọi Member theo mặc định.

### UC-08 Quản lý lời mời

Actor: Owner.

FR: FR-05, FR-24. BR: BR-14, BR-15, BR-20.

Trigger: Tạo, xem hoặc thu hồi invitation.

Tiền điều kiện: Owner hiện tại.

Luồng chính:

1. Chọn EMAIL với email người nhận hoặc LINK.

2. Hệ thống tạo token bảo vệ, hạn 7 ngày; EMAIL đưa vào xử lý gửi, LINK hiển thị để sao chép.

3. Chỉ Owner hiện tại xem, tạo hoặc thu hồi lời mời; chuyển Owner giữ hiệu lực lời mời, Owner mới quản lý và Owner cũ mất quyền.

Luồng thay thế và ngoại lệ:

- EMAIL nhận đã là Member: thông báo đã tham gia, không tạo membership mới.

- Lỗi gửi email: invitation vẫn có trạng thái gửi phù hợp và cho thử lại.

- Thu hồi invitation đã thu hồi/hết hạn: trả trạng thái hiện tại, không phục hồi hiệu lực.

Hậu điều kiện: Invitation hợp lệ hoặc bị thu hồi; không tự tạo membership.

Tiêu chí nghiệm thu: AC-08: link mời nhiều User được; EMAIL chỉ đúng email đã xác minh; link revoked không accept được; Member không tạo/thu hồi lời mời; chuyển Owner không tự thu hồi; EMAIL tạo in-app nếu lúc gửi đã có tài khoản tương ứng, không hồi tố khi đăng ký sau và LINK không phát cho mọi User.

### UC-09 Gia nhập Workspace qua lời mời

Actor: Authenticated User.

FR: FR-06. BR: BR-02, BR-14, BR-15.

Trigger: Mở invitation và chọn Gia nhập.

Tiền điều kiện: Preview cho người có link hợp lệ; accept cần đăng nhập, xác minh, invitation còn hiệu lực và EMAIL đúng email.

Luồng chính:

1. Mở preview lời mời hợp lệ: chỉ tên Workspace, người mời, loại và hạn; không lộ email người nhận, thành viên, Project hoặc Task.

2. Nếu chưa đăng nhập, đăng nhập/đăng ký rồi quay lại invitation.

3. Hệ thống kiểm tra lại token và eligibility tại lúc accept.

4. Tạo membership Member; EMAIL đánh dấu chấp nhận; LINK còn dùng được cho người khác.

Luồng thay thế và ngoại lệ:

- Đã là Member: mở Workspace, không tạo trùng.

- Sai email/chưa xác minh: hướng dẫn dùng tài khoản phù hợp hoặc xác minh, không tiêu thụ invitation.

- Accept/revoke đồng thời: kết quả nhất quán; token đã mất hiệu lực không cho gia nhập.

Hậu điều kiện: Có membership hoặc giữ nguyên khi bị từ chối.

Tiêu chí nghiệm thu: AC-09: kiểm thử AC-X03 đến AC-X06; hai người dùng LINK đều có membership riêng.

### UC-10 Rời Workspace

Actor: Member.

FR: FR-07. BR: BR-06, BR-12, BR-13, BR-18.

Trigger: Xác nhận Rời Workspace.

Tiền điều kiện: Membership hiện tại, không giữ ownership.

Luồng chính:

1. Xem cảnh báo mất quyền và tác động tới phân công.

2. Xác nhận.

3. Hệ thống chấm dứt membership, bỏ assignee Task chưa Done ở cả Active/Archived, giữ assignee Done, xóa email override của Workspace và ngừng thông báo công việc.

4. Đưa User về Personal Home.

Luồng thay thế và ngoại lệ:

- User đã trở thành Owner: từ chối, cần chuyển ownership.

- Rời lại lần hai: không tạo tác động lặp.

- Task đang được sửa: không phục hồi assignee đã bỏ; sửa nội dung Done ở Active được giữ nguyên assignee lịch sử.

Hậu điều kiện: Mất quyền truy cập Workspace; tác giả lịch sử vẫn xác định được.

Tiêu chí nghiệm thu: AC-10: URL cũ bị từ chối; chưa Done ở Active/Archived mất assignee, Done giữ lịch sử; tái gia nhập không tự giao lại Task đã bỏ, nhãn đã rời biến mất và email override bắt đầu kế thừa.

### UC-11 Loại thành viên

Actor: Owner.

FR: FR-07. BR: BR-04, BR-12, BR-13, BR-15.

Trigger: Xác nhận Loại Member.

Tiền điều kiện: Actor là Owner, target là Member hiện tại khác actor.

Luồng chính:

1. Chọn Member; xem cảnh báo về phân công và khả năng gia nhập lại qua link.

2. Xác nhận.

3. Hệ thống kết thúc membership và xử lý Task/thông báo tương tự rời nhóm.

Luồng thay thế và ngoại lệ:

- Target đã rời hoặc role đổi: tải lại, không loại Owner.

- Target gia nhập lại bằng LINK còn hiệu lực: cho phép, không tự giao lại Task đã bỏ assignee; nhãn đã rời trên Done biến mất, email override bắt đầu kế thừa.

Hậu điều kiện: Target mất quyền hiện tại.

Tiêu chí nghiệm thu: AC-11: Member không loại người khác được; Owner không tự loại mình; loại không tự revoke toàn bộ link.

### UC-12 Chuyển ownership

Actor: Owner.

FR: FR-08. BR: BR-01, BR-05.

Trigger: Xác nhận Chuyển ownership.

Tiền điều kiện: Actor Owner, người nhận là Member hiện tại.

Luồng chính:

1. Chọn người nhận và xem thay đổi quyền.

2. Xác nhận.

3. Hệ thống kiểm tra lại membership và chuyển hai vai trò nhất quán.

4. Owner cũ thành Member; người nhận thành Owner.

Luồng thay thế và ngoại lệ:

- Người nhận vừa rời: từ chối, Owner cũ giữ quyền.

- Hai yêu cầu chuyển cùng lúc: tối đa một yêu cầu thành công theo trạng thái hiện tại.

Hậu điều kiện: Workspace vẫn có đúng một Owner.

Tiêu chí nghiệm thu: AC-12: chạy AC-X07; không có thời điểm trạng thái hoàn tất thiếu hoặc trùng Owner.

### UC-13 Xem danh sách và thông tin Project

Actor: Workspace Member.

FR: FR-09. BR: BR-03, BR-11.

Trigger: Mở Workspace hoặc Project.

Tiền điều kiện: Membership hiện tại.

Luồng chính:

1. Xem Project theo filter Active/Archived.

2. Mở Project và hiển thị thông tin cùng Board.

3. Archived có nhãn chỉ đọc.

Luồng thay thế và ngoại lệ:

- Không có Project: empty state, Owner có CTA tạo.

- Không quyền hoặc Project không tồn tại: trạng thái phù hợp không lộ dữ liệu.

Hậu điều kiện: Không đổi dữ liệu.

Tiêu chí nghiệm thu: AC-13: Member xem Archived được nhưng không có thao tác ghi hợp lệ.

### UC-14 Tạo Project

Actor: Owner.

FR: FR-09. BR: BR-04.

Trigger: Chọn Tạo Project.

Tiền điều kiện: Owner hiện tại.

Luồng chính:

1. Nhập name/description.

2. Hệ thống kiểm tra quyền và tạo Project Active thuộc Workspace.

3. Mở Project mới.

Luồng thay thế và ngoại lệ:

- Dữ liệu sai hoặc quyền đã đổi: không tạo.

Hậu điều kiện: Project thuộc đúng một Workspace.

Tiêu chí nghiệm thu: AC-14: Member bị từ chối; Owner tạo Project Active và không thêm Project Membership. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-15 Chỉnh sửa Project

Actor: Owner hoặc Project Creator còn membership (Creator chỉ sửa mô tả/mục tiêu).

FR: FR-09. BR: BR-04, BR-11, BR-26.

Trigger: Lưu thông tin Project.

Tiền điều kiện: Membership hiện tại, Project Active; Owner sửa mọi trường hợp lệ, Creator chỉ sửa description.

Luồng chính:

1. Owner xem và sửa name/icon/description; Creator còn membership chỉ sửa description (mục tiêu và mô tả dùng chung trường nội dung).

2. Backend kiểm tra quyền, status và phiên bản.

3. Lưu thông tin hợp lệ.

Luồng thay thế và ngoại lệ:

- Project Archived: yêu cầu mở lại trước.

- Bản stale hoặc ownership thay đổi: từ chối phù hợp.

Hậu điều kiện: Thông tin Project cập nhật.

Tiêu chí nghiệm thu: AC-15: Project Archived không sửa thông tin; Member không phải Owner/Creator không sửa được; Creator sau chuyển ownership vẫn sửa mô tả nhưng không sửa tên/icon/vòng đời; rời Workspace mất quyền. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-16 Archive hoặc mở lại Project

Actor: Owner.

FR: FR-09. BR: BR-04, BR-11.

Trigger: Xác nhận Archive hoặc Mở lại.

Tiền điều kiện: Owner hiện tại.

Luồng chính:

1. Xem tác động thay trạng thái.

2. Xác nhận.

3. Hệ thống đổi vòng đời Project; giữ Tasks và Comments.

4. Board chuyển chế độ chỉ đọc hoặc cộng tác tương ứng.

Luồng thay thế và ngoại lệ:

- Yêu cầu cùng trạng thái: trả trạng thái hiện tại.

- Có người đang sửa Task: kiểm tra Archived tại thời điểm ghi, không chỉ lúc mở form.

Hậu điều kiện: Dữ liệu còn nguyên, quyền ghi phụ thuộc status mới.

Tiêu chí nghiệm thu: AC-16: AC-X09; archive không xóa Task; reopen khôi phục quyền ghi cho thành viên hiện tại.

### UC-17 Tạo Task

Actor: Workspace Member.

FR: FR-10, FR-11, FR-23. BR: BR-07, BR-08, BR-11, BR-17.

Trigger: Chọn Tạo Task.

Tiền điều kiện: Membership hiện tại, Project Active.

Luồng chính:

1. Nhập title/description, assignee và deadline tùy chọn đến phút theo giờ Việt Nam; lưu deadline UTC.

2. Backend kiểm tra assignee hiện tại và dữ liệu; tạo status Todo theo OD-04.

3. Lưu Task và phát event phân công nếu có người nhận khác actor.

4. Mở Task hoặc cập nhật Board.

Luồng thay thế và ngoại lệ:

- Assignee rời/Project archive trong lúc tạo: từ chối và yêu cầu tải lại.

- Không assignee hoặc deadline: vẫn tạo được; deadline quá khứ được lưu có cảnh báo và đánh dấu overdue nếu chưa Done.

Hậu điều kiện: Task có Creator và đúng Project.

Tiêu chí nghiệm thu: AC-17: tự giao không tự báo; giao Member khác tạo một in-app và email theo setting. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-18 Xem chi tiết Task

Actor: Workspace Member.

FR: FR-10. BR: BR-03, BR-11, BR-12.

Trigger: Mở Task từ Board, My Tasks hoặc link.

Tiền điều kiện: Membership hiện tại ở Workspace của Task.

Luồng chính:

1. Backend suy ra Workspace và kiểm tra quyền.

2. Hiển thị Task, Creator, assignee, deadline và Comments có pagination.

3. Hiển thị chỉ đọc nếu Archived; nhãn assignee đã rời theo membership hiện tại; deadline giờ Việt Nam và overdue kể cả Archived, trừ Done hoặc không có deadline.

Luồng thay thế và ngoại lệ:

- Task bị xóa hoặc mất quyền: không hiển thị dữ liệu nội bộ.

Hậu điều kiện: Không đổi dữ liệu.

Tiêu chí nghiệm thu: AC-18: AC-X01; quyền không dựa trên việc User là Creator từ trước.

### UC-19 Cập nhật Task

Actor: Workspace Member.

FR: FR-10, FR-11, FR-23, FR-24, FR-25. BR: BR-07, BR-08, BR-09, BR-11, BR-13, BR-17, BR-26.

Trigger: Lưu Task hoặc đổi status.

Tiền điều kiện: Membership hiện tại, Project Active.

Luồng chính:

1. Sửa nội dung, assignee, deadline hoặc status theo quyền; status gồm Chưa làm/Đang làm/Hoàn thành cố định và cho chuyển trực tiếp giữa mọi trạng thái.

2. Backend kiểm tra membership, Project và quyền theo hành động: Owner/Creator sửa nội dung, deadline, phân công; Assignee hiện tại chỉ đổi status nếu không đồng thời là Owner/Creator; kiểm tra phiên bản, phân công mới tới thành viên hiện tại, sửa nội dung Done giữ assignee lịch sử và deadline đến phút lưu UTC.

3. Reopen Done bỏ assignee nếu không còn membership, giữ nếu đã tái gia nhập; giữ deadline cũ, tính overdue khi đã qua hạn; bỏ deadline thì hết overdue.

4. Lưu thay đổi và tạo event gộp theo recipient; cập nhật lịch reminder khi increment đó có.

Luồng thay thế và ngoại lệ:

- Không thay đổi thực tế: không tạo event mới.

- Concurrent edit/assignee rời/Project archive: từ chối ghi stale phù hợp.

- Bỏ hoặc đổi assignee: thông báo thay đổi phân công tới Creator, assignee cũ và mới còn membership; loại actor và trùng; cleanup do rời nhóm không phát hàng loạt thông báo assignment.

Hậu điều kiện: Task nhất quán và event xuất phát từ lần ghi thành công.

Tiêu chí nghiệm thu: AC-19: chạy AC-X08/X09/X10/X17/X18; Owner/Creator sửa và đổi status, Assignee chỉ đổi status nếu không là Owner/Creator, Member khác bị từ chối; sửa nội dung Done giữ assignee lịch sử, deadline quá khứ được lưu có cảnh báo và reopen không tự đổi hạn. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-20 Xóa Task

Actor: Owner hoặc Task Creator.

FR: FR-10. BR: BR-09, BR-11.

Trigger: Xác nhận Xóa Task.

Tiền điều kiện: Actor còn membership, Project Active, actor có quyền xóa.

Luồng chính:

1. Hiển thị xác nhận và tác động tới Comments.

2. Xác nhận; backend kiểm tra lại quyền.

3. Task và Comments không còn truy cập được; notification cũ có target unavailable.

Luồng thay thế và ngoại lệ:

- Người không phải Creator/Owner: từ chối xóa, kể cả Assignee chỉ có quyền đổi status.

- Task đã xóa: trả trạng thái phù hợp, không xóa tài nguyên khác.

Hậu điều kiện: Task không còn dùng trong Board/My Tasks; retention theo OD-11.

Tiêu chí nghiệm thu: AC-20: Cancel không xóa; Confirm chỉ xóa khi đúng quyền; URL Comment thuộc Task cũng không truy cập được.

### UC-21 Theo dõi Project qua Kanban Board

Actor: Workspace Member.

FR: FR-12. BR: BR-08, BR-09, BR-11, BR-26.

Trigger: Mở Board hoặc đổi cột Task.

Tiền điều kiện: Có quyền xem Project.

Luồng chính:

1. Nhóm Tasks theo ba status cố định; search động title/description và lọc khoảng Ngày tạo/Deadline dùng chung My Tasks, trong phạm vi Project có quyền; mỗi cột thời gian tạo mới nhất trước, không sắp thủ công; sửa/status change không đổi thời gian sắp.

2. Mở Task khi chọn card.

3. Chỉ Owner/Creator/Assignee hiện tại còn membership đổi status trong Active; Member khác chỉ xem, không có quyền đổi status chỉ từ membership; thao tác hỗ trợ bàn phím và backend xử lý như UC-19.

4. Chỉ cập nhật hiển thị thành công khi backend chấp nhận.

Luồng thay thế và ngoại lệ:

- Archived: chỉ xem.

- Lưu thất bại: khôi phục card hoặc tải lại, hiển thị lý do.

- Không có Task: empty state.

Hậu điều kiện: Board phản ánh Task, không có entity Board riêng.

Tiêu chí nghiệm thu: AC-21: cùng quyền Owner/Creator/Assignee, đổi assignee thu hồi quyền riêng người cũ; ba status cố định chuyển trực tiếp/reopen; mỗi cột mới tạo trước, không sort thủ công hoặc dùng thời gian sửa; search động và khoảng Ngày tạo/Deadline cùng My Tasks, giới hạn quyền, không chỉ tìm trang đã tải; lọc cập nhật tổng số, reset pagination và giữ sort ổn định.

### UC-22 Theo dõi My Tasks

Actor: Authenticated User.

FR: FR-13. BR: BR-22, BR-23.

Trigger: Mở My Tasks.

Tiền điều kiện: Đã đăng nhập.

Luồng chính:

1. Truy vấn Tasks có assignee là User và còn quyền Workspace.

2. Kết hợp Workspace/status/overdue/vòng đời với search động title/description và khoảng Ngày tạo/Deadline; cùng quy tắc Kanban, tìm toàn tập có quyền thay vì chỉ trang đã tải; giữ mới tạo trước, Workspace → Project từng Task; mặc định Active/chưa Done đã duyệt, có filter xem Done/Archived với nhãn chỉ đọc.

3. Mở Task được chọn.

Luồng thay thế và ngoại lệ:

- Không có kết quả: empty state.

- User rời Workspace sau khi tải: mở Task bị từ chối và tải lại danh sách.

Hậu điều kiện: Không tạo bản sao Task.

Tiêu chí nghiệm thu: AC-22: không lộ Task Workspace đã rời; mới tạo trước như Kanban; search động không cần Enter, kết hợp filter/thời gian và không đổi sort; kiểm tra dấu tiếng Việt, biên ngày Việt Nam, khoảng sai, không deadline và pagination toàn tập; Done/không deadline không overdue; Archived cùng rule overdue; mặc định Active/chưa Done; filter xem Done/Archived theo OD-05 đã duyệt.

### UC-23 Thêm Comment

Actor: Workspace Member.

FR: FR-14, FR-23. BR: BR-11, BR-17.

Trigger: Gửi Comment.

Tiền điều kiện: Membership hiện tại, Task tồn tại, Project Active.

Luồng chính:

1. Nhập content.

2. Backend kiểm tra dữ liệu và quyền; lưu với Author hiện tại.

3. Tạo event tới Creator/Assignee hợp lệ, loại actor và trùng.

4. Hiển thị Comment đã lưu.

Luồng thay thế và ngoại lệ:

- Chỉ khoảng trắng: không lưu.

- Task bị xóa/Project archive: từ chối.

- Email lỗi không làm mất Comment.

Hậu điều kiện: Comment thuộc đúng Task và Author.

Tiêu chí nghiệm thu: AC-23: AC-X11/X12; không có event khi validation thất bại. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-24 Chỉnh sửa hoặc xóa Comment của mình

Actor: Comment Author.

FR: FR-14. BR: BR-10, BR-11, BR-26.

Trigger: Lưu sửa hoặc xác nhận xóa Comment.

Tiền điều kiện: Author còn membership, Project Active.

Luồng chính:

1. Chọn Comment của mình.

2. Sửa content hợp lệ hoặc xác nhận xóa.

3. Backend kiểm tra author, quyền và cập nhật/xóa.

Luồng thay thế và ngoại lệ:

- Owner không phải Author: từ chối.

- Comment đã xóa hoặc bản stale: trả trạng thái phù hợp.

Hậu điều kiện: Comment được sửa hoặc không còn hiển thị.

Tiêu chí nghiệm thu: AC-24: chỉ Author còn membership sửa/xóa Comment trong Active; Task Creator/Assignee/Owner không sửa/xóa Comment của Author khác; Cancel không xóa. Mô tả hoặc Comment dùng editor chung; lưu/tải lại giữ định dạng, hyperlink, emoji và nội dung Việt/Anh; quyền ghi giữ nguyên.

### UC-25 Xem giới thiệu sản phẩm

Actor: Visitor.

FR: FR-15. BR: Không có BR riêng.

Trigger: Mở trang công khai.

Tiền điều kiện: Không yêu cầu phiên.

Luồng chính:

1. Đọc giá trị và tính năng sản phẩm.

2. Chọn Đăng ký, Đăng nhập hoặc Policies.

Luồng thay thế và ngoại lệ:

- Đã đăng nhập: có lối vào ứng dụng.

Hậu điều kiện: Không đổi dữ liệu.

Tiêu chí nghiệm thu: AC-25: landing dùng được không cần auth và CTA tới đúng luồng; không hiển thị Workspace riêng tư.

### UC-26 Đọc chính sách ứng dụng

Actor: Visitor hoặc Authenticated User.

FR: FR-16. BR: Không có BR riêng.

Trigger: Mở Terms hoặc Privacy.

Tiền điều kiện: Không yêu cầu phiên.

Luồng chính:

1. Hiển thị nội dung, phiên bản/ngày hiệu lực và cách liên hệ.

2. User đọc rồi quay về đăng ký hoặc ứng dụng.

Luồng thay thế và ngoại lệ:

- Nội dung chưa được chuẩn bị: là blocker phát hành public, không dùng trang trắng để nghiệm thu.

Hậu điều kiện: Không đổi acceptance chỉ vì xem.

Tiêu chí nghiệm thu: AC-26: hai policy truy cập công khai; nội dung phản ánh chức năng/dữ liệu thật trước release.

### UC-27 Bắt đầu sử dụng sau đăng nhập

Actor: Authenticated User.

FR: FR-17. BR: BR-02.

Trigger: Đăng nhập hoặc mở trang ứng dụng.

Tiền điều kiện: Có phiên.

Luồng chính:

1. Ưu tiên invitation intent còn phù hợp.

2. Không có Workspace: Welcome với tạo Workspace và hướng dẫn join.

3. Có Workspace: Personal Home và My Tasks.

Luồng thay thế và ngoại lệ:

- Chưa xác minh: hiển thị yêu cầu theo OD-07.

- Invitation hết hạn: báo rõ, có lối về Home.

Hậu điều kiện: User có hướng tiếp tục hợp lệ.

Tiêu chí nghiệm thu: AC-27: không bị ép tạo Workspace khi đang join invitation; zero-workspace state có hành động rõ.

### UC-28 Xem và chỉnh sửa Profile

Actor: Authenticated User.

FR: FR-18. BR: BR-16.

Trigger: Mở Profile hoặc lưu display name.

Tiền điều kiện: Đăng nhập.

Luồng chính:

1. Xem thông tin bản thân, email chỉ đọc; avatar lấy từ Google profile đã xác thực nếu có, fallback chữ cái đầu.

2. Sửa display name hợp lệ.

3. Cập nhật tên chung trong mọi Workspace và danh tính liên quan.

Luồng thay thế và ngoại lệ:

- Tên sai/blank: không lưu.

- Không có chức năng upload trong bản đầu.

Hậu điều kiện: User ID không đổi, không phát sinh nickname.

Tiêu chí nghiệm thu: AC-28: AC-X20; không sửa Profile người khác; ảnh Google thiếu/lỗi dùng chữ cái, không lấy ảnh chỉ từ email; đổi display name không ghi đè Google identity.

### UC-29 Đổi password

Actor: Authenticated User.

FR: FR-19. BR: BR-21.

Trigger: Gửi form Đổi password.

Tiền điều kiện: Có phiên.

Luồng chính:

1. Nhập password hiện tại và password mới.

2. Backend xác thực password hiện tại và validation.

3. Đổi thông tin xác thực; xử lý phiên theo OD-07.

Luồng thay thế và ngoại lệ:

- Password hiện tại sai: không đổi.

- Phiên hết hạn: yêu cầu đăng nhập.

- Google-only chưa có local password: không cung cấp đổi password hiện tại; hướng dẫn đăng nhập Google, thiết lập password cần luồng riêng chưa chốt.

Hậu điều kiện: Password mới dùng được; password cũ không còn dùng được.

Tiêu chí nghiệm thu: AC-29: nhập password cũ sai không thay credential; secret không xuất hiện trong log/response.

### UC-30 Khôi phục password

Actor: Visitor.

FR: FR-20, FR-24. BR: BR-21, BR-25.

Trigger: Chọn Quên password.

Tiền điều kiện: Không cần phiên.

Luồng chính:

1. Nhập email; phản hồi chung dù email có tồn tại hay không.

2. Nếu phù hợp, tạo recovery token có hạn và gửi email.

3. Mở link, nhập password mới; kiểm tra token tại lần ghi.

4. Đổi password, tiêu thụ token và xử lý phiên theo OD-07.

Luồng thay thế và ngoại lệ:

- Token hết hạn/đã dùng: không đổi, cho bắt đầu lại.

- Yêu cầu liên tiếp: rate limit và token cũ xử lý theo OD-13.

- Email lỗi: không tiết lộ danh tính và cho thử lại theo giới hạn.

- Google-only chưa có local password: không âm thầm tạo local credential qua recovery; phản hồi công khai không tiết lộ phương thức/tồn tại tài khoản.

Hậu điều kiện: Chỉ token hợp lệ đổi được credential.

Tiêu chí nghiệm thu: AC-30: AC-X16; hai lần dùng token không tạo hai lần đổi thành công.

### UC-31 Xác minh email

Actor: Chủ tài khoản chưa xác minh.

FR: FR-20, FR-24. BR: BR-25.

Trigger: Mở link xác minh hoặc chọn Gửi lại.

Tiền điều kiện: Có tài khoản; token phù hợp khi xác minh.

Luồng chính:

1. Gửi lại email nếu cần với rate limit.

2. Mở token; backend kiểm tra purpose, hạn và trạng thái dùng.

3. Đánh dấu emailVerified và tiêu thụ token.

Luồng thay thế và ngoại lệ:

- Token hết hạn/đã dùng: hiển thị trạng thái và lối gửi lại.

- Tài khoản đã xác minh: không tạo trạng thái đảo ngược.

Hậu điều kiện: Email xác minh cho đúng User.

Tiêu chí nghiệm thu: AC-31: token recovery không xác minh được; invitation yêu cầu verified không bypass được.

### UC-32 Xem và xử lý In-app Notifications

Actor: Authenticated User.

FR: FR-21, FR-23, FR-25. BR: BR-17, BR-18, BR-24.

Trigger: Mở Notifications, đọc hoặc mở target.

Tiền điều kiện: Có phiên, là recipient.

Luồng chính:

1. Tải danh sách có pagination và số chưa đọc.

2. Đánh dấu từng mục hoặc tất cả đã đọc; không đánh dấu thông báo mới ngoài phạm vi lần xử lý.

3. Mở target; kiểm tra quyền hiện tại trước khi tải nội dung.

Luồng thay thế và ngoại lệ:

- Target xóa hoặc mất quyền: unavailable, danh sách và chi tiết notification che nội dung cũ bằng thông báo chung; giữ thời điểm/read state, không lộ title/comment/Workspace name hoặc link target.

- Không thông báo: empty state.

- Tắt email vẫn không tắt in-app.

Hậu điều kiện: Read state của chính User được lưu.

Tiêu chí nghiệm thu: AC-32: không đọc/mark thông báo User khác; AC-X14/X15; đọc lại không làm tăng số chưa đọc; target xóa/mất quyền được che nội dung ngay trong danh sách, số chưa đọc tính trên các mục trả về.

### UC-33 Thiết lập tùy chọn Email Notifications

Actor: Authenticated User.

FR: FR-22, FR-24, FR-25. BR: BR-19, BR-17.

Trigger: Lưu Settings Notifications Email.

Tiền điều kiện: Đăng nhập.

Luồng chính:

1. Xem setting chung theo loại sự kiện và override Workspace đang tham gia; mặc định chung bật assignment, tắt comment/content/status.

2. Thay setting chung Bật/Tắt hoặc override từng loại Theo setting chung/Bật/Tắt; override ưu tiên; reset một loại/cả Workspace trở về kế thừa.

3. Kiểm tra membership khi lưu override của bản thân; đổi setting chung chỉ ảnh hưởng loại đang kế thừa; xử lý sự kiện theo setting hiệu lực, xóa override khi rời và tái gia nhập bắt đầu kế thừa.

Luồng thay thế và ngoại lệ:

- Không lưu được: không giả hiển thị đã thành công.

- Chức năng reminder chưa có: không có checkbox hoạt động giả.

- Email đang gửi trước lúc đổi setting có thể đã được gửi; không cam kết thu hồi email.

Hậu điều kiện: Setting lưu theo User, có override theo Workspace; không ảnh hưởng người khác.

Tiêu chí nghiệm thu: AC-33: kiểm tra override ưu tiên, đổi chung không ghi đè override, reset kế thừa và rời/tái gia nhập xóa override; không sửa setting người khác/Workspace đã rời; auth/invitation và in-app giữ luồng riêng; email queued kiểm tra quyền/setting trước mỗi lần thử gửi; mất membership hoặc Task bị xóa thì bỏ email công việc; email đã bàn giao cho dịch vụ gửi không thể thu hồi.

### UC-34 Đăng nhập hoặc liên kết tài khoản Google

Actor: Visitor hoặc Authenticated User.

FR: FR-02, FR-16, FR-18, FR-28. BR: BR-16, BR-21.

Trigger: Chọn Đăng nhập Google hoặc liên kết Google.

Tiền điều kiện: Google credential từ flow hợp lệ; liên kết cần chứng minh tài khoản hiện tại.

Luồng chính:

1. FE bắt đầu Google sign-in, giữ invitation intent và anti-replay context.

2. BE kiểm credential Google, chữ ký, issuer, audience, expiry và anti-replay; dùng provider/sub làm định danh.

3. Identity đã liên kết thì tìm User; User mới hoàn tất Terms acceptance trước tạo tài khoản; email trùng tài khoản chưa liên kết yêu cầu chứng minh tài khoản đó, không auto-merge.

4. Ghi identity/avatar URL nếu có, fallback chữ cái; email chỉ được verified theo Google authority hoặc app verification phù hợp.

5. Tạo phiên ứng dụng, kiểm verified gate và tiếp tục invitation/Home; không dùng Google token thay quyền Workspace.

Luồng thay thế và ngoại lệ:

- Google bị hủy/token sai/hết hạn/replay: không tạo phiên hoặc membership.

- Google picture thiếu/lỗi: vẫn đăng nhập với avatar chữ cái.

- Email bên thứ ba chưa đủ bằng chứng verified: yêu cầu app verification trước create/join Workspace.

- Trùng email hoặc Google sub đã thuộc User khác: không liên kết tự động, không tạo tài khoản trùng.

Hậu điều kiện: User và Google identity nhất quán, phiên ứng dụng theo auth design, không tự cấp Workspace access.

Tiêu chí nghiệm thu: AC-34: Google login ngay bản đầu; token sai audience/issuer/expiry hoặc replay bị từ chối; identity unique theo provider/sub; không auto-link theo email; Terms/verified/invitation gate không bypass; avatar fallback; Google-only không cần passwordHash và recovery không tự tạo password.

### UC-35 Xem và quản lý thông báo chung có ghim của Workspace

Actor: Workspace Member để xem, Workspace Owner để quản lý.

FR: FR-29. BR: BR-04, BR-12, BR-26.

Trigger: Mở thông báo Workspace hoặc tạo/sửa/xóa/ghim/bỏ ghim.

Tiền điều kiện: Membership hiện tại; thao tác ghi cần Owner hiện tại.

Luồng chính:

1. Member xem bài ghim tại Workspace overview và danh sách thông báo chung theo quyền.

2. Owner nhập title/content bằng editor chung, hoặc sửa/xóa/ghim/bỏ ghim bài hiện có.

3. BE kiểm quyền Owner hiện tại, validation và phiên bản; pin count theo giới hạn sẽ chốt, không âm thầm ghi đè stale.

4. Lưu và cập nhật danh sách/khối bài ghim; chuyển Owner giữ bài/ghim, Owner mới quản lý.

Luồng thay thế và ngoại lệ:

- Member gửi thao tác quản lý: từ chối dù tự sửa UI.

- Mất membership/ownership hoặc bài đã xóa: không tiếp tục thao tác.

- Bản cũ thay đổi: conflict và giữ nội dung đang nhập.

- Số bài ghim/giới hạn content và phase phát hành còn cần review; không tự gửi email/broadcast từ thao tác pin.

Hậu điều kiện: Thông báo chung/ghim nhất quán; không biến thành pin cá nhân trong Notifications.

Tiêu chí nghiệm thu: AC-35: Member chỉ xem, Owner đăng/sửa/xóa/ghim/bỏ ghim; Owner mới quản lý bài Owner cũ; mất quyền không xem/ghi; pin/unpin cạnh tranh có kiểm tra; nội dung Việt/Anh không tự dịch; quota và event fanout vẫn chờ quyết định.

## 9 Tiêu chí nghiệm thu xuyên chức năng

| ID | Tình huống và kết quả cần kiểm chứng |
|---|---|
| AC-X01 | User A không thuộc Workspace B truy cập Task B bằng URL/API: bị từ chối và không lộ nội dung |
| AC-X02 | Member gọi API sửa Workspace/tạo Project: bị từ chối dù tự sửa giao diện |
| AC-X03 | Một User nhận cùng invitation hai lần: vẫn chỉ có một membership hiện tại |
| AC-X04 | Nhiều User dùng cùng link hợp lệ: mỗi User có membership riêng, role Member |
| AC-X05 | Email invitation và email tài khoản không trùng: không gia nhập, không tiêu thụ lời mời |
| AC-X06 | Accept và revoke đồng thời: chỉ một kết quả nhất quán; không gia nhập bằng invitation đã thu hồi trước khi accept hoàn tất |
| AC-X07 | Transfer ownership và người nhận rời nhóm đồng thời: không để Workspace mất Owner hoặc có hai Owner |
| AC-X08 | Assignee rời nhóm trong lúc người khác lưu: không tạo phân công mới hoặc phục hồi assignee đã bị bỏ; cleanup Task chưa Done ở cả Active/Archived không cấp quyền ghi thủ công vào Archived |
| AC-X09 | Project archive trong lúc sửa Task: lần lưu sau archive bị từ chối |
| AC-X10 | Task Done có assignee đã rời được mở lại: bỏ assignee; sửa nội dung Done ở Active giữ người cũ; tái gia nhập bỏ nhãn đã rời, không tự phục hồi phân công chưa Done và reopen giữ assignee còn membership |
| AC-X11 | Author đồng thời là Creator và Assignee: Comment mới của họ không tự gửi thông báo cho họ |
| AC-X12 | Một người vừa Creator vừa Assignee nhận Comment của người khác: một in-app, không bị trùng |
| AC-X13 | Email provider lỗi: Task vẫn lưu, email có trạng thái xử lý lại; retry cùng event không gửi lặp |
| AC-X14 | Email theo override từng loại ưu tiên setting chung; đổi chung không ghi đè override; reset trở về kế thừa; rời/tái gia nhập không phục hồi override cũ; tắt email không tắt in-app hoặc verification/recovery/invitation |
| AC-X15 | User rời Workspace: notification cũ che nội dung ở danh sách/chi tiết, không mở target; không nhận event công việc mới hoặc email queued; read/unread và thời điểm được giữ |
| AC-X16 | Token reset đã dùng hoặc hết hạn: không đổi password; phiên đăng nhập xử lý theo OD-07 |
| AC-X17 | Hai người sửa cùng Task: theo đề xuất BR-26, người lưu bản stale được báo tải lại thay vì âm thầm ghi đè |
| AC-X18 | Overdue bản đầu: nhập đến phút, lưu UTC/hiển thị giờ Việt Nam; kiểm tra trước/bằng/sau dueAt; không deadline/Done không overdue, Archived vẫn tính, past-due được lưu có cảnh báo, bỏ deadline hết overdue và reopen giữ hạn cũ |
| AC-X19 | Task đã Done hoặc Project Archived: không tạo reminder; deadline đổi thì lịch cũ không còn gửi |
| AC-X20 | User chỉ thay display name: Creator, Assignee và Author vẫn là cùng User ID |

AC-X18 kiểm tra deadline/overdue của bản đầu, đã duyệt OD-03. AC-X19 thuộc increment Nhắc hạn; không tuyên bố đã kiểm thử khi chưa có code nghiệp vụ.

## 10 Dữ liệu nghiệp vụ conceptual

| Đối tượng | Nội dung tối thiểu | Quan hệ |
|---|---|---|
| User | ID, display name, email, thông tin xác thực, emailVerified, thời gian tạo | Có nhiều memberships; tên chung |
| Workspace | ID, name, description, thời gian tạo/cập nhật | Có memberships, invitations, projects |
| WorkspaceMembership | Workspace, User, role, thời gian gia nhập | User và Workspace quan hệ N-N |
| WorkspaceInvitation | Workspace, creator, EMAIL/LINK, email nhận nếu EMAIL, hạn/thu hồi/chấp nhận | Một Workspace có nhiều invitations |
| Project | Workspace, name, description, Active/Archived, creator, timestamps | Một Project thuộc một Workspace |
| Task | Project, title, description, status, assignee tùy chọn, deadline tùy chọn, creator, timestamps | Một Task thuộc một Project |
| TaskComment | Task, author, content, timestamps | Một Task có nhiều Comments |
| Notification | Recipient, loại event, tham chiếu ngữ cảnh, createdAt/readAt | Một User có nhiều Notifications |
| Email preferences | User, giá trị chung từng event; override Workspace từng event Theo setting chung/Bật/Tắt; reset kế thừa, xóa override khi rời | Quy tắc đã duyệt OD-02; vị trí lưu thuộc SDS |
| Verification và Recovery | Token bảo vệ, mục đích, hạn, thời điểm dùng | Cơ chế lưu và index thuộc SDS |
| Terms acceptance | User, phiên bản Terms, thời điểm chấp nhận nếu duyệt | Quyết định OD-08 |

Kanban là cách nhóm Task theo status. My Tasks là truy vấn, không sao chép Task thành collection riêng. Chưa chốt embed/reference, index, session collection, transaction và nơi lưu Owner. Không tạo schema vật lý trước khi giải quyết các quyết định liên quan.

## 11 Yêu cầu phi chức năng và giới hạn đề xuất

Tất cả con số dưới đây là mục tiêu để duyệt và kiểm thử, không phải hiệu năng đã đạt.

| ID | Yêu cầu và cách kiểm chứng | Trạng thái |
|---|---|---|
| NFR-01 | Backend kiểm tra membership và role trên mọi read/write có Workspace context; chạy AC-X01/X02 | Dự thảo bắt buộc |
| NFR-02 | Password không lưu/ghi log dạng rõ; token/session được bảo vệ; rà soát auth trước phát hành | Dự thảo bắt buộc |
| NFR-03 | Có rate limit cho login, invitation và gửi lại email; ngưỡng cụ thể chốt trong SDS và security review | Chưa chốt ngưỡng |
| NFR-04 | Pagination cho Task, Comment, Notification, Project; đề xuất 20 mặc định, tối đa 100 | Đề xuất |
| NFR-05 | Với bộ dữ liệu 10 Workspace, 100 Project và 10.000 Task, 20 User đồng thời: API đọc p95 dưới 1 giây, ghi dưới 1,5 giây; không gồm email provider | Đề xuất; môi trường đo chốt SDS |
| NFR-06 | Event in-app hiển thị sau thao tác và lần tải tiếp theo; đề xuất dưới 5 giây ở điều kiện vận hành bình thường | Đề xuất |
| NFR-07 | Email event được đưa vào xử lý sau commit; đề xuất lần thử gửi đầu dưới 60 giây; retry/backoff không chặn request | Đề xuất; không cam kết thời gian email tới inbox |
| NFR-08 | Giao diện hoạt động ở chiều rộng 360 và 1440 px, không mất hành động; Board hẹp được cuộn ngang có chủ đích | Đề xuất |
| NFR-09 | Form có label, lỗi cụ thể, bàn phím; Board có cách đổi status không phụ thuộc kéo thả | Dự thảo |
| NFR-10 | Deadline nhập đến phút; lưu UTC, hiển thị Asia/Ho_Chi_Minh; overdue theo BR-22 thống nhất trên các màn hình, không phụ thuộc timezone máy client | Đã duyệt OD-03; chưa kiểm chứng |
| NFR-11 | Log không chứa password/token đầy đủ hoặc nội dung nhạy cảm ngoài nhu cầu; có request/event ID để truy lỗi | Dự thảo |
| NFR-12 | Có backup và thử restore trước phát hành; RPO/RTO và retention chốt theo môi trường thật | Chưa chốt mục tiêu |
| NFR-13 | Terms/Privacy phản ánh dữ liệu và dịch vụ thật; có liên hệ và thời điểm hiệu lực | Còn nội dung và người chịu trách nhiệm |

| Trường | Giới hạn đề xuất |
|---|---|
| Display name | 2–80 ký tự, trim, không dùng làm unique key |
| Workspace/Project name | 1–120 ký tự, trim |
| Description Workspace | Đề xuất mới 0–20.000 ký tự hiển thị, editor chung; chờ review |
| Task title | 1–200 ký tự |
| Task description | 0–10.000 ký tự |
| Comment | 1–5.000 ký tự, không chấp nhận chỉ khoảng trắng |
| Password | 12–128 ký tự, không trim hoặc ghi log; chính sách hoàn chỉnh duyệt OD-07 |

Giới hạn ký tự Unicode và chuẩn hóa email phải được định nghĩa thống nhất giữa client/backend trong SDS. Không tự ý loại dấu tiếng Việt. Email dùng để so sánh invitation và tài khoản theo cùng quy tắc chuẩn hóa.

## 12 Danh sách quyết định cần duyệt

Ưu tiên cập nhật 03/10/2026: chủ dự án đưa storage về Upcoming sau khi hệ thống lõi hoàn thiện. Bản đầu không triển khai Task file uploads/Workspace Documents, provider storage, quota/reservation/scan/jobs hoặc kho tài nguyên Link/File đang đề xuất. Giữ nghiên cứu làm roadmap, không yêu cầu duyệt giới hạn file/quyền Assignee upload lúc này. Google sign-in/avatar URL đã chốt vẫn ở bản đầu, không cần bucket upload avatar. Thông báo chung Owner đăng/ghim vẫn là capability đã ghi nhận; phase/quota chưa được chốt từ quyết định hoãn storage. Giới hạn mô tả Workspace là yêu cầu riêng, không hoãn theo storage.

Yêu cầu bảo mật bổ sung 03/10/2026: bắt buộc authentication và authorization trên BE, validate cả FE và BE với BE là nguồn kiểm tra cuối, giới hạn trường được phép gửi/trả và chống sửa trường nội bộ. Mọi request trực tiếp vượt qua FE vẫn phải tuân theo quyền, verified gate, Active/Archived và các validation nghiệp vụ. Credential/phiên bị thu hồi không dùng lại được theo lifecycle đã chốt; response/log không lộ secret/hash/token hoặc dữ liệu mất quyền. HTTPS, chống CSRF khi dùng cookie, xử lý rich text có kiểm soát, rate limit và kiểm thử bypass/quyền/revocation là đầu vào bắt buộc trước phát hành. JWT/session là lựa chọn kỹ thuật cần thiết kế, không tự xem việc nhắc JWT là phê duyệt cơ chế JWT. Xem docs/sds/SECURITY-DESIGN-v0.1.md cho draft, lựa chọn còn mở và tình huống nghiệm thu bổ sung.

Cập nhật editor 03/10/2026: chủ dự án duyệt dùng chung editor cho mô tả Task, Comment và mô tả Workspace/Project để đồng bộ. Cùng bộ định dạng/cấu trúc nội dung; Comment có toolbar gọn hơn, không dùng một cơ chế lưu/validation khác. Tên/tiêu đề đối tượng vẫn một dòng. Các chi tiết counting, format allowlist và lựa chọn library tại CONTENT-EDITOR-v0.1.md cần cụ thể hóa ở SDS; không suy thành duyệt toàn bộ NFR/giới hạn nhóm 6.

Bổ sung 03/10/2026 theo chủ dự án: nhập nội dung cần hỗ trợ hyperlink, emoji, tiếng Việt có dấu, bộ đếm chữ/ký tự, thanh định dạng và kiểu Title/Subtitle/Body. Yêu cầu năng lực đã ghi nhận; phạm vi editor theo trường, bộ định dạng cụ thể và cách đếm là đề xuất tại docs/ui-ux/CONTENT-EDITOR-v0.1.md. Đây là bổ sung cho nội dung Task/Comment và giới hạn NFR, chưa tự phê duyệt toàn bộ nhóm 6 hoặc thêm upload/shape hình vẽ. Cần cập nhật UC/AC chi tiết sau khi chốt phạm vi editor.

| ID | Vấn đề | Phương án đề xuất | Ảnh hưởng |
|---|---|---|---|
| OD-01 | Assignee khi rời nhóm | Đã duyệt 01/10/2026: BR-13 và mục 5.1; cleanup cả Archived; sửa nội dung Done giữ lịch sử; tái gia nhập không tự phục hồi phân công, nhãn theo membership hiện tại | Membership, Task, concurrency |
| OD-02 | Phạm vi email setting | Đã duyệt 01/10/2026: chung + override từng event ở Personal Settings; Theo setting chung/Bật/Tắt, reset kế thừa; default assignment bật, loại khác tắt; rời xóa override, tái gia nhập kế thừa. Email đang xếp hàng review ở notification pipeline | Preferences và notification routing |
| OD-03 | Deadline | Đã duyệt 01/10/2026: nhập đến phút, lưu UTC/hiển thị giờ Việt Nam; now > dueAt và chưa Done; past-due cho lưu có cảnh báo; Archived vẫn overdue, không reminder; bỏ deadline/reopen theo mục 5.1 | Form, overdue; reminder riêng OD-10 |
| OD-04 | Status và Board | Đã duyệt 01/10/2026: ba trạng thái cố định Chưa làm/Đang làm/Hoàn thành, chuyển trực tiếp giữa mọi trạng thái theo quyền; mỗi cột thời gian tạo mới nhất trước, không sắp thủ công; sửa/chuyển status không đổi thời gian dùng để sắp. Tải thêm/pagination review riêng | Task, Kanban |
| OD-05 | My Tasks | Đã duyệt thứ tự 01/10/2026: thời gian tạo mới nhất trước giống Kanban, không ưu tiên deadline riêng. Chủ dự án giao assistant xem xét bố cục: chọn danh sách có ngữ cảnh Workspace → Project. Eligibility/filter/default còn là baseline đề xuất: Assigned to me, Active/chưa Done, có xem Archived qua filter | Query, điều hướng, bố cục |
| OD-06 | Đồng thời chỉnh sửa | Kiểm tra phiên bản và trả conflict; không âm thầm last-write-wins | API, UI |
| OD-07 | Auth và bảo mật | Chưa xác minh vẫn đăng nhập/đọc Settings, phải xác minh để tạo/join Workspace; reset password thu hồi các phiên cũ; đổi password giữ phiên hiện tại và thu hồi phiên khác | Session, token, first-use |
| OD-08 | Terms và lifecycle tài khoản | Checkbox chấp nhận Terms khi đăng ký, lưu phiên bản/time; đổi email và xóa tài khoản ngoài bản đầu nhưng cần hoàn thiện retention trước public release | Policy, User |
| OD-09 | Gộp event | In-app một mục mỗi recipient/lần lưu; email chỉ chứa event type đã bật trong cùng lần lưu | Event model, setting |
| OD-10 | Reminder | Nhắc trước 24 giờ một lần; sát hạn thì nhắc ở lần xử lý đầu trước dueAt; không bắn lại chỉ vì toggle setting; đổi dueAt tạo lịch mới | Increment Nhắc hạn |
| OD-11 | Xóa Task | User không còn truy cập Task/Comment sau xóa; notification tồn tại nhưng target unavailable; hard/soft delete và retention chốt SDS | TaskComment, Notification |
| OD-12 | NFR và giới hạn | Duyệt mục tiêu mục 11 hoặc thay số theo quy mô thực tế | Nghiệm thu và validation |
| OD-13 | Thời hạn token auth | Verification 24 giờ, recovery 30 phút; gửi lại vô hiệu token cũ cùng mục đích | Auth và email |
| OD-14 | Thông tin invitation trước gia nhập | Chỉ hiển thị tên Workspace, người mời, loại và hạn; không lộ danh sách thành viên hoặc Task | Deep link và privacy |

OD-10 phải làm rõ liệu thay assignee/deadline sát nhau có tạo nhắc mới; key chống trùng đề xuất Task + dueAt + recipient. FR-26/FR-27 cần phụ lục UC và AC trước khi code increment tương ứng.

## 13 Kế hoạch nghiệm thu và thông qua

Ngày 01/10/2026, chủ dự án duyệt nhóm 1–2 và phương án nhóm 3 tại REVIEW-REMAINING-BUSINESS.md. My Tasks chỉ assigned-to-me trong Workspace còn tham gia, mặc định Active/chưa Done, cho lọc Done/Archived. Member tạo Task/thêm Comment trong Active; chỉ Owner quản lý Workspace/Project/membership và gửi/thu hồi lời mời. Workspace có đúng một Owner, chuyển cho Member hiện tại trước khi rời. Sửa stale Workspace/Project/Task/Comment và status bị từ chối; giữ nội dung chưa lưu trong giao diện đang mở để sao chép rồi tải bản mới. Các tham chiếu OD-05/06 trong UC giờ trỏ tới quyết định đã duyệt; không còn là yêu cầu chờ review mặc định/conflict.

Nhóm 3 đã duyệt: chưa verified chỉ đăng nhập/Profile/Personal Settings/gửi lại xác minh, phải verified để create/join Workspace và dùng nghiệp vụ Workspace. Password 12–128 ký tự, không trim, không ép mẫu chữ hoa/số/ký hiệu; đổi cần password hiện tại, giữ phiên hiện tại và thu hồi phiên khác; reset thu hồi mọi phiên cũ và đăng nhập lại. Verification 24h, recovery 30 phút, dùng một lần và resend vô hiệu token cũ cùng mục đích. Terms acceptance lưu version/time khi đăng ký; đổi email/xóa tài khoản ngoài bản đầu. OD-08 vẫn mở về retention và nội dung Policies trước phát hành. Nhóm 4–5 và NFR/giới hạn nhóm 6 chưa được duyệt.

### 13.1 Checklist review

- [ ] Thống nhất phạm vi bản đầu và các increment, xác nhận loại email tổng hợp hằng ngày.
- [x] Duyệt quyền nền mục 4; BR-13, cleanup Archived và tái gia nhập đã duyệt.
- [x] Duyệt OD-02 về phạm vi email preferences: chung toàn tài khoản và override Workspace ngay bản đầu.
- [x] Duyệt chi tiết email override/kế thừa/reset và deadline/overdue OD-01/02/03.
- [x] Duyệt status/chuyển trực tiếp và thứ tự Kanban OD-04.
- [x] Duyệt My Tasks và concurrency OD-05/06; pagination và tải thêm review riêng nhóm 6.
- [ ] Duyệt auth, Terms, giới hạn và việc cung cấp Policies trước public release.
- [ ] Kiểm tra 35 UC và AC-X01 đến AC-X20; bổ sung tình huống còn thiếu.
- [ ] Lập baseline v1.0: người duyệt, ngày, các quyết định được duyệt và các mục hoãn.

### 13.2 Điều kiện bản đầu đạt nghiệm thu

FR-01 đến FR-24 chạy end-to-end theo quyền; UC-01 đến UC-33 đạt tiêu chí được duyệt; kiểm tra concurrency/security có code thật; không còn blocker ở decision register; có nội dung Policies phù hợp; kiểm tra NFR ở môi trường đã ghi nhận. Những mục thuộc increment sau chưa cần đạt nhưng phải có roadmap và tiêu chí rõ trước khi bắt đầu.

### 13.3 Chuyển sang SDS

SDS tiếp theo cần architecture, boundaries module, auth/session, MongoDB schema và index, API contracts, error responses, event/email pipeline, concurrency và transaction strategy, frontend route/UI flows, test strategy, triển khai và backup. Nền tảng file được chuẩn bị bằng ranh giới adapter trong thiết kế; chưa triển khai storage provider hoặc upload trước đặc tả nghiệp vụ.

## 14 Lịch sử phiên bản và nguồn quyết định

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 0.2 | 01/10/2026 | Bản xuất đầu tiên trong Work: tổng hợp core, 33 UC, supporting pages/auth, hai invitation types, in-app luôn có, settings email và roadmap storage/reminder |
| 0.2 review local | 01/10/2026 | Chủ dự án duyệt OD-01, phạm vi OD-02 với override ngay bản đầu, dạng ngày giờ/múi giờ Việt Nam OD-03; đồng bộ UC-10/19/33 và AC-X10. Chưa duyệt chi tiết còn mở hoặc baseline v1.0 |
| 0.2 review nhóm 01 | 01/10/2026 | Chủ dự án duyệt chi tiết assignee/Archived/tái gia nhập, email override từng event/default/reset và deadline/overdue; cập nhật UC và AC-X08/X10/X14/X18; chưa lập baseline v1.0 |
| 0.2 review quyền | 01/10/2026 | Chủ dự án làm rõ Owner/Creator/người được uỷ quyền trên Task và Author trên Comment; thay dự thảo mọi Member sửa Task; định nghĩa/phạm vi uỷ quyền còn hỏi, không tự duyệt OD-04/05/06 |
| 0.2 phạm vi uỷ quyền | 01/10/2026 | Người được uỷ quyền chỉ đổi status, không edit/delete/phân công; còn xác nhận assignee hay người thứ ba do assignee cấp quyền |
| 0.2 chốt quyền Task/Comment | 01/10/2026 | Chủ dự án xác nhận uỷ quyền chính là Assignee, không có người thứ ba; chốt Owner/Creator quản lý Task, Assignee chỉ đổi status, Comment chỉ Author sửa/xóa; đồng bộ UC-19/20/21/24 và decision register |
| 0.2 thứ tự Kanban | 01/10/2026 | Chủ dự án duyệt mới tạo trước theo thời gian tạo, không sắp thủ công; đồng bộ FR-12/UC-21/AC-21. OD-04 duyệt một phần, chưa suy rộng sang status transitions hoặc My Tasks |
| 0.2 chốt status Kanban | 01/10/2026 | Chủ dự án xác nhận ba trạng thái cố định và chuyển trực tiếp giữa chúng; đóng OD-04 về status/thứ tự, cập nhật BR-08 và UC-19/21; My Tasks, conflict và pagination còn review riêng |
| 0.2 thống nhất sort | 01/10/2026 | Chủ dự án yêu cầu Kanban/My Tasks có sort tương đồng; My Tasks dùng thời gian tạo mới nhất trước, bỏ đề xuất deadline-first. Chọn bố cục danh sách theo yêu cầu giao assistant xem xét; default/filter vẫn đánh dấu đề xuất |
| 0.2 search/thời gian | 01/10/2026 | Chủ dự án yêu cầu cả Kanban/My Tasks có search động và lọc thời gian; bổ sung FR-12/13 và UC-21/22; giữ cùng sort/membership, lưu thiết kế dùng chung và cập nhật bản mẫu |

Nguồn quyết định là nội dung trao đổi của chủ dự án được chuyển vào phiên Work này. Chưa có file SRS v0.1 trong thư mục để đối chiếu nguyên văn; vì vậy không tuyên bố đây là bản diff đầy đủ của v0.1. Khi có tài liệu trước đó, cần đối chiếu ID và cập nhật traceability. Tên Collaborative Workflow Platform là tên làm việc, chưa phải thương hiệu đã chọn.

Cập nhật 03/10/2026: chủ dự án tạm chốt nhóm 4–5 theo trao đổi: preview/accept invitation, in-app invitation, giữ lời mời khi chuyển Owner; recipients cũ/mới/Creator, event gộp, queued settings và che notification sau mất quyền/xóa Task. Xóa Task làm Comments không truy cập; chưa có thùng rác ở bản đầu. OD-09/14 và RD-04 provisionally-approved; OD-11 tạm chốt hiệu lực xóa, retention/purge còn mở. Nhóm 6/NFR, email delivery guarantee và backup vẫn cần review; chưa baseline v1.0.

Cập nhật 03/10/2026: mở rộng lên 35 UC và 29 FR với Google sign-in/avatar (ngay bản đầu) và Workspace announcements/pin (Owner capability đã chốt, phase/quota cần review). Avatar chữ cái chỉ fallback; file/resource/provider/quota và giới hạn mô tả mới là đề xuất tại docs/sds/AVATAR-STORAGE-RESOURCES-REVIEW.md. Không tạo cloud storage từ nghiên cứu này.


Bổ sung quyết định Notifications 03/10/2026: chủ dự án duyệt sau tái gia nhập Workspace, notification công việc cũ hiển thị lại theo quyền hiện tại nếu Task vẫn khả dụng. Khi không còn membership hoặc Task đã xóa, list/detail giữ time/read state nhưng che payload và link. Không thêm quyền ghi hoặc phục hồi Task/assignment/email job đã cancelled từ quyết định này.
