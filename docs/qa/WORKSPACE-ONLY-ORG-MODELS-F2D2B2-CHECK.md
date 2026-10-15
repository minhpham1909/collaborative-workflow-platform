# F2d2b2 — Organization model registry retirement

Ngày: 15/10/2026.

## Phạm vi

- Runtime registry còn 26 model; không import hoặc đăng ký Organization, OrganizationMembership, OrganizationAudit, OrganizationInvitation.
- Schema và registry lịch sử nằm trong test-support. Registry fixture re-export model hiện tại để các test lịch sử tạo đúng index mà không thêm model cũ vào runtime registry.
- Historical document save bị chặn nếu không phải loopback DB workflow_*_test hoặc ở production. Collection-level fixture writes vẫn là thao tác test tường minh; đây không phải lớp bảo vệ database tổng quát.
- Import historical model không đăng ký historical access adapter. Các test Workspace-only vẫn dùng policy hiện tại, dù tạo dữ liệu đối chứng Org cũ.
- Notification/outbox/Ban metadata Org tạm giữ dạng ObjectId nullable không có Mongoose ref. Layout đánh dấu retiredReferences và bốn collection retired-test-fixture-only. Category/hook/template cũ chưa bị xoá ở patch này.
- Reset inventory vẫn phân loại collection lịch sử để không bỏ sót phạm vi cleanup đã duyệt; không chạy reset.

## Kiểm thử

- Full isolated Mongo integration: 136/136 PASS, không skip.
- BE + FE unit invocation: 124 PASS, 22 DB-dependent skip (các suite DB đã chạy trong integration).
- Fresh child process: đúng 26 model, không model Organization, không field ref tới Organization.
- Historical save ngoài DB test: từ chối.
- 12 FE fixture scripts thay import: syntax PASS. Không coi các browser journey Org cũ là nghiệm thu Workspace-only hiện tại.
- UI source/styles không đổi; không thực hiện lại browser visual acceptance cho patch model này.

## Còn lại

Tiếp dọn schema category/validation và provider template Org trong notification/mail/moderation; sau core mới fresh seed và nghiệm thu web nhiều tài khoản. Chưa hoàn tất toàn bộ Org removal.

Không thay dữ liệu/index trên dev; không reset, seed, migration, SMTP, hàng đợi cũ, worker hoặc deploy.
