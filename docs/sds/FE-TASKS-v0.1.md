# FE Board, Task, Comments và My Tasks v0.1

04/10/2026. Increment FE thật sau Workspace/Project. [QA](../qa/FE-TASKS-CHECK.md). Visual giữ nền kem/lavender/coral/mint; chưa pixel-match Figma hoặc realtime.

## Màn và query

Project route có Board ba cột todo/in_progress/done, count/nextCursor từng cột. Tải thêm qua task list với status của chính cột; dedupe ID, không append cột khác. Search server/debounce 300 ms; generation loại response cũ, filter đổi reset cursor/data. Mới tạo trước, không drag/sort tay.

My Tasks `#mine`: list phẳng assigned-to-me, mặc định Project Active/status open. Cùng search, createdAt/dueAt, from/to Việt Nam, overdue/status; thêm Project state và Workspace selector paginated. Hiển thị tên Workspace/Project và Archived; không create Task không rõ Project đích.

`#task/:id`: chi tiết toàn trang, reload/direct link xác thực và tải Task→Project→Workspace; panel overlay bổ sung sau. Form chung title/description/assignee/deadline, member picker load more chưa search server. UTC ↔ giờ Việt Nam độc lập timezone máy, đến phút; hạn quá khứ có cảnh báo nhưng cho lưu. Done giữ assignee lịch sử khi sửa nội dung: không gửi assigneeId không đổi. Reopen dùng cleanup BE.

Task controls theo permissions, Comment controls chỉ Author. Archived bỏ controls ghi, vẫn đọc/filter. Mutation expectedVersion, không auto retry timeout, conflict giữ draft; đóng form rồi Làm mới để đọc lại, không tự merge. Chỉ báo saved sau response thành công.

## Editor

Tiptap React/pm/StarterKit 3.31.4 pin lockfile. [React install](https://tiptap.dev/docs/editor/getting-started/install/react), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) đã đối chiếu 04/10/2026; không tính năng trả phí/cloud. Lazy chunk riêng; Task/Comment dùng cùng component.

Heading 1/2/3 schema (H1/H2 controls), bold/italic/underline, paragraph, lists, link, emoji Unicode, undo/redo, từ/grapheme counters. Disable codeBlock/horizontalRule vì BE chưa hỗ trợ. Adapter giữ attrs/marks BE chấp nhận, link chỉ href; HTTP(S)/mailto, không credentials/control chars. Không gửi HTML hoặc tin plainText FE; BE validate tree/depth/size/link và derive text độc lập. Không dangerouslySetInnerHTML. FE title/limits/blank validation hỗ trợ UX, BE vẫn validate mọi input.

Lưu rõ ràng, chưa autosave. Khóa form khi gửi, cancel/draft confirm và unload/link guard. Chặn thao tác Task khi soạn Comment để không mất draft do remount. Browser hash Back/Forward, logout và mọi transition draft chưa có router blocker hoàn chỉnh; filters chưa giữ sau unmount. Hoàn thiện trước release.

## BE identities

Task DTO thêm creator/assignee {id, displayName, avatar}; Comment thêm author cùng allowlist. Chỉ lấy User được tham chiếu sau parent/session/membership guard, không lookup tùy ý/email/credential. Người đã rời còn tên theo reference; assigneeLeft derive membership hiện tại. Cache theo request/transaction, không cache quyền giữa requests. G02 xử lý các DTO này; chưa benchmark NFR/batch tập lớn. G03 picker search vẫn mở.

Tiếp theo: Notifications, Account/Settings, quản lý Members/Invitations, English, panel/routing/filters/draft transitions, editor Workspace/Project. Storage/announcements riêng; không chạy SMTP/Google live lượt này.
