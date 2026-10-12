# W2d2 — Home overview/priority gate

12/10/2026. [Contract](../sds/HOME-OVERVIEW-W2D2-API-v0.1.md).

- Full isolated BE integration126PASS,0FAIL/skip.
- Unit BE72+FE27=99PASS;16integrationSKIP trong invocation unit khôngDB.
- New Mongo case dùng account tạm riêng: emptycounts;3today/3overdue/union4/distinct2Workspaces; Done/trash/future/no-deadline loại đúng; limit1/3/5 giữ totalMatching; sort priority/due stable; MyTasks destination matching; Project Archive giảm đúng count. HTTP auth401/unverified403/strictquery400 và limit6 rejected.
- FE helper test các links Today/Overdue/attention roundtrip MyTasks parser, không nhầm Today tile với today deadline group.
- Browser HomeS1 Vi/En +5widthPASS: counts/priority thứ tự từ API, đúng href ngày/quá hạn; overview-only network abort→“—”, priority vẫn có, focus retry khôi phục; Workspace filters/races/cards/grid-list/create/draft/cancel/error/retry/paging/mobile controls còn đạt. API/DB fixture riêng.
- FE build/budgetPASS: initial422103bytes,largest395860bytes; không đổi budget.

Không số giả/Sprint metrics/meeting data, không live SMTP/purge/queues, không mutate business data dev/Mongo27017/27018 hoặc deploy. Inbox unread/latest vẫn API cũ; không duplicate policy hoặc thêm notification broadcast. No live-provider acceptance claim.

Đã đóng W2d2 scope. W2d toàn bộ còn Workspace/Project/Trash list projections và core/UI integration khác theo plan. Tiếp metadata create/settings và Team role UI từng cụm; Organization cutover vẫn cần inventory/mapping/rehearsal.
