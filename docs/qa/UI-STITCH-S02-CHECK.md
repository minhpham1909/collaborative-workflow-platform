# S2 — QA Organization

07/10/2026. [Contract](../ui-ux/ORGANIZATION-S02-CONTRACT.md). Đạt scope S2a selector/create và S2b Organization Workspace collection/create, không nghiệm thu Team/whole UI.

## Kiểm thử

- FE14 unit pass (route ID validation + invitation compatibility), production build122 modules.
- BE67 unit pass,14 dedicated Mongo suites skip trong unit; full isolated integration113/113 và targeted Org/lifecycle/Workspace30/30. Query unit reject fake Guest role/state/tenant injection, giữ dates/defaults.
- `FE/scripts/check-stitch-organizations.mjs` real API/browser fixture: Owner/Admin/Member, Admin không WS membership vẫn đọc; Member chỉ assigned WS; standalone WS không lọt parent Org; private Org404 không lộ title; create Org/attached WS đúng parent/manager, không nâng global role.
- Live demotion khi form đang mở: POST bị403, giữ inline error/draft; DB không có Workspace trái quyền; reload bỏ CTA/create và show empty scoped state.
- Search/role/state/time/cursor totals trước paging,pagination16 Org với page12; filter request race, error/retry, create dưới search và readback clear, Org→WS→Org breadcrumb, no page errors/overflow.
- Chụp/soi selector ở1440/1280/1024/768/375px và Org WS ở1440/1024/375px. Mobile tabs 2×2, readable metadata, same shared shell/controls/card visual. Static photo là minh họa, không nguồn thống kê.
- S1 Home browser regression PASS và C2 invitation browser PASS (scope/Guest/auth intent/account switch/uncertain accept/no overflow1440/390). NameDialog defaults giữ cho Project, không đổi nghiệp vụ các cụm công việc.
- Skill probe có fixture auth/API adapter chỉ ở `.local`, mỗi context fresh login; measurement code giữ. Reports `.local/stitch-organizations/probe-selector/report.json`, `probe-workspaces/report.json`; không cung cấp cookie/token thật.

## Visual/nguồn và giới hạn

Stitch cổng chọn/tạo Org + Workspace collection dùng hierarchy/header/card/filter/ảnh. Form bỏ domain/billing/Pro/SSO và role mock không có API. Org cards chỉ name/role/date, không đếm roster/WS/projects từ page để bịa global totals.

Probe cuối cả selector/Org Workspace ghi0 mục Hỏng; mobile orphan tabs đã sửa thành grid2×2, card description text-pretty/short copy và metadata12px. Các default/Gu còn lại (focus rings, warm borders, native date/select, overlay shadows/classification) theo quyết định/QA S1, không coi là clean tất cả hoặc full accessibility certification. No horizontal overflow được browser đo riêng.

Backend shared helper là read aggregation trong caller tx; authoritative parent filter bảo vệ Org scope và preserve generic WS list. Không migration/index mới/data seed hoặc live SMTP/Google/purge. API local được restart để có read contracts mới, health ready kiểm cuối.

S3 kế tiếp; S4/S5 team/permission operations chưa dựng.
