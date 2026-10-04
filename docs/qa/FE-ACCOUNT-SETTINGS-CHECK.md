# Account / Personal Settings FE — kiểm tra

04/10/2026. [Thiết kế](../sds/FE-ACCOUNT-SETTINGS-v0.1.md).

- FE unit: **8 tests đạt**, gồm shared refresh, late/queued session guard, fresh CSRF và token rotation khi đổi password, editor/deadline regression.
- BE integration: **13 tests đạt** với Accounts + Users trên Mongo replica set cô lập: password rotation/revoke, nonce/link, validation/Origin/CSRF, own capabilities allowlist, permissions và version conflict.
- Browser harness chạy React thật → Express thật → Mongo replica set fixture: lưu tên và cập nhật shell; preferences + locale; conflict giữ draft/tải lại; sai mật khẩu và đổi đúng, reload còn phiên; Google sai email rồi link đúng; Google-only không có password/link form.
- GIS script và Google verifier được giả lập rõ trong harness. Đây không phải nghiệm thu Google provider thật; không gửi SMTP hoặc thay đổi dữ liệu dev. Tài khoản và cookie đều fixture trong DB tạm, server/browser/DB đóng khi kết thúc.
- Quan sát screenshot hồ sơ; kiểm không tràn ngang tại 1440/1280/390px và không có page errors. Harness/screenshot trong `.local` ignored; API tests và Users assertions được commit.
- Vite build, doc links và git diff whitespace kiểm trước commit.

Chưa nghiệm thu: Google link mới với provider thật, English UI, Workspace email override UI, signup/recovery/policies, router guard cho mọi draft transition, production operations/NFR. Quản lý thành viên/lời mời là cụm màn hình tiếp theo.
