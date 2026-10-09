# C2 core gate — invitation entry / Guest context

05/10/2026. C2 đạt gate core trong phạm vi dưới; không phải nghiệm thu redesign Stitch hoặc production/live providers.

## Thay đổi

- FE đọc `/invite`, `/organization-invite`, `/project-invite` token hash; scrub URL trước render, giữ kind/token trong memory của tab. Đăng nhập email/Google dùng cùng intent, không auto accept. Register/recovery/verify routes giữ intent trong tab; loginHref trở lại đúng loại invitation.
- Public invitation page cho xem scope/role trước đăng nhập. User chưa xác minh có resend/reload; User đăng nhập thấy email đang dùng và phải bấm accept rõ ràng. Scope Organization/Project labels không dùng nhầm Workspace role.
- Accepted Project đi tới Project, Organization kèm Workspace đi tới Workspace; Organization không kèm Workspace về Home với xác nhận. Redirect chỉ chấp nhận ObjectId, không URL tự do.
- Guest Shared list có query/lifecycle/time/cursor/retry/empty; navigation riêng. Project/Task không gọi Workspace API khi accessRole=guest; BE context chỉ workspaceName/canOpenWorkspace, capabilities thật giữ nguyên sau mutation.
- Project/Task/TaskList actions dùng capabilities, Guest không thấy tạo/sửa/xóa/Archive; active Guest bình luận được, Archived chỉ đọc. Không nới quyền Workspace/Org cho Guest để UI chạy tạm.
- Fix EditorCore lifecycle: React Suspense có thể reconnect effects với instance đã destroy khi mở Composer; không gọi setEditable/commands trên destroyed instance. Real browser tái hiện trước sửa, C2 + Interaction regression đạt sau sửa.

## Bằng chứng chạy

- BE unit 52 pass, 9 dedicated Mongo suite skip riêng lượt unit; integration toàn BE 73 pass, 0 fail/skip.
- FE unit 13 pass; build 114 modules.
- `FE/scripts/check-c2-invite-flows.mjs`: Playwright Edge headless + React/Vite + Express/Auth/Workspace/Work/Organization/Inbox thật, isolated Mongo replica set `workflow_fe_c2_test`, fake accounts và test keys. Không gọi SMTP worker/provider hoặc Google thật.
- Browser: Guest LINK public preview → register/back intent → login → explicit accept → Board/Task → write Comment → revoke → unavailable/shared empty. Không GET Workspace restricted; không create membership rộng.
- Organization EMAIL preview → login unverified → reload sau fixture verify → explicit accept → đúng Workspace. Email mismatch → logout/account switch → correct accept. Uncertain accept đã commit nhưng fixture trả 503 → không tự retry, button khóa, shared list phản ánh quyền thật. Private Project denied; Archived Guest comment không có CTA; shared lifecycle filter hoạt động.
- Scrubbed URL reload không còn token: yêu cầu mở lại link, không auto join; local/session storage không chứa invite token. Đây là memory-only intent, không hứa giữ token qua reload/tab mới.
- Root không overflow ở 1440/390, không page errors. Screenshot local ignored `.local/qa-c2/guest-task-desktop.png` / `guest-task-mobile.png`; giữ style hiện có, chưa visual P6.
- Regression browser Account, Team và Interaction đều pass: standalone Workspace invite/login/accept, signup/verify/reset, member CAS/transfer/revoke/leave, editor/comment/archived/draft/nested dialog.
- `git diff --check` pass.

## Giới hạn / kế tiếp

- C3 Ban/moderation/hard Comment delete, C4 Task enrichment/reopen, C5 archive/trash/purge, C6 production migration/restore/NFR chưa nghiệm thu.
- Không bật SMTP/dev queue cũ. URL entry đã có trên Vite; production phải có SPA fallback cho ba path mail entry trước deploy. Chưa Google/SMTP live test mới.
- Signup thực + verify token có browser regression Account riêng; C2 combined fixture kiểm register/back intent và verified gate bằng cập nhật fixture. Không coi fixture verify là mail Inbox/Spam thật.
- Organization administration/Lead/Guest management full UI theo Stitch và design system là U1/U2; C2 hiện nối core entry/scoped views. Filters/context Back fallback P4 vẫn backlog riêng.
- Giới hạn 7 ngày invite implementation-selected; Guest link multi-use/revoke đã có, Ban chặn rejoin thuộc C3.
