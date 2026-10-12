# M3 — collection views

12/10/2026. M3a Notifications đạt. Chi tiết/Thu gọn thay density, giữ thông tin/action/read state; single notification luôn full detail. Browser-local preference riêng account+collection, invalid/blocked storage fallback và đổi mode vẫn dùng được.

Return từ Task/detail: lưu chỉ query, anchor ID, geometry và số trang trong bộ nhớ (max20entries/max20pages; clear khi account change). Return list re-fetch theo quyền hiện tại, không dùng cached notification bodies; khôi phục anchor offset hoặc scroll clamped nếu item không còn. Filter change hủy kết quả cũ. Với hơn240 item đã tải, auto restore giới hạn20pages; tiếp load-more thủ công. Không hứa mọi tình huống Back/cross-tab/reload đều khôi phục exact vị trí; hard reload không giữ module-memory anchor.

M3a QA: light/dark fixtures PASS, 2 modes×5width English, Việt switching/return, no view-change read/write/query/cursor mutation, reload preference, blocked storage usable, Task/detail fresh2page return (<3px offset), detail full. NotificationsS9a Vi/En/5width regression PASS gồm signed filtered read-all, unknown write readback, search races, masking leave/rejoin. FE25/25 PASS (view preference scope + bounded return), build/budgetPASS. Fixtures DB/API riêng; không gửi provider/email/devwrites. Screenshot `.local/inbox-views/` ignored.

M3b tiếp: cùng control trên collections phù hợp; Team/Audit giữ bảng; bounded lazy-load có manual fallback, không tự chạy worker hay tạo data.

## M3b hoàn tất

- Shared CollectionView/hook dùng trên Home Workspaces (thay control cũ, giữ aria labels), Organizations, Organization Workspaces, Workspace Projects và Guest Shared Projects: card/list, account+scope preference. My Tasks dùng detailed/compact, giữ nhóm hạn/counts/tags/actions. Team/member/audit giữ bảng; checklist/comments/reopen/trash giữ bố cục nghiệp vụ riêng, không ép card/grid cho mọi list.
- List bố cục ngang trên desktop, về hàng dọc trên mobile; caption dài vẫn wrap, Project excerpt có tối đa2dòng và mở Project để đọc đầy đủ. Không đổi API/role/filter/sort/cursor. Chọn mode không tạo request mới; invalid/blocked local storage không cản thao tác.
- Inbox lazy loading **opt-in, mặc định tắt**, tự tải tối đa3trang mỗi lượt list/filter, manual Load more luôn có. Pending/cursor guard tránh gọi trùng; query reset/unmount hủy observer; không auto retry khi lỗi, unsupported IntersectionObserver vẫn dùng manual. Lỗi mạng khi append giữ dữ liệu đã tải;401/403/404 xóa dữ liệu cũ. Đây không là realtime permission cache hoặc streaming; re-fetch/API action vẫn kiểm quyền hiện tại.
- **4 M3b browser cases PASS** (light/dark×Vi/En):6collections, mode switch giữ item/query, reload persistence, default của account khác độc lập;6collection list/compact×5width =>120snapshots. Pin/Project action giữ handler; không ghi dev/providers. `.local/collection-views/` ignored.
- Lazy fixture80+notifications PASS: opt-in3page cap tới48rows, manual tới60, cursor dedup; lỗi giữ60rows và không auto retry, manual recovery tới72; unsupported observer reload/manual24rows. Lỗi fixture trùng event21 khi tăng seed80 đã sửa sang121/122 trước lượtPASS, không tính lượt lỗi làPASS.
- Regressions **HomeS1, WorkspaceS3, TeamS4a, MyTasksS8, NotificationsS9a PASS**, Vi/En/5width/capabilities/network/draft/filters theo runner. M3a light/dark return checks chạy trước M3b; manual default nên không thay return contract. FE25/25 và build/budgetPASS: entry307859/initial421915/gzip132096/largest395855 bytes, budget giữ nguyên.

Chạy lại: `FE/scripts/check-collection-views.mjs` với `WORKFLOW_JOURNEY_THEME=light|dark`, `WORKFLOW_JOURNEY_LANGUAGE=vi|en`; `FE/scripts/check-lazy-inbox.mjs` và các fixture regressions như trước. Các screenshot overwritten theo theme/locale ở `.local`, không là visual diff guarantee. Không new BE schema/data migration, no dev worker/email/purge. M3a/M3b đạt; tiếp M4 lịch cá nhân với BE counts/queries đầy đủ theo quyền, không tính lịch từ12 item My Tasks.
