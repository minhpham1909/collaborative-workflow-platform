# S3 — Workspace detail / Project collection

07/10/2026. Visual theo Stitch/Jakarta/kem–tím, tái sử dụng shell, FilterPanel, NameDialog, RichEditor, DescriptionPreview và focus/draft guard. Workspace Team giữ cho S5; Organization Team cho S4.

| Vùng / hành động | Contract và quyền |
| --- | --- |
| Header / mô tả | GET `/workspaces/:id`; role thật, state thật. Mô tả dài thu gọn và mở trong khung cuộn. Không giả số thành viên/presence. |
| Sửa tên/mô tả Workspace | PATCH `/workspaces/:id`, expectedVersion/name/description; `permissions.edit`, Owner/Manager/Org Owner/Admin hiện tại và Workspace Active. Rich text tối đa 20.000 ký tự. |
| Project collection | GET `/workspaces/:id/projects`; q/name+description, state, từ/đến ngày tạo VN, cursor; mặc định Active/newest. Total áp dụng toàn query, không đếm page làm tổng. |
| Tiến độ Project | `taskSummary` scope whole_project, total/done/progressPercent; loại trash. Một aggregation cho các Project trong page đã qua kiểm tra scope/Ban, không gọi API cho từng card. Không đổi thành Sprint hoặc năng suất cá nhân. |
| Vào Project | Một link chính phủ vùng thẻ; nút sửa độc lập nằm trên vùng link. Keyboard vẫn có link/nút thật. |
| Tạo Project | POST `/workspaces/:id/projects`, name/icon; `permissions.createProject`. Sau success reset filter để đọc lại Project vừa tạo, toast ngắn. |
| Sửa tên/biểu tượng | PATCH `/projects/:id`, expectedVersion/name/icon; Project management và effective Active. Creator/Lead quyền description giữ ở màn Project (S6). |
| Archive / Unarchive | PATCH `/workspaces/:id/state`, expectedVersion/state/confirmName/reason. Dialog nhập đúng tên + lý do 1–2.000 ký tự; lưu nhật ký. Không xóa dữ liệu, không tự đổi Project own state. Unarchive còn kiểm Manager hợp lệ ở BE. |
| Email riêng | Chỉ có tab khi DTO xác nhận WS membership, kể cả quản trị Org có quyền đọc mọi WS nhưng chưa là thành viên. Archive vẫn cho personal email lifecycle exception. |

`permissions` là projection từ effectiveRole sau access guard. FE dùng để trình bày; BE luôn recheck actor/session/current role/parent/CAS khi mutation. Không cấp thêm quyền bằng DTO hoặc Client.

Archived notice nằm ngoài header flex; Project Active trong Workspace Archived vẫn hiện chỉ đọc. Không dựng delete Workspace/Project, manual purge, transfer hoặc custom RBAC. Attached Workspace không dùng lời mời standalone; assignment/invitation/Manager recovery UI sẽ xử lý S4/S5.

Form lỗi xác định giữ draft trong dialog; conflict yêu cầu đọc lại version hiện tại. Unknown outcome khóa gửi lại; đóng và tải lại trước lần gửi tiếp. Dialog có focus trap/restore, Escape/discard guard, pending guard. Workspace settings hiện xóa snapshot nhạy cảm khi mất toàn bộ scope. Browser-history draft guard toàn diện còn là hạng mục regression, không claim đã bao phủ.

Ảnh là minh họa local theo identity, không phải cover upload; fallback gradient khi ảnh lỗi. UI hiện tiếng Việt, mở rollout đầy đủ Vi/En ở S10.
