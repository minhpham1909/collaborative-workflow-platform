# Prompt tiếp tục dự án trong phiên làm việc local

Copy nội dung giữa START PROMPT và END PROMPT sang chat hoặc coding agent mới. Đưa kèm SRS-v0.2.md và use-cases.json; nếu agent được truy cập máy, cung cấp đường dẫn thư mục đã giải nén. Không chỉ gửi prompt rồi kỳ vọng agent mới có toàn bộ file của phiên cũ.

START PROMPT

Bạn tiếp tục dự án portfolio Collaborative Workflow Platform của tôi. Làm việc và lưu tài liệu/code trực tiếp trong thư mục local của dự án. Không sử dụng ChatGPT Library, Google Drive, cloud storage hay tạo remote GitHub nếu tôi chưa yêu cầu. Đây là yêu cầu về nơi lưu file; không tự tuyên bố dịch vụ chat/model đang chạy offline.

## Bối cảnh và mục tiêu

Tôi là fresh graduate chuyên ngành NodeJS Fullstack, quen MongoDB, dùng tiếng Việt. Tôi muốn phân tích nghiệp vụ và UI/UX chặt chẽ rồi xây sản phẩm portfolio. Trình tự là SRS → SDS → triển khai. Không tích hợp AI vào sản phẩm này ở phạm vi hiện tại.

Sản phẩm cộng tác cho nhóm nhỏ: User → Workspace → Project → Task; Kanban, My Tasks, Comments, Invitations, Notifications và các màn hình hỗ trợ. Không tự mở rộng thành Jira/Slack đầy đủ.

## Tài liệu phải đọc trước

1. docs/srs/SRS-v0.2.md: bản SRS tổng hợp để duyệt, có 33 Use Cases, quyền, FR, BR, AC, NFR, màn hình, mô hình conceptual và decision register.
2. docs/srs/use-cases.json: cùng 33 UC ở dạng dữ liệu để chỉnh và kiểm tra tham chiếu.
3. NEXT-STEPS.md: trạng thái thực tế và kế hoạch tiếp tục.

Tài liệu v0.2 CHƯA được tôi thông qua. Không coi đề xuất của assistant thành quyết định đã duyệt. ID v0.2 được tổng hợp từ hội thoại, chưa đối chiếu nguyên văn với file v0.1 vì phiên trước không có file đó.

## Quyết định đã chốt

- Một display name chung toàn ứng dụng, không có nickname theo Workspace.
- Owner/Member là role theo từng Workspace; không có Project Membership, Project Manager hay System Admin trong dự thảo core.
- Hỗ trợ EMAIL invitation và LINK chia sẻ. Hạn 7 ngày, Owner thu hồi; EMAIL đúng email tài khoản đã xác minh và một lần gia nhập; LINK cho nhiều tài khoản đã xác minh. Gia nhập chỉ thành Member, không tạo membership trùng. Loại Member không phải ban; họ có thể quay lại bằng LINK còn hiệu lực.
- In-app luôn có cho các sự kiện liên quan đã đặc tả, không có switch bật/tắt. Không gửi mọi hoạt động của Workspace tới mọi người. Loại actor, loại recipient trùng, gộp thay đổi cùng một lần lưu.
- Email settings nằm trong Personal Settings. Phạm vi toàn tài khoản hay override từng Workspace CHƯA CHỐT. Trước đó tôi từng muốn setting riêng Workspace; assistant đề xuất setting chung trước. Không tự bỏ lựa chọn Workspace.
- Thông báo theo sự kiện: assignment/reassignment, comment mới, sửa nội dung Task, đổi status. Email verification/recovery/invitation có luồng riêng khỏi switch email công việc.
- Nhắc deadline giữ trong mục tiêu hoàn thiện, làm sau notifications theo sự kiện. Bỏ email tổng hợp hằng ngày hoàn toàn. Mốc nhắc trước 24 giờ mới là đề xuất.
- Browser push làm sau; là kênh gửi khác in-app và phải tôn trọng quyền trình duyệt. Không nhầm reminder event với push channel.
- Avatar bản đầu là chữ cái đầu display name, chưa upload. Increment Communication & Documents xây storage chung cho upload avatar, Task Attachments, Workspace Documents. Các nghiệp vụ này nằm trong mục tiêu hoàn thiện sau, không cần code ngay. Direct file sending chưa có scope.
- Landing/Visitor/giới thiệu sản phẩm có thể cùng một trang; có Welcome, Personal Home, Profile, Account Settings, Terms và Privacy.

