# Workspace-only W2a — nền metadata BE

12/10/2026. Patch additive đầu tiên; không coi refactor Workspace-only hoàn tất.

## Đã triển khai

- Workspace schema/POST/PATCH thêm summary optional≤500, icon/color/coverId preset allowlist. Summary trim, blank spaces/null xóa giá trị; reject control chars/unknown types/presets, URL cover tùy ý và role/owner injection.
- Response thêm metadata, updatedAt, readOnly/readOnlyReason. Raw legacy rows thiếu fields có read fallback, không backfill. Giữ name/description/role/permissions hiện tại để consumers tương thích.
- Search Workspace mở summary vào literal AND query; không index migration.
- List trả activeProjectCount và archivedProjectCount theo trạng thái riêng Project được phép đọc. Workspace Archived không biến số Project Active thành0; readonly vẫn khóa nội dung.
- Owner/create transaction, current auth/rights/CAS và Archive guards giữ hiện tại. Chưa có membership role mới/nhiều Managers; Organization/Lead chưa bị gỡ trong patch này.

Preset icon: folder/palette/code/megaphone/layers/document. Color: lavender/coral/mint/blue/amber/gray. Cover: moodboard/architecture/campaign, khớp ảnh local hiện có. Default folder/lavender/moodboard; mới có default trong model, cũ có fallback khi đọc.

## Kiểm thử

- BE unit invocation:69PASS,16integrationSKIP vì invocation không cấu hình DB;0FAIL.
- Mongo isolated replica set: workspaces-mongo + work-mongo,25PASS,0FAIL/skip. Có create metadata, persisted read, summary search, Member403, stale409, Archived update409, Project Active/Archived counts, clear summary, raw legacy fallback không ghi fields.
- DTO unit negative cases: summary501/control chars/object; invalid icon/color/cover; forged role; empty/nullable summary; legacy read-only/defaults.
- Schema/index design tests trong unit suite PASS; không thêm/drop live index. git diff --check PASS.

Suite integration dùng DB workflow_auth_test trên replica set tạm. Existing mail dispatcher tests dùng fake send trong test DB; không gửi email thật hoặc chạy dev queues/workers. Không sửa data collections dev, Mongo27017/27018, không backfill/purge/deploy.

## Chưa hoàn thành

FE chưa có editor/create form cho metadata mới hoặc dùng preset đã lưu; chưa browser acceptance. DTO list vẫn giữ rich description để không gãy consumers, chưa tách lean projection. Member role/Manager appointment, bỏ Org/Lead, Home overview/priority và migration mapping thuộc patch sau. Count semantics mới đã có regression; DATA-05 chỉ phần BE đạt, không đóng toàn screen gate.

Tiếp W2b role foundation nhiều Manager, scope/target guards và isolated tests; không tự map Org Admin hoặc former Lead thành Manager. Sau contract đủ, nối create/settings/Home theo từng cụm và nghiệm thu web.
