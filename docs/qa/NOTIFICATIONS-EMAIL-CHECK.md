# QA Notifications / work email

Ngày 03/10/2026. Dedicated workflow_auth_test/MongoDB 8.0.17 replica set tạm; fake mail sender. Integration files chạy tuần tự vì dispatcher claim shared outbox, tránh gửi fixtures của suite khác. Không dùng SMTP/token thật, không mutate DB dev.

- Suite thường: 40 pass, 0 fail; 6 integration parents skip khi không cấu hình TEST_MONGODB_URI.
- Suite tích hợp: 40 pass, 0 fail, 0 skip; module mới parent + 6 subtests.
- Own recipient list/detail/read, mass assignment/Origin/forged signed cutoff, read idempotence, pagination/filter/count.
- Leave mask không title/Workspace/payload/link; rejoin phục hồi theo quyền hiện tại; Task deleted vẫn generic.
- Read-all cutoff loại thông báo mới hơn, không mark user khác và lặp không thay đổi.
- Unverified nhận EMAIL in-app tối thiểu nhưng accept bị chặn; email verified đúng mới accept by ID; sai recipient/LINK ID không được accept.
- Settings sau queue/override lọc lại trước gửi; content off không hiện event content/status; account locale hiện tại; deleted Task và mất membership cancelled.
- Concurrent claim chỉ một sender, retry giữ error code không provider text, lease hết hạn phục hồi, mất lease sau provider accepted không finalize.
- Capture hai recipients cùng event tạo hai file riêng và retry từng delivery không ghi đè; templates Việt/English chỉ nêu các loại được bật.

Chưa chạy SMTP work mail thật hoặc process worker lâu dài trên dev/production. Không khẳng định Inbox/Spam, exactly-once, NFR, FE hoặc reminder. [API](../sds/NOTIFICATIONS-EMAIL-API-v0.1.md).
