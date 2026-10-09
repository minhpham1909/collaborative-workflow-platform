# Kế hoạch core trước UI Stitch

Ngày 05/10/2026. Theo yêu cầu chủ dự án: hoàn thiện core trước, UI theo bộ Stitch mới; cho phép tinh chỉnh trong triển khai nhưng không tự thêm quyền theo mockup.

Nguồn nghiệp vụ: [delta D1–D5](../srs/CORE-EXPANSION-v0.3.md). Status Approved/Proposed/Open ở delta có ưu tiên; kế hoạch không tự phê duyệt điểm mở.

## Mốc và tiêu chí chuyển bước

| Mốc | Nội dung | Điều kiện hoàn thành | Trạng thái |
|---|---|---|---|
| C0 | Tổng hợp quyết định, khoảng trống, compatibility | Delta spec và danh sách điểm mở đọc được, không claim implemented | Đã có tài liệu; contracts còn mở |
| C1 | Organization/membership và authorization theo phạm vi | Org ownership/Admin; Workspace standalone giữ API cũ; cross-scope negative tests; schema/index/migration có bằng chứng | Đạt gate nền 05/10: role/ownership/Manager/internal assignment + audit log/notification và audit dev/indexes đã có; QA 48 unit/55 integration/12 FE/build; production rehearsal và lifecycle C2/C3 chưa nghiệm thu |
| C2 | Workspace Manager, Project Lead, Guest và invitations | Membership active/revoke; email/link accept không nâng quyền; Owner/Admin đọc toàn scope; member-only assignment; use cases mới | Đạt gate core 05/10: backend + public invitation intent + scoped Guest views/browser fixture; 52 BE unit/73 integration/13 FE unit/build, C2/Account/Team/Interaction browser pass. Redesign/admin full UI và providers live chưa nghiệm thu |
| C3 | Kick/Ban, profile DTO và dọn Comment | Ban mọi API/accept, cascade thu hồi; hard delete theo cutoff/scope; retry job; privacy và auth regression | Đạt gate core 05/10: Ban 3 scopes + signed cleanup review/job/worker/retry, hard Comment moderation, profile card privacy; 55 BE unit/82 integration/13 FE unit/build, C3/C2/Interaction browser. Full Ban UI/prod worker/NFR chưa nghiệm thu |
| C4 | Priority/labels/checklist/mã, activity, completedAt, reopen | Mã unique atomic; checklist CAS; rates/request unique; permission/state race tests; thống kê đúng | Đạt gate core 05/10: C4-A enrichment/mã/nhóm hạn + C4-B request/review/self-review guard/rates/cancellation/current-statistics; 61 unit/97 full integration + C4-B targeted10/13 FE/build; UI request queue/statistics, production migration/NFR chưa nghiệm thu |
| C5 | Workspace Archive, Task trash/restore và purge 30 ngày | Restore/purge race; parent semantics; hard Comment delete; authority và các điểm mở D4 chốt trước API destructive | C5-A đã kiểm: Workspace readonly lifecycle/Task trash restore/retention worker; 63 unit/107 integration/build. Manual purge quyền và transfer còn mở; worker chưa chạy dev thật, UI chưa nghiệm thu |
| C6 | Nghiệm thu core end-to-end | Test thật qua API hai org + standalone + Guest; migration rehearsal; payload/privacy/outbox checks; giới hạn live providers ghi rõ | C6-A/B local rehearsal đạt: HTTP e2e + encrypted BSON/index restore/rollback, measured100/1000/3000 Task/worker batch; 65 unit/113 integration. Query index/counts optimized + runbook. Tiếp U1 current API; production SLA/backup/providers và phạm vi mở chưa nghiệm thu |
| U1 | Dựng screen contracts theo Stitch | Mỗi CTA có quyền/API/state; chuyển scope, drawer/back/draft, search/filter và empty/error | Plan cụm/audit nguồn đã có ở STITCH-UI-CLUSTER-PLAN-v0.1.md; chưa toàn gate U1. F0/S1 pilot Home trước, bổ sung contract theo cụm |
| U2 | UI theo từng cụm | Theo F0/S1–S12 của Stitch cluster plan; một cụm đang làm, responsive/keyboard/API thật và QA trước chuyển cụm | Chưa bắt đầu code đợt UI mới |

Mỗi slice gồm schema/index, validation, service/store/HTTP, permission matrix, migration, use case/QA rồi mới chuyển mốc. Không đánh dấu hoàn thành chỉ vì model tồn tại. Có thể review UI mapping song song trên giấy; chưa đổi màn đang chạy trước nền API.

## Compatibility bắt buộc

- Workspace đang có giữ id/owner/membership, được nhận diện standalone; không tạo tổ chức giả hoặc nâng Member thành Manager hàng loạt.
- Auth/accounts là nền dùng chung; Organization role không đặt trực tiếp trên User và không suy từ JWT cũ.
- Migration audit trước backfill; kiểm quan hệ và unique conflicts, có rollback strategy. Không đổi database dev thật chỉ để thử schema.
- Mã Task cần migration ổn định và counter riêng. completedAt không lấy updatedAt làm thời điểm Done lịch sử; dữ liệu không biết phải đánh dấu, không bịa timestamp.
- Chuyển Comment soft-delete cũ sang hard-delete cần chính sách migration; không tự purge dữ liệu đang có.
- Lưu giữ QA P1–P3 cũ như bằng chứng nền, không suy thành nghiệm thu mô hình mới. P4–P6 được phối hợp lại sau core, không xóa backlog draft/history.

## Các quyết định cần đóng đúng thời điểm

1. C1/C2: cardinality Manager/Lead và quyền bổ nhiệm; Guest link hạn dùng/multi-use và xử lý Member hiện có; lead moderation quyền nào.
2. C4: namespace/prefix mã, chuyển Workspace; summary definitions; pending request khi parent archive/delete hoặc người gửi mất quyền.
3. C5: Workspace/Project chỉ Archive hay có Trash; purge thủ công authority; chuyển Workspace và tái cấp membership.

Không cần mở tất cả câu hỏi cùng lúc. C1 bắt đầu được sau khi chốt contract role/membership; D4 chưa rõ không chặn schema tổ chức hoặc scoped authorization.

## Chuẩn UI đã chọn

Stitch local source: `assets/ui_design/stitch_workflow_collaborative_workspace_design/`, warm cream/indigo, Jakarta, sidebar/context switcher, dashboard thật, compact filters, Task drawer. Giữ native accessible controls/component dùng chung phù hợp; HTML export không thay business logic. Không copy Pro/giá/SOC-2/online/Sprint/meeting số giả. Ảnh popup xuất thiếu và Task screenshot lỗi phải xem HTML/đặc tả trước nghiệm thu.

Storage, quotas cho file, payment, lịch/Sprint và integrations được thiết kế riêng sau core. Thùng rác 30 ngày không thay quota/backup policy.
