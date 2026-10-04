# Đăng ký / Xác minh / Khôi phục — QA

04/10/2026. [Thiết kế](../sds/FE-REGISTRATION-RECOVERY-v0.1.md).

- **12 FE tests đạt**: shared session/refresh/password, reset chỉ clear sau confirmed success và queued-session guard; auth link path/scrub, Unicode password bounds; editor/deadline regression.
- **8 BE integration tests đạt**: Accounts + Auth trên Mongo replica set cô lập; Terms/unique email, verification/reset/password/session lifecycle, Google identity/nonce regression, HTTP/Origin/CSRF và mail lease. Không đổi BE trong increment.
- Automated headless React → Express → Mongo fixture đạt: checkbox không chọn sẵn, chưa consent không tạo User; signup queued, login unverified gate; verify link scrub và không consume trước click; verify success; recovery missing/existing cùng thông báo; reset mismatched confirmation, success/login mật khẩu mới, replay invalid và reload không còn form token; không tràn ngang 1440/1280/390px, không page errors.
- Fixture đọc token từ encrypted outbox test trong DB tạm, không in token, không gửi SMTP/Google hoặc sửa dữ liệu dev. Harness `.local` ignored, có finally đóng browser/server/DB. FE unit tests commit; đây là kiểm tự động, không thay nghiệm thu trực tiếp với email/provider thật.
- Vite build, local Markdown links và git diff whitespace kiểm trước commit.

Kiểm thử trực tiếp để sau theo yêu cầu chủ dự án: email verify/reset tới Inbox/Spam, liên kết Google và luồng đa tab trong môi trường dev thật. Google signup mới vẫn chờ policy thật; policy draft local không phải nghiệm thu phát hành. English/routing/draft guards/NFR còn roadmap.
