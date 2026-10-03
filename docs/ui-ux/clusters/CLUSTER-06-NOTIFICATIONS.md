# Cụm 06 — Notifications và badge chưa đọc

03/10/2026. Tiếp tục kế hoạch thiết kế sau review đăng ký/Google link. Phân tích responsive desktop/mobile, chưa code FE hoặc tạo Figma. Nguồn [contract Notifications](../../sds/NOTIFICATIONS-EMAIL-API-v0.1.md), [screen spec](../SCREEN-SPEC-v0.2.md) và BE/src/notifications. Layout/actions UX mới là đề xuất; policy rejoin theo quyền hiện tại đã được chủ dự án chốt.

## 1. Mục đích và lối vào

Người dùng cần biết điều gì liên quan tới mình vừa xảy ra, mở đúng Task/lời mời và xử lý các mục chưa đọc. Notifications không phải feed mọi hoạt động Workspace, không phải email delivery log và không phải nơi đọc nguyên Comment.

Chuông trong shell hiển thị tổng chưa đọc và link tới trang `/notifications`. Bản đầu không cần thêm dropdown đầy đủ thứ hai với filter/actions riêng. Desktop dùng list rộng dễ quét, mobile một cột. Link từ user chưa verified vẫn mở own inbox, có thể xem preview invitation; work payload bị che và accept vẫn cần verified.

## 2. Bố cục trang

```text
Thông báo                    [Tải lại] [Đánh dấu tất cả đã đọc]
[Tất cả / Chưa đọc / Đã đọc] [Tất cả loại / Công việc / Lời mời]
[Tìm nội dung…] [Ngày thông báo]             ← cần server extension
Tổng kết quả   •   Số chưa đọc của loại đang chọn

● [icon] Nội dung thông báo                      [Đã đọc]
         Thời điểm / Workspace khi còn quyền
  [icon] Nội dung thông báo
[Tải thêm]
```

Mới tạo trước theo createdAt/id, không gom nhóm theo Workspace hoặc chia Hôm nay/Hôm qua khiến thay đổi thứ tự mặc định. Timestamp có thể tương đối, kèm cách xem ngày giờ đầy đủ theo timezone Việt Nam; message tiếng Việt/English, tên do user nhập giữ nguyên.

Một mục gồm icon loại, message ngắn, thời gian, trạng thái đọc và action riêng. Work message lấy changes/payload có quyền từ BE: có thể cùng sự kiện có nhiều changes, trình bày thành một mục gọn, không tách thành nhiều unread records giả. Không tự hứa mọi thành viên nhận mọi thay đổi; người nhận được xác định bởi nghiệp vụ BE.

Desktop message mở đích và nút Đánh dấu đã đọc tách vùng click; mobile action có label rõ, không chỉ hover/menu ẩn khó tìm. Unread có text/style cùng chấm, không chỉ màu. Link/nút dùng được bằng bàn phím, không nest button bên trong toàn-row link.

## 3. Count, filter và search

Shell badge lấy unreadCount từ query category=all, không dùng items.length hay total của trang. Có thể trình bày 99+ trên icon nhưng accessible label giữ ý nghĩa; con số chính xác ở trang khi có dữ liệu. Nếu tải lỗi giữ badge cũ với trạng thái stale phù hợp, không đổi thành 0.

Trong inbox, total theo read/category; unreadCount theo category, không theo read filter. Ví dụ tab Đã đọc vẫn có thể hiển thị số chưa đọc của loại đã chọn; label phải rõ hoặc chỉ hiện unread count tại tab Chưa đọc. Đổi loại/filter reset cursor; Tải thêm dùng đúng query đã tạo cursor, deduplicate ID và bỏ response query cũ.

Search động/ngày tạo là yêu cầu đã có nhưng server Notification chưa hỗ trợ. Cần mở rộng query trước khi cho controls hoạt động trong FE; wireframe gắn chú thích, không dùng client lọc trang đầu rồi tuyên bố tìm toàn inbox. Search nội dung chỉ trong payload còn quyền xem; không query title/actor đã bị che để kết quả hoặc totals làm lộ thông tin. Mục unavailable chỉ có message chung, không được tìm bằng tên Task/Workspace cũ. Query/search/time cũng phải nhất quán pagination/count.

## 4. Đọc một mục và mở đích

GET không tự mark read. Đề xuất người dùng chọn message → mark read theo thao tác có chủ ý → mở Task hoặc card invitation; nếu mark request lỗi vẫn cho mở đích và giữ trạng thái chưa đọc, có retry riêng. Không báo unread đã giảm trước khi server xác nhận nếu chưa có rollback rõ.

Work available → canonical Task Detail, giữ đường về inbox/filter/scroll. Archived Task vẫn mở đọc, không coi Archived là unavailable. Nội dung notification là snapshot sự kiện; Task Detail là dữ liệu hiện tại, không hứa title/status luôn trùng snapshot. Không dựng activity history đầy đủ từ vài notification.

