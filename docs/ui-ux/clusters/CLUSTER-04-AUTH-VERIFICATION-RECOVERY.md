# Cụm 04 — Đăng nhập, Đăng ký, Google, Xác minh và Khôi phục

Ngày 03/10/2026. Tiếp tục phân tích desktop/mobile responsive trước Figma và FE. Nội dung dưới đây đối chiếu BE/src/auth hiện hành, [screen spec](../SCREEN-SPEC-v0.2.md) và [flow](../SCREEN-FLOWS-v0.2.md). Layout vẫn là đề xuất; không đổi session contract hoặc tự xác nhận toàn bộ Google/email đã nghiệm thu.

## 1. Home có tồn tại và nằm ở đâu?

Có hai đích khác nhau: Landing `/` dành cho người chưa vào ứng dụng; Home `/app` là “Workspace của bạn” sau đăng nhập, chứa danh sách Workspace và lối My Tasks/Notifications. Workspace `/workspaces/:id` là bên trong một nhóm, không đồng nghĩa Home.

```text
Landing → Login → Home: Workspace của bạn
                       → Chọn Workspace → Projects → Board → Task

Task link → Login nếu cần → kiểm verified/quyền → Task đã yêu cầu
Invitation → Login nếu cần → kiểm verified → card lời mời → Tham gia
```

Đăng nhập bình thường vào Home; không tự chọn Workspace đầu tiên, kể cả chỉ có một nhóm. Người chưa có nhóm thấy onboarding ngay trong Home: tạo Workspace hoặc xem lời mời. Nếu có một đích hợp lệ trước khi login, ưu tiên đích đó. Invitation phải được người dùng bấm Tham gia, không auto-accept sau login. Task không còn quyền/xóa thì màn không khả dụng với lối về Home, không lặp login.

Home không cần một dashboard riêng nữa phía trước danh sách Workspace. Khi có session hợp lệ mở Login/Register trực tiếp, đề xuất chuyển Home hoặc intent, tránh đưa lại form đăng nhập. Khi mở Landing có session, giữ nội dung public và CTA Vào ứng dụng.

## 2. Khung màn Auth

Không dùng sidebar công việc. Có logo, chọn Việt/English, form chính và liên kết Terms/Privacy. Desktop form gọn giữa màn, có thể thêm vùng giới thiệu ngắn; mobile một cột, bỏ phần minh họa lớn. Không đặt form trong modal nhỏ khi bàn phím mở.

Label luôn hiển thị, không chỉ placeholder; email dùng bàn phím phù hợp, password có hiện/ẩn và autofill đúng mục đích. Không chặn paste/password manager. Focus lỗi đầu tiên, text giải thích gần trường; trạng thái gửi không làm layout nhảy. Giữ email/display name khi lỗi, không đưa password vào URL/log hoặc lưu draft lâu dài.

## 3. Login

Email, password, Đăng nhập, Quên mật khẩu, Đăng nhập Google và Tạo tài khoản. Không thêm Remember me khi BE chưa có thời lượng tùy chọn. Sai credential dùng thông báo chung; lỗi mạng khác sai mật khẩu; 429 đọc Retry-After nếu có, không cho click liên tục.

Sau response thành công, khởi tạo session rồi tải/kiểm user hiện tại; nếu target cần verified mà user chưa verified thì vào gate. Không hiển thị Workspace/Task trước khi kiểm quyền rồi mới che. Refresh khi reload theo session contract; FE cần phối hợp request refresh để tránh tự làm token rotation xung đột. Access token giữ trong memory, refresh cookie do BE quản lý; không lưu JWT trong localStorage để “nhớ đăng nhập”.

Intent FE là route nội bộ allowlist và trạng thái tối thiểu, không chấp nhận URL redirect tùy ý hoặc token trong query next. Login/Register đổi qua lại giữ intent. Token invitation/verify/reset giữ tạm trong memory theo flow; nếu mất khi reload hoặc mở tab khác, hướng mở lại link gốc, không giả draft/intent sống qua mọi trình duyệt.

## 4. Register

Display name, email, password, confirm password, checkbox đồng ý Terms hiện hành và CTA Tạo tài khoản; lựa chọn Google dùng cùng flow chung. Confirm password FE kiểm, không gửi field thừa BE từ chối. Hint password bám rule hiện hành, không tự thêm yêu cầu hoa/số/ký hiệu. Display name guardrail hiện 100 UTF-16 units.

Terms version lấy từ capabilities, checkbox mặc định chưa chọn. Mở policy không tự đồng ý. Nếu version thay đổi và BE trả TERMS_REQUIRED, tải version mới và yêu cầu đồng ý lại, giữ nội dung hợp lệ; không tự tick hoặc retry acceptance mới.

Password register trả REGISTRATION_ACCEPTED, email queued, chưa cấp session. Result screen nói “Tài khoản đã được tạo. Kiểm tra email và đăng nhập để tiếp tục”, có Đăng nhập và hướng dẫn mở thư/Spam. Không dựng auto-login hoặc nút resend công khai không có endpoint. Resend cần login; vì vậy result có thể dẫn Login rồi verification gate. Queue không chứng minh email tới Inbox.

## 5. Google sign-in và account link

CTA dựa `/auth/capabilities` và SDK khả dụng; Google chưa cấu hình hoặc tải SDK lỗi có giải thích, password login vẫn dùng được. Cancel/đóng popup không báo sai password. Không thiết kế nút Google tự tạo để giả SDK đã tích hợp.

