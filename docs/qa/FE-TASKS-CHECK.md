# FE Task screens check

04/10/2026. Scope Board/Task/Comments/My Tasks và identity DTO. Fixtures/database riêng, không thay tài khoản thật hoặc gửi email.

- Vite build đạt; editor lazy chunk ~395 kB, main ~268 kB, không cảnh báo >500 kB. Chưa đo NFR.
- 6 FE tests đạt: 4 API-client regression, JSON editor roundtrip validator BE (heading/list/Unicode/link/attrs), timezone minute. Work HTTP/Mongo suite 10 tests đạt, 0 skipped; assertions identity hiện tại/lịch sử và không email/password.
- Headless Edge React→Express→MongoDB 8.0.17 replica riêng `workflow_fe_projects_test`, chuyển requests tới API thật. Đạt Board create/assign/deadline Việt Nam, editor heading+link được BE lưu, detail, Author create/edit/delete Comment, assignee chỉ status, My Tasks open→Done, CAS giữ draft, Archived read-only, reload/direct link, load more 12→15 trong một cột, delete→unavailable.
- Owner không có edit/delete Comment của assignee; assignee không có Task edit/delete. Sau delete không render title cũ. Không page error/overflow ngang 1440/1280/390; screenshot Board đã xem local. Harness browser hiện local ignored, chưa CI suite.

## Chạy lại

```powershell
# Từ FE
pnpm test
pnpm build
# Từ BE
node scripts/run-integration.js test/work-mongo.test.js
```

Kiểm tay localhost:5173: Owner/Creator tạo/giao Task; assignee chỉ status; mỗi người chỉ sửa/xóa Comment bản thân; hai form cùng version → conflict; Archived chỉ đọc; Done rời open My Tasks; hạn quá khứ/timezone; search/date/load more cột.

Chưa nghiệm thu mọi paste/IME/browser, English, panel, drag, autosave, draft Back/Forward/logout transitions, filter restoration, member search, NFR, SMTP/Google live hoặc production security. Không tuyên bố toàn FE/Figma đã hoàn thành.
