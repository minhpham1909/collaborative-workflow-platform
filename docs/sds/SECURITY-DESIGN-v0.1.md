# Thiết kế bảo mật v0.1

Cập nhật implementation: [Auth/session](AUTH-SESSION-v0.1.md) có login/JWT/refresh/logout/me, Origin/CSRF và verified middleware; 28 tests đạt/1 Mongo skip. Chưa toàn bộ Auth/User hoặc production security; trạng thái foundation ở đoạn sau là mốc cũ.

Ngày 03/10/2026. Chủ dự án yêu cầu bảo mật là yêu cầu thiết kế bắt buộc, gồm authentication, JWT/token và validation cả FE/BE. Stack JavaScript/Express/Mongoose và React JS/JSX. Cập nhật: chủ dự án đã chọn JWT access + refresh; schema/editor/health foundation đã có tests, authentication/authorization services chưa triển khai. Các yêu cầu bảo mật dưới đây vẫn phải kiểm chứng với API nghiệp vụ.

## 1. Yêu cầu bảo mật của sản phẩm

- BE tự xác thực từng request bảo vệ; endpoint public được xác định rõ. Không tin userId/role/emailVerified do client gửi. Quyền nghiệp vụ kiểm tra trên đối tượng và membership hiện tại, không chỉ xác minh token.
- User chưa verified chỉ dùng chức năng tài khoản đã chốt. Loss membership, transfer ownership, archive và creator/assignee/author được kiểm tra lại tại lúc thao tác. Role lịch sử trong token không cấp quyền hiện tại.
- FE validate để báo lỗi sớm; BE validate body/query/params/header liên quan trước xử lý. Cùng quy tắc kiểu, enum, giới hạn, Unicode, deadline và rich text; bỏ qua FE vẫn không ghi được dữ liệu sai.
- Chỉ nhận trường được phép theo hành động. ownerId/creatorId/authorId/role/emailVerified/createdAt và trường nội bộ do server xác định; assignee chỉ thay theo quyền đã chốt. Không dùng req.body làm Mongo filter hoặc update nguyên khối.
- Response chỉ trả trường được phép, không có password hash, token nội bộ hoặc dữ liệu đối tượng không có quyền. Lỗi không trả stack trace/chi tiết database trong production; mã lỗi ổn định hỗ trợ Việt/Anh.
- Logout/đổi/reset password phải thu hồi đúng phiên theo SRS. Token mời/xác minh/reset có purpose riêng, hạn và một lần theo loại; không được dùng làm credential đăng nhập.

## 2. Auth mechanism — JWT access + refresh đã chọn

Chủ dự án chọn phương án B ngày 03/10/2026. A giữ làm phần so sánh lịch sử. Session model dùng refreshTokenHash/refreshGeneration; TTL, algorithm/keys và concurrent-refresh policy chưa quyết định. Xem BACKEND-FOUNDATION-v0.1.md.

### Phương án A: session phía server

Cookie chứa mã phiên, bản ghi phiên lưu server với user/expiry/revocation. Phù hợp website hiện tại và yêu cầu thu hồi phiên. Không lưu toàn bộ session trong cookie hoặc dùng MemoryStore production. Cookie production HttpOnly/Secure, SameSite/domain/path theo topology deploy; có CSRF protection cho request thay đổi dữ liệu.

### Phương án B: JWT access + refresh và session record

Nếu chọn JWT: access ngắn hạn, refresh ngẫu nhiên có bản hash lưu server, rotate khi dùng và xử lý reuse/refresh đồng thời; chi tiết expiry/grace/idempotency cần thiết kế. Access kiểm chữ ký, allowlist thuật toán, expiry, issuer/audience/token purpose theo hợp đồng; decode không thay verify. Không đưa password hoặc nội dung nhạy cảm vào payload.

Access token đề xuất chỉ giữ trong memory FE; refresh cookie HttpOnly/Secure, SameSite phù hợp; endpoint cookie vẫn cần CSRF protection. Không lưu credential dài hạn trong localStorage. Muốn phiên cũ mất hiệu lực ngay sau reset/logout thì access còn hạn cũng cần kiểm tra trạng thái session hoặc cơ chế revoke tương đương trên request bảo vệ; chỉ xóa refresh không đáp ứng SRS. BE kiểm membership/role hiện tại độc lập với claims.

Cả hai phương án đều có thể đáp ứng yêu cầu nếu thực hiện đúng. Chủ dự án chọn B, thay thế khuyến nghị A trước đây. Chưa chọn thư viện, thuật toán ký hoặc số phút expiry. Không xem JWT là tính năng bảo mật tự đủ.

## 3. Defense và vận hành

Password dùng password hashing thích hợp, đề xuất Argon2id; work factor và library chốt theo môi trường, không dùng hash nhanh thông thường. Rate limit login/reset/resend/invitation và tác vụ dễ bị lạm dụng; ngưỡng chốt SDS. Response login/recovery tránh tiết lộ tài khoản tồn tại khi không cần; UI Việt/Anh dùng mã lỗi nhất quán.

HTTPS production, security headers, giới hạn request size và query complexity, CORS theo origin cho phép; CORS không thay authentication/authorization và không chặn mọi client trực tiếp. Không dùng GET để thay đổi nghiệp vụ. Cookie auth cần chống CSRF; SameSite chỉ là một lớp.

Rich-text backend allowlist node/mark/URL, viewer render có kiểm soát; validate không thay output escaping/sanitization phù hợp. Không chạy HTML/script paste; không tự fetch URL bên ngoài chỉ vì người dùng nhập hyperlink. Các validation MongoID/type/filter/operator có allowlist; query không nhận operator tùy ý từ client.

Secrets qua cấu hình môi trường/secret store, không commit hoặc log; log có request/event ID và redaction credential/header/cookie. Dependencies được kiểm tra cập nhật/lỗ hổng; findings được đánh giá trước phát hành. Backup access/retention/restore thuộc vận hành còn cần chốt, không tuyên bố bảo mật hoàn thành bằng tài liệu này.

## 4. Bằng chứng kiểm thử phải có khi triển khai

1. Bỏ qua FE, gửi sai kiểu/enum/ID/quá giới hạn/trường nội bộ và Mongo operators: BE từ chối, không ghi/event.
2. User A truy cập đối tượng Workspace B, member gửi lệnh Owner, Assignee sửa content và token chứa role giả: bị từ chối đúng quy tắc.
3. Credential hết hạn/sai chữ ký/thu hồi; verified gate; logout/reset/đổi password và refresh nếu chọn JWT: phiên được thu hồi không dùng tiếp, kể cả access chưa hết hạn.
4. Cookie mutation request không có CSRF hợp lệ bị chặn; CORS đúng origin; endpoint public/auth không vô tình mở tài nguyên riêng.
5. Rich text có HTML/URL không hợp lệ không thực thi; danh sách/search/notification không lộ dữ liệu sau mất quyền.
6. Không có hash/token/secret trong response/log; login/resend/recovery/invitation chịu rate limit; lỗi production không lộ stack.

Test ngưỡng hoặc thuật toán phụ thuộc cấu hình đã chọn; kiểm tra SRS consistency hiện tại không chứng minh các mục trên.

## Nguồn hướng dẫn

- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security/)
