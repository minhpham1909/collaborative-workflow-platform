# Trạng thái kiểm tra

05/10/2026 — **P3 Đạt gate**: skip-to-main, focus/toolbar targets, description dài có vùng cuộn và CTA luôn thấy; keyboard/card/CTA và 7 màn tại 1440/1280/390px đạt. 5 browser fixtures, 12 FE tests/build đạt. [QA P3](FE-P3-INTERACTION-CHECK.md). Bước tiếp theo P4; các đoạn dưới là lịch sử. Không bật mail worker.

05/10/2026 — **P2 Đạt gate**: nền dialog chung và states/feedback hoàn thiện trên các cụm; thêm regression bàn phím/dialog lồng, assignee rời nhóm, Workspace scope mất quyền và Inbox loading/error/retry/empty. 8 browser fixtures, 12 FE tests và build 113 modules đạt. [QA hiện hành](FE-COMPONENTS-CHECK.md) và [kế hoạch](../project/UI-UX-UPGRADE-PLAN.md) ghi ngoại lệ và giới hạn. Bước tiếp theo P3; chưa nghiệm thu toàn bộ UI hoặc providers thật. Các đoạn dưới là lịch sử increment.

05/10/2026 sau 44bd73c: [QA P2](FE-COMPONENTS-CHECK.md) bổ sung WorkspacePicker My Tasks và names/FormField; >20 Members/Workspaces, search/retry/stale/reset/count/responsive đạt. Account/Settings/Navigation/Interactions, build 111 modules/12 tests đạt; P2 còn dialog/state/field coverage.

04/10/2026: [P2 FormField/MemberPicker](FE-COMPONENTS-CHECK.md) — Task assignee search, giữ selection, retry/stale response và lỗi title cạnh field đạt fixture; build/12 FE tests/navigation regression đạt. P2 đang làm, chưa chuyển P3.

05/10/2026: cùng QA P2 đã bổ sung PasswordField/Auth/Security và Team labels/dirty-close/leave-success; Account/Settings/Navigation/Team fixtures, 12 FE tests và build 110 modules đạt. Provider live và phần P2 còn lại chưa nghiệm thu.

04/10/2026: [P1 audit bốn cụm màn hình](UI-UX-FLOW-AUDIT.md) — đạt gate audit sau [sửa NAV-01 và regression bản nháp](FE-DRAFT-NAVIGATION-CHECK.md). Navigation/account/settings/interactions/network fixtures, 12 FE tests và build đạt sau guard chung; 46 BE integration là bằng chứng mốc audit trước. Tiếp theo P2; chưa nghiệm thu nhà cung cấp thật, P4 hoặc toàn sản phẩm.

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

[Team / Invitations FE QA](FE-TEAM-INVITATIONS-CHECK.md): 12 Workspace integration + 8 FE tests, browser lifecycle fixture; không gửi SMTP thật.

[Cài đặt Workspace / own email overrides QA](FE-WORKSPACE-SETTINGS-CHECK.md): 18 Users/Workspace integration + 8 FE tests, browser settings và Task/editor regression, không gửi SMTP thật.

[Registration / verification / recovery FE QA](FE-REGISTRATION-RECOVERY-CHECK.md): 12 FE tests, 8 Accounts/Auth integration, automated browser fixtures; live QA để sau.

[Review UI bằng skill ui-ux](UI-DESIGN-REVIEW-2026-10-04.md): tối ưu trực tiếp sáu màn, kiểm 1440/375px và đối chiếu probe. NAV-01 đã sửa ở increment điều hướng tiếp theo.
