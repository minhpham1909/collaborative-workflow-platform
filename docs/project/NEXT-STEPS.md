# Trạng thái và bước tiếp theo

Cập nhật 03/10/2026. [Nhật ký cũ](../archive/project/PROJECT-HISTORY-2026-10-03.md) là lịch sử, yêu cầu trực tiếp mới của chủ dự án có ưu tiên.

## Hiện tại

- Repo GitHub private minhpham1909/collaborative-workflow-platform; main giữ mốc nền, phát triển trên dev.
- BE: Node 24.x, JavaScript ESM, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0, lockfile; 13 models, editor validation, health.
- JWT access/refresh, Argon2id login, rotation/reuse revocation, logout/me và verified middleware. Đã có signup/Terms, verify/resend, reset/change password, Google login/link và encrypted email outbox. [Accounts contract](../sds/AUTH-ACCOUNTS-v0.1.md), [session contract](../sds/AUTH-SESSION-v0.1.md).
- 31 unit/schema/HTTP tests đạt; 8 integration tests đạt, 0 skipped trên MongoDB 8.0.17 replica set local. Google verifier dùng SDK stub; mail sender giả lập, chưa Google/SMTP thật. [QA](../qa/AUTH-ACCOUNTS-CHECK.md).
- MongoDB dev local đã chạy smoke, tạo index 13 collections; env:dev/db:dev/test:integration hỗ trợ setup. .env/binaries/data/mail previews ignored; không đẩy credentials/data lên Git.
- FE còn skeleton React JS/JSX; chưa màn hình Auth. Storage/resources Upcoming, announcements phase riêng. NFR/retention/product limits còn review.

## Tiếp theo

1. Dựng FE Auth với validation, Việt/English, login/signup/Terms, verify/reset và unverified gate; access token memory, refresh single-flight/coordination giữa tabs.
2. Cấu hình OAuth Web client và SMTP, kiểm credential/email delivery thật. Hoàn thiện nội dung Terms, worker nền, Profile/Personal Settings APIs.
3. Triển khai Workspace/Invitations: Owner-only invites, verified gate, membership lifecycle và quyền DB; rồi Project/Task/Comment, Notifications/Settings.
4. Review production provider/secrets/rotation, shared limiter/proxy/cookie topology, retention/purge/backup và NFR. Local DB không thay production.

## Tài liệu

[Docs index](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md), [DB](../sds/DATABASE-DESIGN-v0.2.md), [BE setup](../../BE/README.md), [Git workflow](../decisions/GIT-WORKFLOW.md), [file hygiene](REPOSITORY-HYGIENE.md).
