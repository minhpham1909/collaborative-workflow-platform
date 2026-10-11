# W2 — Kết quả kiểm thử web xuyên màn hình

11/10/2026. Theo WEB-ACCEPTANCE-PLAN.md; chưa chuyển deploy/CI-CD. Toàn bộ CRUD dùng API/Mongo/browser fixture riêng, không thay dữ liệu Workspace thật, không provider/SMTP hoặc chạy queue cũ.

## Hành trình mới

check-web-journey.mjs kiểm liên tục bằng UI:

1. Owner đăng nhập, chọn Org/Workspace, tạo Project và Task có mô tảUnicode, giao Member.
2. Member vào MyTasks, mở Taskpanel, không có Edit/Delete Task; đổi status và thêm bình luận. Đóngpanel thấy trạng thái mới ởMyTasks.
3. Owner thấy thay đổi trongInbox, đánh dấu một notification cụ thể đã đọc; kiểm UI vàDBreadAt cùngID.
4. Guest vàoSharedProjects, không có Create/Edit/status/Workspace-link; được bình luận, không sửa bình luận củaMember. URLWorkspace trực tiếp bị từ chối, không giữ nội dungTask cũ.
5. Owner softdelete→Trash→restore→Board. MãTask/bìnhluận giữ nguyên, deletedAtnull, không thêmnotification/replay. Search được click/nhập saufeedback; khôngdocumentoverflow/pageerrors ởcác pagecuối.

Built preview4176, chạy tuần tự: vi/1440, vi/375, en/1440, en/375 đềuPASS. Dev5173 cũng đã đạt các lượt chạy riêng. Mobile dùngdrawer navigation đúngscope; ảnh.local/web-journey/owner-restored-built-{locale}-{width}.png ignored.

Test giữ nguyên payload/capabilities. Kỳvọng locator ban đầu chưa đúng: notification đổi nhóm sau khi đọc cần giữID thay vìfirst(); BacktoBoard có2CTA nên scope header; mobile menu cần chọn link trongdialog thay vìfooter phía sauoverlay. Sửa test và giữ assertionsbusiness, không sửa product để nétest.

## Các cụm kiểm lại

- HomeVi-En: names/draft/dates/counts/card/grid-list/paging/searchrace/errorretry,5widthPASS.
- OrgVi-En: Owner/Admin/Member, attachedWorkspace, counts/filter/create/privateisolation/demotion denial/draft,5widthPASS.
- Manage/AuditVi-En: CAS, internalallocation, ArchivedManager/recovery/preservedOrgrole, typedownershiptransfer/audit/currentcapabilities,4views×5widthPASS.
- WorkspaceVi-En: metadata/Project collection/Archive/settings/email/editor, readonly/CAS/stalerole/paging/longdescription,5widthPASS.

## Lượt lỗi chưa được tínhpass

Chạy4journeys song song có lỗi fetchmodule Home/EditorCore trêndev. Đối chiếu builtpreview ghi nhận ERR_INSUFFICIENT_RESOURCES từtrìnhduyệt ởmột lượt navigation. Chạy riêng/tuần tự4cases trênbuiltpreview đềuđạt. Chưa có phépđo đủ để xác định nguyên nhân tài nguyên cụ thể hoặc quy thànhlỗi nghiệp vụ/server. Đây không phải loadtest sản xuất; không tăng timeout, relaxlimiter hayretrywrites để coi đạt.

Giữasset diagnostic trongscript; dùng tuần tự cho acceptance trênmáy này. Nếu cần chạy nhiều browser đồngthời, tách đo CPU/RAM/handles/network và giới hạnrunner trước khi suy capacity.

## Phạm vi nghiệm thu còn lại

Chưa phát hiệnblocker nghiệp vụ trong các case trên. Khôngsuy mọi browser/device, physicalmobilekeyboard, WCAG/SLA hoặcGoogle/SMTP thật từviewport/fixture. Tiếp kiểm trải nghiệm bằng tài khoản thật trongphạmvi đã chọn và theo dõi lỗi tái hiện, đặcbiệt các điều kiện tải/phiên kéo dài. Chỉ chuyển deploy sau khi nghiệmthu web, không tự mởworker/queue.
