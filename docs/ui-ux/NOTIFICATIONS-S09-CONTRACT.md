# S9 — Notifications / invitation entry

09/10/2026: S9a Inbox và S9b public invitation entry đạt trong phạm vi S9. Nguồn Stitch local `trung_t_m_th_ng_b_o_ho_t_ng_m_i/code.html` + `screen.png`; giữ kem/indigo/Jakarta và component hệ thống, áp dụng ui-ux trực tiếp, không vẽ lại wireframe.

## S9a bố cục / tác vụ

Header/refresh/read-all → quick all/unread/read → compact search/read filter + advanced category/Vietnam dates → nhóm unread/read của các trang đã tải. Row có loại, icon, trạng thái đọc, thời điểm, nội dung được BE cho phép và action phù hợp. Icon thay cho chân dung bịa; group heading ghi số mục đã tải, không coi page là tổng inbox. Thứ tự mới tạo trước trong từng nhóm, cursor server vẫn sort ngày tạo.

| Tác vụ | API | Điều kiện / state |
| --- | --- | --- |
| List/search/date/category/read | GET `/notifications`, limit12/cursor/read/category/q/from/to | Server filter/search sau masking, count toàn scope. Search200/debounce300ms; generation bỏ stale; invalid from>to không request. |
| Detail | GET `/notifications/:id` | Own recipient/current scope; không tự đọc khi mở. Breadcrumb quay về filter whitelist trong URL. |
| Mark one | POST `/notifications/:id/read`, `{}` | Idempotent; vẫn được đánh dấu khi target unavailable. Không báo thành công trước response. |
| Mark all | POST `/notifications/read-all`, `{cutoff}` | Cutoff ký theo recipient/category/q/time của response gần nhất. Loaded query phải khớp, có unread/cutoff. Confirmation giải thích gồm trang chưa tải, không phụ thuộc tab trạng thái đọc, bỏ qua bản mới hơn snapshot. |
| Open Task/Workspace | DTO available + target type | Chỉ render link target khi available; scope kiểm lại ở trang đích. Không lấy IDs/payload raw để vượt masking. |
| Invitation actions | Existing WS/Org/Project accept-by-ID | Detail giữ verified gate/scope theo API, không lộ reusable token. Public invitation redesign riêng S9b. |
| Badge | GET list limit1 + workflow-inbox-changed/focus | Không websocket/polling/realtime claim; stale count có cảnh báo. |

## Mutation và điều hướng

- Đặt pending trước confirm, khóa filters/writes khi đang xử lý; busy draft guard chặn rời trong pending. Cancellation không gửi API. Known error có retry; uncertain network/5xx khóa write đến fresh reload/readback, không tự retry mutation.
- Read success refresh list/detail và badge. Filter URL replaceState không tạo history entry cho mỗi ký tự; detail return chỉ cho `#notifications`, whitelist options/date/q; external/unrelated return bị loại. Khi quay về tải từ trang đầu, không serialize cursor/scroll. Broad Back/Forward/draft gate ở S12 vẫn cần kiểm.
- Generic unavailable row không render task/name/actor/target; search không match snapshot mất quyền. Leave rồi rejoin có thể hiển thị lại nếu quyền hiện tại cho phép; deleted Task vẫn unavailable. Không restore nội dung dựa vào cache.
- Summary `total` theo read filter; `unreadCount` theo category/q/time, không theo read filter. Không suy global category counts từ một page.
- Compact controls có kích thước tối thiểu, wrap ở tablet/mobile; email preference link tách khỏi quick tabs và nói đúng email work preference, không giả in-app mute setting.

Không thêm mention/reply, deadline alert/snooze/extension, nhận Task, Slack/browser push, pin cá nhân, Workspace filter, realtime sync hoặc ảnh nhân sự khi API chưa hỗ trợ. Không đổi API/schema/worker/data trong S9a.

## S9b — Public invitation entry

Không có standalone invitation screen trong bộ Stitch local. Adapt card/hero/type/role/spacing theo visual foundation hiện tại. Desktop public view hai vùng preview + existing embedded Login; mobile xếp dọc. Logged-in view nằm trong shell, có account/verification/accept card. Ba bước là hướng dẫn tĩnh, không số liệu hoặc controls giả.

- Workspace: preview tên/người mời/thời hạn, lời mời thành viên không cấp quyền quản trị. Org: Member và Workspace đích nếu được kèm; không nói được tự xem toàn Org. Project: Guest chỉ xem/bình luận, không giao/sửa Task hoặc gia nhập toàn WS/Org.
- Preview POST raw theo endpoint hiện có (`/invitations`, `/organization-invitations`, `/project-invitations`); generation/liveness qua effect và xóa preview cũ khi đổi token/endpoint/account/retry. Không gán token vào href/UI/storage; auth-link consumption scrub URL và giữ intent trong memory qua login/register/verify.
- Chưa login: chỉ hiện auth panel sau preview hợp lệ. Chưa verified: verification actions hiện có, không accept. Đã verified: account email rõ, CTA accept đúng scope. Đổi tài khoản dùng logout callback chuẩn của App, giữ intent; không gửi email recipient từ preview hoặc tự đoán email mismatch.
- Accept pending một request, busy route guard; callback/redirect chỉ sau busy=false và chỉ delivery một lần, tránh tự chặn chuyển trang success hoặc toast lặp. BE kiểm lại token/quyền/ban/lifecycle/email/idempotence, không cấp quyền từ FE.
- Network preview lỗi có retry. Terminal unavailable/archived/banned sau accept xóa stale preview/CTA và có chỉ dẫn kiểm tra nhóm/liên hệ quản lý. Hết hạn/thu hồi/đã dùng dùng thông báo generic của API, không suy nguyên nhân cụ thể ngoài dữ liệu được cung cấp.
- Unknown accept khóa gửi lại trong cùng intent/account, có Home/Shared để readback; preview retry không phải bằng chứng chưa commit. Refresh mất token thì hướng dẫn mở liên kết gốc. Guard History/Back toàn diện vẫn thuộc S12.

S9b không đổi BE/schema, không gửi SMTP hoặc mở thêm Guest/cộng tác quyền mới. Embedded Login semantics/Google-new-account/localization nâng cấp tiếp ở S10.

[QA S09](../qa/UI-STITCH-S09-CHECK.md).
