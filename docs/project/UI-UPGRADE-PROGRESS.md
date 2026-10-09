# Tiến độ nâng cấp UI theo Stitch

Cập nhật09/10/2026 sau S9b, đối chiếu [plan cụm](STITCH-UI-CLUSTER-PLAN-v0.1.md) và QA từng cụm. **9/12 mốc S đạt gate — 75% số mốc**, không phải75% khối lượng hoặc75% sản phẩm hoàn thiện. F0 có gate nền/pilot riêng, không cộng vào12 mốc.

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
| S10 | Account/settings và Auth flows | Chưa nâng cấp cụm;10a tiếp theo |
| S11 | Thùng rác/khôi phục Task | Chưa nâng cấp cụm |
| S12 | Regression toàn app, navigation/draft, Vi/En, responsive/performance | Chưa nghiệm thu tổng thể |

Các chức năng Auth/settings đã có, “chưa nâng cấp cụm” nghĩa chưa qua gate UI mới. S10a ưu tiên profile/email/security/Google link;10b login/register/verify/recovery/reset và locale. S11 cần biểu diễn expiry30 ngày/legacy-unscheduled/read-only/restore conditions đúng API, không CTA purge chưa mở. S12 cần kiểm xuyên các scope/role/history/drafts và bản dịch đầy đủ.

[QA S09](../qa/UI-STITCH-S09-CHECK.md) ghi validation cuối: FE16/build148, real browser/C2 regression,3 public variants ×5 widths, authenticated probe0 Hỏng. Existing BE/queues/dev data không đổi trong S9b.

Đạt từng cụm không thay gate toàn ứng dụng. Storage/upload, realtime/mentions, billing/domain, provider/worker production và nghiệp vụ chưa mở vẫn deferred theo core plan; không tự thêm chỉ vì mockup có.
