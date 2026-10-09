# S10 — Settings/Auth QA

09/10/2026: **S10a đạt, S10b tiếp theo**. [Contract](../ui-ux/SETTINGS-AUTH-S10-CONTRACT.md).

- Settings theo Stitch profile summary + tabs/content card, Google avatar/initials thật, phương thức login dựa capability. Không job title/bio/Pro/counts/achievements/2FA/theme hoặc upload fake.
- `FE/scripts/check-stitch-settings.mjs` real React/Express/temp Mongo PASS: blank name không PATCH; tab cancel giữ draft; CAS giữ draft và reload/discard; profile response cập nhật; email prefs/locale lưu; password mismatch không POST, current password sai giữ retry, success thu hồi session khác và current reload được; lost profile response chỉ1 write/readback, Google wrong-email rejection, lost Google-link response lock/readback linked; Google-only không password form, unverified không link; GET lỗi clear/retry.
- Profile/preferences/security mỗi tab1440/1280/1024/768/375 không overflow. Screens `.local/stitch-settings/{profile,preferences,security}-{width}.png`, `google-only.png`. Installed skill probe `.local/stitch-settings/probe-mine-{width}/report.json`:0 Hỏng/console sạch. Mobile orphan tab đã chuyển3 cột; initials trong summary được căn giữa, undo/save có khoảng cách; text pretty tránh widow.
- Google SDK/verifier giả lập có ghi rõ trong fixture; HTTP challenge/nonce/password/user/unique identity/session store thật. Không gọi Google/SMTP thật và không dùng tài khoản cá nhân người dùng. Đây không phải Google provider end-to-end production acceptance; thực Google auth đã được thử trước, không rerun/claim trong S10a.
- FE16 unit/build149 PASS; C2 invitation browser regression PASS. Toàn BE rerun trên DB tạm sau commit baseline:67 test thường PASS/14 Mongo tests skip ở lượt unit,113 integration PASS/0 skip. Các worker tests dùng fixture/providers giả, không chạy dev queue.
- Gu exceptions: focus rings/native select/password controls/warm borders/header-shadow theo brand/accessibility; không claim mọi heuristic clean. Không đổi BE schema/API trong S10a. API ready; Mongo27017 OS và27018 project giữ nguyên; không SMTP/retention/purge/moderation/backfill dev.

## Git checkpoint

09/10:9 commit baseline tách models/API/operations/design assets/foundation/workspace-team/task/inbox-routing/docs, đẩy `origin/dev` tới5888972. `.env`, runtime DB, builds/dependencies/QA screenshots bị ignore; raw Stitch ZIP duplicate thêm ignore, extracted references commit. S10a có commit riêng sau gate. Chỉ nâng cấp UI10a; chưa coiS10 hoàn tất.
