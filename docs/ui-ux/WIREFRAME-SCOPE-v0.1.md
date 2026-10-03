# Phạm vi wireframe sau screen review

03/10/2026. Review đầu vào ở [screen spec v0.2](SCREEN-SPEC-v0.2.md), [flow v0.2](SCREEN-FLOWS-v0.2.md) và [UI/API gaps](UI-API-GAPS-v0.1.md). Chưa có wireframe hoàn chỉnh; BE core/contracts đã triển khai nên không cần viết lại contract từ đầu sau wireframe.

## Thứ tự và bố cục đề xuất

| Đợt | Cần vẽ | Cần chứng minh trong prototype |
|---|---|---|
| A | Shell, Home/Welcome, Workspace Projects | Navigation cá nhân/context, zero-workspace, Member vs Owner |
| B | Board, My Tasks, Task Detail và shared forms | Sort/search/time, Task panel desktop/page mobile, quyền tách edit/status, Comments Author |
| C | Login/Register/Verify/Recovery/Google/Invitation | Register chưa có session, verified gate đúng scope, intent, wrong email/Terms/link |
| D | Members/Invitations/Workspace Settings | Leave/transfer/remove confirmations, URL copy một lần, override own Member |
| E | Profile/Account/Email/Notifications | Credential capabilities gap, identity gap, unavailable/read-all/rejoin |
| F | Landing/Policies và audit toàn luồng | Public content, draft policy chưa release, keyboard/mobile/Việt/English |

Thiết kế shared editor viewer/toolbar/counting dùng schema BE thật. Không font/shape/table/upload hoặc màn Files hoạt động giả. Announcements giữ inventory UC-35, chưa tích hợp trước phase tương ứng.

## Đầu ra

Desktop và mobile responsive đã được chủ dự án đồng ý trong phạm vi thiết kế ngày 03/10/2026. Kiểm màn hẹp khoảng 360px, màn hình ngang/tablet, safe area và bàn phím mở; không coi đây là dự án app native riêng. Breakpoint/pixel cuối cùng chọn khi wireframe và kiểm nội dung.

Wireframe desktop/mobile + screen/action/state mapping và critical-flow prototype bằng dữ liệu giả. Chọn visual/UI/editor/router/query libraries sau khi biết nhu cầu từ màn; không implementation production FE trong lượt screen review. Figma sau khi nội dung/bố cục đã review rõ, không mua/nâng cấp tool trong bước này.
