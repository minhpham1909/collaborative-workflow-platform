# Cài đặt Workspace / Email riêng — QA

04/10/2026. [Thiết kế](../sds/FE-WORKSPACE-SETTINGS-v0.1.md).

- **18 BE integration tests đạt** (Users + Workspace), kiểm quyền/version/preferences và membership lifecycle. BE không đổi contract trong increment này.
- **8 FE unit tests đạt** (API/session, editor envelope/deadline regression).
- Browser React thật → Express thật → Mongo replica set fixture: Owner lưu tên/mô tả có Unicode/emoji; header cập nhật; hủy chuyển tab giữ draft; Workspace CAS conflict giữ draft và reload; override save/reload, membership CAS conflict, reset về inherit, global thay đổi phản ánh sau reload; Member không có tab sửa nhóm và không đổi override Owner; mất membership/Owner xóa form và không ghi tên sai quyền.
- Regression browser Board/Task/Comment/My Tasks đạt sau sửa EditorCore: editor không phát update khi chỉ chuyển editable, các flows create/edit/CAS/archive/delete vẫn đạt. Mở form rồi đổi tab không có cảnh báo dirty giả; thao tác nhập thật vẫn có guard.
- Kiểm screenshot email override và không tràn ngang tại 1440/1280/390px; không page errors. `.local` harness/screenshot ignored; không sửa dữ liệu dev hoặc gửi SMTP/Google thật. Fixture server/browser/DB đóng trong finally.
- Vite build, local Markdown links và git diff whitespace kiểm trước commit.

Chưa nghiệm thu: work-email SMTP thực đến Inbox, English, mọi back/logout draft transition, production/NFR và Project description UI. Không dùng kết quả settings CRUD để tuyên bố SMTP delivery đạt.