| Kết quả | Giao diện/luồng |
|---|---|
| Session thành công | Cùng verified/intent/Home flow với password login |
| Account Google mới cần Terms | Màn consent rõ version, đồng ý rồi tiếp tục flow Google; không tạo password bắt buộc |
| ACCOUNT_LINK_REQUIRED | Giải thích cần login tài khoản sẵn có rồi liên kết Google trong Account Settings; không gọi đây là login thành công |
| Challenge/credential không còn hợp lệ | Cho bắt đầu lại thao tác Google với challenge phù hợp, không auto retry credential cũ vô hạn |
| User chưa verified theo app | Verification gate, không coi mọi tài khoản Google luôn đủ verified |

Nonce/credential chỉ phục vụ request xác thực, không lưu draft, không xuất UI. Nếu consent hoặc popup kéo dài, FE phải xử lý challenge hết hạn và re-auth Google khi cần; không hứa giữ credential mãi. Account link là thao tác có phiên và kiểm mật khẩu hiện tại, khác login; phân tích chi tiết capabilities/phân nhánh ở cụm Personal Settings.

## 6. Xác minh email

Cần hai biến thể cùng ngôn ngữ giao diện:

- Gate cho user đã login chưa verified: email bản thân, giải thích, Gửi lại, Kiểm tra lại, đổi tài khoản/đăng xuất. Profile/Personal Settings/own invitation inbox còn đường mở; Workspace/Task bị gate.
- Kết quả verify link: đang xử lý, thành công, token không khả dụng, lỗi mạng. Endpoint verify không cần phiên, nhưng thành công không tự đăng nhập.

Gate resend trả queued hoặc already verified; nói đúng response. BE resend thu hồi token verify cũ, nên giải thích dùng email mới nhất. Chưa cam kết deadline cooldown cố định ngoài hạn rate limit thực tế. Kiểm tra lại gọi trạng thái user mới, không chỉ thay local flag.

Verify thành công có phiên thì kiểm user và tiếp tục intent hoặc Home; nếu phiên là tài khoản khác, không coi email phiên đó verified chỉ vì token đã xác minh thành công. Không có phiên thì về Login. Token hết hạn/đã dùng/thu hồi dùng wording theo error thực tế, không tự suy nguyên nhân chi tiết. Có link về Login để resend, không giữ người dùng trong màn lỗi cụt.

Verify token hiện hạn 24 giờ; reset 30 phút theo BE, không thay TTL trong UX. Link chứa token fragment; lấy vào memory, dọn address bar và không log/analytics. Reload mất token cần mở lại email gốc. Lỗi network sau consume có thể khiến thử lại báo token không khả dụng; nếu có phiên kiểm trạng thái user, không khẳng định tài khoản xác minh thất bại từ retry đó.

## 7. Quên và đặt lại mật khẩu

Forgot: email và Yêu cầu khôi phục; kết quả chung “Nếu email phù hợp với tài khoản hỗ trợ mật khẩu, hướng dẫn sẽ được gửi”. Không tiết lộ account tồn tại hay Google-only, không báo chắc chắn email đã được gửi. Có Login và Google để người dùng tự chọn phương thức quen thuộc.

Reset: password mới/confirm, Đặt lại mật khẩu, không cần password hiện tại. Endpoint chưa có public preflight kiểm reset token; không làm loading “đã kiểm link hợp lệ” giả. FE kiểm token shape để báo link thiếu/sai dạng, còn hiệu lực thật do BE quyết định khi submit. Token lỗi có Yêu cầu link mới; password validation giữ nội dung form.

Reset thành công thu hồi phiên và clear FE session/cache, nói Đăng nhập lại; không refresh phiên cũ sau đó. Giữ intent nội bộ nếu còn phù hợp rồi kiểm quyền mới sau login. Nếu reset link mở trong browser đang login user khác, chủ động giải thích sẽ về Login sau khi reset, không gán mật khẩu mới cho user trong local state.

## 8. Những vấn đề suy ra từ màn hình

| Nhu cầu | BE hiện hành | Hướng chuẩn bị FE |
|---|---|---|
| Login/register/verify/resend/recovery/reset/Google | Có APIs | Nối đúng lifecycle và session, không thêm auto-login register |
| Terms version/Google availability | Có capabilities | Hiển thị đúng consent/CTA; nội dung policy thật còn cần hoàn thiện |
| Home và intent sau login | Dữ liệu user/Workspace đã có | FE route logic, không cần endpoint “login Home” mới |
| Credential providers/password capabilities | Own DTO chưa có | Cần trước màn Account/link chi tiết, không suy từ avatar Google |
| Token validity preflight | Reset/verify kiểm lúc mutation | Thiết kế result theo response; chưa cần thêm endpoint chỉ để dựng màn |
| Các mã lỗi vi/en và labels validation | FE catalog chưa có | Map theo code, không render raw stack/JSON; lỗi không biết có fallback |
| Locale guest và user locale null | Chính sách default còn mở | Đề xuất guest chọn vi/en, user locale ưu tiên sau login; quyết định cuối ở cụm Settings |
| Email đến hộp thư và Google mọi biến thể | Chưa nghiệm thu toàn bộ | Các response/test cũ không đủ chứng minh; kiểm thực tế khi nối FE |

Không thêm captcha/MFA/passkey, SMS hoặc social providers mới từ bước layout này. Auth devtools hiện có chỉ là harness kiểm thử; các màn trên vẫn chưa được code thành FE sản phẩm.

## 9. Frames/flows cần kiểm trước Figma

Login normal/error/rate-limit/Google unavailable; Register/Terms/result; Google consent/link-required/cancel; gate và verify-link; forgot/reset invalid/success; Home zero/one/multiple Workspace sau login và Task/Invitation intent. Desktop/mobile, password autofill, bàn phím mở, Vietnamese IME và language labels dài. Không show dữ liệu công việc ở frame unverified/mất quyền.

Cụm tiếp theo: Personal Settings — Profile, Account, Email và Language.
