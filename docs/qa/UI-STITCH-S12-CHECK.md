# S12 — Regression toàn ứng dụng

09/10/2026 — đang thực hiện. S1–S11 đạt gate cụm; tổng vẫn11/12. Chưa nghiệm thu S12/toàn site Vi-En/production.

## S12a — SMTP thật, kiểm tra đường gửi

Theo yêu cầu mới của chủ dự án, bổ sung email thật vào S12. Giới hạn cũ về hàng đợi dev vẫn giữ: không bật worker hoặc gửi các job cũ.

- Thêm `BE/scripts/check-live-smtp.js`: opt-in `--preview` hoặc `--send-to ONE_EMAIL`; không import database/dispatcher/worker, chỉ gọi production `createMailProvider` đúng1 lần. Kiểm tra mode SMTP/TLS/config và recipient đơn, không auto retry. Không thêm package/runtime dependency.
- Syntax +preview PASS. 09/10/2026:1 thư gửi tới địa chỉ thử đã được user cho phép; SMTP accepted, mã `d37f13ea`,1 attempt. Nội dung có nhãn KIỂM THỬ SMTP S12, tiếng Việt có dấu và link trang chủ local, không token/password/Google credential hoặc dữ liệu Task thật. Subject dùng template work hiện có: “Cập nhật công việc”.
- Report cục bộ ignored: `.local/s12-smtp/{runId}.json`, chỉ metadata/trạng thái, không lưu recipient/credentials/token. Ghi intent trước khi gửi; response mất không tự gửi lại.
- **Inbox: chủ dự án đã xác nhận nhận thư mã `d37f13ea` trong Inbox ngay phiên kiểm thử.** Đây là bằng chứng SMTP → mailbox cho1 thư smoke; không suy deliverability mọi recipient. Chưa có bằng chứng email từ nghiệp vụ auth/invitation/outbox đã đi đủ luồng trong increment này.
- Template hiện có là plain text. Kiểm tra thật dùng đúng provider và builder hiện có, không tự tuyên bố email HTML đã hoàn thiện.

## Các gate S12 còn lại

1. Email nghiệp vụ thật có kiểm soát: verification/single-use/expired link, reset/revoke sessions, invitation accept/correct-account/expiry; assignment/preferences/workspace overrides, cancellation khi mất quyền/Archive. Tách sinh job/dispatch/nhận thư/link action, chỉ job thử mới tới mailbox được phép. Chốt cách giữ môi trường test cho link email hoạt động trước khi gửi token thật; không gửi link trỏ nhầm database tạm hoặc đọc/gửi hàng đợi cũ.
2. Cross-scope2 Org +standalone/Guest/current capabilities, navigation/history/draft guards, nested dialog/notification layering và stale responses.
3. Kiểm bản dịch toàn route Việt/Anh, responsive/focus/keyboard/empty/error/read-only/success; asset/performance/bundle và các deferred records.
4. Ghi rõ automation fixture vs provider thật vs xác nhận Inbox. S12 chỉ đạt khi các gate cần thiết có bằng chứng và hạn chế còn lại được ghi đúng.

## Chạy kiểm tra SMTP từng thư

Từ thư mục BE, dùng Node runtime đã cấu hình:

```text
node --env-file=.env scripts/check-live-smtp.js --preview
node --env-file=.env scripts/check-live-smtp.js --send-to YOUR_AUTHORIZED_EMAIL
```

Lệnh thứ hai gửi1 email thật mỗi lần chạy. Không đặt vào CI hoặc test suite mặc định. Nếu kết quả chưa rõ, kiểm tra report/mailbox trước khi chủ động chạy lại. Không dùng `mail:once`/worker để thay thế vì chúng có thể chọn job dev cũ.
