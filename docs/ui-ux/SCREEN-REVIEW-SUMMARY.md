# Tổng hợp sau phân tích bảy cụm màn hình

03/10/2026. Đã phân tích mục đích, bố cục, luồng/quyền và dữ liệu cần dùng cho bảy cụm. Đây là hoàn thành vòng phân tích nội dung; chưa phải toàn bộ UI đã được chủ dự án duyệt, FE đã code hoặc mọi BE gap đã xử lý.

## 1. Kiến trúc để dựng wireframe

Landing → Login/Register → verification/intent → Home danh sách Workspace → Workspace Projects → Board → Task/Comments. My Tasks xuyên nhóm và Notifications là lối cá nhân, dùng cùng Task Detail. Profile/Account/Email/Language là own Settings; own Workspace email tách khỏi group Settings Owner.

| Cụm | Tài liệu | Trọng tâm |
|---|---|---|
| 01 | [Navigation/Home/Workspace](clusters/CLUSTER-01-NAVIGATION-HOME-WORKSPACE.md) | Chọn nhóm/dự án, không dashboard trung gian |
| 02 | [Board/My Tasks/Task/Comments](clusters/CLUSTER-02-BOARD-MY-TASKS-TASK-COMMENTS.md) | Cùng Task Detail, editor, status/edit quyền riêng |
| 03 | [Members/Invitations/Workspace Settings](clusters/CLUSTER-03-MEMBERS-INVITATIONS-WORKSPACE-SETTINGS.md) | Owner quản lý, EMAIL/LINK, membership lifecycle |
| 04 | [Auth/verification/recovery](clusters/CLUSTER-04-AUTH-VERIFICATION-RECOVERY.md) | Session/gate/intent đúng, không auto-login register |
| 05 | [Personal Settings](clusters/CLUSTER-05-PERSONAL-SETTINGS.md) | Profile, credential capability, global/own overrides |
| 06 | [Notifications](clusters/CLUSTER-06-NOTIFICATIONS.md) | Counts, cutoff/read-all, masking/rejoin |
| 07 | [Public/Policies/Announcements](clusters/CLUSTER-07-PUBLIC-POLICIES-ANNOUNCEMENTS.md) | Public vs Home, policy outline, phase announcements |

21 nhóm màn/forms trong screen spec hiện hành phủ 35 UC; group count không phải số frame nghiệm thu. Screen X01/empty/error/conflict/dirty là trạng thái xuyên nhóm. Routing/layout cụ thể và brand chưa duyệt.

## 2. Quyết định đã xác nhận và policy chưa chốt

Đã giữ email/password + Google optional, không đổi username; Google-only không cần password. Unique email/User và Google identity/User đã yêu cầu và có index plan. Same-email link giữ hiện trạng. Desktop/mobile responsive cùng nghiệp vụ đã được đồng ý. Status/sort/permission/deadline/email override/rejoin notification giữ SRS hiện hành; không mở thêm roles hoặc storage.

Chưa tự chốt: locale guest/null/email fallback policy chung; verified-before-link/khôi phục unverified/email provider drift; announcements phase/quota/ordering/fanout; Terms/Privacy nội dung/contact/retention; brand/tokens và libraries. [Ma trận tài khoản](ACCOUNT-REGISTRATION-LINK-REVIEW.md) ghi nhánh Auth còn mở. Quyền tạo Task/Comment đã có baseline BE nhưng không tự đổi chữ baseline ở SRS thành quyết định mới từ một wireframe.

## 3. Data gaps theo thời điểm nối màn

1. Account capabilities trước nối màn phương thức đăng nhập; historical identity trước polished Task/Comments.
2. Member search/pagination đầy đủ cho picker; Workspace/Project/Member/Invitation search-time còn phải bổ sung theo scope màn.
3. Notification search-time phải masking-safe và làm rõ read-all scope; hiện chỉ category/cutoff, không tự coi read-all theo mọi filter.
4. vi/en catalog/validation rules; create timeout/idempotency, không auto retry mutations chưa hỗ trợ.
5. Policy/operations/production verification trước release. Prototype không chứng minh provider delivery, realtime hoặc NFR.

Không cần đợi mọi gap để vẽ wireframe dữ liệu mẫu, nhưng FE không được nối control hoạt động giả trên trang dữ liệu đã tải. Không viết lại BE contracts đã có chỉ vì chuyển sang wireframe.

## 4. Quy tắc chung cần chứng minh bằng prototype

- App context/breadcrumb theo route, Home rõ; back/close giữ source và filters, direct Task không cần Board đã tải.
- Mobile menu/card/form/tab status; desktop sidebar/columns/panel; nhãn dài Việt/English, keyboard/focus và bàn phím mở.
- Sort mới tạo trước, counts không lẫn số items đã tải; search/filter reset cursor, responses stale không ghi đè.
- Save pending/error/dirty/conflict; status và content mutations không dùng cùng stale version song song.
- Archived read-only; Owner/Creator/Assignee/Comment Author khác nhau; mất quyền purge nội dung; rejoin không tự phục hồi assignee đã bỏ.
- Password/nonce/token không nằm trong demo code/data thực, URL params/log; không nối mail thật hoặc tạo User thật khi review mock.

## 5. Đầu ra wireframe và thứ tự

Đã bổ sung [rà trạng thái/tương tác trước visual](PRE-VISUAL-REVIEW.md). Chủ dự án thấy bố cục lõi cơ bản ổn và đã về desktop; không cần preview phone từng lượt. Có thể bắt đầu visual design lõi, các frames/state còn thiếu dựng cùng component library; vẫn chưa coi mọi layout/brand đã duyệt.

Batch đầu: shell, Home, Workspace Projects, Board, My Tasks, Task Detail/Comments. Mẫu local có dữ liệu giả, desktop/mobile; chứng minh chọn nhóm → mở Project → Task và quay lại. Sau đó Auth/Invitations, Members/Settings, Notifications, Public/Policies. Màn Announcement ghi phase riêng, không nút chức năng giả trong core prototype.

Đã có [mẫu HTML tương tác batch lõi](wireframes/core.html); [README mẫu](wireframes/README.md) ghi rõ controls được minh họa và giới hạn (editor text thuần, chưa loading/conflict/CAS/API). Chưa coi một prototype happy-path là toàn bộ frames nghiệm thu.

Wireframe ưu tiên cấu trúc và độ dễ đọc, chưa chốt design system. Sau review bố cục mới chọn visual tokens/shared components và libraries phù hợp FE JS/JSX; Figma sau khi cấu trúc rõ/quyền tool cho phép, không yêu cầu trả phí. Production FE theo module/contracts, test quyền/error trên API thật.
