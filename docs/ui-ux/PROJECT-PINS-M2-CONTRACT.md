# M2 — ghim Project cá nhân / truy cập nhanh Kanban

12/10/2026. Triển khai theo kế hoạch M2 và yêu cầu ghim/mark để mở nhanh Kanban. Đây là tùy chọn cá nhân, không là cấp quyền hoặc thay trạng thái Project.

## Nghiệp vụ và dữ liệu

- Tài khoản đã xác minh có quyền đọc hiện tại được ghim Project: Workspace Member/Owner/Manager, Project Guest, Org Owner/Admin đọc được Workspace trực thuộc. Chỉ đọc Project Archived hoặc Workspace Archived vẫn ghim/bỏ ghim được.
- Mỗi tài khoản tối đa20 ID Project, lưu trong `users.projectPins`. Ghim mới ở đầu; ghim lại không đổi thứ tự hoặc tạo bản sao. Không tự bỏ ghim cũ khi đủ20. Dữ liệu User cũ thiếu field được coi là mảng rỗng; không backfill hoặc index mới.
- Không cache tên/Workspace/role ở DB. Mỗi lần đọc list kiểm quyền qua cùng `projectScope/projectAccess` như Project hiện tại. Chặn bởi Ban, mất membership/Guest hoặc parent mất: trả marker `available:false`, chỉ có Project ID từng được ghim; không tên, icon, tên/ID Workspace hoặc trạng thái. Không có link mở nhưng vẫn bỏ ghim được. Cấp quyền lại: list hiện lại theo quyền mới.
- Ghim là intent boolean rõ ràng, không endpoint toggle. Chạy trong transaction với kiểm lại user/session/emailVerified và workspace/access fence. Hai request tranh slot cuối không làm vượt20; không tạo notification, email, task hoặc quyền mới.
- API: `GET /project-pins` (không nhận query) → `{items,limit:20}`. Item có quyền: `{projectId,available:true,name,icon,workspaceId,workspaceName,readOnly}`; không quyền: `{projectId,available:false}`. `PATCH /projects/:projectId/pin` body duy nhất `{pinned:boolean}` → `{projectId,pinned,items,limit}`. Auth verified, Origin/JSON/ID/shape/rate limits như Work router; `PIN_LIMIT_REACHED`409.
- Bỏ ghim kiểm auth/session hiện tại và sửa riêng User, không cần quyền tài nguyên cũ còn tồn tại. Không suy cấp quyền từ pin record. Không tăng CAS version của profile/settings vì không sửa những field đó.

## UI/UX

- Ghim/bỏ ghim ở thẻ Project trong Workspace, Shared Projects và header Project. Pin button nằm trên stretched link của card, không bị click card nuốt action.
- Sidebar desktop và menu mobile có mục “Dự án đã ghim”, mở trực tiếp `#project/<id>` vào Kanban. Hiện5 đầu, Xem thêm/Thu gọn cho tối đa20, giữ scroll của sidebar; icon/name/Workspace và hint chỉ đọc theo quyền hiện tại.
- Dữ liệu ghim nằm trong provider theo account, đồng bộ các vị trí trên trang. Revalidate khi mount/đổi route/focus; không quảng cáo cập nhật quyền realtime. API mở Kanban vẫn kiểm quyền lần nữa. Account boundary bỏ state cũ; reply đọc/mutation trễ có generation guard.
- Loading/empty/error/retry rõ ràng. Lỗi mutation đặt cạnh nút; toast cho success ngắn. Lost response không tự ghi lại; khóa action, tải lại list trước khi thử tiếp. Readback thành công dọn cảnh báo cũ. Intent idempotent không đồng nghĩa mọi lỗi đều có thể retry mù.
- Palette chung, Lucide Pin/PinOff, hit targets44px, focus hiện có, Việt/Anh và sáng/tối. Không localStorage chứa Project names hoặc pin list.

[M2 kiểm thử](../qa/UI-PROJECT-PINS-M2-CHECK.md). M3 view modes/lazy loading và M4 calendar còn riêng; không worker/SMTP/provider/dev seed hoặc deploy.
