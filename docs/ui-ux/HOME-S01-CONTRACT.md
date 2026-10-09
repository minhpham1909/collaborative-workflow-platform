# Screen contract S1 — Home

07/10/2026. Shell/Home theo Stitch, dữ liệu core C1–C6; [QA](../qa/UI-STITCH-S01-CHECK.md).

| Khối/CTA | API hoặc hành vi | Quyền/state |
|---|---|---|
| Greeting/ngày | User.displayName đã xác thực; ngày Asia/Ho_Chi_Minh | UI vẫn Vi; không tự reuse locale email làm language switch |
| Today/overdue cards | MyTasks status=open/state=active, dueAt calendar today hoặc overdue=true | Current assigned WS member, không nhiệm vụ Guest hoặc WS Archived |
| Unread card/latest | Notifications read=unread/limit1 | Minimal current target payload; unavailable masked, không fake mention/realtime |
| Workspace collection | GET workspaces limit12/q/from/to/state/role | Guarded scope trước totals/paging, sortcreatedAt newest |
| Role tabs | roleCounts của scope+q/time+state | all/managed/member là filter, không role cấp cho user |
| State control | state=all/active/archived | Archived giữ card xem/readonly, không bị biến thành deleted |
| Search/time | Debounce250ms; from/to Vietnam day boundaries; generation discards late responses | Không stale card/summary theo filter cũ; invalid range không query; Ctrl/Meta-K focus Home search |
| Grid/list | Presentation trên cùng tập data | Không đổi default sort hoặc count khi đổi view |
| Workspace card | #workspace/id thật, stretched link; name/description/counts/role | Media/icon minh họa ổn định theo id; không giả logo upload/avatar roster |
| Create dialog | POST workspaces {name} | Verified user; single submit/draft guard; unknown outcome không retry mù; reset filters khi success/readback |
| Load more | nextCursor theo cùng query | Giữ item cũ khi load-more lỗi; summary vẫn full filtered set, không items.length |
| Mobile menu | Existing nav routes; modal focus/inert/Escape | Resize desktop đóng portal; account menu chỉ một nơi |

Loading dùng busy + placeholder counters/LoadingState thay vì0 giả. Empty filtered khác chưa có Workspace; inline error có retry, không hidden CTA cần dùng. Success toast không cản pointer; network failure sau mutation yêu cầu readback trước tạo lại.
