# Trạng thái và bước tiếp theo

Cập nhật 03/10/2026. File này là trạng thái hiện hành; nhật ký trước đây nằm trong [archive](../archive/project/PROJECT-HISTORY-2026-10-03.md).

## Hiện tại

- Repo GitHub private `minhpham1909/collaborative-workflow-platform`; `main` giữ mốc khởi đầu, làm việc trên `dev`.
- `BE/`: Node 24.x, JavaScript ESM, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0 và lockfile. Có 12 models lõi, rich-text validation, text/counters server và health endpoints.
- JWT access + refresh đã có signing/verification, Argon2id login, rotation/reuse revocation, logout, /me và verified middleware. Google/signup/verification/reset/change-password và các API công việc chưa triển khai; xem [Auth/session](../sds/AUTH-SESSION-v0.1.md).
- `FE/` còn skeleton; hướng React JS/JSX, thư viện UI/editor chọn trong quá trình thiết kế/code.
- 28 tests schema/editor/auth/HTTP đạt; live Mongo integration test đã có nhưng skipped do chưa có TEST_MONGODB_URI. SRS checker đạt 35 UC/29 FR. Mongo adapter transactions/indexes chưa chạy thực tế.
- Storage/resources Upcoming; announcements và idempotency theo phase riêng. Giới hạn editor/name vẫn là guardrails kỹ thuật đề xuất, chưa suy thành duyệt toàn bộ NFR.
- Đã rà file Git, bổ sung ignore rules và phân chia tài liệu hiện hành/lịch sử; xem [quy tắc file](REPOSITORY-HYGIENE.md).

## Tiếp theo

1. Cấu hình DB test để chạy integration session, review production key management/proxy/cookie topology/shared limiter; FE cần single-flight refresh giữa tabs.
2. Triển khai signup/Terms, verification/reset/email outbox/provider, change password và Google identity login/linking; giữ verified gate và quyền server. Nối Profile/Personal Settings và frontend login.
3. Cấu hình MongoDB replica set development/test để kiểm unique indexes, CAS và multi-document transactions.
4. Tiếp tục Workspace/Invitations → Project/Task/Comment → Notifications/Settings/outbox; UI/UX phát triển theo flows hiện có.

Không cần chọn storage provider trước phần lõi. Database/email provider, retention/purge và NFR vẫn còn review.

## Điểm vào tài liệu

- [Danh mục docs](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md).
- [DB hiện hành](../sds/DATABASE-DESIGN-v0.2.md), [backend foundation](../sds/BACKEND-FOUNDATION-v0.1.md).
- [Hướng dẫn chạy BE](../../BE/README.md), [QA backend](../qa/BACKEND-FOUNDATION-CHECK.md), [Git workflow](../decisions/GIT-WORKFLOW.md).
