# S5 — QA Workspace Team

07/10/2026: **Đạt trong scope S5**. [Contract](../ui-ux/WORKSPACE-TEAM-S05-CONTRACT.md). Scope: WS roster/invitations/allocation/leave/Kick/standalone transfer và Workspace Ban/preview/actions/retry/Unban; không full moderation mọi Org/Project UI.

## Thực hiện

- Roster/invitations chuyển bảng responsive cùng S4. Row permissions từ BE bảo vệ Owner/Admin/Manager/self; sửa hardcode Owner và label role. Attached Manager thêm Org member nội bộ qua search/paging; giữ Org role.
- Standalone EMAIL/LINK create, revoke, retry failed email; copy URL/result label rõ, không hiển thị token ở list. Archived không tạo/retry email nhưng vẫn cho đọc/revoke security exception.
- Kick khác Ban; confirm leave/transfer nói hậu quả. Typed standalone WS transfer, old Owner DTO effectiveRole member và management false ngay trong response.
- Ban preview server-count/cutoff, cleanup choices, hard-delete warning + typed cleanup confirmation; reason single-line2.000. Worker/action state, matched/deleted counts, retryfailed giữ selection, Unban không restore hoặc cancel job.
- Names bans/actions batched after scope; không lộ emails/content hoặc giả nhân sự. Không new dependency/worker CTA.

## Bằng chứng

- BE Workspace/moderation/organization integration30/30 PASS; Workspace12/12 pass lại sau fix transfer DTO/CAS assertion. FE14 unit/build132 PASS.
- `FE/scripts/check-stitch-workspace-team.mjs` real API/browser/temp replica: Kick bỏ assignee và giữ2 comments, valid link rejoin không tự giao Task lại; Ban ở Workspace Archived preview2/confirmation/job pending/access denied; failed-job retry về pending; Unban vẫn no membership và job pending/comments giữ; leave route Home; Member không management.
- Manager ở attached WS thêm Admin nội bộ ngay, Org role giữ admin, không được Ban Admin/self-leave khi chưa handoff. Standalone typed transfer giảm old Owner controls, new Owner có quyền; restore ownership bằng service chỉ trong fixture.
- EMAIL create có result chờ gửi; failed mail xếp hàng lại, revoke cancel job; LINK URL đúng `/invite#token=...` chỉ ở creation result. Selector aria-label cho cách mời/textarea link đã bổ sung, không dùng text token làm label. Không gọi SMTP provider.
- Ca cuối thay Manager rồi revoke membership giữa phiên: reload nhận404, roster/modal và tên/mô tả parent Workspace cũ được xóa; root error/tải lại hiển thị. Không giữ management CTA của scope đã mất.
- General `check-interaction-flows.mjs` regression PASS: card navigation/editor/nested dialogs/drafts/Board/Task/author/status/CAS/Archived/deleted scope.
- Đã xem screenshots members1440/1280/1024/768/375 và ban-preview; browser đo không tràn ngang5 widths. Installed skill probe `.local/stitch-workspace-team/probe-projects/report.json` sau chờ roster/moderation load ổn định: **0 Hỏng**, consoleErrors rỗng. Initial hover-layout flag xảy ra khi request đang cập nhật vùng dưới; đo lại stable không tái hiện. Text-pretty sửa orphan word.
- Probe fixture adapter chọn Members tab, fresh fake auth/API route, đợi pending reads, unroute on teardown; measurement code không đổi. Một lần DB tạm startup10s timeout, chạy lại với launch timeout30s; không chỉnh Mongo dev để vượt test.
- Probe adapter ban đầu gặp context disposed/repeated tab-click dưới overlay; đã sửa teardown/navigation adapter và chạy lại thành công. Không sửa measurement để bỏ finding; không coi lỗi fixture này là lỗi hệ thống.
- Warm borders/native dates/focus ring/overlay-shadow heuristic còn Gu exceptions như S4; không claim full accessibility certification.

## Giới hạn

Không gửi SMTP, chạy moderation/retention/purge dev queue hoặc backfill. Job pending trong fixture không đồng nghĩa comments đã bị xóa; worker lifecycle/hard deletion đã kiểm bằng BE dedicated suite. Manual refresh trạng thái, không giả realtime. User DB/process Mongo27017/27018 giữ nguyên.

S6 kế tiếp: Project/Board/Task creation; Project Guest/Lead UI vẫn ở S6. Ban theo Org/Project API có sẵn nhưng không tự suy thành hoàn tất UI các scope đó. History draft guard/full Vi/En/production SLA vẫn còn gate sau.
