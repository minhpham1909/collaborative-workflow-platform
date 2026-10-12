# W2d2 — Home personal overview và priority slice

12/10/2026. Contract đã implement; giữ Workspace/Project/Task data và quyền hiện tại, không thêm Sprint/meetings/mentions.

## GET /home/overview

Auth verified như Work router; query phải rỗng, không nhận account/assignee/Workspace/date/state tùy ý. Response `{scope:'my_assigned_active_nontrash',timeZone:'+07:00',day,asOf,dueTodayOpenCount,dueTodayWorkspaceCount,overdueOpenCount,attentionOpenCount}`.

Scope chung với MyTasks assigned pipeline: current Workspace membership, không Ban trong Org/Workspace/Project, parent khớp và tồn tại; Project/Workspace Active; assignee=current actor; non-trash; status khácDone. Org scope vẫn transitional đến cutover riêng. Scope read không do FE tự lọc page hoặc role từ JWT.

- day tính GMT+7 fixed từ server clock. Today=[start,end), end exclusive.
- dueTodayOpenCount bao cả overdue xảy ra hôm nay; distinct Workspace count trong cùng tập.
- overdueOpenCount: dueAt<asOf, date thật, không Done.
- attentionOpenCount: dueAt<endOfToday, date thật, open; union overdue/today không cộng trùng.
- Inbox không đưa vào aggregate Task. FE dùng `/notifications?limit=1&read=unread` hiện có để giữ unread/redaction/latest-note policy và error boundary riêng.

Counts dùng full dataset, không phụ thuộc Workspace collection filter hoặc list limit. Loading/error không trả0 giả ở FE. Counts và priority/Inbox là requests riêng, có thể chênh khi mutation/time boundary; không claim realtime hoặc snapshot chung giữa chúng.

## GET /home/priority-tasks?limit=3

Limit default3,1–5,string integer canonical; không cursor/query filter khác. Response `{items,totalMatching,selectionRule:'overdue_then_today_priority',scope,timeZone,day,asOf}`. Items dùng TaskListItem W2d1 + workspaceName/projectName; không rich description/checklist/Creator.

Candidate cùng attention scope: open assigned Active Tasks có deadline trước endOfToday. Sort overdue trước today-not-overdue; trong group high→medium→low, dueAt ASC,createdAt DESC,id DESC. Legacy missing priority như medium. Không đưa high-priority future/no-deadline Tasks vào danh sách gọi là hôm nay. totalMatching là whole union count, không items.length. Không pagination ở slice bounded này; CTA mở MyTasks tập đầy đủ.

## UI và links

Home hook thay hai requests MyTasks để lấy counts bằng overview+priority, vẫn load Inbox riêng và dùng existing focus/inbox-change/day-change/revision lifecycle. Account/request stale guards giữ hiện tại.

- Today tile/greeting: `#mine?status=open&state=active&timeField=dueAt&from=day&to=day`.
- Overdue tile: cùng base, `overdue=true`, không ngày range.
- Priority “Xem công việc”: cùng base, `to=day`; bao tất cả ngày quá hạn và hôm nay, loại dueAt null qua typed date filter.
- Unread tile: `#notifications?read=unread`.

Home priority section dùng đúng slice, không ghép hai pages newest-first rồi tự deduplicate/sort tại FE. Overview fail hiện“—”/thông điệp, priority và Inbox vẫn có thể thành công; không lấy0 làm kết quả lỗi. Server day dùng cho links; client day timer chỉ trigger refresh khi đổi ngày.

Không index/schema/dev data writes hoặc worker/backfill. Home full contract nhỏ; metadata settings/role UI, Org migration và các read projections khác vẫn patch riêng.

[QA](../qa/WORKSPACE-ONLY-HOME-W2D2-CHECK.md).
