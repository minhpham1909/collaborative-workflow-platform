# Workflow — Stitch/Figma review v1

Ngày 03/10/2026. Nguồn visual là [Figma của chủ dự án](https://www.figma.com/design/TQpGbJPdfs7CFMYBUKpvNE/collaborative-webapp?node-id=0-1). Đây là prototype bổ sung My Tasks/states và chuẩn hóa nghiệp vụ, không phải bản sao pixel-perfect hoặc FE production.

Chạy `node docs/ui-ux/stitch-review/serve.cjs`, mở `http://127.0.0.1:4175/`.

| Route | Nội dung |
|---|---|
| #home | Greeting, Workspace cards, search/lọc ngày tạo |
| #workspace:w1 | Project list, Active/Archived, Owner/Member |
| #board:p1 | Ba cột cố định, search/time/overdue, Task Detail |
| #detail:t1 | Task toàn trang; Mở toàn trang từ panel; quay về nguồn Board/My Tasks |
| #mine | Danh sách phẳng xuyên Workspace; default Active/open, mới tạo trước; cùng Task Detail với Board |
| #states | Owner/Creator, Assignee, Member, Archived; loading, no-results, retry, conflict, save/validation/dirty-close, unavailable, departed |

Khung sidebar chung; nền kem/tím, accents lavender/mint/coral. Plus Jakarta Sans 400/600/700 phục vụ local từ Google Fonts, có tiếng Việt; [OFL](OFL.txt). Không cần gọi CDN khi xem.

## Giới hạn

Dữ liệu giả, thay đổi trong bộ nhớ tab. Không API/auth/mail/storage/autosave/realtime. Role selector là công cụ review. Search/time của Workspace/Project vẫn cần server contract. VI/EN là nhãn hướng thiết kế, chưa dịch toàn bộ mẫu. Editor còn textarea, chưa nghiệm thu rich-text toolbar/IME/JSON. Đã thêm đếm grapheme/từ, comment edit/delete và Task delete với xác nhận; chưa nối CAS/API. Các màn Auth/Members/Invitations/Settings/Notifications chưa hoàn chỉnh. Gallery minh họa trạng thái; các nút quyền không kết nối mutation thật. Không thêm billing/sprint/report/tags/favorite/Project deadline/template/archive Workspace.

## Figma đã ghi và phần còn lại

Trang mới [Workflow / UI v1](https://www.figma.com/design/TQpGbJPdfs7CFMYBUKpvNE/collaborative-webapp?node-id=3-2), giữ bản import gốc Page 1. Tool trả về 2 collections, 37 variables (14 primitives + 23 theme), 5 text styles, 3 sets Button/Badge/Input với 16 variants, Sidebar/Header và Home clone 1440px. [Foundation sheet](https://www.figma.com/design/TQpGbJPdfs7CFMYBUKpvNE/collaborative-webapp?node-id=4-2), [Home](https://www.figma.com/design/TQpGbJPdfs7CFMYBUKpvNE/collaborative-webapp?node-id=8-18), [ledger IDs](figma-state.json).

Công cụ hết lượt gọi Figma MCP Starter trước bước Workspace. Canvas mới chưa có screenshot nghiệm thu. Cần kiểm Home clipping/height/nav/KPI còn sót, áp text/effect styles và focus treatment vào component, audit bindings; rồi sửa 3 màn còn lại, thêm My Tasks/states. Chưa coi Figma đã hoàn thành. Không chạy lại mutation thành công hoặc tạo duplicate; dùng ledger để tiếp tục. Không thao tác browser để vượt giới hạn.

## Kiểm tra local

Headless Edge context riêng đã kiểm My Tasks default/filter/search không dấu, invalid date giữ kết quả cũ, Ctrl+K, Task Archived chỉ đọc, Assignee status-only, Archived khóa status, conflict giữ draft, title validation, saving và retry. Không page error hoặc tràn ngang tại 1440/1280/390px trên Home/Workspace/Board/My Tasks/states. Đã xem ảnh Home/My Tasks/states và sửa greeting xuống dòng riêng emoji. Không tuyên bố kiểm toàn bộ accessibility hoặc BE/auth thật.

Tiếp tục cùng ngày: kiểm panel → full page → nguồn My Tasks, direct Task link, tác giả-only comment edit/delete, text escaping, emoji gia đình tính một grapheme, vượt quota khóa gửi, cancel giữ draft khi đổi status/mở full page/đổi hash. Assignee không có edit/delete; Archived không composer hoặc comment mutations. Xóa Task có cancel/confirm. Full page không tràn ngang 1440/1280/390px, không page errors. Sửa duplicate controls khi rerender Task toàn trang. Nền sau modal được inert, full page dùng region.

Figma vẫn hết lượt gọi Starter khi kiểm lại; canvas không nhận thêm thay đổi trong increment Task Detail này.

Ảnh local: [Home](home-desktop.png), [My Tasks](mine-desktop.png), [States](states-desktop.png), [Task toàn trang](task-desktop.png); không phải ảnh canvas Figma.
