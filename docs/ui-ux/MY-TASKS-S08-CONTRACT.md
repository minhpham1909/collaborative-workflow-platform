# S8 — Công việc của tôi

09/10/2026. Nguồn: Stitch local `c_ng_vi_c_c_a_t_i_qu_n_l_nhi_m_v_c_nh_n/code.html` và `screen.png`; giữ nền cream/indigo/Jakarta đã chọn, dùng skill ui-ux để kiểm tra trực tiếp, không làm lại wireframe.

## Mục tiêu và bố cục

Thành viên tìm công việc được giao qua nhiều Workspace/Project, so sánh bằng hạn, trạng thái và ưu tiên, rồi mở chi tiết để làm việc. Header → tổng quan kết quả lọc → thanh tìm/lọc gọn → nhóm theo hạn → tải thêm. Mặc định chưa hoàn thành và tài nguyên Active.

- Ba thẻ: cần xử lý = overdue + today, sắp tới = upcoming, hoàn thành = completed. Đây là số lượng của toàn bộ kết quả lọc hiện tại, không phải báo cáo tuần hay số đã tải. Không có dữ liệu thì hiển thị dấu chờ, không số0 giả.
- Năm nhóm server: overdue, today, upcoming, no_deadline, completed. Done luôn vào completed, không quá hạn. today dùng ranh giới ngày Việt Nam và chưa quá hạn tại asOf; upcoming gồm mọi hạn từ ngày mai. Giữ ngày tạo mới nhất trước trong mỗi nhóm; toàn bộ pages vẫn dùng sort/cursor theo ngày tạo.
- Header nhóm ghi tổng BE và số đã tải. Nếu nhóm có tổng nhưng chưa có item trong trang, hiển thị giải thích và CTA tải thêm chung; không ngụy trang phân trang là nhóm rỗng. Không tính KPI từ12 items đầu.
- Row: code nếu có, Workspace/Project links, title, priority, deadline/completedAt, nhãn kể cả archived, checklist progress, status và link toàn trang. Không bịa completion timestamp cho legacy. Tài nguyên Archived có nhãn chỉ đọc.
- Không thêm mock personal Task creation, bulk checkbox/actions, calendar view, personal Kanban, column customization, attachment/comment counts, Sprint metrics hoặc tăng trưởng tuần khi chưa có nghiệp vụ/API.

## CTA → API → quyền → trạng thái

| CTA/khối | API/input | Giới hạn quyền và kết quả |
| --- | --- | --- |
| Search/lọc/tổng quan | GET `/my-tasks`, q/status/state/priority/workspaceId/projectId/labelId/timeField/from/to/overdue, limit12 | Assigned + current membership; ban checks, exclude trash, match Project/Workspace. count/groupCounts trước cursor. |
| Workspace picker | GET `/workspaces`, q/limit/cursor | Paginated authorized list, giữ ID đã chọn khi search khác; đổi Workspace bỏ Project và label. |
| Project picker | GET `/workspaces/:id/projects?state=all&limit=20` | Chỉ tải khi chọn Workspace; paged; đổi Project bỏ label. |
| Label picker | GET `/projects/:id/labels?limit=20` | Nhãn scoped Project; chỉ tải khi chọn Project, có archived historical labels để lọc. Không lấy options từ Task page. |
| Tải thêm | GET `/my-tasks`, giữ filters + cursor | Merge/dedup, khóa double click, giữ loaded rows khi lỗi mạng; unauthorized clears. Retry đọc lại trang đầu. |
| Mở Task | GET Task/Project/Workspace qua TaskPanel/TaskDetail S7 | Parent ID expected check; Task mutations/CAS/current permissions giữ S7. Close refresh cùng filters và restore focus. |
| Toàn trang/quay về | `#task/:id?returnTo=...` → validated `#mine?...` | Return target chỉ My Tasks; whitelist/filter validation; query không mở redirect bên ngoài. Clear không đúng ID hoặc lựa chọn. |

## Lifecycle

- Debounce300ms; generation loại phản hồi cũ. Đổi query xóa dữ liệu/số liệu cũ ngay; same-query refresh giữ DOM cho focus. Ngày from > to chặn request và xóa kết quả. Search tối đa200 ký tự; BE vẫn validate độc lập.
- Compact search/status/reset; quick open/all/done/overdue; nâng cao Workspace/Project/label/priority/Archive/time. Không ẩn CTA cần thiết; native date/select giữ theo component hệ thống.
- Filter URL được thay bằng replaceState, không tạo một history entry cho mỗi ký tự. Deep return/refresh cùng query giữ filters; không lưu vào account khác. Load-more page count/scroll không được serialize, quay toàn trang về thì tải lại từ đầu.
- Pending panel/draft dùng S7 guard. S8 không tuyên bố toàn bộ Back/Forward/draft guard đã bao phủ; gate rộng thuộc S12.
- asOf hiển thị rõ, refresh để cập nhật thời gian/quyền; không realtime polling. Không tạo nguồn dữ liệu giả để giống mockup.

## BE thay đổi nhỏ cho bộ lọc

My Tasks thêm `projectId` ObjectId filter sau authorized Workspace/assignee/bans, cùng pipeline count/page; không mở endpoint hoặc quyền ghi mới. DTO thêm workspaceState/readOnly để biểu diễn effective Archive của cha. Không đổi schema/index/data hoặc backfill.

Theo dõi nghiệm thu ở [QA S08](../qa/UI-STITCH-S08-CHECK.md).