Invitation available → card accept theo invitationId, không yêu cầu token hoặc auto-accept. User chưa verified vào verification flow rồi quay lại. Accepted/expired/revoked sau khi list tải có thể thành unavailable; refresh đúng state, không hứa lời mời còn hiệu lực chỉ vì row cũ. Sau join, dùng Home/Workspace để mở nhóm; invitation đã accept có thể không còn target ở inbox theo mapper hiện hành.

## 5. Đánh dấu tất cả đã đọc

Contract hiện tại dùng cutoff do server ký, bind user và category. Action đọc mọi mục chưa đọc thuộc loại đang chọn và không mới hơn cutoff, bao gồm các trang chưa tải; không chỉ items đang hiện. Read filter không đổi phạm vi category này. Thông báo mới hơn cutoff vẫn chưa đọc.

UX button/tooltip diễn đạt “Đánh dấu tất cả thông báo [loại] đã đọc”, không nói chỉ các mục đang hiển thị. Có thể dùng confirmation gọn để giải thích bao gồm mục chưa tải khi cần; không thêm một bước confirmation bắt buộc cho mọi click nếu wireframe cho thấy label đã rõ. Pending khóa action; cutoff null hoặc không có mục unread phù hợp thì disable. Reload counts/list sau thành công, không trừ markedCount khỏi badge một cách mù khi có notification mới đồng thời.

Khi thêm search/time, không gọi action “đọc tất cả kết quả đang lọc” với cutoff hiện chỉ bind category. Đề xuất trước khi đổi contract: disable read-all trong search/time và giải thích xóa điều kiện để đọc theo loại. Nếu muốn read-all theo kết quả lọc, cần signed scope mới bind filters và quyền/masking; không chỉ truyền query tùy ý từ client.

Không có mark-unread, delete, archive hoặc ghim inbox vì chưa có API/nghiệp vụ. Read-all không xóa notification và không thu hồi email đã gửi.

## 6. Nội dung không còn khả dụng và rejoin

available=false → message chung “Nội dung thông báo hiện không khả dụng”, thời gian, read state và mark-read; không có target link. Không còn title, Workspace/actor, tooltip tên cũ hoặc thumbnail/aria-label lấy từ cache. Không khẳng định nguyên nhân là Task xóa hoặc bị loại khỏi nhóm vì response chung không chứng minh nhánh đó.

Record vẫn nằm trong count/unread nên không tự ẩn nó khỏi list và để badge không giải thích được. Được mark read vì inbox thuộc chính người nhận, dù không còn quyền target. Khi fetch mới xác định mất quyền, purge payload/target từ cache/background detail liên quan; không giữ dữ liệu cũ dưới skeleton.

Gia nhập lại Workspace: mapper kiểm membership/quyền hiện tại, có thể hiện nội dung cũ nếu Task còn khả dụng. Task đã xóa vẫn unavailable. Read state giữ nguyên, không tự biến thành unread mới hoặc gửi lại mail. Work email cancelled không tự phục hồi chỉ vì rejoin.

## 7. Cập nhật và trạng thái

Refresh khi vào trang/focus và nút Tải lại; chưa có realtime push contract, không hiển thị “trực tiếp” hoặc cam kết badge cập nhật dưới vài giây. Focus refresh giữ filter/scroll và không đóng Task/editor dirty. Số trên chuông phản ánh lần tải gần nhất, không phải bằng chứng mail đã được gửi/đọc.

Loading có skeleton; inbox empty khác no-results. Error lần đầu có retry, error Tải thêm giữ items đã tải. Session hết hạn đi Auth theo flow và clear inbox/cache account cũ. Mất Workspace quyền không đồng nghĩa hết phiên hoặc toàn inbox biến mất; chỉ các record liên quan bị mask.

Setting email không tắt in-app inbox. Không có nút bật Notification permission của browser khi chưa có push notifications. Worker/provider states không xuất trên work notification; invitation email delivery state nằm ở màn quản lý Owner.

## 8. Nhu cầu suy ra và frames

| Nhu cầu | Hiện trạng / kết luận |
|---|---|
| List/filter read/category, count, cursor | Đã có; render đúng nghĩa từng count |
| Mark one, signed read-all | Đã có; giới hạn category/cutoff, không giả chỉ đọc trang hiện tại |
| Task/invitation target và unavailable mapping | Đã có; không dùng snapshot thay quyền |
| Search/time | Gap server query, masking và cutoff scope cần thiết kế trước controls hoạt động |
| Badge toàn inbox | Query hiện có đủ; endpoint count riêng chỉ là tối ưu sau đo tải, chưa bắt buộc |
| vi/en message templates/error catalog | Cần FE catalog theo changes/code; không render raw JSON/enum |
| Realtime, unread/delete/pin/browser push | Chưa scope/contract, không tự thêm |

Frames: desktop/mobile có dữ liệu, empty/error, read/category filters, work nhiều changes, invitation unverified, unavailable, read-all pending/error/new-arrival, rejoin payload phục hồi; search/time frames thể hiện contract còn cần bổ sung. Không dùng thông báo giả để nghiệm thu quyền/realtime.

Cụm cuối cần phân tích: Landing/Terms/Privacy và announcements phase riêng; sau đó tổng hợp screen/state coverage, các quyết định còn mở và dựng wireframe chung.
