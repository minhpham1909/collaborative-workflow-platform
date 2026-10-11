# S12 đã hoàn tất ở local; việc còn lại trước deploy

Cập nhật11/10/2026. [QA](../qa/UI-STITCH-S12-CHECK.md) và [tiến độ](UI-UPGRADE-PROGRESS.md) là bằng chứng nghiệm thu scoped, không chứng nhận production readiness.

## Các task implementation đã hoàn thành

| Phần | Kết quả |
| --- | --- |
| Board/TaskForm/pickers/profile | S12d5b: Vi-En, payload/query/UTC và quyền giữ nguyên; browser5width +interaction regression |
| ProjectManagement/SharedProjects | S12d5c: labels/Lead/Guest/invitations, protected names, current scopes/CAS; Vi-En và5width |
| Task panel/detail/checklist/comments/activity/reopen | S12d6: authorship/Assignee/review/rates/history/unknown outcomes; Vi-En và5width |
| MyTasks/Inbox/public invitations/Trash | S12d7: groups/counts/filters/returns, masking/read-cutoff, token intent, restore/retention; Vi-En và5width |
| Error copy/lang/loading/failed chunk | S12e2:47workflowcodes, document.lang, defaultguards, route loading/error/reload Vi-En |
| Bundle budget | Entry308.64kB, initialJS400.79kB/gzip estimate124.67kB, largest395.89kB; check:build PASS, khôngnới warning threshold |
| Regression tổng local | FE21 unit, BE67 unit +113 integration, navigation/drafts/feedback/C2/auth/production-build fixture PASS |

F0/S1–S12 đạt gate local theo phạm vi kế hoạch. Các kết quả browser chạy bằng API/Mongo/browser fixture riêng; không gửi provider hoặc xử lý hàng đợi cũ/dev collections. Không suy toàn-siteWCAG, toàn bộbrowser, latencySLA hoặc production backup từ các test này.

## Bước tiếp theo: nghiên cứu deploy và CI/CD

Đã rà checkout dev: chưa có thư mục .github/workflows. Chưa triển khai workflow CI/CD trong S12; pipeline sẽ được thiết kế cùng phương án hạ tầng.

1. Chọn môi trường, chi phí, domain và cách đặt FE/BE; xác định HTTPS/origins/cookies/CSRF và URL Google callback/SMTP theo môi trường thật.
2. Chọn MongoDB replica set, secrets, indexes/migration/rehearsal, backup/restore/rollback và giới hạn lưu trữ/tải thực tế.
3. Tách API và các workers; xác định startup/scheduling/retry/monitoring. Không mở SMTP/moderation/retention cũ củadev hay backfilllegacy theo thói quen deploy.
4. Thiết kế CI: dependencies theo lockfile, FE/BE tests với Mongo tạm, build +budget, artifacts và secret checks. Thiết kế CD: environments/secrets, promotion, health/readiness/smoke, migration/backup và rollback.
5. Nghiệm thu trên môi trường thật rồi mới mở truy cập internet; local fixture không thay production provider/worker/SLA acceptance. Email thửS12 đã nhậnInbox ởcheckpoint trước, không cần gửi lại chỉ vì đổiUIcopy.

Chưa tạo workflow deploy hoặc mở môi trườngproduction trong S12. Các lựa chọn nền tảng/hạ tầng là nội dung giai đoạn nghiên cứu tiếp theo.

## Ngoài scope hiện tại

Manual permanent purge/chuyển Workspace vàoOrg còn cần chốt quyền/điều kiện trước API/CTA destructive. Storage/upload/quota, realtime/presence/mentions, sprint/calendar/meetings/timer, billing/domain/SSO/2FA/customRBAC là module/spec riêng; không tự thêm để gọiS12 hoàn thành.
