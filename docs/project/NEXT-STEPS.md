# Trạng thái và bước tiếp theo

Cập nhật 03/10/2026. [Nhật ký cũ](../archive/project/PROJECT-HISTORY-2026-10-03.md) là lịch sử, yêu cầu trực tiếp mới của chủ dự án có ưu tiên.

## Hiện tại

Increment thiết kế tiếp theo đã bổ sung Task toàn trang, comment edit/delete, Task delete xác nhận, draft guard và Unicode counters tại [prototype](../ui-ux/stitch-review/README.md). Đã kiểm headless Edge quyền/luồng/escaping/overflow; chưa FE production hoặc CAS/API thật. Figma kiểm lại vẫn hết lượt gọi; các pending trong ledger giữ nguyên.

Chủ dự án đã import Stitch vào Figma và yêu cầu chuẩn hóa. [Review mới](../ui-ux/FIGMA-STITCH-REVIEW-v0.1.md), [prototype kem/tím + My Tasks/states](../ui-ux/stitch-review/README.md) là hướng hiện hành thay teal. Figma đã ghi foundations/components/navigation/Home trên trang mới; bị giới hạn lượt gọi Starter trước 3 màn còn lại. Ledger lưu IDs; canvas mới chưa visual QA. Tiếp tục từ ledger khi có lượt gọi, không tạo duplicate hoặc coi FE đã triển khai.

- Repo GitHub private minhpham1909/collaborative-workflow-platform; main giữ mốc nền, phát triển trên dev.
- BE: Node 24.x, JavaScript ESM, Express 5.2.1, Mongoose 9.10.4, pnpm 11.19.0, lockfile; 13 models, editor validation, health.
- JWT access/refresh, Argon2id login, rotation/reuse revocation, logout/me và verified middleware. Đã có signup/Terms, verify/resend, reset/change password, Google login/link và encrypted email outbox. [Accounts contract](../sds/AUTH-ACCOUNTS-v0.1.md), [session contract](../sds/AUTH-SESSION-v0.1.md).
- 40 unit/schema/HTTP tests đạt; 40 integration tests đạt, 0 skipped trên MongoDB 8.0.17 replica set local. Automated tests dùng Google verifier stub/outbox sender giả lập; kiểm thử Google thật do chủ dự án thực hiện đã trả GOOGLE_LOGIN_SESSION_OK, /auth/me 200, emailVerified:true và avatar Google. SMTP transport live đã xác thực và accepted một email thử; Inbox/Spam chưa xác nhận. [QA](../qa/AUTH-ACCOUNTS-CHECK.md).
- MongoDB dev local đã chạy smoke, tạo index 13 collections; env:dev/db:dev/test:integration hỗ trợ setup. .env/binaries/data/mail previews ignored; không đẩy credentials/data lên Git.
- FE còn skeleton React JS/JSX; chưa màn hình Auth. Storage/resources Upcoming, announcements phase riêng. NFR/retention/product limits còn review.

## Tiếp theo

Đã triển khai [visual design v0.1](../ui-ux/visual/index.html), [README](../ui-ux/visual/README.md): Home/Board/Task và các màn lõi cùng teal styles, desktop ưu tiên. Tiếp theo review hướng visual rồi mở rộng Auth/Members/Settings/Notifications và frames loading/error/conflict; chưa khóa brand hoặc production FE.

Đã rà [UI trước visual design](../ui-ux/PRE-VISUAL-REVIEW.md): state matrix/tương tác/components và các mốc design/FE/release. Chủ dự án đã về desktop, không cần gửi preview mobile mỗi lượt; responsive vẫn giữ. Bước tiếp theo là visual direction desktop Home/Board/Task, shared tokens/components và mở rộng frames/states, chưa chốt brand hoặc library.

Đã hoàn thành vòng phân tích [bảy cụm](../ui-ux/SCREEN-REVIEW-SUMMARY.md), gồm [cụm cuối Public/Policies/Announcements](../ui-ux/clusters/CLUSTER-07-PUBLIC-POLICIES-ANNOUNCEMENTS.md). Đã dựng [wireframe lõi tương tác](../ui-ux/wireframes/core.html) bằng dữ liệu giả desktop/mobile. Tiếp theo bổ sung Auth/Invitations/Members/Settings/Notifications/Public và frames lỗi/conflict/loading; chưa production FE hoặc rich-text editor hoàn chỉnh.

