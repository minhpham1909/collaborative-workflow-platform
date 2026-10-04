# Workflow FE

04/10/2026: React JavaScript/JSX + Vite đã chạy. Increment đầu có Login, khôi phục phiên, xác minh email gate và Home lấy/tạo/search Workspace qua BE thật. Visual dùng nền kem, tím và các accent mềm theo hướng Stitch đã chọn.

## Chạy local

Node 24.x, pnpm 11.19.0. Từ thư mục FE:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Mở **http://localhost:5173/**. BE phải chạy tại localhost:4000; xem [BE README](../BE/README.md) để chạy Mongo replica set, tạo indexes và API. `WEB_ORIGIN` của BE phải khớp chính xác `http://localhost:5173`; không đổi sang 127.0.0.1 rồi dùng cùng cấu hình CORS.

Mặc định API origin là localhost:4000. Nếu cần đổi, tạo `.env` từ `.env.example`. Biến `VITE_*` là dữ liệu công khai được bundle vào FE: không đặt Google client secret, SMTP password hoặc JWT secret vào đây. Google client ID công khai lấy từ BE `/auth/capabilities`.

```powershell
pnpm test
pnpm build
```

`pnpm preview` dùng port 4176 để xem build; muốn gọi API phải cấu hình BE cho origin này. Server preview không phải deployment production.

Regression lỗi mạng sau khi BE commit: `node scripts/check-network-flows.mjs` (FE dev đang chạy, Playwright/browser test có sẵn). Dùng Mongo/API fixture riêng, không gửi email thật. Cấu hình module/browser và bằng chứng tại [audit luồng](../docs/qa/SYSTEM-FLOWS-CHECK.md). Form create có kết quả chưa xác nhận sẽ giữ nội dung và chặn submit lặp; đóng form để đọc lại dữ liệu. Đây chưa phải BE idempotency.

## Phạm vi hiện tại

Auth: signup email với consent bản nháp local, xác minh/đặt lại mật khẩu qua token link scrub URL, khôi phục generic và login lại sau reset. [Thiết kế](../docs/sds/FE-REGISTRATION-RECOVERY-v0.1.md), [QA](../docs/qa/FE-REGISTRATION-RECOVERY-CHECK.md). Kiểm trực tiếp Google/SMTP thật để sau; không coi draft policies là bản public release.

Workspace Cài đặt nhóm: Owner sửa tên/mô tả bằng shared editor. Email của tôi trong nhóm: inherit/on/off theo từng sự kiện, giá trị hiệu lực và reset. [Thiết kế](../docs/sds/FE-WORKSPACE-SETTINGS-v0.1.md), [QA](../docs/qa/FE-WORKSPACE-SETTINGS-CHECK.md).

Workspace Thành viên/Lời mời: quản lý Owner remove/transfer/invite/revoke/retry, Member leave, server search/time và nhận link sau login. [Thiết kế](../docs/sds/FE-TEAM-INVITATIONS-v0.1.md), [QA](../docs/qa/FE-TEAM-INVITATIONS-CHECK.md). Không tự chạy SMTP worker.

Account/Personal Settings tại `#settings`: hồ sơ, email preferences chung, locale cho email, đổi mật khẩu và Google link theo credential capabilities. [Thiết kế](../docs/sds/FE-ACCOUNT-SETTINGS-v0.1.md), [QA](../docs/qa/FE-ACCOUNT-SETTINGS-CHECK.md). Google link đã kiểm fixture, chưa kiểm provider thật.

Notifications inbox/detail, badge chưa đọc, read/read-all, search/thời gian và accept EMAIL invitation đã nối BE. Unverified được xem own inbox, accept vẫn cần verified. [Thiết kế](../docs/sds/FE-NOTIFICATIONS-v0.1.md), [QA](../docs/qa/FE-NOTIFICATIONS-CHECK.md).

- Đăng nhập email/password; access token chỉ trong memory, refresh cookie HttpOnly; reload khôi phục phiên, đăng xuất và đồng bộ thay đổi phiên giữa tab.
- Google control dùng challenge/nonce BE và Google Identity Services. Tài khoản đã đăng ký/liên kết được sử dụng theo contract. Account Settings có UI link dùng mật khẩu hiện tại và nonce; đăng ký Google mới chưa mở khi Terms UI/nội dung chưa hoàn thiện. Không tự nhận consent hoặc tự link tài khoản trùng email.
- Home: danh sách Workspace có quyền hiện tại, mới tạo trước, search tên/mô tả trên server, ngày tạo theo Việt Nam, cursor/load more, tạo Workspace bằng tên; trạng thái loading/empty/error.
- Workspace cards mở Workspace thật: danh sách Dự án search/lọc ngày/trạng thái trên server, tạo Dự án Owner, danh sách thành viên có pagination. Chi tiết Dự án hỗ trợ Owner đổi tên/lưu trữ/mở lại và conflict expectedVersion. Reload link trực tiếp giữ ngữ cảnh.
- Board/Task/Comments/My Tasks đã nối API thật: search/thời gian/cursor, status/quyền, CAS, Task create/edit/delete và author-only Comment edit/delete. Editor chung Tiptap cho Task/Comment; deadline nhập giờ Việt Nam. [Thiết kế](../docs/sds/FE-TASKS-v0.1.md), [QA](../docs/qa/FE-TASKS-CHECK.md).
- Policy thật/Google signup, English UI và editor mô tả Project còn tiếp theo. Task toàn trang, chưa panel/autosave/drag, phục hồi filters khi back hoặc mọi draft transition.

Font Plus Jakarta Sans self-hosted; license trong `public/fonts/OFL.txt`. Chưa cài UI kit, routing/form library; editor Tiptap pin 3.31.4. [Thiết kế nền](../docs/sds/FE-FOUNDATION-v0.1.md), [QA Auth/Home](../docs/qa/FE-AUTH-HOME-CHECK.md).

[Workspace/Project increment](../docs/sds/FE-WORKSPACE-PROJECT-v0.1.md), [QA Workspace/Project](../docs/qa/FE-WORKSPACE-PROJECT-CHECK.md). Hash navigation nhỏ dùng Home/Workspace/Project; chưa chọn routing library.
