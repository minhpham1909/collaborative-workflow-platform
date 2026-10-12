# M4 — lịch công việc cá nhân

12/10/2026. Lịch theo deadline, cùng phạm vi My Tasks: tài khoản đã xác minh, Task được giao cho chính mình, membership Workspace/Org hiện tại và không bị Ban. Org Admin/Owner có quyền đọc Workspace nhưng chưa là member không tự có việc trong lịch. Guest không nhận việc; legacy assignment Guest không mở rộng calendar scope.

## API

- `GET /my-calendar?month=YYYY-MM`: month bắt buộc1900–9999; filter status=open/all/todo/in_progress/done (mặc địnhopen), state=active/archived/all (mặc địnhactive), workspaceId/projectId, q literal AND, priority/labelId optional. Không nhận user/assignee/role, cursor/limit ở endpoint counts.
- Response `{month,timeZone:'+07:00',days:[{day:'YYYY-MM-DD',total,done,overdue}],total,noDeadlineCount,asOf}`. Ngày không có row trong summary =0 sau khi load thành công. `total` chỉ deadline trong tháng; `noDeadlineCount` toàn bộ ngày trong filter (dueAt null hoặc thiếu legacy). Counts từ aggregation toàn bộ dataset có quyền, không12records đã tải. Done không overdue; overdue =dueAt<asOf, status khácdone.
- `GET /my-calendar/tasks?month=...&day=YYYY-MM-DD|none`: cùng filter, thêm limit/cursor như Work pageInput (FE12/defaultBE20/max100). Day phải nằm trong month; `none` không giới hạn tháng vì không có deadline. Response `{items,total,nextCursor,day,timeZone,asOf}`; item như Task DTO, thêm workspaceName/projectName/readOnly. Sort createdAt desc,_id desc theo quy tắc mới tạo trước; không tự kéo/thay deadline.
- Month/day boundaries start-inclusive/end-exclusive theo GMT+7 cố định, lưuUTC. `$dateToString` dùngoffset+07 để nhất quán với parser kể cả lịch sử; không dùng offset lịch sử Asia/Ho_Chi_Minh cho range1900–9999. Leap/year transition có kiểm.
- Assigned pipeline dùng chung với My Tasks: active membership/parent consistency, Project/Workspace Archive filter, scoped Ban, assigneeId=current user, exclude trash/missing parent. Day DTO kiểm lại projectScope; không cấp thêm quyền ghi. Endpoint auth/verified/Origin/rate/strict DTO dùng Work router hiện có. No schema/index/migration/backfill.

## UI

Tab “Lịch công việc” desktop/mobile. Month, previous/next, Today, chọn ngày và filter/search. Count loading là“—”, emptydays chỉ số ngày để giảm nhiễu; aria-label vẫn cócounts. Arrow/Home/End focus trong tháng, Enter chọn; date targets≥44px. Mobile calendar scroller giữ overflow trong vùng lịch khi cực hẹp, agenda xuống dưới; desktop calendar sticky có scroll khi thấp.

Ngày chọn có total và listpaged, Task panel/Full page/returnTo được whitelist giữmonth/day/filter. Close panel re-fetch để cập nhật status/deadline/delete/permissions; data stale month requests bịgeneration guard chặn. NoDeadline riêng, Archive readonly, empty/error/retry rõ, code legacy fallback không backfill. Time display GMT+7, Việt/Anh/theme palette chung.

Counts vàday list là hai request/read snapshot riêng; mutation giữa chúng có thể gây chênh tạm. Refresh/đóng panel tải lại; không realtime/calendar events/drag scheduling/email reminder/Google Calendar integration. Không biến7/12 records UI thành tổng dữ liệu.

[QA](../qa/UI-CALENDAR-M4-CHECK.md).
