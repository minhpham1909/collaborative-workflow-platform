# UI polish và rà soát email xác minh — 04/10/2026

## Cơ sở thiết kế

Phản hồi người dùng: icon điều hướng quá nhỏ, bộ lọc thô, My Tasks và Settings sơ sài, thiếu hình ảnh. Tham chiếu [bản Stitch đã lưu](FIGMA-STITCH-REVIEW-v0.1.md). Đọc Figma live bị Starter MCP quota chặn; lần này không tuyên bố khớp 1:1 canvas mới nhất.

- Sidebar: một vùng navigation, SVG 24px, hàng tối thiểu 52px, trạng thái active và aria-current. Mobile chuyển thành hai cột.
- FilterPanel dùng chung cho Workspace, Project, Members/Invitations, Notifications, Board/My Tasks: header, search rộng, field grid, khoảng cách và focus đồng nhất. Search động và lọc server giữ nguyên; ngày hiển thị native theo locale trình duyệt, phạm vi truy vấn vẫn theo contract Việt Nam.
- My Tasks: dòng công việc với title/context bên trái, status/deadline bên phải; chuyển thành hàng xếp dọc trên mobile. Không thay sort, scope, quyền, pagination hoặc overdue.
- Email preferences: mỗi sự kiện có hàng riêng, mô tả và checkbox dạng toggle. Có accessible name, bàn phím/focus và reduced motion. Workspace override vẫn ưu tiên setting chung.
- Security: các phương thức đăng nhập thành thẻ trạng thái, form password có hướng dẫn và khoảng cách; hai field password mới cạnh nhau ở desktop, một cột ở mobile.
- Home: banner illustration, CTA rõ; ảnh trang trí dùng alt rỗng. Không thêm carousel tự chạy vào vùng làm việc.

## Hình ảnh và nguồn nghiên cứu

Asset hiện dùng: `FE/public/illustrations/creative-workspace.svg`, SVG nguyên bản tự thiết kế cho dự án, không lấy ảnh Google/avatar làm hình quảng cáo và không cần tải hình từ bên ngoài khi mở trang. Palette lavender/coral/mint/amber giữ nhất quán với Stitch. Dùng cho Home và góc sidebar.

Nguồn đã nghiên cứu ngày 04/10/2026:

- [unDraw Team collaboration](https://undraw.co/illustration/team-collaboration_phnf), [license](https://undraw.co/license): nguồn illustration có thể đổi màu; kiểm điều kiện trước mỗi asset, không bulk redistribute hoặc dùng cho AI/ML training/development.
- [Unsplash license](https://unsplash.com/license): nguồn photography để chọn ảnh bàn làm việc/studio cho banner hoặc cover sau này. Khi chọn phải lưu ảnh cụ thể, tác giả, URL và license trong manifest; hiện chưa đưa ảnh Unsplash vào repo.

Chưa thêm storage/upload/slider như chức năng mới. Các minh họa tiếp theo nên có cùng nét và palette; ảnh thực nên giới hạn ở khu vực chào mừng/cover, để title, deadline và trạng thái dễ đọc.

## Authentication và gửi email

Đăng ký email → transaction tạo account chưa verified + token/outbox mã hóa → 202/queued → worker kiểm job/token rồi gửi → mở link xác minh → làm việc với verified account. Google linking vẫn cần proof mật khẩu, email khớp và identity unique; không tự link chỉ vì email giống nhau.

Chẩn đoán live: 5 verify_email pending, chưa có lỗi gửi, không có worker đang chạy. API `pnpm dev` không chạy worker. Chưa có bằng chứng SMTP lỗi. Đã thêm `mail:status` chỉ đọc và `dev:full` khởi động API + worker; cập nhật [BE README](../../BE/README.md). Không chạy `dev:full`/worker/once trong lần sửa này: người dùng chọn chỉ sửa setup, chưa gửi hàng đợi cũ. Năm job vẫn pending sau sửa. Không tuyên bố email đã đến Inbox/Spam.

## Kiểm chứng

- Vite production build và 12 FE unit tests đạt.
- 7 account integration tests trên replica set riêng đạt: signup queue, duplicate account, verify/reset, password rotation, Google proof/nonce, Origin/CSRF, dispatcher stale token và lease. Không SMTP thật.
- Settings E2E React/Express/Mongo đạt: profile/preferences/CAS, password rotation/reload, Google wrong-email/link/Google-only bằng GIS/verifier fixture.
- Task E2E đạt: Board/editor/comments, creator/assignee rights, My Tasks, CAS, archive, load more, deleted unavailable.
- Team và inbox E2E đạt sau khi đổi FilterPanel: search, queue/retry/revoke/accept lời mời, ownership/membership CAS, notification read/search/cutoff/masking; chỉ fixtures/fake sender.
- Screenshot kiểm trực quan Home, My Tasks, preferences, security; kiểm không tràn ngang tại 1440/1280/390px cho Settings và My Tasks. Screenshot chứa dữ liệu thử trong `.local`, không đưa lên Git.
- Script setup kiểm cú pháp; `dev:full` chưa chạy với SMTP thật theo lựa chọn người dùng.

Tiếp theo: review trực tiếp giao diện với chủ dự án; chọn bộ ảnh/illustration cụ thể nếu muốn nhiều biến thể. Mail live chỉ kiểm khi cho phép xử lý queue hoặc có môi trường test riêng. Figma đối chiếu mới nhất khi quota khả dụng.
