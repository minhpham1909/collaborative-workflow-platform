# S10 — Settings/Auth QA

09/10/2026: **S10a/S10b1 đạt; S10b2 Google signup/locale còn mở**. [Contract](../ui-ux/SETTINGS-AUTH-S10-CONTRACT.md).

- Settings theo Stitch profile summary + tabs/content card, Google avatar/initials thật, phương thức login dựa capability. Không job title/bio/Pro/counts/achievements/2FA/theme hoặc upload fake.
- `FE/scripts/check-stitch-settings.mjs` real React/Express/temp Mongo PASS: blank name không PATCH; tab cancel giữ draft; CAS giữ draft và reload/discard; profile response cập nhật; email prefs/locale lưu; password mismatch không POST, current password sai giữ retry, success thu hồi session khác và current reload được; lost profile response chỉ1 write/readback, Google wrong-email rejection, lost Google-link response lock/readback linked; Google-only không password form, unverified không link; GET lỗi clear/retry.
- Profile/preferences/security mỗi tab1440/1280/1024/768/375 không overflow. Screens `.local/stitch-settings/{profile,preferences,security}-{width}.png`, `google-only.png`. Installed skill probe `.local/stitch-settings/probe-mine-{width}/report.json`:0 Hỏng/console sạch. Mobile orphan tab đã chuyển3 cột; initials trong summary được căn giữa, undo/save có khoảng cách; text pretty tránh widow.
- Google SDK/verifier giả lập có ghi rõ trong fixture; HTTP challenge/nonce/password/user/unique identity/session store thật. Không gọi Google/SMTP thật và không dùng tài khoản cá nhân người dùng. Đây không phải Google provider end-to-end production acceptance; thực Google auth đã được thử trước, không rerun/claim trong S10a.
- FE16 unit/build149 PASS; C2 invitation browser regression PASS. Toàn BE rerun trên DB tạm sau commit baseline:67 test thường PASS/14 Mongo tests skip ở lượt unit,113 integration PASS/0 skip. Các worker tests dùng fixture/providers giả, không chạy dev queue.
- Gu exceptions: focus rings/native select/password controls/warm borders/header-shadow theo brand/accessibility; không claim mọi heuristic clean. Không đổi BE schema/API trong S10a. API ready; Mongo27017 OS và27018 project giữ nguyên; không SMTP/retention/purge/moderation/backfill dev.

## S10b1

- `check-stitch-auth.mjs` real React/Express/temp Mongo PASS: login client length validation/known bad credentials; register mismatch/consent/queued verification; login unverified gate; verify không tự consume, one-use/used link error; generic recovery; reset expired/missing token; lost reset chỉ1 submit, locked/readback password changed; lost register single account/locked; caps error retry; existing linked Google login bằng SDK/verifier fake. Token scrub được assert trong URL. Không SMTP/provider thật.
- Login/register/recover/verify/reset ×1440/1280/1024/768/375 screenshots `.local/stitch-auth/{mode}-{width}.png`, no overflow/pageerrors. AuthFrame grid override sửa mobile legacy display:block để giữ khoảng cách cards. Semantic inputs/password controls/draft guard/policy consent giữ nguyên.
- Installed skill probe registration với session fixture để tránh expected anonymous refresh401: `.local/stitch-auth/probe-auth-{width}/report.json`,0 Hỏng/console sạch. Public5 screens kiểm riêng qua browser screenshot/flows. Policy details được expand đo; long policy paragraphs không cắt vì không phải sidebar rows. Warm borders/native checkbox/focus là Gu exceptions, không claim heuristic toàn bộ clean.
- FE16 unit/build151 và C2 invitation regression PASS. Không BE/schema/API/worker/dev data thay đổi. Main-languageVi/En và Google-new-account creation UI còn tiếpS10b2; S10 vẫn chưa gate hoàn tất.

## Git checkpoint

09/10:9 commit baseline tách models/API/operations/design assets/foundation/workspace-team/task/inbox-routing/docs, đẩy `origin/dev` tới5888972. `.env`, runtime DB, builds/dependencies/QA screenshots bị ignore; raw Stitch ZIP duplicate thêm ignore, extracted references commit. S10a đã commit6ac1814 và pushdev; S10b1 có commit riêng sau gate. Chưa coiS10 hoàn tất.

## S10b2 — Google signup increment

09/10/2026: GoogleRegister nối API có sẵn, consent/version bắt buộc, Google-only không password, exact-email không auto-link, email không authoritative vẫn verify. Draft email/mật khẩu phải xác nhận bỏ trước chuyển; lỗi commit-unknown khóa cả hai phương thức, readback login không tạo lại user. Thay termsVersion giữa thao tác bị rollback; reload capabilities buộc consent lại.

check-google-signup.mjs real API/temp DB + fake Google SDK/verifier PASS, consent/draft/rejection/authoritative-external/stale terms/unknown/readback,5width no overflow; probe0 Hỏng/console sạch. C2 regression, FE16/build152 PASS. Không Google/SMTP thật, không BE/schema/queues dev. Locale còn increment tiếp; chưa toàn S10.
