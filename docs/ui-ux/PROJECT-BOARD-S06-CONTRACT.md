# S6 — Project / Kanban

09/10/2026: S6a và S6b đạt trong scope Project/Board/labels/Lead/Guest.

| Vùng / hành động | Contract |
| --- | --- |
| Project header | GET projects/:id + WS context khi có quyền WS. Guest chỉ có Shared Projects breadcrumb, không link parent WS/Org. Hiển thị accessRole thật; readOnly do parent hoặc Project, không suy own Active thành writable. |
| Metadata | PATCH Project version/name/icon hoặc description. Management CTA theo permissions.manageProject; description theo editDescription (current management/Lead/Creator còn scope). Mô tả dài preview2lines/expand khung cuộn, không tự đẩy Board xuống toàn tài liệu. |
| Archive | PATCH Project state + expectedVersion theo current management/WS Active; confirm tác động. Unknown mutation outcome khóa Archive/metadata/create Task tới khi reload; không blind retry. Không API delete Project. |
| Board | GET projects/:id/board q/status/timeField/from/to/overdue/priority. Ba cột todo/in_progress/done; newest created order, mỗi cột limit12/cursor/total đầy đủ theo filter. Không manual ordering hay thêm cột Review từ mock. |
| Whole progress | Board trả statistics scope whole_project + asOf: total/done/overdue/progressPercent, non-trash, cùng authorized project và transaction. Header dùng projection này, không thêm HTTP request thống kê riêng. Endpoint statistics C4 độc lập vẫn giữ cho report. |
| Filtered progress | Footer dùng totals3columns theo query, có nhãn Task phù hợp bộ lọc; không gọi Sprint hoặc coi đó là tiến độ toàn Project khi đang search/priority/date filter. |
| Per-column paging | GET projects/:id/tasks query/status/cursor trả page + total + current project DTO. Merge/dedup chỉ cột được yêu cầu. Read network failure giữ page đã tải; scope401/403/404 xóa Board và context parent. |
| Refresh capability | Board/paged Tasks trả project DTO current scope/readOnly/capabilities, cập nhật header/Create CTA khi parent archive ở nơi khác. BE recheck mọi write; FE không tự cấp quyền từ role label. |
| Cards | Mã thật khi có, priority3mức, labels/checklist/assignee profile/due/overdue/current completedAt. Legacy không code hoặc completedAt giữ unknown, không giả số/ngày hoặc backfill. Done không overdue. |
| Task create hiện có | Giữ create Todo theo API; clear search/date/overdue/status/priority sau success để đọc lại Task vừa tạo. Filters disabled khi form đang soạn; draft/pending guard ở form. S6b thêm priority/labels controls, không coi việc render chúng trên card là edit UI đã xong. |

Desktop/tablet/mobile: Board là region có horizontal scroll khi cần,3cột giữ cấu trúc; mỗi cột có vertical scroll giới hạn75dvh/700px, keyboard focus. Page không tràn ngang. Control/comment/profile không bị stretched link bắt thao tác.

Không fake Sprint/members/presence/meeting/resource upload, không gọi custom RBAC. Colors/Jakarta/cream/indigo từ local Stitch, không import scripts/CDN runtime. Native date/select và visible focus theo foundation hiện tại. UI Vi/En full rollout và history draft guard vẫn còn gate sau.

## S6b — enrichment và quản lý

- TaskForm create/edit priority low/medium/high và tối đa20 Project labelIds. Labels picker paged; archived không gán mới. Khi edit bỏ labelIds khỏi PATCH nếu bộ nhãn không đổi để giữ lịch sử archived; nếu thay bộ nhãn phải bỏ nhãn unavailable theo BE validation. Không chuỗi tạo Task→status/checklist giả atomic; create vẫn Todo.
- Labels GET/POST/PATCH theo Project scope. Owner/Org Admin/Manager và Lead có manageLabels khi effective Active; Creator đơn thuần không quản trị labels. Name60/color6/archived/version theo C4, duplicate name có lỗi rõ.
- Lead PATCH Project leadId/null + Project expectedVersion; chỉ management, target phải WS member hiện tại. Lead không cấp Guest hoặc nâng WS/Org role. Picker có search/paging và selected identity độc lập.
- Guest management GET guests/guest-invitations; invite EMAIL/LINK7days chỉ effective Active/current management. Revoke guest/invitation vẫn được phép ở Archived như security exception. Guest chỉ view/comment, không Task write/assignment, không WS admission. LINK URL chỉ creation result, có copy/manual copy, không lưu token vào list.
- Project DTO manageAccess là current management trong scope kể cả readonly để đọc/thu hồi Guest; không cấp content editing. manageLabels riêng effective Active. BE luôn recheck.
- Deep link `#project/:id/manage` được parse đúng ID/segment; Board và management có Back/Reload rõ. Direct Guest/member URL không mở management controls nếu không capability. Full browser-history draft guard vẫn thuộc gate sau.
- Dialog pending/CAS/permission/unknown errors giữ draft; unknown khóa gửi lại, đóng/reload để kiểm tra. Lỗi tên nhãn trùng/unavailable chỉ rõ cách tiếp tục. Không window dialogs hoặc UI email sent claim.
