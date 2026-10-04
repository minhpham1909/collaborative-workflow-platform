# Cài đặt Workspace / Email riêng — FE v0.1

04/10/2026. Tiếp nối [Thành viên/Lời mời](FE-TEAM-INVITATIONS-v0.1.md); [QA](../qa/FE-WORKSPACE-SETTINGS-CHECK.md).

## Thông tin nhóm

Owner có tab Cài đặt nhóm: tên tối đa 200 UTF-16 units theo BE, mô tả tối đa 20.000 graphemes. Dùng shared Tiptap editor và rich-text envelope như Task/Comment; hỗ trợ headings, lists, links, emoji, đếm từ/ký tự. Không mở editor mới hoặc lưu HTML trực tiếp. Mô tả ở header Workspace hiển thị read-only qua cùng editor.

PATCH /workspaces/:id dùng expectedVersion Workspace; response thành công cập nhật header/context. Lỗi version giữ draft, không tự lấy version mới rồi ghi đè. Tải lại/Hủy xác nhận bỏ draft. Mất Owner hoặc membership sẽ xóa form/draft sau lỗi; Owner quyền thay đổi được phản ánh vào tabs. Không thêm quyền xóa Workspace.

EditorCore chuyển readOnly bằng `setEditable(editable, false)`: thay chế độ do code không phát update giả. Trước sửa, setEditable mặc định emit update làm form dirty khi mới mở; regression Task/Comment đã kiểm sau sửa.

## Email của bản thân trong Workspace

Mọi Member active có tab riêng; Owner cũng chỉ sửa mình. GET Workspace lấy own emailOverrides và membershipVersion; GET /users/me lấy global emailPreferences. Bốn sự kiện assignment/comment/content/status có inherit/on/off, hiển thị giá trị hiệu lực từ draft lựa chọn và snapshot global. Giá trị là trạng thái đã tải, không tuyên bố realtime giữa tab.

PATCH /email-overrides dùng membershipVersion, độc lập version Workspace. Reset POST /email-overrides/reset có xác nhận, đưa bốn loại về inherit. Reset không tắt tất cả. Response cập nhật membershipVersion cho lần lưu sau. Rời/bị loại xóa override, rejoin inherit do BE; UI giải thích rõ. Email auth/bảo mật không bị preferences công việc tắt.

Chặn double submit, khóa form/tab khi lưu; không auto retry mutation. Nếu network ambiguity, khóa gửi tiếp cho tới khi tải lại kiểm trạng thái. Dirty guard cho đổi tab, anchor navigation và beforeunload; back/logout qua mọi route vẫn thuộc router guard trước release. Reload/back chưa giữ tab/filter.

Tiếp theo: signup/verify/recovery FE và Terms/Privacy review, English, routing/draft polish, Project mô tả bằng shared editor, Task assignee picker server search. Storage/announcements vẫn phase riêng.
