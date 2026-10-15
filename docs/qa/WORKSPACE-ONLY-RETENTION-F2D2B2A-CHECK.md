# F2d2b2a — Retention parent isolation

Ngày: 15/10/2026.

## Thay đổi

- Gỡ phụ thuộc Organization khỏi worker retention.
- Worker chỉ khoá và xử lý Workspace có ownerId dạng ObjectId và không gắn Organization. Parent không hợp lệ trả orphan_skipped trước khi thay đổi mutationRevision.
- Historical fixture adapter không mở rộng phạm vi xoá của worker.
- Không đổi thời hạn 30 ngày, điều kiện CAS, giao dịch xoá con hoặc audit.

## Kiểm thử

- Targeted retention: 9/9 PASS trên Mongo replica tạm.
- Thêm ca Task hết hạn với parent gắn Organization, owner null và owner sai kiểu: giữ nguyên Workspace, Task, comment, activity, notification, outbox và purge audit.
- Hồi quy BE: 136/136 PASS, không skip, trên Mongo replica tạm.

## Giới hạn và bước tiếp

Đây là prerequisite nhỏ của F2d2b2, chưa gỡ bốn model Organization khỏi registry. Tiếp tục tách model/schema lịch sử, rồi dọn notification/mail/moderation metadata. Chưa fresh seed hoặc nghiệm thu web nhiều tài khoản. Không chạy worker/SMTP/purge trên dev, không đổi collections/indexes dev, không reset hoặc deploy.