Auth giữ email/password + Google optional, Google-only không cần password riêng; uniqueness email/Google/User đã được chủ dự án xác nhận. [Ma trận link](../ui-ux/ACCOUNT-REGISTRATION-LINK-REVIEW.md) giữ các nhánh unverified recovery và provider email drift còn review. [UI/API gaps](../ui-ux/UI-API-GAPS-v0.1.md) vẫn cần trước nối controls vào FE thật.

1. Theo yêu cầu chủ dự án: bám requirement, triển khai BE theo module và kiểm API/quyền/transactions trước; Profile/Personal Settings và Workspace/Invitations đã triển khai; Project/Task/Comment, Board/My Tasks đã triển khai; Notifications/work-email dispatcher đã triển khai; tiếp theo review UI/UX chung và FE theo module.
2. Google login thật đã đạt cho tài khoản kiểm thử. Tiếp tục kiểm email auth outbox tới Inbox/Spam, hoàn thiện Terms và worker nền; [hướng dẫn local](GOOGLE-SMTP-LOCAL-SETUP.md).
3. Theo yêu cầu mới: chưa chi trả, rà screen flow/nội dung/bố cục trước Figma. Review [screen spec v0.2](../ui-ux/SCREEN-SPEC-v0.2.md), [flows v0.2](../ui-ux/SCREEN-FLOWS-v0.2.md) và [UI/API gaps](../ui-ux/UI-API-GAPS-v0.1.md); rồi wireframe local/navigation/components chung, Figma sau khi cấu trúc rõ. Giữ loading/empty/error/mất quyền/conflict, Việt/English và editor chung.
4. Review production provider/secrets/rotation, shared limiter/proxy/cookie topology, retention/purge/backup và NFR. Local DB không thay production.

## Tài liệu

[Docs index](../README.md), [SRS](../srs/SRS-v0.2.md), [quyết định](../decisions/DECISION-REGISTER.md), [DB](../sds/DATABASE-DESIGN-v0.2.md), [BE setup](../../BE/README.md), [Git workflow](../decisions/GIT-WORKFLOW.md), [file hygiene](REPOSITORY-HYGIENE.md).

Đã triển khai [Profile/Settings API](../sds/PROFILE-SETTINGS-API-v0.1.md). Google login end-to-end đã đạt theo response thực tế chủ dự án cung cấp ngày 03/10/2026; Profile/Personal Settings BE đã có và kiểm HTTP/Mongo; Workspace/Invitations đã triển khai và kiểm tích hợp; Project/Task/Comment đã triển khai, Notifications đã triển khai, chuyển ưu tiên sang thiết kế UI/UX và FE. Response cuối không chứng minh độc lập thao tác link đã diễn ra; không suy thành mọi biến thể Google đã nghiệm thu.

API Users: GET /users/me, PATCH /users/me/profile, PATCH /users/me/preferences; global settings và Workspace overrides đã có, mỗi loại inherit/on/off và reset/leave/rejoin về kế thừa. [QA Profile/Settings](../qa/PROFILE-SETTINGS-CHECK.md).

Increment Workspace/Invitations đã có: ownership/membership lifecycle, LINK/EMAIL invites, preview/accept, encrypted outbox/dispatcher và invitation in-app khi gửi. [API](../sds/WORKSPACE-INVITATIONS-API-v0.1.md), [QA](../qa/WORKSPACE-INVITATIONS-CHECK.md). Task cleanup đã có; Project/Task API cần cùng Workspace guard để giữ invariant. Inbox notification API đã có, FE còn tiếp theo.


Increment [Project/Task/Comment API](../sds/PROJECT-TASK-COMMENT-API-v0.1.md) và [QA](../qa/PROJECT-TASK-COMMENT-CHECK.md): quyền, CAS, archive/reopen, soft delete, Board/My Tasks search/thời gian/pagination, durable work events đã có. Inbox/work-email dispatcher đã nối ở increment Notifications; FE và kiểm SMTP work mail thật còn tiếp theo.


Increment [Notifications/work email](../sds/NOTIFICATIONS-EMAIL-API-v0.1.md), [QA](../qa/NOTIFICATIONS-EMAIL-CHECK.md): own inbox/read/read-all signed cutoff, current-rights masking/rejoin, EMAIL invite accept by ID, work dispatcher/worker đã có. Khuyến nghị design bằng Figma chính, Stitch tùy chọn khám phá: [đánh giá](../ui-ux/DESIGN-TOOLS-v0.1.md), [brief](../ui-ux/DESIGN-BRIEF-v0.1.md). Chưa tạo canvas hoặc chốt visual style; chưa chạy worker trên SMTP dev thật.
