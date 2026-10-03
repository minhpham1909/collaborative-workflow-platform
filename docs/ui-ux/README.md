# Phân tích UI/UX hiện hành

Cập nhật 03/10/2026 theo yêu cầu chủ dự án: phân tích flow, nội dung và bố cục trước; chưa chi trả hoặc tạo Figma canvas. FE còn skeleton; trang Auth devtools chỉ phục vụ kiểm thử.

## Tài liệu dùng để review

- [Visual design v0.1](visual/index.html), [hướng visual và kiểm tra](visual/README.md): mẫu desktop Home/Board/Task, teal accent và shared styles; dữ liệu giả, chưa production FE.
- [Rà UI trước visual design](PRE-VISUAL-REVIEW.md): ma trận trạng thái, tương tác, component inventory và phân biệt điều kiện design/FE/release; ưu tiên review desktop.
- [Tổng hợp bảy cụm / bước wireframe](SCREEN-REVIEW-SUMMARY.md): vòng phân tích đã hoàn thành, cấu trúc lõi và policy/data gaps chưa chốt.
- [Wireframe tương tác lõi](wireframes/core.html), [phạm vi/giới hạn mẫu](wireframes/README.md): Home → Workspace → Board → Task, My Tasks và mobile bằng dữ liệu giả; chưa nối API, editor tạm và frames lỗi/conflict ở batch sau.
- [Đăng ký và liên kết Google — ma trận nghiệp vụ](ACCOUNT-REGISTRATION-LINK-REVIEW.md): same/different email, duplicate, identity ownership, unverified recovery và các policy còn mở. Google-only không cần password theo xác nhận trực tiếp.
- [Cụm 01 — Điều hướng, Home, Workspace Projects](clusters/CLUSTER-01-NAVIGATION-HOME-WORKSPACE.md): phân tích từng cụm theo mục đích, bố cục, trạng thái và luồng trước khi suy ra nhu cầu API; layout còn đề xuất.
- [Cụm 02 — Board, My Tasks, Task Detail, Comments](clusters/CLUSTER-02-BOARD-MY-TASKS-TASK-COMMENTS.md): màn làm việc, mobile, form/editor, quyền, conflict và nhu cầu identity/picker.
- [Cụm 03 — Thành viên, Lời mời, Quản lý Workspace](clusters/CLUSTER-03-MEMBERS-INVITATIONS-WORKSPACE-SETTINGS.md): membership lifecycle, invitations Owner/recipient, settings nhóm và own email; desktop/mobile trong phạm vi đã đồng ý.
- [Cụm 04 — Auth, xác minh, khôi phục](clusters/CLUSTER-04-AUTH-VERIFICATION-RECOVERY.md): login/register/Google, verified gate, reset và đích Home/Task/Invitation sau đăng nhập.
- [Cụm 05 — Cài đặt cá nhân](clusters/CLUSTER-05-PERSONAL-SETTINGS.md): Profile/Account/Email/Language, credential capabilities, phạm vi setting và shared-version/conflict.
- [Cụm 06 — Notifications](clusters/CLUSTER-06-NOTIFICATIONS.md): inbox/badge, read-all cutoff, Task/invitation targets và nội dung theo quyền hiện tại.
- [Cụm 07 — Public, Policies, Announcements](clusters/CLUSTER-07-PUBLIC-POLICIES-ANNOUNCEMENTS.md): Landing/Home, template Policies và thông báo ghim phase riêng.
- [Screen spec v0.2](SCREEN-SPEC-v0.2.md): 21 nhóm màn/form, nội dung, bố cục desktop/mobile, actions/quyền, states; phủ 35 UC và phân biệt BE đã có với phần dự kiến.
- [Screen flows v0.2](SCREEN-FLOWS-v0.2.md): sitemap/routes FE đề xuất, auth/invitation/Task/ownership/settings và nhánh lỗi.
- [UI/API gaps](UI-API-GAPS-v0.1.md): account capabilities, historical names/avatar, picker/search/time và các phần chưa thể nối FE như đã hoàn thiện.
- [Kế hoạch UI/UX](UI-UX-PLAN-v0.1.md), [phạm vi wireframe](WIREFRAME-SCOPE-v0.1.md): thứ tự review và đầu ra.

## Nguồn thiết kế dùng chung

[Search/time](TASK-SEARCH-TIME-FILTERS.md), [Kanban/My Tasks](KANBAN-MY-TASKS-DESIGN-v0.1.md), [editor](CONTENT-EDITOR-v0.1.md), [Việt/English](LANGUAGE-v0.1.md), [brief](DESIGN-BRIEF-v0.1.md), [đánh giá công cụ](DESIGN-TOOLS-v0.1.md). Các layout/branding vẫn là đề xuất; quyền, status, sort, defaults My Tasks và concurrency đã được chốt trong SRS.

[Screen flows v0.1](SCREEN-FLOWS-v0.1.md) giữ làm lịch sử, không dùng các dòng pending cũ làm trạng thái hiện hành. Backend contracts và QA hiện tại ở [NEXT-STEPS](../project/NEXT-STEPS.md).
