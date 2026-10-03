# Đối chiếu Stitch/Figma và nghiệp vụ

Ngày 03/10/2026. Chủ dự án chọn phong cách creative studio, nền kem/multi-accent. [File nguồn](https://www.figma.com/design/TQpGbJPdfs7CFMYBUKpvNE/collaborative-webapp?node-id=0-1). Mô tả của Stitch là context, không tự phê duyệt nghiệp vụ mới. Bản teal trong `visual/` giữ làm lịch sử.

Cả 4 frame import rộng 1280px, dù mô tả nói 1440px. Home/Workspace dùng top navigation, Board/Task dùng sidebar. File có editable text/frames, nhưng không local variables/text styles hoặc component instances trước lần chuẩn hóa này.

| Quan sát canvas | Xử lý theo core |
|---|---|
| Kem/tím/pastel, Plus Jakarta Sans | Giữ visual, shared tokens/components |
| Home KPI hôm nay, member/project counts, avatar stacks | Dữ liệu demo; cần định nghĩa/contract trước khi bật trong FE |
| Workspace archived/departed | Bỏ; archive hiện thuộc Project; không đọc nhóm cũ sau mất membership |
| Billing, sprint/report, Task progress, tags/favorite/templates | Bỏ trong core; chưa có requirement/contract |
| Project deadline/team riêng | Không suy từ Task dueAt hoặc Workspace membership |
| Cover ảnh | Có thể là minh họa preset; không thêm upload khi storage Upcoming |
| VI / VNĐ và ⌘K | VI/EN, Ctrl+K Windows/Cmd+K macOS khi search có hành vi tương ứng |
| Autosave cùng Lưu/Hủy | Explicit save, draft trong tab, dirty guard |
| Active đồng nghĩa có thể sửa | Quyền còn phụ thuộc Owner/Creator/Assignee và membership |
| Task deadline chỉ ngày | Ngày + giờ tới phút, giờ Việt Nam; UTC khi gửi BE |
| Done gạch ngang tràn card; comments ngoài frame | Sửa wrapping/decoration; panel có vùng cuộn, direct link full page |

[Prototype local](stitch-review/README.md) bổ sung My Tasks dạng danh sách phẳng: title → Workspace/Project, status/deadline bên phải, mới tạo trước. Filters thời gian/search giống Board. Loading/no-results/error/conflict/validation/unavailable biểu diễn riêng. Comment quyền theo tác giả; Archived khóa mọi thao tác ghi; conflict không auto-overwrite/retry stale mutation.

Figma chỉ ghi một phần foundations/components/Home rồi gặp giới hạn lượt gọi Starter. [Ledger](stitch-review/figma-state.json) lưu IDs, canvas mới chưa visual QA. Prototype local đã kiểm luồng/filter/quyền và overflow; không thay thế nghiệm thu Figma/FE production.

Tiếp theo: hoàn tất canvas khi công cụ có lượt gọi; bổ sung comment edit/states còn thiếu; xử lý G01–G04 trong [UI/API gaps](UI-API-GAPS-v0.1.md) trước nối FE theo module. Không thay SRS để khớp tính năng Stitch tự thêm.
