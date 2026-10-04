# Gap log giữa screen review và BE

Cập nhật 04/10/2026: G04 đã xử lý phần Workspace bằng server search tên/mô tả và ngày tạo, trước pagination/membership scope. Project/Member/Invitation/Notification vẫn mở. G09 có mapping tiếng Việt cho lát cắt Login/Home; catalog song ngữ đầy đủ còn tiếp theo. G06 được giảm rủi ro bằng chặn double submit/no auto retry ở FE, chưa có BE idempotency. [FE foundation](../sds/FE-FOUNDATION-v0.1.md).

03/10/2026. Rà source routes/DTO hiện tại, không coi BE có endpoint là screen đã đủ dữ liệu. Đây là đề xuất xử lý trước khi nối FE, không implementation mới trong lượt phân tích UI. [Screen spec](SCREEN-SPEC-v0.2.md), [flows](SCREEN-FLOWS-v0.2.md).

## Đã có để thiết kế lõi

| Vùng UI | Nguồn BE đã có |
|---|---|
| Login/register/verify/reset/change/Google | /auth routes, capabilities Terms version/Google client ID |
| User profile/global preferences | GET /users/me, PATCH profile/preferences; locale, Google avatar/fallback |
| Home/context Workspace | /workspaces list/create/get/update, role và own overrides |
| Members/ownership/leave | Scoped members/remove/ownership/leave; membership versions |
| Invitation token/ID và Owner quản lý | Preview/accept, EMAIL accept ID; Owner create/list/revoke/retry-email |
| Project list/Board | Project state/list/get/create/edit; Board counts/columns, Task list filters |
| Task/comments/My Tasks | Scoped content/status/delete, editor normalization, permissions, search/time/cursor |
| Notifications | Own list/detail/read/read-all, unavailable mapper, cutoff/unread counts |

## Gaps cần xử lý

| ID | Mức độ | Vấn đề thật | Hướng xử lý đề xuất / tác động UI |
|---|---|---|---|
| G01 | P0 trước Account FE | User/auth/me DTO không có hasLocalPassword/providers; avatar Google không chứng minh kiểu credential | Bổ sung own account capabilities từ AuthIdentity/password existence, chỉ boolean/provider, không secret; mới phân nhánh change password/link/linked/Google-only đúng |
| G02 | P1 trước Task/Members polished | Task/Comment chỉ ID creator/assignee/author; active Member list không chứa tên người đã rời | Enrich DTO hoặc endpoint batch identity trong scope Task/Workspace, name/avatar allowlist kể cả historical reference; không expose email hoặc User lookup toàn hệ thống; UI không hiển thị ObjectId |
| G03 | P1 trước picker nhiều thành viên | Members chỉ paginated, chưa server search hoặc lookup assignee selection/history | Add scoped search/pagination cho picker và total nếu cần; tạm load more nhưng không giả search toàn bộ trên trang đã tải |
| G04 | P1 trước mở rộng search/time danh sách | Hiện dynamic q/time đầy đủ chỉ Task/Board/My Tasks; Project/Workspace/Member/Invitation/Notification chưa có cùng query | Screen spec mục 7 đề xuất field/scope phù hợp theo yêu cầu search/time; thêm server filters/total trước UI; không search client page đầu rồi tuyên bố toàn tập; Notification phải check masking trước search và bind cutoff với filters mới |
| G05 | P0 trước public release | Terms/Privacy text/version/contact chưa hoàn thiện, Terms version env hiện draft | Chuẩn bị nội dung phản ánh dữ liệu thật, Việt/English, bind acceptance đúng version; không chặn wireframe local |
| G06 | P1 reliability trước FE create retry | Create Task/Comment/Workspace chưa idempotency key, timeout có thể đã commit | UX ngăn double-submit/no auto retry; thiết kế BE idempotency riêng khi duyệt; không hứa nút Retry luôn an toàn |
| G07 | Phase riêng | Announcements UC-35 chưa API, quyền/ordering/limits còn cần cụ thể hóa | Giữ trong inventory, không active nav/CTA fake; khi vào phase mới chốt payload/state/API và màn |
| G08 | UX/pending policy | Locale default/guest persistence và invitation email language là đề xuất; work mail locale đã có | Review cách guest preference → user locale null/vi/en; auth/invitation SMTP hiện bilingual, không giả đã localized theo account như work mail |
| G09 | UI polish/BE mapping | Public error envelope có stable codes nhưng FE chưa có catalog/mapping; User fields dùng UTF-16, rich text graphemes; old SRS limits có proposal khác | Một catalog vi/en + shared limits/validation mapping bám runtime; không copy mọi limit đề xuất thành UX rule; handle 409 theo từng code |
| G10 | NFR/operations | Không realtime notifications, worker process riêng và SMTP work email thật chưa kiểm; API read không trả email delivery status của từng work event cho actor | Không vẽ live badge, mail delivered toast hoặc SLA như đã đạt; refresh/focus/manual trước, NFR/worker/prod verification riêng |

P0 ở đây là mức ưu tiên nối màn đúng chức năng hoặc public release, không tuyên bố lỗi bảo mật hiện hữu. Không tự mở rộng scope upload/storage/payment/roles vì gặp gap layout.

## Các bẫy không cần endpoint mới nếu bố cục đúng

- Home không cần progress/activity/stats; hiện đủ Workspace cards + navigation My Tasks.
- Project description/info dùng GET Project; Owner role từ Workspace context; Task response permissions vẫn là gợi ý UI, BE recheck lúc lưu.
- Đăng ký password chưa có session: dùng result screen + Login/verify-link, không cần giả auto-login.
- Notification unavailable vẫn returned/countable: generic row + read state, không loại khỏi UI rồi số badge lệch.
- LINK chỉ copy ngay lúc create: bỏ copy-again ở list; không cần lưu raw token để sửa một control design.
- Member override là own membership: đặt vào personal path/context dành cho mọi Member, không cần Owner cấp quyền riêng.
- Comments newest-first khớp API hiện tại; nếu muốn oldest-first/chat timeline cần thiết kế query trước, không reverse riêng từng trang.

## Đầu ra review trước Figma

Chốt cấu trúc/navigation/forms và các layout đề xuất; ghi rõ state cần frame. G01/G02/G03 ưu tiên trước nối Account/Task UI. G04 có bảng scope đề xuất, cần server contract trước controls hoạt động. Public policies/operations vẫn là checklist trước release. Design không được suy từ dữ liệu demo rằng backend đã cung cấp identity/search/count nào đó.
