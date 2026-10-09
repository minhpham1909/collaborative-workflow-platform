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

## S12b — Email nghiệp vụ và hành động qua link

09/10/2026: thêm `FE/scripts/check-mail-lifecycle.mjs`. Default không gửi thư, chỉ preflight full React/Express/MongoMemoryReplSet. Chế độ `--send-to ONE_EMAIL` opt-in gửi tối đa4 thư qua production dispatchers/provider tới đúng1 mailbox đã được cho phép, không tự retry. FE riênglocalhost5188/API port tạm/test keys/database tạm, giữ dev5173/4000/27018 và OS Mongo27017. Kiểm tra port trước khi chạy và đóng môi trường thử sau kiểm.

- Preflight PASS, rồi live SMTP PASS:4 thư verify/reset/Workspace invite/assignment, mỗi event1attempt được SMTP accepted. Sinh outbox từ nghiệp vụ thật, claim/lease/context/revalidation thật; sent payload encrypted được xóa. Không kết nối MONGODB_URI của dev hoặc gọi dispatcher trên hàng đợi cũ.
- Trình duyệt mở URL từ cùng production mail payload đã đưa tới SMTP khi fixture còn hoạt động: signup qua FE → verification không tự consume khi chỉ mở, scrub token, click xác minh, reuse400; recovery → reset mật khẩu, login mật khẩu cũ bị từ chối, JWT phiên cũ vô hiệu; invitation → login bằng đúng email, không auto-accept, explicit accept → đúng Workspace; assignment → mở đúng Task.
- **Phát hiện và sửa lỗi BE link email công việc**: `/tasks/:id` không được router FE nhận, đổi sang `/#task/:id`. Thêm assertion integration chống tái phát. API `/tasks/:id` giữ nguyên; chỉ sửa web link trong thư.
- Negative gates không gửi thêm thư: token auth hết hạn bị cancelled; Member rời Workspace trước dispatch thì work job cancelled. BE27 integration PASS/0 skip gồm accounts/notifications/workspaces: prefs/override/event filtering, expiry/revoke/exact-email/single-use, leases/cancellation/session/auth/Origin và privacy.
- Page errors0; ảnh Task mở qua email ở `.local/mail-lifecycle/task-link.png`. Report ignored `.local/mail-lifecycle/{timestamp}.json` chỉ kết quả/metadata, không recipient/password/token/url bearer. Không ghi link/token vào Git/log.
- **Chủ dự án đã xác nhận đủ4 thư trong Inbox.** Test link lấy URL từ production send payload, không đọc/click hộp thư qua mail client. Không gọi đây là tự động kiểm toàn tuyến mailbox UI.
- Token/link dùng fixture riêng, đã tiêu thụ khi kiểm và môi trường đã đóng. Không yêu cầu user click lại link thử, không thay đổi tài khoản thật cùng địa chỉ email. Đây là regression nghiệp vụ +SMTP thật, chưa phải deployment production acceptance.

Chạy từ root dự án với Node/Playwright runtime đã cấu hình:

```text
node FE/scripts/check-mail-lifecycle.mjs
node --env-file=BE/.env FE/scripts/check-mail-lifecycle.mjs --send-to YOUR_AUTHORIZED_EMAIL
```

S12 vẫn đang thực hiện: Org/Project invitation variants đã có fixture regression nhưng chưa gửi SMTP thật trongS12b; whole-siteVi/En/navigation/performance còn gate. Không tự gửi thêm thư hoặc bật worker nền để hoàn thành các phần đó.

## S12c — Phạm vi quyền và điều hướng/draft

09/10/2026 — kiểm xong đợt regression này, S12 chưa toàn gate.

- `BE/scripts/run-integration.js test/core-e2e-mongo.test.js`:6 tests PASS/0 skip. HTTP chain2 Org+standalone+Guest, onboarding/current-role/no global elevation, labels/checklist/reopen/statistics, Archive/Ban/Org exit và independent scope, trash/restore/no replay. Retention/migration chỉ chạy trong DB fixture riêng, không dev27018/OS27017/outbox.
- `FE/scripts/check-stitch-organizations.mjs` PASS: Owner/Admin/Member, Org/WS search/total/cursor; không thấy Workspace chưa cấp quyền, cross-Org unavailable không lộ tên; role demotion được BE từ chối, không tự nâng quyền; breadcrumbs, empty/error/retry/stale search và5width.
- `FE/scripts/check-navigation-flows.mjs` PASS sau cập nhật selector Home từ “+ Tạo Workspace” sang “Tạo Workspace” đúng UI S1. Lượt đầu dừng do test selector cũ, không có bằng chứng product failure tại chỗ đó. Không đổi logic guard để làm test qua.
- Guard regression: Back/Forward/hash/link/reload/logout; giữ draft Task create/edit, Project name/description, Workspace create/settings/description/email override, profile/email/password, Comment create/edit, invite/register/recovery/reset; Escape/cancel/discard, busy write chưa nhận response, history tồn tại trước mount và fallback khi không có Navigation API. URL/token scrub và owning React tree được kiểm.
- Bổ sung vào `check-stitch-trash.mjs`: Board→trash tạo history thật; giữ restore request ở transport gate, Back phải quay lại URL trash và giữ component, header refresh bị khóa, thông báo busy hiện; release chỉ1 POST, Task được phục hồi đúng. Fixture cleanup luôn release gate cả khi assertion lỗi để không treo route handler. Cả S11 suite và5width PASS/0 page errors.
- Dữ liệu/accounts/providers trong fixtures độc lập. Không gửi thêm mail thật trongS12c hoặc chạy worker/dev backfill. SMTP S12a/b và xác nhận Inbox giữ nguyên bằng chứng lịch sử.

Gate còn: coverageVi/En toàn app, dialog/toast layering kiểm riêng, responsive/performance/assets và kết quả nghiệm thu tổng hợp. Những guard tests đạt không phải lời khẳng định bảo vệ mọi thao tác rời trang/browser crash.
