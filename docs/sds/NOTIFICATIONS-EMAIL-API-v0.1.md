# Notifications và work email — increment BE

Ngày 03/10/2026. Nối với [Work API](PROJECT-TASK-COMMENT-API-v0.1.md) và [Workspace API](WORKSPACE-INVITATIONS-API-v0.1.md). Chủ dự án đã chọn: gia nhập lại thì thông báo cũ hiển thị theo quyền hiện tại, nếu Task vẫn khả dụng. Không ghi snapshot quyền hoặc che vĩnh viễn sau lần rời.

## Inbox

| Method | Route | Input/response |
|---|---|---|
| GET | /notifications | limit/cursor, read all/unread/read, category all/work/invitation; items/total/unreadCount/nextCursor/cutoff |
| GET | /notifications/:notificationId | notification của chính người nhận |
| POST | /notifications/:notificationId/read | JSON {}; đọc một mục, idempotent |
| POST | /notifications/read-all | {cutoff} lấy từ danh sách gần nhất |
| POST | /invitations/:invitationId/accept | JSON {}; EMAIL của chính email verified, dùng từ in-app |

Bearer access, kiểm session/authVersion trong transaction; JSON/Origin/CORS theo policy chung. Inbox cho account chưa verified xem lời mời của chính họ; work target cần verified và membership hiện tại. Accept vẫn yêu cầu verified. Không nhận recipientId/field readAt từ client. read-all có HMAC với purpose riêng, bind user/category và boundary createdAt/_id; không nhận timestamp tùy ý. Chỉ mark records <= boundary; thông báo mới hơn không bị đọc nhầm. GET không tự mark read.

Sort createdAt desc/_id desc, limit 20/max 100 là guardrail kỹ thuật. total theo filter read/category; unreadCount theo category không theo trang/read filter. Cutoff theo notification mới nhất của category tại lần list, không theo trang đã limit. Record unavailable vẫn được trả nên vẫn nằm trong totals/unread; giữ ID, category, timestamp/readAt, nhưng changes=[], payload=null, target=null và code TARGET_UNAVAILABLE.

Work: kiểm Workspace, membership, Task undeleted cùng Workspace, Project cùng Workspace trước trả payload/target. Archived vẫn xem được. Rời/remove che cả title/Workspace/actor và link trong list/detail; rejoin phục hồi nếu target hợp lệ; deleted Task vẫn unavailable. Không dùng payload snapshot để quyết định quyền. Mark read vẫn cho mục unavailable vì chỉ là trạng thái inbox của người nhận.

EMAIL invitation: kiểm recipient email, type EMAIL, Workspace tồn tại, chưa revoke/accept/expire; chỉ preview tên Workspace/người mời/type/hạn, target invitationId. Không trả email, raw token/hash hoặc member/task list. Account chưa verified được preview, accept bằng ID bị chặn. LINK không accept bằng ID. EMAIL ID không thay quyền: query bind emailCanonical hiện tại, shared Workspace guard và cùng lifecycle với token accept. Đã accept thì inbox target unavailable; muốn vào Workspace dùng danh sách Workspace hiện tại.

## Work email

Work event/outbox đã được Work API lưu atomic; worker không tạo thêm in-app. Mỗi claim atomic pending đến hạn hoặc processing lease hết hạn, lease 60 giây; worker chỉ finalize bằng leaseToken còn hạn. Tối đa 5 lần thử, lỗi redacted/backoff; crash với lease cũ cho phép phục hồi, nếu mất lease sau provider accepted không ghi sent sai.

Trước mỗi lần giao provider, transaction kiểm Workspace guard, User verified/current email/locale, membership, Task undeleted, Project và settings. eventTypes queued giao với các loại đang bật theo override on/off/inherit và global. Không còn quyền hoặc không còn loại được bật -> cancelled; không phục hồi job đã cancelled sau rejoin/bật lại. Không thêm loại chưa từng queue vào một email cũ.

Delivery lấy Task title/Workspace name hiện tại làm context, chỉ nêu mô tả các loại được bật; previousStatus/status chỉ có khi status được bật. Template vi/en theo locale, null dùng vi. Payload không chứa description/Comment đầy đủ; không attachment/storage. Assignment cũ vẫn gửi được nếu recipient còn membership, không bắt họ còn là assignee vì họ cần biết thôi được giao.

SMTP Message-ID và capture filename có eventId + outbox ID cho work để hai người nhận cùng event không đè nhau. Capture local dedupe file từng delivery; SMTP Message-ID không phải bảo đảm exactly-once. Sau provider accepted mà process crash/mất phản hồi có thể gửi lại; semantics at-least-once. Settings/quyền đổi sau khi bàn giao provider không thu hồi mail đang chuyển phát. Retry chỉ chạy trên job còn pending/expired lease; failed cần quy trình vận hành riêng, chưa có admin API retry.

## Chạy local

`pnpm mail:once`: xử lý tối đa một job, thử Auth → Invitation → Work. `pnpm mail:worker`: process riêng, polling idle 3 giây, round-robin ba loại để tránh starvation; SIGINT/SIGTERM dừng sau job đang làm và disconnect DB. EMAIL_MODE disabled không bắt đầu dispatcher; capture chỉ development, SMTP theo env hiện tại. API không tự khởi động worker. Khi chạy lệnh với SMTP thật sẽ gửi các job đủ điều kiện; lượt triển khai này chỉ dùng sender giả lập, chưa chạy worker trên outbox dev thật.

Startup worker kiểm unique indexes Auth/Workspace/Notification; không tạo index/drop dữ liệu tự động. Shared distributed rate limiter, production supervisor/monitoring, provider idempotency, NFR, reminders, purge/retention/backup vẫn chưa nghiệm thu. [QA](../qa/NOTIFICATIONS-EMAIL-CHECK.md).
