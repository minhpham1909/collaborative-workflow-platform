# Tiến độ nâng cấp UI theo Stitch

Cập nhật09/10/2026 sau gate S11 Task trash/restore, đối chiếu [plan cụm](STITCH-UI-CLUSTER-PLAN-v0.1.md) và QA từng cụm. **11/12 mốc S đạt gate — khoảng92% số mốc**, không phải92% khối lượng hoặc92% sản phẩm hoàn thiện. F0 có gate nền/pilot riêng, không cộng vào12 mốc.

| Mốc | Phạm vi | Trạng thái |
| --- | --- | --- |
| F0 | Shell, token và component nền | Đạt pilot; dịch toàn app chưa hoàn tất |
| S1 | Home cá nhân, Workspace cards/search/time/KPI/footer | Đạt |
| S2 | Chọn Tổ chức/Studio và Workspace trực thuộc | Đạt2a/2b |
| S3 | Workspace detail, Project collection, mô tả/Archive | Đạt |
| S4 | Thành viên Tổ chức, role/Manager/ownership/audit | Đạt4a/4b |
| S5 | Thành viên Workspace, lời mời, leave/Kick/Ban | Đạt |
| S6 | Project/Kanban, Task form, nhãn, Lead/Guest | Đạt6a/6b |
| S7 | Task panel/fullpage, checklist/comments/activity/reopen | Đạt7a/7b |
| S8 | My Tasks grouped rows/scoped filters/return context | Đạt |
| S9 | Notifications inbox + public invitations3 scope | Đạt9a/9b |
| S10 | Account/settings và Auth flows | Đạt scopeAccount/Auth; full site localeS12 |
| S11 | Thùng rác/khôi phục Task | Đạt scope list/detail/restore; không purge thủ công |
| S12 | Regression toàn app, navigation/draft, Vi/En, responsive/performance và email thật | S12a–c đạt từng đợt; còn locale/layering/performance và gate tổng |

Các chức năng Auth/settings đã có, “chưa nâng cấp cụm” nghĩa chưa qua gate UI mới. S10a đã đạt profile/email/security/Google link;10b login/register/verify/recovery/reset và locale. S11 đã biểu diễn expiry30 ngày/legacy-unscheduled/read-only/restore conditions đúng API, không CTA purge chưa mở. S12 cần kiểm xuyên các scope/role/history/drafts và bản dịch đầy đủ.

[QA S09](../qa/UI-STITCH-S09-CHECK.md) ghi validation cuối: FE16/build148, real browser/C2 regression,3 public variants ×5 widths, authenticated probe0 Hỏng. Existing BE/queues/dev data không đổi trong S9b.

Đạt từng cụm không thay gate toàn ứng dụng. Storage/upload, realtime/mentions, billing/domain, provider/worker production và nghiệp vụ chưa mở vẫn deferred theo core plan; không tự thêm chỉ vì mockup có.

S10a: [QA](../qa/UI-STITCH-S10-CHECK.md), profile/preferences/security3tabs/5width, current-session rotation và Google capability/unknown readback đạt với verifier/SDK fixture; tiếp10b. S10 vẫn chưa hoàn tất, số mốc hoàn tất vẫn9/12.

S10b1:5 Auth screens đã qua real browser/probe và C2 regression; tiếpS10b2 Google signup/locale. Mỗi increment code commit/pushdev theo [workflow](DEVELOPMENT-WORKFLOW.md). S10 chưa toàn gate; vẫn9/12 mốc hoàn tất.

S10b2 Auth: Google signup +5 flowsVi/En đã đạt có2 commit riêng. Settings/shared/app gate và toàn site chưa dịch đủ; không tính10/12 hoặc toàn app bilingual. Tiếp language coverage còn thiếu, sau đóS11/S12 theo gate.

Gate Settings/shared account locale đã đạt; S10 hoàn tất phạm viAccount/Auth, tổng mốc10/12. Các ghi chú9/12 trước đây là checkpoint lịch sử, không trạng thái hiện tại. TiếpS11 trash/restore; toàn siteVi/En ởS12 vẫn chưa hoàn tất.


S11 đạt list/detail/restore gate: [QA](../qa/UI-STITCH-S11-CHECK.md). Các checkpoint10/12 ở trên là lịch sử; trạng thái hiện tại11/12. Tiếp S12 regression/navigation/drafts/Vi-En/responsive/performance; chưa nghiệm thu toàn app.
