# Workspace / Invitations — QA

Ngày 03/10/2026, Node 24.19.0, Windows, MongoDB 8.0.17 replica set local. [Hợp đồng](../sds/WORKSPACE-INVITATIONS-API-v0.1.md).

- pnpm test: 35 đạt, 0 lỗi; 4 integration parents skipped nếu không có TEST_MONGODB_URI.
- pnpm test:integration: 24 đạt, 0 skipped, gồm Auth/Users regression và 9 Workspace subtests trên DB thật.
- Create Workspace+Owner membership atomic; inject lỗi ở membership save để chứng minh rollback Workspace, không orphan. Unverified bị chặn tại HTTP và trong repository.
- Owner-only edit/invite/list/revoke/remove/transfer; non-members 404; child invitation của Workspace khác 404; stale version conflict; members DTO không lộ email. Cursor page không trùng, giới hạn query/type kiểm strict.
- LINK nhiều User; concurrent accept cùng User tạo một membership và một ALREADY_MEMBER. Public preview chỉ bốn fields được phép, không có email/ID/nội dung nội bộ.
- EMAIL hash/encrypted payload không có raw token, chỉ recipient verified khớp email; unverified không consume và accept được sau verify; consumed token không rejoin sau leave. In-app recipient có account lúc send, không hồi tố account đăng ký sau.
- Cleanup Task todo/in_progress cả Active/Archived, tăng version, Done giữ lịch sử. Overrides clear/inherit khi leave/remove/rejoin; membership generation tăng, stale leave không loại phiên gia nhập mới; không autorestoration assignee.
- Transfer/leave race: chỉ một commit, Owner còn active. Old Owner mất quyền, invitations vẫn dùng được sau transfer. Accept/revoke race: joined chỉ khi accept commit trước, token revoked không thêm người sau đó. Hai Workspace edits cùng version chỉ một thành công.
- Failed email retry giữ expiry/token, revoke clear/cancel job; worker concurrent lease chỉ gửi một lần, recover lease expired, lỗi retry redact, expired/consumed invitation không send. Sender giả lập, không gửi SMTP tới tài khoản thật trong tests.
- Repository từ chối phiên đã revoked sau authenticate trước create.

Chưa kiểm Invitations bằng SMTP/Google thật hoặc FE sản phẩm. Notifications inbox/Project/Task APIs, work email eligibility và reminder chưa có; fixtures Task kiểm cleanup chỉ dùng DB test riêng. Retention/purge, shared limiter, production NFR và exactly-once delivery chưa nghiệm thu. Schema count giữ 13.

Kiểm lease mất sau provider accepted: worker trả lease_lost, không ghi notification/mark sent dưới lease khác; retry sau lease expired chỉ có một notification dedupe. Điều này không đảm bảo một email duy nhất nếu crash sau gửi.
