# S10 — Settings & Auth

09/10/2026: S10a account/settings và S10b1 Auth screens đạt trong scope; S10b2 Google signup/locale tiếp theo. Nguồn Stitch local `h_s_c_nh_n_c_i_t/code.html` + `screen.png`, shared form/Avatar/password/feedback/draft components; giữ kem–indigo/Jakarta, không wireframe lại.

## S10a

Profile summary trái + content card theo3 tabs phải; mobile summary thu gọn trên và tabs3 cột. Summary chỉ user/account DTO thật: name/email/verified, local password capability, Google linked và giờ Việt Nam. Không suy Org roles từ account, không fake counts/job title/bio/month joined/Pro/achievement/online presence.

| Tác vụ | API/body | Kiểm quyền / kết quả |
| --- | --- | --- |
| Account load/retry | GET `/users/me` | Current authenticated session; unavailable/error clear data, inline retry; cập nhật shell user từ response. |
| Profile | PATCH `/users/me/profile`, expectedVersion/displayName | FE nonempty/singleline/max100 + BE own-session/strict DTO/CAS. Known rejection giữ draft; normalizes local form theo response. Email chỉ đọc. |
| Email preferences/locale | PATCH `/users/me/preferences`, expectedVersion/locale/emailPreferences{assignment,comment,content,status} | Setting toàn account, Workspace overrides ưu tiên. Locale email-work, bản dịch site còn partial; security/auth mail không bị tắt bởi work prefs. |
| Đổi mật khẩu | API.changePassword → CSRF challenge + POST `/auth/password/change` | Current/new UTF/codepoint/byte limits và repeat match. Server verify password/revoke other sessions; rotate current JWT/cookie trong API wrapper. Unknown outcome yêu cầu đăng nhập/readback trước làm tiếp. Google-only không dựng password form. |
| Google link | capabilities → SDK → POST `/auth/google/link/challenge` → POST `/auth/google/link` credential/currentPassword | Chỉ local/unlinked/verified ở UI, same-email/password/nonce/unique identity kiểm BE. Không auto-link, không unlink CTA chưa có API. Known failure giữ draft; unknown khóa link/write đến reload/readback. |

- Dirty tính từ thay đổi thật, không giữ dirty chỉ vì đã chạm input; tab/reload discard có confirm, busy guard trong requests. Profile/preferences Hoàn tác chỉ về snapshot đã tải, không rollback server và bị khóa nếu uncertain. Password clear chỉ xóa local fields.
- Không khởi động Google link khi còn draft đổi mật khẩu, tránh link-success reload tự xóa password draft. Callback live/unmount/pending guards, clear password ref khi cancel/unmount; no local/session storage credentials.
- Already-linked hiển thị có thể login Google, không giả unlink/MFA/session list. Google-only không yêu cầu hoặc tự tạo password. Unverified link controls disabled; verify/auth flow chung cải thiện S10b.
- Summary/avatar từ Google picture hoặc initials hiện có; không upload personal avatar. Native password visibility buttons/focus giữ cùng hệ thống.

## S10b1 — Auth screens

- AuthFrame chung cho login/register/recover/verify/reset, brand SVG và story theo tác vụ; embedded Login của lời mời giữ form/intent hiện tại. Không copy fake social providers/seat counts/avatar/upload từ mockup. Bộ Stitch local không có Auth screen riêng, adapt foundation đã chọn.
- Existing API/contracts giữ: register có local draft policy/version/consent; capabilities load/retry không mất input và ignores stale request; FE password/name checks + BE strict validation. Register success chỉ nói queued verification, không nói mail delivered. Recover cùng phản hồi cho missing/Google-only, không user enumeration.
- Verify/reset token chỉ memory, scrub URL, user phải bấm POST; thiếu/đã dùng/hết hạn có hướng mở/yêu cầu liên kết mới. Verify missing token khi có account unverified có resend/reload actions hiện có; không suy tài khoản đang login đã được xác minh từ một link thuộc người khác.
- Reset success clears client session và revokes target sessions theo API. Unknown reset/register outcome khóa submit, không auto retry; kiểm trạng thái/login/readback trước gửi tiếp. Success card có bước tiếp theo, link giữ invitation intent hiện có qua login/register/verify.
- Login Google linked/existing vẫn có nonce/challenge; Google mới hiện vẫn TERM_REQUIRED/local policy gate như trước. Đây là việc riêng trong incrementS10b2, chưa mở theo hình thức auto-link.
- Auth strings hiện chủ yếuVi; không đánh dấu toànS10/Vi-En hoàn tất. Full-app locale vẫn cần auditS12, không nhầm email locale của settings với site đã dịch đủ.

## Chưa mở / tiếp theo

S10b2: language scope/copy; Google new-account terms/UI cần xét tiếp theo backend đã có. Toàn app Vi/En/draft/history được kiểm tiếpS12. Không thêm theme/timezone chooser/digest/mentions/2FA/billing/API keys/devices/unlink/account deletion chỉ vì mockup có.

[QA S10](../qa/UI-STITCH-S10-CHECK.md).

## S10b2 — Google signup (09/10)

GoogleRegister chỉ cho bắt đầu khi caps/consent hiện tại đủ; chọn Google sau xác nhận bỏ draft local, khóa form khi chọn/submit, cancel trước callback được phép. api.google gửi credential/termsAccepted/termsVersion từ version đã consent; nonce/challenge/verified claims/unique email-identity/transactions vẫn BE. Email Google authoritative cho verify theo backend; external không authoritative phải verify. Không password cho user mới Google-only, không auto-link local email trùng. Known errors retry nonce mới, TERMS_REQUIRED refresh caps/reset consent; unknown kết quả khóa write và đọc lại qua login. Success giữ invite intent qua continuation link, không auto-accept. Draft policy local không biến thành production policy. Locale tiếp sau.

## S10b2 — Auth Vi/En increment

AuthLocaleProvider và text catalogue cho5 Auth screens, embedded Login, GoogleRegister, trial-policy copy, validation/errors/hints và password visibility labels. Selector riêng trên AuthFrame/embedded Login; `main lang` đúng theo lựa chọn. Chỉ lưu `workflow.auth.locale` (`vi`/`en`), không token/credential; không PATCH email preference hoặc account locale tự động.

React presentation tree dịch static text và label/hint/error/aria-label, không sửa DOM ngoài React, không đụng controlled value/ID/version/href/callback/request body. FormField render callback vẫn giữ props/id; PasswordField có visibilityLabels tùy chọn, mặc địnhVi giữ trang cũ. Live messages giữ keysVi rồi dịch ở render nên đổi ngôn ngữ không làm mất draft. Lang controls khóa khi submit/chọn Google; có cancel picker trước submit, SDK renderButton dùng locale đã chọn.

Google discard confirmation có labels/messageVi/En; shared history/draft dialogs khác vẫn dùng labels chung chưa dịch hết, cần audit sau. Settings, outer invitation cards, app verified gate và S1–S9 không tự được coi là dịch đủ vì Auth cóEn. Vì gateVi/En còn ngoài Auth, chưa đánh dấu toàn S10/app hoàn tất; tiếp language coverage Settings/shared guards rồiS12 toàn ứng dụng.
