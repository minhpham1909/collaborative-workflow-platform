# Profile / Personal Settings — API v0.1

Ngày 03/10/2026. Chuẩn bị theo UC-28/FR-18, UC-33/FR-22 và website Việt/English. Đã triển khai routes và scoped repository tại BE/src/users; kiểm HTTP/transactions theo [QA](../qa/PROFILE-SETTINGS-CHECK.md). Chính sách locale fallback/email và guardrails sản phẩm vẫn còn review. Tiếp tục BE trước UI sản phẩm.

## Phạm vi

User đã đăng nhập, kể cả chưa verified, xem/sửa Profile và setting chung của chính mình. Owner không sửa Profile/settings người khác. Email chỉ đọc, không upload avatar; chỉ Google picture đã xác thực hoặc initials. Không đổi password/email/identity qua DTO Profile. Thay displayName không đổi User ID hoặc Google sub.

| API đã có | Fields / điều kiện | Response |
|---|---|---|
| GET /users/me | Bearer hợp lệ | Public User DTO như /auth/me, gồm version |
| PATCH /users/me/profile | expectedVersion, displayName | User DTO/version mới |
| PATCH /users/me/preferences | expectedVersion, locale và/hoặc emailPreferences | User DTO/version mới |

expectedVersion integer ≥0; ít nhất một field thay đổi được gửi. displayName dùng guardrail hiện có: không blank/control chars, ≤100 UTF-16 units; không suy thành product limit đã duyệt. locale vi/en/null giữ theo schema, chính sách fallback/email locale cần review. emailPreferences partial object chỉ nhận assignment/comment/content/status kiểu Boolean, không coercion. Chỉ fields được gửi mới đổi; defaults khi tạo account giữ assignment true, ba loại khác false. Auth/email xác minh/reset không bị tắt theo work email preferences.

Mutation trong transaction: User guard → kiểm session/authVersion hiện tại → kiểm expectedVersion → CAS _id+version → cập nhật/version tăng → public DTO. Nếu stale trả 409 VERSION_CONFLICT, không ghi đè; không đổi thật thì không tăng version. Không tạo event thông báo Profile/settings. Không có userId/email/role/ownerId/avatar/passwordHash/Google sub trong input. Generic model query/bulk writes vẫn bị chặn, repository scoped riêng.

Origin/error policy dùng chung với Auth tại src/http/policy.js; Users router hỗ trợ GET/PATCH preflight, JSON 16 KiB, bearer middleware và DTO allowlist. Limiter tạm 60 request/phút/IP theo process cho Users; trust proxy tắt. PATCH đòi Origin chính xác; không dùng refresh cookie để authenticate nên không dùng refresh CSRF thay Bearer. Token/secret/internal fields không trả trong lean/raw documents.

## Workspace override

Triển khai sau membership APIs: mỗi loại inherit/on/off, chỉ User sửa override membership hiện tại của mình; reset về inherit. Không tạo membership bằng setting API. Khi leave/remove xóa override, rejoin kế thừa; Owner không sửa preferences riêng của Member. Eligibility khi gửi work email cần kiểm lại membership/setting lúc gửi, không chỉ lúc enqueue. Worker work-events chưa có; không nghiệm thu routing từ CRUD settings.

## Kiểm thử đã thực hiện (xem QA)

1. Không Bearer hoặc phiên hết hạn/revoked bị từ chối; unverified sửa bản thân được.
2. Không ghi vào User khác; fields server-owned, type sai và nested unknown fields bị từ chối.
3. Hai edits cùng version chỉ một commit; conflict giữ dữ liệu đã lưu; no-op không tăng version.
4. Global preferences partial merge đúng, giữ các loại chưa gửi, locale không đổi quyền/timezone/nội dung User.
5. Đổi tên không sửa Google identity/avatar và không ảnh hưởng JWT/session; response không lộ hashes/revisions.
6. Kiểm HTTP và Mongo replica set, rồi cập nhật SDS/QA; tiếp theo Workspace/Invitations.
