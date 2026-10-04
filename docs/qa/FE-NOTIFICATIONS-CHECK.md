# FE Notifications check

04/10/2026. Thử bằng fixtures/database riêng; không thay account dev, không gửi email thật.

- Build Vite đạt. Notifications unit suite 3 tests và Mongo/HTTP integration suite 8 tests đạt, 0 skipped. Assertions mới: search không lộ title sau leave, rejoin phục hồi search, ngày Việt Nam, cursor/total, read-all bound q/date và input sai.
- Headless Edge chạy React→Express→MongoDB 8.0.17 replica riêng, request chuyển tới API thật. Đạt inbox/search không dấu/detail/read, reload giữ read state, read-all không đọc thông báo đến sau cutoff, mask sau membership mất quyền và không tìm được tên cũ.
- Unverified login mở own inbox, preview EMAIL invitation nhưng không có accept; sau verification/reload, accept by ID tạo membership active, invitation detail chuyển unavailable. Invitation dispatcher chỉ sender stub, không gửi SMTP/provider.
- Không page error/overflow ngang tại 1440/1280/390. Browser harness local ignored, chưa CI; screenshot inbox xem local. Chưa full acceptance mọi browser/race/NFR hoặc production security.

```powershell
# BE
node --test test/notifications.test.js
node scripts/run-integration.js test/notifications-mongo.test.js
# FE
pnpm build
```

Kiểm tay localhost:5173: đọc một mục, read/category/search/date; tạo thêm thông báo sau tải list rồi đọc tất cả; mất membership thì generic row/no old search match; unverified invitation không accept. Badge refresh/focus, không realtime. Search scan là giới hạn performance được ghi ở [thiết kế](../sds/FE-NOTIFICATIONS-v0.1.md).
