# W3a — Workspace metadata create/settings UI

12/10/2026. Nối contract BE W2a vào FE, giữ brand/component hiện có. Không đổi BE/schema/data dev trong patch.

## Đã triển khai

- Form tạo chỉ name required; optional summary/icon/color/cover preset, preview card theo input. Info nhắc mô tả chi tiết/mời người có thể bổ sung sau; success guide dẫn vào Workspace thực vừa tạo, dismiss được. Không fake setup percentage hoặc tự gửi invitation.
- Settings load/save/reset metadata cùng name/rich description, expectedVersion hiện có. Summary one-line≤500 theo rule BE; blank normalize null. Presets chỉ allowlist, không upload/URL tùy ý.
- Home card dùng summary (fallback description), stored icon/color/cover; Workspace header dùng icon/color/summary. Project cover/icon behavior giữ khi không truyền Workspace preset.
- Shared WorkspaceIdentityFields tái dùng FormField/ProjectIconPicker/StudioCover; picker thêm optional label, image key đổi theo cover để clear hidden fallback khi chọn ảnh khác. CSS semantic tokens, responsive2→1columns, six tone labels.
- Metadata participates create dirty/cancel/route guard, saving/unknown state; unknown outcome không retry create. Rich-description editor giữ canonical data/security behavior.
- Mất management nhưng còn read: fetch lại context xác nhận quyền đọc, remove edit controls, giữ bản nháp tên/summary/nhận diện/description dưới textarea read-only để copy. Mất read/Ban/401/404: callback clear parent Workspace context; không tiếp tục hiển thị metadata đã mất quyền. Không giữ draft qua account boundary hoặc tuyên bố guard mọi browser-history route.

## Evidence

- FE unit28PASS: preset parity BE/FE, summary limits/control chars/null-clear, existing auth/query/theme/color/editor/feedback suites.
- Build/budgetPASS: initial423902bytes,largest395860bytes; không nới budget.
- HomeS1 browserPASS: metadata create/persist/cover card/setup link, overview/priority partial errors, protected names, grid/list/filters/search/paging/create/draft vàVi-En5width.
- WorkspaceS3 Light+Dark browserPASS, mỗi case Vi-En/5width: summary/presets save+preview+persist, name/description/Project metadata, editor unsafe-link rejection, Archive readonly/independent child states, email overrides, CAS/draft vàRole loss.
- Case mới Manager demoted khi form mở: submit denied, DB summary không đổi, unsaved copy retained, Save control gone. Membership removed khi form mở: header/metadata/form/copy draft cleared, không expose protected context.
- Visual inspected settings EN375 screenshot: controls/text/preview/editor không overflow; native scroll cho settings dài. Hai theme harness dùng cùng output folder như script cũ, screenshot filenames có thể overwrite; log Light/Dark riêng ghi assertions, không dùng một PNG để chứng minh cả hai theme.

BE không đổi nên giữ gate trước126integration/72unit như lịch sử, không claim đã chạy lại toàn BE ở patch này. Browser/API/DB fixtures độc lập; không user-business data writes/SMTP/queues/purge/backfill/migration/deploy.

## Còn lại

UI appointment/demotion Manager và audit list ở Team chưa dựng (W3b). Setup guide là success navigation, chưa persisted/derived full checklist. Duplicate-create operation identity/readback contract chưa implement; UI chỉ khóa unknown response/reload, không chứng minh outcome bằng tên trùng. Avatar upload/storage, Organization cutover và UI toolbar/density acceptance tổng thể vẫn theo plan riêng.
