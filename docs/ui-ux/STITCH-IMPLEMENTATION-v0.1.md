# Stitch Home/Workspace — triển khai React 04/10/2026

Theo yêu cầu trực tiếp “thay đổi lại UI theo hướng mới”, đã port bố cục từ [hai màn được chọn](stitch-import-2026-10-04/README.md). Không thay HTML vào ứng dụng; giữ API, quyền, search debounce, date range, cursor, CAS và guards khi kết quả ghi chưa xác định.

## Phạm vi

- AppHeader dùng chung thay sidebar: logo, Home/My Tasks/Notifications và menu tài khoản Settings/Logout. Native details hỗ trợ keyboard, Escape trả focus về summary, click ngoài/đổi route đóng menu; tên menu đọc được cả trên mobile.
- Home: hero gradient kem/lavender/coral, CTA tạo Workspace, card ba/hai/một cột, role theo Workspace, ảnh cover, ngày tạo thật và shortcuts cá nhân.
- Workspace: header trắng nối pill tabs, Projects hai/một cột, cover với Active/Archived badge. Archived vẫn mở xem; quyền Owner/Member và các màn Team/Settings/email riêng giữ nguyên.
- Shared filters: pill search/date/select/buttons, giữ khoảng ngày và xử lý query phía server. Không thêm sort giả; vẫn mới tạo trước.
- Tokens/style nằm trong FE/src/studio.css sau styles.css; các màn khác nhận header và filter/CTA đồng bộ, chưa có thiết kế riêng mới cho Board/Task/Auth.

## Ảnh

Năm cover preset copy từ gói Stitch đã tải, lưu local ở FE/public/images/studio: moodboard=image-03, architecture=image-04, campaign=image-05, website=image-06, branding=image-10. [Manifest nguồn](stitch-import-2026-10-04/manifest.json) chứa URLs/hashes/mô tả; ảnh là trang trí, alt rỗng, lazy loading. Chọn preset ổn định theo ID, không đổi khi sort/filter/phân trang. Không dùng portrait mẫu làm avatar thật; không mở upload/storage. Font Jakarta local và SVG icon hiện có, không thêm CDN/Tailwind/Google font request.

Không render số liệu mock, Project members/deadline/progress chưa có API, Workspace archived/restore, payment, template hay bookmark giả.

## Kiểm tra

- Vite build và 12 FE unit tests đạt.
- Isolated React/Express/Mongo: Home create/search/reload/session restore/logout đồng bộ hai tab; menu Escape; Workspace→Project search/create/edit/archive/reopen, CAS draft, Member controls và mất membership đều đạt.
- Account fixture: profile/preferences/CAS/password rotation và Google link/Google-only fixture đạt. Team fixture: invite/retry/revoke/accept/transfer/remove/leave đạt.
- Regression FE/scripts/check-network-flows.mjs đạt: tạo Workspace/Project/Task/Comment đã commit nhưng mất/503 response vẫn chặn submit lại bằng chuột và bàn phím, giữ draft, reconcile khi đóng.
- Đã xem screenshots Home/Workspace desktop; kiểm không tràn ngang 1440/1280/390px, xem Home mobile. Chưa phải nghiệm thu UI mọi màn hay Google/SMTP thật. Không chạy worker gửi hàng đợi mail cũ.

QA screenshots/harness chuyên lượt này ở .local (ignored), dữ liệu test trong Mongo tạm độc lập.
