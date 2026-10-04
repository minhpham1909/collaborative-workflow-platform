# Stitch Kanban và Task — import, review và triển khai

Project `41254457511662208`, truy cập Stitch MCP ngày 04/10/2026 theo yêu cầu trực tiếp. Không tạo/sửa canvas Stitch.

| Screen | ID | Ảnh | Code |
|---|---|---|---|
| Bảng Kanban / Thiết kế Website Bloom | 80a665c29de642a8899aa7af740c881f | [kanban.png](kanban.png), 2560×2468 | [kanban.html](kanban.html) |
| Chi tiết Task & Thảo luận bình luận | bcb8d6af3741455ebd88c7d75de0a0de | [task.png](task.png), 2560×2048 | [task.html](task.html) |

HTML/screenshot tải bằng curl --location từ hosted URLs; screenshot full resolution =s0. [Manifest](manifest.json) lưu metadata, URL và SHA256. HTML có 4 URL ảnh nhúng duy nhất: 2 ảnh tải được vào assets, 2 URL portrait mẫu trả HTTP 400, ghi unavailable trong manifest. Giữ HTML gốc; không thực thi hoặc copy script/CDN vào FE. Không dùng portrait mẫu làm identity thật.

## Review và phần đã áp dụng

- Ba cột Chưa làm/Đang làm/Hoàn thành nền trung tính, dot/badge trạng thái, số tổng phía server, card trắng, border cảnh báo quá hạn, thông tin assignee/deadline gọn.
- Card dùng DTO thật: avatar identity/initials, mô tả ngắn nếu có, chưa phân công và nhãn đã rời. Done không hiển thị cảnh báo quá hạn. Click vẫn mở Task theo route hiện có, không render menu giả.
- Project header gọn hơn; mục tiêu/mô tả mở bằng details và rich renderer chung. Không gắn số thành viên Project vì hệ thống không có Project Membership.
- Desktop cột cuộn độc lập, có tabindex/label/focus để dùng bàn phím; mobile chuyển thành một cột và cuộn trang. Search/time/status/CAS/cursor vẫn hoạt động.
- Thanh tiến độ Done/total lấy tổng từng cột của toàn tập khớp query, không lấy items.length của trang. Label nêu rõ phạm vi bộ lọc; total=0 hiển thị 0%. Không gọi đây là Sprint.
- Chi tiết Task full page: header trắng, metadata theo nhóm, avatar assignee/creator, trạng thái có quyền, createdAt/updatedAt giờ VN, description và comments trong các card riêng. Bình luận giữ tác giả/giờ/quyền edit/delete thật.

## Điều chỉnh so với mockup

Giữ top navigation/Jakarta/VI đã chốt để đồng bộ Home/Workspace; không đưa lại sidebar/currency hoặc font serif do export vào hệ thống. Không thêm tag/sprint/progress từng Task/completedAt/auto-save/share giả vì chưa có contracts. Task detail hiện vẫn là full page; drawer có backdrop trong Stitch là nguồn bố cục, chưa triển khai modal routing/background restoration. Kéo thả đổi status chưa được thêm trong lượt visual này.

## QA

Vite build, 12 FE tests đạt. Fixture React/Express/Mongo Board/Task/editor/comments/My Tasks kiểm author/assignee rights, CAS draft, archive read-only, per-column load more và deleted-unavailable đạt. Fault-injection Workspace/Project/Task/Comment vẫn chặn submit lại sau committed write mất/503 response.

Đã kiểm không overflow ở 1440/1280/390, xem screenshot desktop Kanban/Task; harness/screenshot tại .local (ignored). BE không đổi trong lượt này. Không gửi SMTP hoặc gọi Google thật.
