# Rà soát UI trước visual design

03/10/2026. Chủ dự án đã về máy tính: ưu tiên review desktop, không cần gửi preview điện thoại ở mỗi lượt. Responsive mobile vẫn trong phạm vi đã đồng ý. Wireframe lõi được đánh giá bố cục cơ bản ổn; màu/font/styles chưa chốt. Rà soát này hoàn thiện phần hành vi dùng chung, không mở thêm một vòng phân tích nghiệp vụ từ đầu.

Nguồn: [bảy cụm](SCREEN-REVIEW-SUMMARY.md), [screen spec](SCREEN-SPEC-v0.2.md), [gap log](UI-API-GAPS-v0.1.md), [ma trận account](ACCOUNT-REGISTRATION-LINK-REVIEW.md) và [wireframe hiện có](wireframes/README.md). Quy tắc đã chốt giữ nguyên; các lựa chọn UX mới dưới đây là đề xuất cụ thể để dựng states/visual.

## 1. Ma trận trạng thái cần có trong thiết kế

| Vùng | Trạng thái ngoài nội dung bình thường | Hành vi/nội dung cần thể hiện |
|---|---|---|
| Khôi phục phiên | Đang kiểm / không khôi phục được | Skeleton shell; không flash dữ liệu user cũ; Login giữ intent hợp lệ |
| Home/Projects | Loading / first-use / no-results / error / load-more error | CTA theo quyền; lỗi không biến thành empty; giữ query và items đã tải |
| Board/My Tasks | Filter pending / không kết quả / stale fetch / Archived | Count theo query; request cũ không ghi đè; Archived banner; Task Done rời default My Tasks có giải thích |
| Task đọc | Người chưa phân công / đã rời / không deadline / overdue / deleted / mất quyền | Nhãn chữ rõ; không show ObjectId; bỏ payload private khi unavailable |
| Task tạo/sửa/status | Dirty / saving / validation / timeout / conflict / Project vừa Archived | Save state độc lập status; giữ draft hợp lệ; không tự retry create hoặc stale mutation |
| Comments | Empty / load error / sending / editing / delete / mất quyền | Form riêng; chỉ Author edit/delete; preserve text nếu request lỗi, không báo success trước response |
| Members | Loading / no-results / Owner không có người kế nhiệm / stale membership | Không remove Owner; chuyển quyền trước leave; rejoin stale không bị remove bằng confirmation cũ |
| Invitation Owner | EMAIL/LINK / lifecycle / delivery / copy fail / lost Owner | Lifecycle và delivery riêng; LINK copy một lần; retry failed giữ hạn; không cam kết đọc email |
| Invitation nhận | Guest / unverified / wrong account / already member / unavailable | Một CTA phù hợp; không auto-accept; không lộ email đích hoặc nội dung nhóm |
| Auth/Google | Credential error / rate limit / popup cancel / Terms / link required / recovery | Message đúng scope; không auto-link; register chưa session; reset yêu cầu login lại |
| Settings | Dirty / saving / conflict / Google-only / linked / avatar lỗi | Own capabilities thật; global vs membership version; fallback avatar; password draft không persist |
| Notifications | Unread/read / unavailable / read-all pending / new arrivals / list error | Generic unavailable vẫn mark read; cutoff category; badge dùng global unread, không items.length |
| Public/Policies | Guest/session CTA / nội dung policy draft | Landing khác Home; policy có version; chưa công bố nội dung giả |

Wireframe lõi hiện mới kiểm một phần normal/role/Archived/filter/route flows; bảng trên là coverage phải dựng thêm, không tuyên bố các frames hoặc API error tests đã hoàn thiện.

## 2. Tương tác dùng chung và confirmation

- Search/list: ô search cùng phong cách, filter scope được ghi rõ; thời gian chọn ngày tạo hoặc deadline khi phù hợp. Filter sai ngày báo gần field, chưa áp dụng. Reset về default của từng màn, không tự đổi sort.
- Form: label luôn thấy; lỗi field cạnh field, lỗi tổng nếu không gắn được một trường. Save disabled khi không có thay đổi hợp lệ hoặc đang gửi; Cancel phục hồi snapshot. Client validate và BE validate độc lập, cùng rule hiện hành.
- Pending: khóa đúng mutation, không freeze cả app; trường hợp status mutation và content draft phối hợp version, không gửi đồng thời từ cùng snapshot.
- Confirmation cần cho delete Task/Comment, revoke invitation, remove/leave/transfer. Nội dung nêu đối tượng/ảnh hưởng cụ thể, nút theo hành động; không dùng “OK” chung. Read-all không nhất thiết cần dialog nếu phạm vi label đủ rõ.
- Dirty navigation: route/back/close có cảnh báo, tránh bản nháp biến mất. Giữ draft trong tab không đồng nghĩa autosave phục hồi sau đóng browser. Không persist secret hoặc nội dung công việc vào web storage mặc định.
- Status thành công, Task reassign hoặc membership đổi: cập nhật/refetch dữ liệu/counters liên quan theo response, không hứa realtime. Mutation timeout chưa rõ kết quả: kiểm trạng thái khi có thể, không tạo lại tự động.

