# Stitch review — Workflow Collaborative Workspace Design

Đã truy cập Stitch MCP và tải ngày 04/10/2026 theo yêu cầu trực tiếp của chủ dự án. Project `41254457511662208`; không tạo hoặc chỉnh màn hình trên Stitch. Tên “Generating Screen...” trong yêu cầu là label canvas; get_screen trả tên màn hình cụ thể bên dưới.

| Màn hình | Screen ID | Canvas | Ảnh đã tải | Code gốc |
|---|---|---|---|---|
| Trang chủ cá nhân / Workspace của bạn | `3d29b5291038486fb0d9ba4db402d73b` | 1280 × 1326 | [home.png](home.png), 2560 × 2652 | [home.html](home.html) |
| Workspace Sáng Tạo Studio / Danh sách Project | `32a7a04259fb43709799a034dd2fca6f` | 1280 × 1588 | [workspace.png](workspace.png), 2560 × 3176 | [workspace.html](workspace.html) |

Ảnh screenshot dùng bản full resolution (`=s0` của FIFE download URL), không dùng thumbnail 512px để đánh giá chi tiết. HTML tải bằng curl --location từ downloadUrl do MCP trả về. Giữ nguyên HTML gốc, không chạy nó trong sản phẩm.

[manifest.json](manifest.json) ghi ID, kích thước, SHA-256 HTML/screenshot và 10 ảnh nhúng duy nhất đã tải về `assets/`; định dạng PNG/JPEG đã kiểm magic bytes. Bao gồm logo, ảnh cover và chân dung mẫu. [DESIGN.md](DESIGN.md) là theme nguyên bản MCP trả về, dùng làm tài liệu tham khảo chứ không thay yêu cầu nghiệp vụ.

`home.local.html` và `workspace.local.html` là bản tham khảo đổi src ảnh sang file local. Font Google, Material Symbols và Tailwind CDN vẫn là tài nguyên bên ngoài; đây chưa phải bản preview offline hoặc bundle production. Có thể xem ảnh PNG trực tiếp mà không cần các CDN. Các URL điều hướng `href="#"`, số liệu, avatar và thao tác trong HTML phần lớn là mockup.

## Đánh giá và hướng nên chọn

Nên lấy hai màn này làm nguồn thiết kế cho Home và Workspace khi triển khai UI tiếp theo. Chúng có cấu trúc tốt hơn bản hiện tại: top navigation tiết kiệm chiều ngang, card có cover tạo nhận diện, hierarchy rõ giữa lời chào/nhóm/dự án, pill tabs và CTA nhất quán. Tông kem, indigo, coral, mint và Plus Jakarta Sans giữ đúng hướng Creative Studio đã chọn. Cần port thành React components và nối API/permissions hiện tại; không thay luồng đã kiểm bằng các hành vi mẫu của HTML.

### Phần giữ lại

- **App header:** logo, điều hướng chính, thông báo, account menu. Active route rõ; account menu chứa Settings/Logout. Desktop Home/Workspace dùng top navigation; cách điều hướng Board/Task sẽ thống nhất sau, tránh hai bộ nav trùng nhau.
- **Home:** lời chào, CTA Tạo Workspace, search rộng, danh sách card ba cột ở desktop; role badge riêng trên từng Workspace, icon/tone và ảnh cover. Lối tắt My Tasks/Notifications ở cuối vùng nội dung.
- **Workspace:** breadcrumb, header tên/role/mô tả có thu gọn, tabs Projects/Members/Invitations/Settings/own email; danh sách Project hai cột với cover, trạng thái và link vào Board.
- **Project Archived:** giảm nhấn, khóa/chỉ đọc, vẫn mở xem Board; tiếp tục cho Owner mở lại theo luồng đang có. Không làm Archived card vô hiệu hoàn toàn.

### Phần phải điều chỉnh theo SRS và code

