# Thành viên / Lời mời Workspace — QA

04/10/2026. [Thiết kế](../sds/FE-TEAM-INVITATIONS-v0.1.md).

- **12 BE integration tests đạt** trên replica set cô lập: Workspace lifecycle regression và query mới. Kiểm filter trước cursor, tên/ngày gia nhập Việt Nam, email/type/state, field privacy, sai query và Member không đọc invitation list. Existing tests kiểm remove/rejoin/assignee cleanup, transfer/leave và accept/revoke concurrency, expired/single-use/reusable tokens, invitation delivery lease/retry.
- **8 FE unit tests đạt** cho API/session và editor/deadline regression.
- Browser React thật → Express thật → Mongo fixture: search tên/email; tạo EMAIL queued; đổi fixture delivery failed rồi retry về pending; tạo LINK một lần; người mới login từ link và accept; stale membership version chặn remove rồi reload/confirm mới; transfer cập nhật role và nút; Owner mới revoke; Owner cũ rời nhóm và không còn card Workspace.
- Quan sát screenshot Invitations; không tràn ngang 1440/1280/390px, modal inert/focus controls, không page errors. Harness/screenshot ở `.local` ignored; integration assertions commit cùng code.
- Không gửi SMTP hoặc gọi Google provider thật, không sửa dữ liệu dev. Browser/server/DB fixture đóng trong finally. “Email chờ gửi” không phải nghiệm thu Inbox.
- Vite build, local Markdown links và git diff whitespace kiểm trước commit.

Giới hạn: chưa benchmark query nhiều thành viên/lời mời, chưa nghiệm thu production limiter/cookie/mail/NFR. Tabs/filter phục hồi khi reload/back, draft guards, English và Workspace Settings/overrides UI còn tiếp theo.
