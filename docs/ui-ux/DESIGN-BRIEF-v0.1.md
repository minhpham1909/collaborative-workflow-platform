# Brief dùng chung cho Figma / Stitch

03/10/2026. Dùng requirements/API đã có; visual direction bên dưới là đề xuất, chưa chốt branding/library. [Screen flows](SCREEN-FLOWS-v0.1.md), [editor](CONTENT-EDITOR-v0.1.md), [search/thời gian](TASK-SEARCH-TIME-FILTERS.md), [công cụ](DESIGN-TOOLS-v0.1.md).

## Bối cảnh và foundations

Ứng dụng web cộng tác nhóm nhỏ User → Workspace → Project → Task. React JS/JSX; BE Express/Mongoose có Auth, Profile, Workspace/Invitations, Project/Task/Comment, Board/My Tasks, Notifications. Hai ngôn ngữ Việt/English, mặc định theo quy tắc locale đã có. Dữ liệu demo hoàn toàn giả.

Đề xuất phong cách tập trung vào công việc: nền sáng trung tính, chữ rõ, accent xanh vừa phải, density trung bình; không hero marketing trong màn làm việc. Có focus ring, error text gần trường, badge kèm chữ chứ không chỉ màu. Typography cần tiếng Việt đầy đủ, emoji và dòng dài. Chưa chốt palette/font/package cụ thể trước khi review visual.

Tạo spacing/type/color tokens và component Button, Input, Select, Avatar, StatusBadge, Deadline, Breadcrumb, SearchFilterBar, Pagination/LoadMore, Dialog/Drawer, NotificationItem, EmptyState, ErrorState, RichTextEditor. Variants cho loading/disabled/error/focus và quyền. Frame desktop 1440, mobile 360 để review, đây không phải chứng nhận NFR responsive. Shared editor cho description Workspace/Project/Task và Comment, Comment toolbar gọn cùng schema; hyperlink/emoji/heading/body/word-count, không upload file.

## Navigation và màn hình

| Khu vực | Layout và luồng |
|---|---|
| Auth | Login/register/verify/recovery/reset/Google; unverified gate rõ, không báo gửi mail thành công giả |
| App shell | Workspace switcher, My Tasks, Notifications badge, Profile/Settings; breadcrumb Workspace → Project |
| Workspace | Overview/Projects/Members/Invitations/settings; Owner mới có invite/manage/transfer; Member vẫn xem được projects/tasks |
| Project | Active/Archived filter, create/edit/archive/reopen Owner; archived banner read-only |
| Board | Ba cột Chưa làm/Đang làm/Hoàn thành, newest-created-first từng cột; load more riêng từng cột |
| My Tasks | Danh sách assigned-to-me có Workspace → Project; mặc định Active/chưa Done; filter Done/Archived, không deadline-first |
| Task Detail | title/description/deadline/assignee, status và Comments; tách edit/status/delete permissions |
| Notifications | All/unread/read, work/invitation, mark/read-all cutoff; unavailable generic không snapshot title/workspace/link |
| Personal Settings | Display name, vi/en, global email types; Workspace overrides inherit/on/off/reset trong workspace context |

Task Owner/Creator sửa/xóa, Assignee chỉ status; Member khác xem. Comment Author sửa/xóa riêng; Owner không sửa Comment người khác. Deadline nhập đến phút giờ Việt Nam; quá khứ cho lưu có warning; Done không overdue, Archived vẫn overdue. Task Done có assignee đã rời dùng nhãn rõ; reopen có thể bỏ assignee theo BE.

Search động title/description không dấu/case, debounce ~300ms, stale response không thay kết quả mới. Bộ lọc thời gian createdAt/dueAt và from/to bao ngày cuối giờ Việt Nam; query invalid giữ kết quả gần nhất nhưng nói chưa áp dụng. Reset không đổi sort. Load more giữ filters; thay filters xóa cursor. Cần cách đổi status bằng menu/phím ngoài kéo thả.

## Trạng thái bắt buộc

Loading/skeleton, empty first-use, no-results, network error/retry, expired session, verification-required, lost membership, archived, deleted target, stale version conflict và destructive confirmation. Conflict giữ nội dung đang nhập trong tab để sao chép/tải mới, không tự ghi đè. Inbox unavailable giữ time/read state, không leak tên cũ; rejoin hiển thị lại theo quyền hiện tại. Invitation preview chỉ tên Workspace/người mời/type/hạn; accept chưa verified cần xác minh.

## Prompt khởi đầu có thể dùng trong Stitch

Design three coordinated screens for a small-team collaborative workflow web app: My Tasks list, a Project Kanban board, and Task Detail with comments. Use one shared light, calm design system with reusable components and realistic Vietnamese demo text, plus English label variants. Include desktop 1440px and mobile 360px layouts. My Tasks shows Workspace → Project context and tasks assigned to the current user, sorted newest created first. Kanban has exactly To do, In progress, Done with the same sort inside each column; never manual priority ordering. Share dynamic title/description search, status and date filters. Task Detail separates content-edit permissions from status permissions: Owner/Creator can edit/delete, assignee can only change status, and each comment can only be edited/deleted by its own author. Archived projects are read-only. Show loading, no results, network error, stale-version conflict, overdue deadline, and former-assignee states. Use a consistent rich text toolbar supporting links, Vietnamese accents, emoji, headings and counts. Do not add file uploads, payments, AI assistants, direct messages or invented roles. These are editable visual concepts; do not generate a replacement backend or pretend API integration is finished.

## Deliverable khi bắt đầu design thật

Foundations/component library, responsive screen frames, prototype critical flows, state variants và mapping tới API. Trước khi tạo file cần chọn công cụ/file đích; lượt này mới soạn brief và đánh giá, chưa tạo artifact Figma/Stitch hoặc khóa visual style.