| Chi tiết Stitch | Xử lý khi port |
|---|---|
| Home: “4 việc hôm nay”, số thành viên/dự án, avatar stack, số Workspace “3” | Chỉ hiển thị số từ API đủ scope. `/workspaces` hiện phân trang, không có total/statistics tổng; không lấy items.length làm tổng khi còn cursor. Không phát N+1 request chỉ để tô card. |
| Project: 14/18 và progress 78%, deadline Project, danh sách nhân sự Project | API Project hiện chưa trả aggregates/deadline và không có Project Membership. Ẩn phần chưa có dữ liệu; nếu bổ sung progress phải là Done/total Task theo scope. Không biến avatar stack thành role Project mới. |
| “Workspace đã lưu trữ hoặc đã rời”, khôi phục/xóa vĩnh viễn trong accordion Home | Bỏ trong bản lõi: chỉ Project có Active/Archived; Workspace đã rời không còn quyền đọc hay khôi phục từ card. |
| Header gắn “Chủ sở hữu” dưới profile ở mọi màn | Role thuộc Workspace hiện tại, không phải quyền toàn tài khoản. Home chỉ hiển thị user; Workspace có role đúng context. |
| Banner Owner: “toàn quyền”, “xét duyệt lời mời”, “thiết lập quyền hạn”, “đồng bộ thanh toán” | Đổi copy thành quyền quản lý Workspace/lời mời/Project hiện có. Không có approval invitation, billing, roles tùy biến; Owner không được sửa/xóa Comment người khác. |
| Search và sort đẹp nhưng thiếu khoảng thời gian | Giữ search server/debounce, bổ sung từ–đến ngày tạo. Sort mới tạo trước như đã chốt; controls không hoạt động thì không giả dropdown. |
| Bookmark sao, project templates/duplicate, global create menu, “đồng bộ trực tuyến” | Chưa có các chức năng/trạng thái tương ứng. Không render như nút đang hoạt động hoặc khẳng định realtime khi chưa có subscription/presence. CTA create theo context và quyền. |
| “VI / VNĐ”, Footer 2025, trợ giúp/policies | Chỉ VI/EN theo yêu cầu; không currency/billing. Footer ngày/name đúng sản phẩm; policies chỉ liên kết trang có nội dung, không coi draft là chính sách phát hành. |
| Avatar người mẫu/Google picture giả | Dùng avatar identity thật hoặc initials hiện có. Ảnh mẫu chỉ nằm trong gói tham khảo, không gắn vào user thật. |
| Cover có caption sprint/campaign | Có thể dùng ảnh preset trang trí; caption chỉ khi có field/thông tin thật. Không mở upload/storage để phục vụ reskin. |

### Trạng thái và khả năng thao tác

- Header HTML giấu nav dưới breakpoint xl nhưng chưa có đường thay thế rõ. Khi port cần mobile menu có keyboard/focus và account/logout vẫn tới được; grid Home 3→2→1, Project 2→1.
- Dropdown/chips cần label, focus-visible, mục selected và thao tác keyboard; search không chỉ có placeholder. Icon-only buttons cần accessible name, target tối thiểu 44px.
- Giữ loading/empty/error, pagination, CAS conflict và draft protection. Không thay bộ lọc server bằng tìm trong ba card mẫu.
- Owner thấy create/invitation/manage controls; Member thấy quyền tương ứng. Backend tiếp tục là nơi quyết định cuối cùng.
- Giữ trạng thái chưa xác nhận khi mất phản hồi đã sửa ở lượt audit; không để layout mới bỏ chặn submit hoặc che CTA.
- Khối Archived vẫn cần contrast đủ đọc. Hai ảnh desktop chưa chứng minh responsive, menu interactions hoặc accessibility; phải kiểm sau port.

## Handoff triển khai

1. Tách shared AppHeader, account menu, pill controls và tokens từ bản này. Mọi label/data theo identity/route hiện tại.
2. Port Home: cover presets + card layout + shortcuts, nối API list/create/search/date/cursor. Bỏ statistics mock chưa được hỗ trợ.
3. Port Workspace: header/tabs/project cards Active/Archived, giữ Team/Settings/own email components và quyền đang có.
4. Kiểm desktop 1440/1280 và mobile; chạy lại network-commit regression cùng Home/Project/Team flows.

Trong lần này chỉ import và review, **chưa thay FE đang chạy**. Ưu tiên luồng hệ thống từ yêu cầu trước vẫn được giữ; các sửa tiếp theo dùng tài liệu này làm nguồn visual đã được chủ dự án chọn, không tự thêm chức năng vì mockup có nút.
