# Cụm 05 — Hồ sơ, Tài khoản, Email và Ngôn ngữ

Ngày 03/10/2026. Phân tích website responsive trước wireframe/Figma/FE. Quyền và email defaults giữ theo yêu cầu đã chốt; bố cục và chính sách locale fallback là đề xuất. Nguồn: [Profile contract](../../sds/PROFILE-SETTINGS-API-v0.1.md), [Auth contract](../../sds/AUTH-ACCOUNTS-v0.1.md), [language](../LANGUAGE-v0.1.md), [screen spec](../SCREEN-SPEC-v0.2.md) và source BE/src/users, BE/src/auth, BE/src/mail.

## 1. Mục đích và điều hướng

Người dùng cần sửa tên hiển thị, hiểu cách đăng nhập, quản lý email công việc và ngôn ngữ. Tất cả là cài đặt bản thân; Owner không chỉnh hộ người khác. Login chưa verified vẫn được vào Settings cá nhân, nhưng mở override của Workspace vẫn cần verified/membership theo guard hiện hành.

Menu tài khoản → Cài đặt cá nhân. Đề xuất bốn mục Hồ sơ / Tài khoản / Email / Ngôn ngữ, mỗi mục có URL riêng để deep link/Back đúng. Desktop có menu phụ bên trái nội dung; mobile có danh sách mục hoặc selector rõ label, không ép bốn tab dài vào một hàng nhỏ. Sidebar sản phẩm vẫn theo shell, không tạo một vùng điều hướng nhóm mới.

Mỗi form Save/Cancel riêng; không có nút Lưu tất cả qua cả credential/User/membership. Đổi mục có dirty guard. Trường bắt buộc, lỗi và pending cùng cách trình bày toàn ứng dụng. Form đang lỗi giữ nội dung hợp lệ, không reset về defaults.

## 2. Hồ sơ

```text
Hồ sơ
[Avatar Google / chữ cái]
Tên hiển thị       [                         ]
Email              [chỉ đọc]     Đã xác minh / Chưa xác minh
[Hủy thay đổi] [Lưu]
```

Tên hiển thị editable, guardrail hiện 100 UTF-16 units. Email chỉ đọc; chưa có đổi email. Avatar dùng URL Google đã được BE xác thực hoặc initials fallback; ảnh lỗi fallback ngay. Không có upload/crop hoặc ô nhập URL ảnh. Không hứa avatar tự đồng bộ ngay khi người dùng đổi ảnh tại Google vì chưa có refresh-avatar API riêng.

Đổi tên không đổi email, Google identity hay quyền Workspace. Sau Save cập nhật user menu/header từ response; không suy rằng tên trong mọi notification lịch sử đều bị sửa theo vì payload sự kiện có thể là snapshot. Profile không cần public profile route hoặc nickname từng Workspace.

User chưa verified có lời nhắc và link tới verification gate; nút resend thuộc luồng Auth, không tự gửi email khi mở Profile. Có tên/email của chính mình không cấp quyền xem Workspace.

## 3. Tài khoản — cách đăng nhập và mật khẩu

Hai khối “Phương thức đăng nhập” và “Mật khẩu”. Khối methods chỉ hiển thị sau khi own account capabilities tải thành công; lỗi có Thử lại, không đoán từ avatar hoặc lỗi thử gọi change-password.

| Trạng thái account | Nội dung/actions |
|---|---|
| Local password, chưa Google linked | Có mật khẩu; Đổi mật khẩu; Liên kết Google |
| Local password và Google linked | Mật khẩu và Google đã liên kết; Đổi mật khẩu |
| Google-only | Đăng nhập bằng Google; không có form nhập mật khẩu hiện tại hoặc Set password giả |

BE own user DTO chưa trả hasLocalPassword/providers nên chưa thể nối phân nhánh này chính xác. DTO mới đề xuất chỉ boolean/provider; không trả hashes, Google sub, credentials hoặc token. Google linked không cần hiển thị thêm email identity khác khi chưa có nhu cầu và contract; email account bản thân đã ở Profile.

