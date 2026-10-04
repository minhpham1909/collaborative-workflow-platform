# FE Workspace/Project check

04/10/2026. Scope Workspace/Project UI thật và Project server query. Không thay database dev/tài khoản thật trong tests; không gửi SMTP hoặc gọi Google provider.

## Bằng chứng

- Vite production build đạt.
- Project-query unit test đạt: state, regex escaped, biên ngày Việt Nam và input sai. 4 API-client regression tests tiếp tục đạt.
- Work Mongo/HTTP integration suite 10 tests đạt, 0 skipped. Case mới kiểm name/description không dấu, ngày Việt Nam, lifecycle, cursor/total và scope Workspace; các case Task/Comment/quyền/concurrency cũ tiếp tục đạt.
- Headless Edge → React → Express → MongoDB 8.0.17 replica set riêng `workflow_fe_projects_test`. API requests được chuyển tới server test thật, không mock payload nghiệp vụ. Kiểm Home→Workspace→Project, create/edit Owner, search/no-results/reset, member tab, conflict giữ draft không ghi đè, refresh, archive/reopen và reload route trực tiếp.
- Browser Member không có create/edit/archive controls; sau membership inactive và refresh, nội dung Project bị ẩn và báo không khả dụng. Không page error hoặc overflow ngang tại 1440/1280/390 px. Screenshot Workspace được xem kiểm bố cục local, không là pixel-match Figma.

## Chạy lại

```powershell
# Từ BE
node --test test/project-query.test.js
node scripts/run-integration.js test/work-mongo.test.js
# Từ FE
pnpm test
pnpm build
```

Browser harness local ignored, chưa đóng gói thành CI. Kiểm tay ở localhost:5173: Owner tạo/đổi tên/archive/reopen; Member chỉ xem; hai người đổi Project cùng version → conflict; khoảng ngày sai; reload URL Project. Không chạy worker SMTP nếu chỉ kiểm UI.

## Còn lại

Board/Task/My Tasks/editor, quản lý Members/Invitations/Settings, member search/time, English UI, Google FE live và NFR chưa thuộc nghiệm thu này. Filter state chưa phục hồi khi rời màn rồi back. Route Project hiện tổng quan/lifecycle, Board nối ở increment kế tiếp.
