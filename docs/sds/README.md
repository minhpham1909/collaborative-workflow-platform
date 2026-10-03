# Chuẩn bị SDS

Cập nhật tiếp 03/10/2026: [Auth/session v0.1](AUTH-SESSION-v0.1.md) đã triển khai login/JWT/refresh/logout/me và middleware; [QA](../qa/AUTH-SESSION-CHECK.md) ghi 28 pass/1 Mongo skip. Các ghi nhận foundation phía dưới là mốc trước lát cắt này.

Cập nhật 03/10/2026: đã dựng backend JS/Express/Mongoose, 12 models, editor validation và health endpoints; 16 tests đạt. JWT access + refresh do chủ dự án chọn. Chưa có MongoDB/index hoặc Auth/Google API nghiệp vụ chạy thật. FE giữ React JS/JSX. Các đoạn trạng thái skeleton phía dưới là lịch sử.

- [Backend foundation v0.1](BACKEND-FOUNDATION-v0.1.md): code đã có, hợp đồng JWT/editor, giới hạn và bước Auth/User tiếp theo.

- [Thiết kế DB v0.2](DATABASE-DESIGN-v0.2.md): bản hiện hành, 12 collection lõi, data dictionary và lifecycle.
- [Layout dữ liệu v0.2](DATABASE-LAYOUT-v0.2.json): field/reference/index plan; executable models tại BE/src/models.
- [Sơ đồ quan hệ DB v0.2](DATABASE-ERD-v0.2.md): phạm vi lõi; v0.1 giữ lịch sử.
- Các bản DB v0.1 đã chuyển sang [archive](../archive/README.md); chỉ dùng v0.2 cho implementation hiện tại.
- [Hướng stack](TECH-STACK-DIRECTION.md), [thiết kế bảo mật](SECURITY-DESIGN-v0.1.md): đầu vào implementation.

Trạng thái: chưa thông qua thiết kế kỹ thuật. Stack ứng viên: React/Vite + NodeJS + MongoDB. Không ấn định phiên bản thư viện tại giai đoạn skeleton.

Đã tạo [khung SDS v0.1](SDS-v0.1.md) gồm boundaries, invariants, phần thiết kế cần hoàn thành và dependencies SRS. Đây là draft chuẩn bị, chưa chọn schema/stack/auth/API. Đọc [SRS readiness](../srs/SRS-READINESS.md) để phân biệt hành vi cần duyệt và chi tiết chuyển sang SDS.

| Phần thiết kế | Đầu vào cần thống nhất |
|---|---|
| Auth/User | OD-07/08/13, chuẩn hóa email, sessions, Terms acceptance |
| Workspace/Membership/Invitation | OD-01/14, tính nhất quán transfer/leave/accept/revoke, tái gia nhập |
| Project/Task/Comment | OD-03/04/05/06/11, quyền xóa, archive và cleanup assignee |
| Notifications/Email | OD-02/09, eligibility khi xử lý, retry và khả năng chống gửi lặp |
| API và lỗi | Pagination, validation, conflict, không lộ dữ liệu khi mất quyền |
| Frontend | Route map, invitation intent, loading/empty/error, keyboard Board |
| Vận hành/QA | OD-12, môi trường đo, backup/restore, provider và secrets |

Sau baseline: chọn framework backend; JavaScript hay TypeScript; workspace manager nếu cần; auth/session; embed/reference, index và transaction; event/email pipeline; API contracts và routes. Không biến các lựa chọn này thành quyết định đã duyệt trước review.

Storage, reminder và browser push cần boundaries trong thiết kế và đặc tả riêng trước khi triển khai increment.

Implementation hiện hành: [Auth/accounts](AUTH-ACCOUNTS-v0.1.md) và [Auth/session](AUTH-SESSION-v0.1.md). Các đoạn chuẩn bị/baseline ở trên là lịch sử kế hoạch; trạng thái mới tại docs/project/NEXT-STEPS.md.

Increment BE tiếp theo: [Profile/Personal Settings API draft](PROFILE-SETTINGS-API-v0.1.md), trước Workspace/Invitations.

Profile/global settings đã triển khai theo [API v0.1](PROFILE-SETTINGS-API-v0.1.md), [QA](../qa/PROFILE-SETTINGS-CHECK.md); Workspace/Invitations là increment BE kế tiếp.

Increment hiện hành: [Workspace/Invitations API](WORKSPACE-INVITATIONS-API-v0.1.md), [QA](../qa/WORKSPACE-INVITATIONS-CHECK.md); Project/Task/Comment là phần tiếp theo.


[Project/Task/Comment API v0.1](PROJECT-TASK-COMMENT-API-v0.1.md): quyền, lifecycle, queries, soft delete và atomic work events đã triển khai; inbox/work-email dispatcher tiếp theo.