### Đổi mật khẩu

Current password / new password / confirm, hiện-ẩn từng ô; hint theo rule BE. Confirm FE-only. Nút Đổi mật khẩu có lời giải thích thành công giữ phiên hiện tại và thu hồi các phiên khác. Endpoint cấp access/CSRF mới và refresh cookie mới: FE cập nhật session trước request tiếp theo, không dùng token cũ rồi báo vừa đổi xong lại hết phiên.

Không có danh sách thiết bị/phiên để hiển thị các device bị logout vì chưa có API. Lỗi mật khẩu hiện tại khác network/session lỗi. Thành công xóa toàn bộ password fields. Hết phiên hoặc đổi tài khoản cũng xóa password draft; không lưu password vào cache/localStorage/URL. Form change-password không dùng User expectedVersion vì endpoint có proof/session contract riêng.

### Liên kết Google

Local user chọn Liên kết Google → xác nhận mật khẩu hiện tại + chọn Google theo challenge link gắn user. Google identity phải đáp ứng điều kiện BE, gồm email canonical khớp; Google account sai hoặc đã liên kết khác không được auto-switch/merge tài khoản.

Cancel popup trở về form không làm mất session hiện tại; không gọi là đăng xuất. GOOGLE_LINKED thành công refresh account capabilities; response hiện chỉ có code, không tự lấy avatar từ credential rồi ghi user state như BE đã xác nhận. Refresh own user để lấy avatar chính thức nếu cần. Không dựng Unlink Google hoặc tạo password cho Google-only khi chưa có nghiệp vụ/API.

## 4. Email — mặc định toàn tài khoản và override nhóm

### Setting chung

Bốn switches có label dễ hiểu và mô tả ngắn:

- Phân công: được giao/thôi được giao Task — mặc định bật.
- Bình luận: có Comment liên quan — mặc định tắt.
- Nội dung: cập nhật nội dung/deadline — mặc định tắt.
- Trạng thái: Task thay đổi status — mặc định tắt.

Hiển thị setting đang lưu của user, không dùng default thay cho load error. Chỉ gửi fields thay đổi với User version. Bật/tắt email công việc không tắt email xác minh, recovery hoặc invitation và không tắt Notifications in-app. Lưu setting không phát email test hoặc notification mới. Không thêm reminder/push/integration switches ngoài contract.

### Override từng Workspace

Bên dưới có vùng “Tùy chỉnh theo Workspace”, chọn nhóm đang tham gia hoặc mở danh sách nhóm để đi tới `/workspaces/:id/email`. Reuse form đã phân tích ở [cụm 03](CLUSTER-03-MEMBERS-INVITATIONS-WORKSPACE-SETTINGS.md), không tạo bản logic khác trong Settings.

Mỗi loại có Theo setting chung/Bật/Tắt và text “Hiện đang bật/tắt”. Ví dụ global assignment bật + override Tắt → riêng nhóm này tắt; global đổi không tác động override on/off. Reset đưa bốn loại về inherit, không tắt tất cả. Leave/remove xóa override, rejoin kế thừa chung.

Global Save dùng User version, Workspace Save dùng membership version. Không gửi cả hai như một operation atomic giả. Có thể preview hiệu lực từ bản global chưa lưu nhưng phải ghi rõ “sau khi lưu”; ưu tiên tính giá trị hiệu lực từ dữ liệu đã lưu để tránh hiểu nhầm.

Worker hiện kiểm quyền và effective preferences lúc gửi work email; thay setting không bảo đảm thu hồi thư đã được dịch vụ gửi nhận trước đó. UI không hứa “mọi thư đang xử lý đã bị hủy”. Thông báo lưu chỉ xác nhận setting đã lưu, không xác nhận provider delivery.

## 5. Ngôn ngữ

