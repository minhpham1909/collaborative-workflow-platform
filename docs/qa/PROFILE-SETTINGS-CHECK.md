# Profile / Personal Settings — kiểm thử BE

Ngày 03/10/2026. [Hợp đồng API](../sds/PROFILE-SETTINGS-API-v0.1.md). Node 24.19.0, Windows, MongoDB 8.0.17 replica set local.

- pnpm test: 33 đạt, 0 lỗi, 3 live Mongo tests skipped khi TEST_MONGODB_URI không có.
- pnpm test:integration: 14 đạt, 0 skipped (gồm Auth/accounts và Users HTTP/CAS).
- User chưa verified xem/sửa Profile và setting chung của mình được; không Bearer bị từ chối. DTO không cho đổi userId/email/avatar/password/role; route không có User ID tùy ý.
- Tên Unicode/emoji lưu đúng. Avatar, Google identity, email, passwordHash/authVersion không bị sửa; JWT hiện tại vẫn dùng và /auth/me trả tên mới. DTO không có hashes, providerSubject hoặc guard revision.
- Concurrent Profile/preferences từ cùng version: một 200, một 409 VERSION_CONFLICT; stale no-op cũng conflict. No-op đúng version không tăng version hoặc updatedAt.
- Preferences partial merge giữ các event chưa gửi, dùng strict boolean; locale vi/en/null được lưu; không tạo email/notification cho Profile/settings.
- Phiên bị revoke/expired hoặc authVersion thay đổi sau authenticate vẫn không commit mutation; repository kiểm lại trong transaction với User guard.
- HTTP kiểm Origin, missing Origin trên PATCH, JSON content type, malformed/oversized body, DTO forging, PATCH CORS preflight và routes.
- Auth regression vẫn đạt sau dùng chung Origin/error policy. Browser script đổi tên thành auth-harness.js để Node test runner không nhận nhầm; URL /auth-test.js giữ cho trang local.

Đây là API BE cho Profile/global settings. Workspace overrides chờ membership APIs; chưa nghiệm thu work email eligibility, dịch email theo locale, FE sản phẩm hoặc production NFR. Không sửa dữ liệu cá nhân trong dev DB để làm fixtures; tests dùng workflow_auth_test riêng và cleanup đúng fixtures.