## 3. Desktop, accessibility và ngôn ngữ

Review chính desktop 1440px và laptop 1280px; sidebar/tên dài không ép Board/card/input tràn khung. Task panel có đường mở full page và close/back source; direct Task không giả background route đã tải. Tablet/mobile vẫn reflow, menu/filters thu gọn, không yêu cầu hover/drag để thao tác.

Dialog focus vào nội dung phù hợp, trap focus và trả focus về trigger sau đóng; Escape/Close phải đi qua dirty guard. Nền dialog không còn tương tác/đọc như một màn thứ hai. Drawer menu có label/expanded state. Buttons vs links đúng semantics, không nested interactive controls; không chỉ color để báo overdue/error/role/status. Keyboard có thứ tự rõ, focus visible và error/read success announcements phù hợp.

Editor: IME tiếng Việt, selection/undo, paste/links/emoji, toolbar keyboard và count không bị mất khi đổi layout/language. Mẫu textarea chưa nghiệm thu các điểm này. Text overflow/paste dài cần clamp ở card nhưng đọc đầy đủ trong detail. Profile title limits dùng UTF-16; rich text dùng grapheme, không gộp thành một rule đếm giả.

Đủ nhãn/empty/error/conflict vi/en; user content không dịch. Ngày/giờ cùng thời điểm UTC và timezone Việt Nam. Language fallback guest/null vẫn đề xuất, không dùng một screenshot tiếng Việt để coi toàn bộ i18n đã kiểm.

## 4. Component inventory trước styles

Shell/sidebar/header/breadcrumb; Button (primary/secondary/danger/loading); Input/Password/Select/date-time; SearchFilterBar; Workspace/ProjectCard; TaskCard/ListRow; Avatar/RoleBadge/StatusBadge/Deadline; Dialog/Drawer/TaskPanel; RichTextEditor/Viewer/Counter; CommentItem/Composer; NotificationItem/UnreadBadge; Empty/Error/Skeleton/InlineAlert/Toast; LoadMore; dirty/conflict confirmations.

Components phải có default/hover/focus/disabled/error/loading và variants theo quyền/content. Colors/typography/spacing/radius/shadow/icons là tokens của bước visual design; chưa chốt package hoặc token values trong lượt này. “Danger” không chỉ đổi màu mà phải có label/ngữ cảnh. Branding có thể có accent nổi bật nhưng phần Board/work forms ưu tiên đọc và quét nhanh.

## 5. Điều gì cần trước visual, trước nối FE và trước release?

| Mốc | Cần hoàn thành | Không cần chờ |
|---|---|---|
| Bắt đầu visual design | Sitemap/mục đích, permissions, shared states, component inventory, desktop baseline | BE search/count/capability mới có thể dùng mock ghi rõ; policy text thật không cản vẽ template |
| Nối FE theo module | Own account capabilities, identity lịch sử, picker/list query đúng scope, error catalog/version/refresh coordination | Announcements/storage ngoài increment không cản core |
| Public release | Policy/content/provider/retention, production security/worker/NFR và kiểm real flows | Không coi wireframe/Figma/tests mock là bằng chứng đã đạt |

Có thể bắt đầu visual design lõi ngay sau review này. Các frames Auth/Members/Settings/Notifications và states còn thiếu được dựng cùng shared components, không cần trì hoãn style đến khi mọi BE gap đóng. Chưa cần thêm dashboard/roles/AI/file modules để chuyển giai đoạn.

## 6. Các lựa chọn còn mở nhưng đã có hướng đề xuất

- Locale: Việt default khi chưa có lựa chọn, account vi/en ưu tiên; policy vẫn cần xác nhận trước nối i18n/locale mail đầy đủ.
- Notification read-all trong search/time: giữ category/cutoff hiện tại, disable action khi filter mở rộng chưa có signed scope. Chưa auto mở BE scope mới.
- Link account chưa verified và provider email drift: giữ code hiện tại trong mock, không nghiệm thu nhánh chưa policy; ma trận account ghi điểm cần quyết định trước hoàn thiện Auth production.
- Announcements: giữ phase riêng, quota/pinned ordering/fanout chưa chốt; storage Upcoming.

Thứ tự tiếp theo: chọn 1–2 hướng visual desktop cho Home/Board/Task → review → thống nhất tokens/components → mở rộng các screen/state còn lại → responsive check → FE theo module. Không yêu cầu mua tool hoặc tạo Figma file trước khi có visual direction cụ thể.