Việt / English, một nút Lưu rõ ràng cho account. Đề xuất preview giao diện sau chọn, chỉ áp dụng toàn app khi Save thành công; nếu lỗi giữ lựa chọn pending và nói chưa lưu. Không reload trang hoặc unmount editor làm mất draft/filter chỉ để đổi nhãn. User locale đã có vi/en/null; không thêm locale khác hoặc timezone selector chưa có.

Đề xuất mặc định: chưa lựa chọn → Việt; guest preference trên browser chỉ lưu mã ngôn ngữ, user locale vi/en ưu tiên sau login; locale null dùng guest preference hoặc Việt, không tự PATCH account từ một lần login. Quy tắc này còn đề xuất, không biến thành yêu cầu đã được duyệt. Cho chọn vi/en rõ ràng ở account; null là trạng thái legacy/default, không dựng control “tự động” khi ý nghĩa chưa chốt.

Đổi ngôn ngữ dịch UI, lỗi và mẫu notification; không dịch title/description/Comment, không đổi search/sort/quyền. Ngày giờ đổi cách trình bày nhưng deadline vẫn giờ Việt Nam. Bộ đếm Unicode giữ cùng quy tắc. Nhãn Việt/English dùng tên tự nhận biết, không chỉ cờ quốc gia.

Work mail hiện lấy recipient.locale tại lúc chuẩn bị gửi, null fallback vi; auth/invitation templates còn song ngữ. Vì vậy không ghi “mọi email đều theo ngôn ngữ vừa chọn” trước khi đồng bộ chính sách/template. Guest lựa chọn ngôn ngữ không chứng minh thay đổi language của một email đã queue.

## 6. Hai form cùng sửa và responsive

Profile, global email và locale dùng chung User version, nên các form trong tab khác có thể stale sau một lần Save. FE cập nhật version chung từ response nhưng không thay expectedVersion của draft đã được tạo từ bản cũ để tự vượt conflict. Draft cần snapshot riêng, reload/so sánh trước Save; ưu tiên không gửi hai form từ cùng version song song.

Conflict giữ nội dung người dùng trong tab, cho xem/tải dữ liệu mới và áp dụng lại có chủ ý; không auto overwrite. Fetch focus không thay dirty fields. Mất session chuyển Auth theo flow, clear sensitive draft/cache; không để tên/email account cũ trên Settings account mới.

Mobile dùng form một cột; switches/select có label đủ rõ, target dễ chạm, lỗi không chỉ biểu thị bằng màu. Bàn phím mở vẫn cuộn tới field/CTA; password autofill/paste dùng được. Lưu/Hủy không bị toolbar hoặc safe area che. Desktop/mobile cùng capability và trạng thái.

## 7. Kết luận dữ liệu và frames

| Nhu cầu | Hiện trạng / việc còn lại |
|---|---|
| Profile/global email/locale/User version | Đã có APIs, đủ cho forms |
| Own Workspace overrides/reset | Đã có, reuse route/component đúng scope |
| Account providers/local password capability | Gap bắt buộc trước Account FE; không suy từ Google avatar |
| Member-safe Workspace selector | List có cursor, chưa server search; xử lý load more/query extension cùng cụm 01 |
| vi/en labels/error catalog và locale policy | Catalog FE chưa có, fallback còn đề xuất; email templates chưa đồng nhất |
| Avatar upload/email change/unlink/Google-only set password | Ngoài scope hiện hành, không vẽ controls hoạt động |

Frames: Profile normal/unverified/avatar lỗi/dirty/conflict; Account ba credential states/loading/error/link/password success; global Email và own override có hiệu lực khác nhau; Language vi/en/null; mobile bàn phím mở và account session-expired. Chưa cần thư viện hoặc endpoint riêng cho mỗi tab.

Cụm tiếp theo: Notifications — inbox, badge, mark-read/read-all, invitation và nội dung bị che theo quyền hiện tại.
