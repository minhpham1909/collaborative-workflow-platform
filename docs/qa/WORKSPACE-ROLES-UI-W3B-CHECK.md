# W3b — Team Manager actions và role history

12/10/2026. Nối API role W2b vào Team; thêm read endpoint cho log đã tồn tại. Không Org cutover hoặc live data mutation.

## Đã triển khai

- Owner standalone có nút Bổ nhiệm Manager/Hạ xuống Member dựa **cả actor manageRoles và target changeRole**; Owner/self/unverified targets không có CTA. Manager/Member không bổ nhiệm.
- Dialog nêu role trước/sau, scope, reason one-line≤2000; membership target version dùng cho PATCH. Dirty/pending guards, CAS/permission errors giữ reason đọc/copy nhưng chặn submit; lost response không retry write.
- 403/404 role action readback Workspace: mất management nhưng còn read giữ dialog blocked; target không còn active không giả Workspace biến mất. Mất read/auth/Ban clear parent context. Close reloads scoped Team rows/capabilities, không tự gửi lại.
- Native disclosure44px mở role history lazily, có q/date/cursor/error/retry/empty. Table dùng Team responsive styling, copy Việt/Anh route-local để giữ entry budget.
- Team invitation/leave explanation sửa cho Owner+Manager invite Member và standalone multi-Manager leave; legacy attached vẫn riêng.

## GET /workspaces/:id/role-audit

Current verified management scope Owner/Manager (legacy attached management guards còn trong BE); Member403, outsider404/Ban403. FE entry chỉ standalone. Query limit/cursor/q/from/to; max100/default20, FE12, dates GMT+7 start-inclusive/end-exclusive. Search literal AND trên actor name/target name/reason trước pagination. Sort createdAt DESC,id DESC; total full filtered set.

Response `{items,nextCursor,total}`; item id/time/previousRole/role/reason/membershipVersion + actor/target `{id,displayName:string|null}`. Không email/password/avatar/Account object hoặc metadata Workspace khác. Nullable identity dùng FE localized fallback. Ownership reason internal hiển thị label chuyển sở hữu, không code kỹ thuật.

Log **chỉ direct role changes và ownership transfer rows** như model W2b. Không claim mọi role revocation tự động/leave/Ban/kick đều đã nằm đây; unified management audit còn thiếu. Một transfer có2membership-role rows, total đếm changes, không số transfer operations. Backend scopes mọi request; UI không hứa tự đẩy role changes realtime.

## Evidence

- Full isolated BE integration126PASS,0FAIL/skip. Bổ sung assertions Manager read/Member denied/cross-scope denied, search/date/cursor/total, HTTP strict query/auth/privacy, verified target capability; giữ role CAS/no-op/ownership/exit regression.
- Unit100PASS =BE72+FE28;16integrationSKIP trong unit invocation khôngDB.
- Build/budgetPASS initial423902bytes,largest395860bytes. First build426298 exceeded425000; move role translations to route module solved, không đổi budget.
- TeamS5 Light browserVi-En5widthPASS: promote/demote+log, Owner authority lost mid-dialog preserves reason/blocks write, existing Kick/rejoin/Ban/cleanup queue/Unban/leave/invite/transfer/paging rules giữ.
- TeamS5 Dark browserVi-En5widthPASS: cùng scope + simulated committed role write with dropped response; button blocked/reason retained, exactly1request, reload seesMember. Interceptor scenario checked, không suy request không gửi từ timeout.
- git diff --checkPASS. Fixture server/DB riêng, fake delivery/cleanup chỉ test fixtures theo harness cũ, không dev workers/SMTP/oldqueues/purge.

## Còn lại

Role audit index từ W2b đã khai báo, chưa apply/create index trên DBdev trong patch. FE/BE local acceptance không production readiness. Org mapping/migration, create request identity, unified admission/exit audit, remaining list projections, navigation/back/draft/toolbar modes và nghiệm thu chung còn theo plan.
