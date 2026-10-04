# Rà soát luồng hệ thống — lượt 1, 04/10/2026

Ưu tiên trực tiếp của chủ dự án: luồng hoạt động trước, chỉnh UI sau. Đối chiếu SRS/use-cases hiện tại, SDS/API và code đang chạy; handoff archive chỉ là lịch sử. Không coi những ghi nhận “chưa triển khai” trong tài liệu cũ là trạng thái code hiện tại.

## Ma trận đã kiểm

| Cụm luồng | Điều kiện cần giữ | Bằng chứng trong lượt này |
|---|---|---|
| Đăng ký / xác minh | Email unique, account chưa verified, queue token mã hóa, dùng token một lần; không cho làm việc trước verify | Account Mongo integration; Auth FE E2E |
| Login / refresh / logout | JWT + cookie, refresh rotation/replay, revoke và kiểm lại session trong transaction; không tự tạo membership | Auth/account integration; FE API tests |
| Password / Google | Reset thu hồi phiên, change giữ phiên hiện tại; Google không auto-link theo email, cùng email/password proof/nonce/identity unique | Account integration; Auth FE E2E reset/replay; Google provider thật không kiểm lại trong lượt này |
| Workspace / invitations | Tạo Workspace+Owner atomic; chỉ Owner mời; EMAIL đúng email verified và single-use, LINK reusable; expired/revoked không join | Workspace integration |
| Rời / remove / ownership | Không để nhóm thiếu Owner; bỏ assignee chưa Done kể cả Archived; Done giữ lịch sử; rejoin không tự giao lại, override reset | Workspace/work integration, gồm cạnh tranh accept/revoke và transfer/leave |
| Project / Task / Comment | Owner quản lý Project; Archived chỉ đọc; Owner/Creator quản lý Task, Assignee chỉ đổi status; Comment chỉ Author; expectedVersion chặn stale | Work integration; Project và Task FE E2E |
| Board / My Tasks | Scope theo membership hiện tại, sort mới tạo, query trước pagination, deadline UTC/Vietnam, Done không overdue | Work integration; Task FE E2E |
| Notifications / email | Loại actor/trùng, atomic event, đọc theo recipient, masking mất quyền, read-all cutoff; worker kiểm lại quyền/settings | Notifications/work integration; không SMTP thật |

44 tests do integration runner báo (bao gồm test cha) đạt, không skipped; toàn bộ 6 suites dùng replica set tạm riêng. 12 FE unit tests và Vite build đạt. Auth E2E có một lần timeout khi chạy song song tại bước recovery; chạy độc lập lại đạt toàn chuỗi. Chưa tìm được nguyên nhân timeout, nên giữ ghi nhận này để theo dõi độ ổn định của harness, không kết luận lỗi nghiệp vụ từ timeout đó.

## F-01 — gửi lại sau khi mất phản hồi: đã tái hiện và sửa

Trước sửa: POST tạo Task trả 201 từ BE, harness bỏ phản hồi trước khi FE nhận. Mongo đã có một Task; form báo “chưa xác nhận” nhưng nút Lưu vẫn enabled. Người dùng có thể gửi cùng lệnh một lần nữa và tạo bản trùng. Cùng cấu trúc lỗi có ở tạo Workspace, Project và Comment. API không auto retry nhưng chưa chặn retry thủ công.

Sau sửa:

1. Lỗi mạng, phản hồi không đọc được hoặc HTTP 5xx chuyển form sang kết quả chưa xác nhận.
2. Giữ bản nhập, chặn nút submit và `requestSubmit`/Enter; thay đổi field không mở khóa gửi lại.
3. Hủy/đóng form sau xác nhận sẽ tải lại dữ liệu tương ứng để kiểm kết quả đã lưu.
4. Lỗi validation/quyền/conflict 4xx vẫn cho sửa; expectedVersion vẫn giữ, không âm thầm overwrite.

Không thêm auto retry. Đây là bảo vệ trong form hiện tại, **không thay thế idempotency phía BE**: mở tab/form mới vẫn có thể tạo bản giống nhau. Idempotency key, replay response và retention cần một lát cắt SDS/BE riêng.

Regression lưu tại `FE/scripts/check-network-flows.mjs`: tạo Mongo/API fixture riêng, chặn phản hồi **sau khi BE commit**, gồm network abort cho Workspace/Task và giả gateway 503 cho Project/Comment. Kiểm DB đúng một bản ghi, draft còn nguyên, nút/keyboard không gửi thêm, đóng form đọc được bản đã lưu. Đã chạy đạt; không đọc account thật hoặc gửi SMTP.

## F-02 — vùng bấm Tạo Workspace bị che: đã sửa

Harness bấm thật phát hiện phần text banner có z-index che nút CTA. Chỉnh z-index nút để thao tác tạo Workspace thực hiện được. Không redesign giao diện trong lượt này. Regression F-01 bắt đầu bằng click CTA và hoàn thành create/read-back.

## Còn cần làm trước nghiệm thu toàn hệ thống

| Ưu tiên | Vấn đề | Bước tiếp theo |
|---|---|---|
| P1 | Bảo vệ bản nháp mới chỉ bắt click link/beforeunload; chưa bao phủ browser Back/hash và mọi refresh của trang cha | Rà soát navigation/draft transitions theo cùng một cơ chế; kiểm Cancel/Discard/Back/Reload khi đang lưu |
| P1 | Chưa BE idempotency cho create | Thiết kế key theo user/operation/payload, replay kết quả và cạnh tranh; không giả bảo đảm bằng FE debounce |
| P1 | Google signup mới chưa mở, policies hiện là draft local; SMTP delivery chưa nghiệm thu Inbox/Spam | Hoàn thiện release policy/consent rồi kiểm nhánh signup; test mail ở phạm vi được cho phép |
| P2 | Project description chưa có editor FE; Task assignee picker chưa có server search | Hoàn thiện create/edit/read-back với rich text và picker query/CAS/membership |
| P2 | Filters mất khi quay lại; phần lớn UI vẫn tiếng Việt | Giữ context navigation, rồi triển khai English theo yêu cầu đã chốt |
| P2 | Decision register/SRS có ghi nhận draft/open và “chưa triển khai” cũ xen với cập nhật đã duyệt | Đồng bộ baseline trước nghiệm thu; không yêu cầu người dùng duyệt lại các quyết định đã xác nhận |

Storage, reminders, push và announcements giữ phase đã thống nhất, không đưa vào sửa lõi này. Năm auth mail dev pending từ lần trước vẫn không gửi; không bật worker trong lượt audit.

## Chạy lại

```powershell
# Tại root, Node 24
node BE/scripts/run-integration.js
node --test FE/test/*.test.js
node FE/node_modules/vite/bin/vite.js build FE
```

Fault-injection E2E cần FE dev chạy và Playwright/browser test có sẵn. Dùng Playwright được cài trong môi trường test hoặc khai báo `WORKFLOW_PLAYWRIGHT_MODULE` là đường dẫn module đã cài; `WORKFLOW_BROWSER_EXECUTABLE` là browser binary nếu dùng Edge/Chrome ngoài bundled browser. Không có dependency production mới. Có thể đổi `WORKFLOW_FE_ORIGIN` và `WORKFLOW_API_ORIGIN` cho FE đang test.

```powershell
node FE/scripts/check-network-flows.mjs
```

Harness tự chạy/dừng replica set và API fixture; không cần API/dev DB thật. Lần đầu có thể tải Mongo binary vào `.local/mongodb-binaries`. Không export `.env` thật sang test.
