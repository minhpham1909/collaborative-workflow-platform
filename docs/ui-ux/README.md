# Phân tích UI/UX hiện hành

Cập nhật 03/10/2026 theo yêu cầu chủ dự án: phân tích flow, nội dung và bố cục trước; chưa chi trả hoặc tạo Figma canvas. FE còn skeleton; trang Auth devtools chỉ phục vụ kiểm thử.

## Tài liệu dùng để review

- [Screen spec v0.2](SCREEN-SPEC-v0.2.md): 21 nhóm màn/form, nội dung, bố cục desktop/mobile, actions/quyền, states; phủ 35 UC và phân biệt BE đã có với phần dự kiến.
- [Screen flows v0.2](SCREEN-FLOWS-v0.2.md): sitemap/routes FE đề xuất, auth/invitation/Task/ownership/settings và nhánh lỗi.
- [UI/API gaps](UI-API-GAPS-v0.1.md): account capabilities, historical names/avatar, picker/search/time và các phần chưa thể nối FE như đã hoàn thiện.
- [Kế hoạch UI/UX](UI-UX-PLAN-v0.1.md), [phạm vi wireframe](WIREFRAME-SCOPE-v0.1.md): thứ tự review và đầu ra.

## Nguồn thiết kế dùng chung

[Search/time](TASK-SEARCH-TIME-FILTERS.md), [Kanban/My Tasks](KANBAN-MY-TASKS-DESIGN-v0.1.md), [editor](CONTENT-EDITOR-v0.1.md), [Việt/English](LANGUAGE-v0.1.md), [brief](DESIGN-BRIEF-v0.1.md), [đánh giá công cụ](DESIGN-TOOLS-v0.1.md). Các layout/branding vẫn là đề xuất; quyền, status, sort, defaults My Tasks và concurrency đã được chốt trong SRS.

[Screen flows v0.1](SCREEN-FLOWS-v0.1.md) giữ làm lịch sử, không dùng các dòng pending cũ làm trạng thái hiện hành. Backend contracts và QA hiện tại ở [NEXT-STEPS](../project/NEXT-STEPS.md).
