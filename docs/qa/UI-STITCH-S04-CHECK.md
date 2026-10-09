# S4 — QA Organization Team

07/10/2026: **4a và4b đạt trong scope Organization Team**. [Contract](../ui-ux/ORGANIZATION-TEAM-S04-CONTRACT.md). Không đánh dấu toàn bộ phân quyền UI hoàn tất; Workspace/Project scoped UI còn S5/S6.

## 4a đã thực hiện

- Organization collection có navigation sang deep link Team; breadcrumbs quay lại đúng Org. Team dùng bảng theo Stitch, cùng Jakarta/cream/indigo foundation, avatar thật/initials, ba role đúng core.
- Dynamic name search/ngày gia nhập/total/pagination cho members. Owner/Admin có invitations/email search/state/date/total, form mời kèm Active Workspace tùy chọn, revoke confirmation.
- Read-only Member không thấy invitation/create CTA. Admin demotion trong form bị BE từ chối; email draft giữ và không có invitation mới. Reload bỏ CTA theo quyền mới. Không sửa role/backend security semantics.
- DTO members/invitations bổ sung filtered total; invitation query dùng shared teamQuery validation, filter trước cursor/count; tên roster không thêm email. Tokens/outbox secrets không vào UI.
- Loading/empty/error/retry và generation guard; old request không ghi đè search mới. Unknown response sau invite commit khóa retry; đóng/readback thấy một record, không tự gửi lại.

## Kiểm thử

- FE14 unit PASS (deep route team hợp lệ/sai/extra segment, invitation routing), build127 modules.
- BE organizations + organization lifecycle integration18/18 PASS sau assertions mới invitation q/state/total + tenant injection rejection.
- `FE/scripts/check-stitch-team.mjs` chạy browser/real API/replica set tạm: Owner/Admin/Member/private Org,3-row scope, name search total1, create email+Workspace đúng parent, revoke persisted, invitation state, members16/page12 + invitations16/page12/load more. Race Lan→Minh, network clear/retry, stale admin denial/draft, committed response loss/invite readback đều pass.
- S2 Organization browser regression PASS. C2 invitation/login/register/account-switch/Guest/verified gate regression PASS vì chạm App/router.
- Chụp và xem `.local/stitch-team/members-{1440,1280,1024,768,375}.png`, `invite-dialog.png`; đối chiếu source `qu_n_l_th_nh_vi_n_ph_n_quy_n_studio/screen.png`. Không horizontal overflow5 widths/page errors.
- Installed skill probe qua fixture-auth adapter `.local/stitch-team/probe-members/report.json`:0 Hỏng, consoleErrors rỗng. Giữ các Gu finding: focus rings theo dự án; warm border/native dates; table cell-divider heuristic đang so cell giữa các row (screenshot đường chia thẳng); shadow mobile menu so account dropdown đang đóng; header mixed alignment. Không tuyên bố Gu clean hay accessibility certification.

## Còn lại / an toàn

- Workspace Team/Ban/cleanup scopeS5; Project Lead/Guest scopeS6; các hạng mục này không bị coi là đã hoàn tất qua S4.
- Không presence/2FA/seat limit/SSO/export/bots/custom RBAC/title/Guest-org mock. Guide phân quyền chỉ mô tả nghiệp vụ đang có.
- Không chạy SMTP/purge/backfill hoặc thay dev collections. Test invitations/outbox chỉ trên DB tạm, không gọi provider. API project đã restart đúng tiến trình để nhận query mới; health ready, logs `.local/s4-api*.log`. Mongo27017/27018 giữ nguyên.

## S4b đã thực hiện và kiểm tra

- Member rows có Workspace allocation, Owner-only role/transfer controls; Owner row không role-edit/transfer-to-self. Admin có allocation, không thể đổi role/transfer. Reuse shared forms/dialog focus stack/draft guard; ảnh role/Manager/transfer ở `.local/stitch-team-management/` đã soi thực tế.
- Real API/browser `FE/scripts/check-stitch-team-management.mjs` PASS: nâng/hạ role, CAS stale giữ draft, add WS immediate membership, Archived Manager recovery giữ archived/Org role, audit actor Minh→Lan, typed Org name transfer, Owner cũ mất management/new Owner có controls, Admin role matrix.
- Live Admin demotion trước Manager PATCH bị deny, Workspace manager không đổi; selection draft giữ. Lost role response sau commit khóa resend, close/readback thấy role thật. Không gọi providers/dev DB.
- BE organizations/lifecycle18 integration PASS, FE14 unit/build129. S4a browser regression PASS sau S4b để giữ invitations/search/date/totals/race/unknown flows.
- Screens1440/1280/1024/768/375 không horizontal overflow. Tablet768 từng bị cột ngày ép/nút Owner rớt dòng; đã chuyển row thành labeled layout ở<=1000. Installed skill probe chạy lại **0 Hỏng**, consoleErrors rỗng; vẫn giữ Gu exceptions đã ghi S4a.
- Audit DTO additive actorName/targetName batched theo page đã scope Org; không đưa email/token, không lookup từng row. Audit read không mở cho Member. Current name là nhãn hiển thị; không sửa ID/action lịch sử.
- API dev đã restart đúng process, health ready/log startup sạch; Mongo27017/27018 giữ nguyên. Manual purge/SMTP/backfill vẫn tắt.
