# FE Auth/Home check

04/10/2026. Kiểm increment React FE thật + bổ sung server filters Workspace, không dùng prototype làm bằng chứng nghiệp vụ.

## Đã đạt

- Vite production build thành công; font local có license, không cảnh báo thiếu asset.
- 4 FE API-client tests: single-flight refresh của reads song song, bỏ refresh cũ sau clear, không tự retry mutation timeout, giữ phiên khi logout chưa xác nhận.
- 2 BE Workspace-query tests: regex escaped/accent, name/description scope, biên ngày Việt Nam và query không hợp lệ. 2 Workspace-input tests hiện có cũng đạt.
- Workspace Mongo/HTTP integration suite: 11 tests đạt trên MongoDB 8.0.17 replica set riêng; gồm search/time/cursor và không lộ Workspace của người khác.
- Headless Edge chạy React → Express → Mongo thật với user/workspace fixture trong database riêng `workflow_fe_test`: sai mật khẩu, login, empty Home, tạo Workspace, search không dấu/không kết quả/reset, reload restore, logout rồi reload, logout lan sang tab khác. API requests chuyển tới server kiểm thử thật, không giả lập response nghiệp vụ. Không thay đổi tài khoản/database dev và không gửi SMTP.
- Refresh cookie không đọc được qua document.cookie; localStorage/sessionStorage rỗng sau login/reload. Không page error hoặc overflow ngang tại 1440/1280/390 px. Đây không là audit toàn bộ XSS hoặc mọi browser.

## Chạy lại

```powershell
# Từ FE
pnpm test
pnpm build
# Từ BE
node --test test/workspace-query.test.js test/workspace-input.test.js
node scripts/run-integration.js test/workspaces-mongo.test.js
```

Kiểm UI thủ công ở localhost:5173 với BE/Mongo local: dùng tài khoản đã xác minh; thử sai password, tạo Workspace với tên riêng, search tên/không dấu, khoảng ngày không hợp lệ, reload và logout ở hai tab. Kiểm Network để xác nhận filter chạy trên server. Không dùng email thật nếu chưa muốn chạy outbox; browser smoke tự động của lượt này dùng harness local ignored, chưa đóng gói thành CI browser suite.

## Chưa kiểm / chưa triển khai

Google live và SMTP resend chưa kiểm lại trong lượt này. Kết quả Google thật ở lịch sử không chứng minh control GIS FE mới đã nghiệm thu. Signup/Terms, reset/link UI, Workspace→Project→Board/Task, editor, English UI, NFR và production deployment còn các increment tiếp theo. Workspace Home chưa mở vào Project; không ghi thành hoàn thành toàn bộ luồng làm việc.
