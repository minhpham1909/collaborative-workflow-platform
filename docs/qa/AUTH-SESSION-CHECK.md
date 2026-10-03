# Kiểm tra Auth/session

Ngày 03/10/2026, Windows/Node v24.19.0, pnpm 11.19.0. Dependencies bổ sung jose 6.2.12 và @node-rs/argon2 2.2.1. Đã reinstall dependencies local sau đổi thư mục apps/api thành BE để metadata virtual store không còn trỏ đường dẫn cũ.

## Kết quả

28 tests passed, 0 failed; 1 live Mongo test skipped do TEST_MONGODB_URI chưa cấu hình. Gồm 16 tests nền trước đó và 12 tests bổ sung password/JWT/refresh/HTTP. Audit --prod không báo vulnerability đã biết tại thời điểm chạy.

- Argon2id salt/options, password whitespace/Unicode, giới hạn độ dài; missing/Google-only/wrong password trả cùng lỗi.
- JWT signature, purpose, issuer/audience, typed claims, access expiry; refresh giả không revoke session khác.
- Refresh hash/generation rotation, expiry tuyệt đối không gia hạn; replay revoke access còn hạn; hai refresh đồng thời fail closed trong serialized test double.
- Logout, user authVersion thay đổi và session expiry chặn access còn hạn; unverified login được nhưng verified gate từ chối.
- HTTP login/me/csrf/refresh/logout chạy trên server local; cookie HttpOnly/Secure/Strict, refresh không có trong body; /me expired không clear cookie refresh.
- Origin, CSRF, JSON content type/body size/malformed/unknown field, duplicate cookies và limiter bounds.

## Giới hạn

Mongo adapter đã viết nhưng giao dịch/index/concurrency với MongoDB chưa chạy. Test double không chứng minh MongoDB lock/retry thực tế. Chưa nghiệm thu Google, signup/email/verification/reset/change-password, FE, production proxy/cookies/shared rate limiter hoặc quyền Workspace.

## Chạy

Từ BE: pnpm test và pnpm audit --prod. Live integration chỉ bật khi cấu hình TEST_MONGODB_URI cho database riêng workflow_auth_test với replica set; dùng URI local có thể cấu hình như mongodb://127.0.0.1:27017/workflow_auth_test?replicaSet=rs0. Chạy riêng `node --test test/auth-mongo.test.js` sau khi có môi trường đó; không dùng database thật của người dùng.
