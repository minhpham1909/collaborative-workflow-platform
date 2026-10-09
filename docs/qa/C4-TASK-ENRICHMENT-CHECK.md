# C4-A kiểm tra core Task enrichment

05/10/2026. Snapshot slice C4-A; kết quả gate C4 hiện tại xem [C4-B](C4-REOPEN-STATS-CHECK.md). [Contract](../sds/TASK-ENRICHMENT-C4-API-v0.1.md). Gate slice, không phải nghiệm thu toàn C4.

## Bằng chứng

- C4 unit validation: forged code/timestamps/checklist state, priority/labels, dữ liệu giới hạn, Vietnam midnight/exact deadline/Done exemption.
- Mongo replica-set dedicated fixtures: label management/Lead/CAS, archived labels, cross-Project assignment; tạo Task đồng thời mã unique, search bằng mã và không tái dùng sau delete; checklist structure/tick quyền riêng + stale/race + confirmation; completedAt/no-op/history/privacy; counts MyTasks toàn filter trước pagination; legacy Done unknown timestamp, archive guard và backfill idempotent giữ thời gian nghiệp vụ.
- Regression Project Guest thêm phủ quyền checklist/label/activity và cấm ghi qua danh tính Creator/Assignee cũ. Expectation permission DTO được cập nhật cho 2 capabilities additive mới.
- Full BE unit và full isolated integration có kết quả trong phần status dưới; không dùng test unit để claim unique index trên DB thật.

## Status

BE unit: 58 pass, 11 dedicated Mongo suites skip khi không cấu hình DB. Full integration baseline sau enrichment: 88 pass/0 fail; sau thêm MyTasks grouping, targeted C4 + Work regression 19 pass/0 fail. Không FE design changes/browser acceptance mới trong slice này.

24 models, index plan/layout đồng bộ. Dev audit: 1 Task thiếu mã/1 Done không rõ thời điểm, không vấn đề; indexes additive đã tạo, API health ready đạt. Chưa backfill trên dev thật, không Google/SMTP/provider live hoặc xử lý queue cũ. C4-B (reopen approval/statistics) và UI U1/U2 chưa nghiệm thu.