## Các quyết định cần review

Đọc toàn bộ OD-01 đến OD-14 trong SRS. Ưu tiên:

1. BR-13: Member rời thì Task chưa Done bỏ assignee; Done giữ lịch sử; reopen bỏ assignee không còn membership. Đây là đề xuất, chưa duyệt.
2. Email preferences: setting chung hay tùy chỉnh Workspace; vị trí Personal Settings đã chốt.
3. Deadline dạng ngày hay date-time, timezone, overdue và xử lý gần deadline.
4. Status cố định, My Tasks có Archived không, conflict khi nhiều người sửa.
5. Quyền của tài khoản chưa xác minh, reset/đổi password tác động session, Terms acceptance, thời hạn token, giới hạn dữ liệu và NFR.
6. Quyền xóa Task/Comment và retention. Chỉ Owner hoặc Creator xóa Task; Comment chỉ Author sửa/xóa là baseline dự thảo cần duyệt lại.

## Trạng thái thực tế của phiên trước

- Đã tạo SRS và JSON 33 UC trên ổ local.
- Chưa tạo ứng dụng, chưa có API hoặc React frontend, chưa cài dependencies, chưa kết nối MongoDB.
- Chưa init Git riêng, chưa có remote, chưa có SDS hoặc wireframe hoàn chỉnh.
- Chưa chạy test nghiệp vụ hoặc đo NFR; tiêu chí trong SRS là yêu cầu cần kiểm chứng, không phải kết quả test.
- Node v24.15.0, npm 11.12.1 và Git 2.50.1.windows.1 đã được nhận diện trong máy ở phiên trước; phiên mới cần kiểm tra lại, không coi đây là phiên bản sản phẩm đã chọn.
- Phiên trước chỉ có AGENTS.md ở root, không có bản SRS cũ trong sources. Nếu phiên mới có reference mới thì kiểm tra và đối chiếu.

## Cách làm việc và lưu local

- Ưu tiên thư mục dự án trên ổ D. Nếu chưa có đường dẫn cụ thể, hỏi tôi đúng một lần về thư mục muốn dùng; không tự ghi vào nơi không có quyền hoặc tự chọn tên người dùng.
- Nếu môi trường mới chỉ cho ghi vào C/workspace, nói rõ giới hạn đó. Đừng báo đã chuyển sang D khi chưa thực hiện.
- Mọi file sources/ đồng bộ chỉ được đọc. Không sửa, đổi tên, di chuyển hoặc xóa reference hay AGENTS.md gốc.
- Không tự upload, deploy, tạo remote hay chuyển cloud. Tôi đã chủ động yêu cầu local.
- Có thể đọc/viết file dự án đã được cho phép, tạo cấu trúc và chạy kiểm tra cần thiết mà không hỏi xác nhận cho từng việc nhỏ.
- Báo tiến độ ngắn khi làm việc; nếu thao tác lỗi, nêu lỗi cụ thể. Không để tôi chờ lâu chỉ để dò môi trường hoặc đọc toàn bộ tool registry.
- Khi sửa yêu cầu, cập nhật decision register và changelog; phân biệt đã chốt, đề xuất và deferred. Không viết code nghiệp vụ dựa trên quyết định chưa chốt.

## Việc cần làm trong lượt đầu ở chat mới

1. Xác nhận thư mục local và đọc các file bàn giao.
2. Báo mức hoàn thiện theo từng phần, không gán phần trăm tùy ý.
3. Review SRS: chỉ ra mâu thuẫn hoặc thiếu sót đáng kể và gom các quyết định cần tôi duyệt thành nhóm nhỏ.
4. Chuẩn bị cấu trúc project để lưu docs, tài nguyên và code; tôi đã yêu cầu việc này nhưng phiên trước chưa làm. Chỉ dựng skeleton trước khi SRS/SDS được chốt.
5. Đề xuất stack React/Vite + NodeJS + MongoDB để review ở SDS, không tự coi framework backend, TypeScript, auth mechanism, library versions hoặc schema là đã chốt.
6. Kết thúc bằng file local cụ thể và những quyết định cần review. Sau khi tôi duyệt, tạo baseline SRS v1.0 và SDS rồi triển khai theo từng vertical slice.

END PROMPT
