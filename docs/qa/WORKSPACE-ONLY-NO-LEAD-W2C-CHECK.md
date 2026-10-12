# Workspace-only W2c — bỏ quyền Project Lead

12/10/2026. Patch BE+FE; không migration data dev hoặc xóa lịch sử.

## Hành vi đã triển khai

- `projectAccess` không còn isLead. Editor Task, labels, review reopen, trash/restore, description và profile role không dùng leadId cấp quyền.
- Quản lý lấy current Workspace access.canManage: Owner/Manager của standalone đã có ở W2b. Attached Workspace giữ Org/managerId access cũ đến khi migration riêng; không coi Organization đã bỏ xong.
- Task Creator/Assignee giữ quyền nền; Project Creator giữ edit-description-only; Guest chỉ đọc/bình luận, không quản lý hay nhận Task.
- Project DTO không leadId/manageLead/accessRole=lead. FE Project header, management dialog/tab và PersonProfile không hiển thị Lead; copy Việt/Anh nói quyền quản lý trong Workspace.
- PATCH `/projects/:id/lead` trả `PROJECT_LEAD_RETIRED`410 sau auth/verified; không mutation, không cấp quyền. Service/store/input Lead đã gỡ. FE có lời giải thích Việt/Anh cho client cũ gặp410.
- Schema leadId và enum audit lead_changed giữ cho dữ liệu lịch sử; current reads/permissions không dùng. Không clear/backfill dữ liệu cũ hoặc tự nâng former Lead thành Manager.

## Reopen đúng policy mới

Owner/Manager direct Done→todo/in_progress phải có reason khi chưa pending. Có pending thì direct path từ chối: requester chính mình SELF_REVIEW_FORBIDDEN403, requester khác REQUEST_PENDING409. Task.permissions.status=false lúc Done có pending, đồng nhất UI/BE; dùng review endpoint với Task+Request CAS và không self-review.

Review approval vẫn ghi history/reason/request ID, clear completedAt hiện tại và kiểm lại Assignee; quota/cooldown giữ Task+requester semantics hiện có. Không reset quota bởi bỏ Lead. Cleanup/cancel theo Task trash/Archived/exit giữ nguyên. Manual comment moderation của Owner/Org cũ chưa gỡ trong patch này, không coi đó là policy mới đã chốt.

## Evidence

- BE unit70PASS,16integrationSKIP ở invocation không DB;0FAIL.
- Full isolated BE integration124PASS,0FAIL/skip: auth, accounts, Workspace, Work, Organizations/lifecycle, Guest, moderation, labels/checklist, reopen, retention, core HTTP e2e, pins, Calendar.
- FE unit26PASS; build/budgetPASS: initial422103bytes,largest395860bytes. Không đổi budget để đạt gate.
- Browser Project management S6bPASS: Owner/Manager labels, demotion khi form dirty giữ draft và chặn save, archived Guest revoke, invitation/link revoke; Việt/Anh và5width. Controls Lead absent.
- Browser Task reopen S7b và trash S11PASS: queue, CAS/draft, self-review, Manager rejection, cooldown/quota, lost response/readback, Archive cancellation, restore/current assignee/access loss; Việt/Anh và5width theo từng harness. Không suy pass chỉ từ BE.
- Retired route410/current-role projection, legacy leadId không quyền, Member cannot label/edit Task của người khác; Workspace appointment CAS và Manager demotion dùng fixtures cập nhật.

Các failure đầu của suite đến từ fixture giả định Lead cũ/name preview/attached Manager exit cần handoff; đã sửa fixture theo đúng nghiệp vụ và rerun toàn integrationPASS. Browser dồn requests gặp rate limiter; script pacing chia giai đoạn, không nới limiter production. Fixture tests role mutation không tác động accounts/data dev.

Tất cả Mongo/browsers dùng DB/API tạm, fake mail khi suite yêu cầu; không bật SMTP/purge/moderation dev queues, không Mongo27017/27018 migration, không deploy. FE changes nhỏ giữ visual/component hiện tại; đây không là nghiệm thu toàn bộ UI mới.

Tiếp W2d: tách TaskListItem/TaskDetail và read projections/counts theo screen data spec, rồi nối metadata/create/settings/Team UI. Organization removal cần inventory/mapping/rehearsal riêng trước cutover; chưa được giải quyết chỉ bằng bỏ navigation.
