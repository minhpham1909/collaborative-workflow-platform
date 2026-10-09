# C2 increment 2 QA — Lead / Guest

05/10/2026. [Contract](../sds/PROJECT-LEAD-GUEST-API-v0.1.md).

- 52 BE unit pass, 9 dedicated Mongo suites skipped trong lượt unit.
- 73 BE integration pass, 0 fail/skip trên isolated replica set; Project access suite 9/9 (suite cha + 8 assertion groups).
- 12 FE unit pass, Vite build 113 modules. Chỉ Inbox renderer/filter/accept mới; chưa UI visual/browser acceptance cho Guest.
- Audit dev vẫn valid (0 Organization/1 legacy standalone); indexes mới additive, không seed data thật/backfill/đổi ownership. Không chạy worker SMTP hoặc mail queue cũ.

## Coverage mới

- Lead chỉ Member hiện tại, không Guest; own Project Task/description được chỉnh, Project khác/Workspace/lifecycle/Guest management bị chặn; concurrent Lead CAS một commit, stale 409.
- EMAIL preview không lộ recipient; exact email và verified gate; concurrent accept tạo một grant; LINK multi-user/rejoin, revoked/expired denied; cross-Project revoke ID denied. Guest acceptance không tạo Org/Workspace membership.
- Guest chỉ đọc shared Project/Board/Task và own Comment; Workspace roster/Project khác denied; Task create/edit/delete/status/assignment denied. Historical Creator/Assignee returning as Guest không bypass; DTO không email/security fields.
- Revoke Guest/comment-create race consistent; post-revoke edit denied, Comment được giữ. Revoke link không thu hồi Guest đã join. Reactivate/link accept không tạo pair trùng.
- Org exit cleanup Lead/Guest kể cả Archived; external Guest khác giữ quyền riêng; độc lập khác không bị ảnh hưởng. Inbox historical work note bị ẩn khi mất quyền, hiện lại chỉ khi current Guest được xem Project.
- HTTP shared list/Board allowed, Project khác denied; forged role input/hostile Origin denied. Unit models typed targets exclusive và DTO strict.

## Không coi đã nghiệm thu

Public Org/Project invitation pages và token/login intent, Guest shared Project/Task UI, email-link browser E2E; SMTP/Google thật; C3 Ban/moderation hard Comment delete; C4 reopen approval/limits/Task enrichment; C5 archive/trash/retention. Hiện C2 còn Đang làm ở UI entry/context, không coi build/test cũ thay coverage mới.
