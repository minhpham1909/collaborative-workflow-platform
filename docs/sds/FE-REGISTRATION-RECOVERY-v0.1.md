# Đăng ký / Xác minh / Khôi phục — FE v0.1

04/10/2026. Tiếp nối [Workspace Settings](FE-WORKSPACE-SETTINGS-v0.1.md); [QA](../qa/FE-REGISTRATION-RECOVERY-CHECK.md).

## Màn hình

Login có link Đăng ký thử nghiệm và Quên mật khẩu. `#register` dùng displayName/email/password/confirmation, checkbox consent không chọn sẵn, termsVersion lấy GET /auth/capabilities. Nội dung chính sách thử nghiệm hiển thị ngay trong form, ghi rõ bản nháp local, dữ liệu xử lý và phần retention/deletion/operator chưa chốt. Không coi đây là chính sách phát hành công khai hoặc consent Google mới. Signup Google mới vẫn chưa mở trong FE cho tới policy review; Google login/link đã có giữ nguyên.

POST /auth/register trả accepted/queued, không tự login hoặc claim email đã tới Inbox. User có thể login nhưng chưa verified vẫn bị gate việc nhóm. BE validation/unique email và Terms version là nguồn cuối cùng; input server-owned không gửi. Không trim mật khẩu, kiểm 12–128 code points/512 bytes, name guardrail 100 UTF-16 units.

`#recover` gọi POST /auth/password/recovery. Mọi kết quả accepted dùng cùng thông báo, không phân biệt missing/local/Google-only; không claim email đã gửi. `#reset-password` có mật khẩu mới/xác nhận và nút explicit submit. Thành công BE thu hồi phiên cũ và xóa refresh cookie; client clear access/current User và BroadcastChannel báo các tab. Shared Web Lock + epoch guard ngăn request đang xếp hàng áp dụng vào phiên vừa đổi. Lỗi không giả thành công hoặc tự retry mutation.

## Liên kết email

`/verify-email#token=…`, `/reset-password#token=…`, `/invite#token=…` được phân biệt theo path, token 64 hex vào memory và scrub URL trước render. Không tự consume link trên mount; verify/reset cần nút explicit. Reload sau scrub yêu cầu mở lại link gốc. Không token trong localStorage, telemetry, query hoặc logs.

Verify thành công có thể refresh own session nếu đang login; token có thể thuộc email khác, không tự giả account đang login đã verified. Reset thành công yêu cầu login lại. Invite intent được giữ khi chuyển qua register/recover/login trong cùng lượt mở trang; registration accepted không consume invitation. Không hứa khôi phục intent qua reload.

Network ambiguity khóa gửi lại trong form và hướng kiểm trạng thái; không idempotency retry tự động. Back/logout/full draft guards và English UI còn trong roadmap. Nội dung policy thật, production config và Google/SMTP live QA là các hạng mục trước public release. User yêu cầu kiểm thử trực tiếp sau nên increment này chỉ kiểm tự động trên fixtures, không chạy SMTP worker hoặc thao tác Google thật.
