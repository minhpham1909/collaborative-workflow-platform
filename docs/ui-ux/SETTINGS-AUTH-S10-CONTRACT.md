# S10 — Settings & Auth

09/10/2026: S10a account/settings đạt trong scope; S10b auth/locale screens tiếp theo. Nguồn Stitch local `h_s_c_nh_n_c_i_t/code.html` + `screen.png`, shared form/Avatar/password/feedback/draft components; giữ kem–indigo/Jakarta, không wireframe lại.

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

## Chưa mở / tiếp theo

S10b: login/register/verify/recover/reset và language scope/copy; Google new-account terms/UI cần xét tiếp theo backend đã có. Toàn app Vi/En/draft/history được kiểm tiếpS12. Không thêm theme/timezone chooser/digest/mentions/2FA/billing/API keys/devices/unlink/account deletion chỉ vì mockup có.

[QA S10](../qa/UI-STITCH-S10-CHECK.md).
