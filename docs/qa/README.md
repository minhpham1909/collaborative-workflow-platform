# Trạng thái kiểm tra

[FE Notifications](FE-NOTIFICATIONS-CHECK.md) — 3 unit/8 integration, browser inbox/read/cutoff/privacy và unverified→verified invitation gate/accept đạt; không SMTP thật.

[FE Task screens](FE-TASKS-CHECK.md): build, 6 FE tests, 10 Work Mongo/HTTP và browser thực Board/Task/Comments/My Tasks đạt; chưa Google/SMTP live hoặc nghiệm thu toàn sản phẩm.

[FE Workspace/Project](FE-WORKSPACE-PROJECT-CHECK.md): browser qua BE/Mongo thật, Owner/Member, CAS/mất quyền và 10 Work integration tests đã đạt; scope không gồm Board FE/SMTP/Google live.

04/10/2026: [FE Auth/Home check](FE-AUTH-HOME-CHECK.md) — build, 4 FE client tests, 2 BE query tests, 11 Workspace Mongo/HTTP tests và browser FE→BE→Mongo riêng đã đạt. Google control mới/SMTP live chưa kiểm lại; chưa nghiệm thu full sản phẩm.

Hiện hành: [Auth/accounts check](AUTH-ACCOUNTS-CHECK.md): 31 tests thông thường và 8 integration tests đạt trên MongoDB local; Google/SMTP thật và FE chưa nghiệm thu. [Auth/session check](AUTH-SESSION-CHECK.md) giữ mốc lịch sử.

Cập nhật 03/10/2026: [backend foundation check](BACKEND-FOUNDATION-CHECK.md) ghi 16 tests schema/editor/HTTP đạt và dependency audit không báo vulnerability. Chưa kiểm thử database/index/transaction/auth nghiệp vụ hoặc FE thực tế.

Đã có công cụ kiểm tra tài liệu `scripts/check-srs.ps1`. Nó kiểm tra tham chiếu và đồng bộ UC; không xác nhận tính đúng đắn nghiệp vụ.

Đã kiểm tra [bản mẫu My Tasks](MY-TASKS-MOCKUP-CHECK.md): sort/filter và trạng thái local trên dữ liệu minh họa, giao diện desktop/360 px. Đây là kiểm tra bản mẫu, không phải kiểm thử ứng dụng thật.

Đã kiểm các luồng Auth theo báo cáo mới; chưa nghiệm thu toàn bộ AC-01 đến AC-33, AC-X01 đến AC-X20 hoặc đo NFR. Các kiểm tra nghiệp vụ phải thực hiện sau khi yêu cầu liên quan được duyệt và có lát cắt chạy thật.

Ưu tiên kế hoạch sau baseline: quyền xuyên Workspace; vòng đời membership và tái gia nhập; accept/revoke và transfer/leave đồng thời; archive/write và stale edits; recipients/email preferences; token/session lifecycle; sau cùng nghiệm thu NFR trong môi trường ghi nhận cụ thể.

Hiện hành sau increment Users: [Profile/Personal Settings check](PROFILE-SETTINGS-CHECK.md) — 33 tests thông thường, 14 tests tích hợp đạt, gồm Auth regression. Các số liệu phía trên là mốc trước increment.

Hiện hành sau Workspace: [Workspace/Invitations QA](WORKSPACE-INVITATIONS-CHECK.md) — 35 tests thường, 24 tích hợp đạt; Auth/Users vẫn được chạy regression.


[Project/Task/Comment check](PROJECT-TASK-COMMENT-CHECK.md): 37 tests thường, 33 tích hợp; quyền, concurrency, search/time và event rollback.


[Notifications/email check](NOTIFICATIONS-EMAIL-CHECK.md): 40 tests thường/40 tích hợp; own inbox, che dữ liệu, settings, lease và retry; chưa gửi work SMTP thật.

[Account / Personal Settings FE QA](FE-ACCOUNT-SETTINGS-CHECK.md): 8 FE tests, 13 Accounts/Users integration tests và browser fixture flows; không gửi SMTP/Google thật.
