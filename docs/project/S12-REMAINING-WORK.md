# Việc còn lại sau rà soát S12

Rà soát ngày11/10/2026 từ checkout hiện tại, [plan cụm](STITCH-UI-CLUSTER-PLAN-v0.1.md), [QA S12](../qa/UI-STITCH-S12-CHECK.md) và [core plan](CORE-EXPANSION-PLAN.md). Không dùng số11/12 gate để suy tỷ lệ khối lượng hoặc production readiness.

## 1. Hoàn thành Vi/En theo cụm — việc tiếp theo

| Thứ tự | Phạm vi còn lại | Điều kiện chuyển bước |
| --- | --- | --- |
| 1 | TaskList Board: filter, column/card/status/priority/checklist/deadline/filtered progress; TaskForm và PersonProfile | Names/documents/codes/enums không bị dịch; search/paging/statistics và quyền Owner/Lead/Assignee/Guest đúng; Vi/En + responsive |
| 2 | ProjectManagement: Lead/Guest/invitations/labels và SharedProjects | Current capabilities/CAS, revoke/Kick/Ban/Archived và mất quyền; không lộ Workspace cho Guest |
| 3 | TaskPanel/TaskDetail, checklist, Comments, activity và reopen/review | Quyền tác giả/Assignee/quản lý, reasons/rate limits, request/review/self-review, history và unknown outcomes giữ đúng |
| 4 | MyTasks, Inbox và public invitation bodies cho các scope | Filter/time/group counts/return context, unread/read/content-unavailable, login intent/token scrub và accept đúng scope |
| 5 | ProjectTrash và shared controls/copy còn sót | Restore theo parent/current access, expiry30 ngày và legacy-unscheduled không bị hiểu thành backup; không thêm nút purge chưa có quyền/API |

Project header/overview/rename/description/Archive ởS12d5a là một slice, chưa đồng nghĩa Board hoặc cảProject đã English. Những file trên có giao diện/cơ chế hiện hữu; việc còn lại chủ yếu là locale và nghiệm thu xuyên luồng, không phải xây lại từ đầu.

## 2. Đóng gate UI tổng thể

- Chạy lại luồng tạo → xem → sửa → hủy → mất quyền → lỗi mạng, Vi/En và scope2Org +standalone +Guest trên các cụm vừa đổi. Giữ negative tests/CAS/single-write/unknown readback, không chỉ screenshot đẹp.
- Kiểm loading/empty/error/read-only/success, keyboard/focus/modal/scroll, touch targets, dài tên/mô tả, lịch sử Back/Forward/hash/drafts và các điểm chuyển account. Những kiểm scoped đã đạt là nền; không tự công bố toàn-site accessibility hoặc draft protection toàn diện.
- Đối chiếu Stitch local theo screen contract; không thêm KPI/presence/CTA giả vì mockup có. Assets hiện có và ảnh/fallback phải tải ổn, không có external runtime từ export.

## 3. Hiệu năng — còn mở

Entry build hiện lớn hơn500kB. App đang chỉ lazy-load Settings; EditorCore có chunk riêng. Cần đo và chia route/feature phù hợp, giữ loading/error/retry và auth/draft behavior; đo lại initial payload/caching/interaction, không nới warning threshold để coi đạt.

Không gọi performance gate hoàn tất chỉ vì build thành công hoặc ảnh375 không tràn trang.

## 4. Trước khi đưa lên internet

Core C1–C6 và các browser fixtures đã có scoped evidence. Còn nghiệm thu cấu hình production: HTTPS/origins/cookies/CSRF, Google/SMTP production, replica set/index/migration rehearsal, backup/restore/rollback, worker scheduling/retry/monitoring và giới hạn tài nguyên dưới tải dự kiến. Local rehearsal không thay SLA/backup/provider acceptance ở môi trường thật.

Không xử lý hàng đợi SMTP/moderation/retention cũ củadev hoặc backfilllegacy chỉ vì đang nghiệm thuUI. Cần tách cấu hình và dữ liệu production, xác định phạm vi thao tác trước khi mở workers. Email thửS12 đã được xác nhận Inbox ở lượt trước; không cần gửi lại chỉ vì đổi copy.

## 5. Ngoài scope hiện tại / cần nghiệp vụ riêng

- Manual permanent purge và chuyển Workspace độc lập vàoOrg còn mở: chốt quyền/điều kiện trước API hoặc CTA destructive.
- Storage/upload/quota, realtime/presence/mentions, sprint/calendar/meetings/timer, billing/domain/SSO/2FA và custom RBAC chưa được coi là yêu cầu phải xây để đóngS12. Nếu muốn phát triển, mở spec/gate riêng.

Ưu tiên: hoàn tất locale theo bảng → regression/visual tổng → đo và tối ưu bundle → kế hoạch nghiệm thu production. Tránh mở module mới giữa lúc gateUI còn dở.
