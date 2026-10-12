# Workspace-only W2b — nhiều Manager trên Workspace độc lập

12/10/2026. BE foundation đạt scoped gate; chưa UI bổ nhiệm, chưa migration bỏ Organization/Lead.

## Contract đã implement

`PATCH /workspaces/:workspaceId/members/:memberId/role`, memberId là User ID theo convention member endpoints hiện tại. Body `{expectedVersion,role:'manager'|'member',reason}`; version của **membership target**, không Workspace. Response `{member:{userId,role,version}}`. Auth/verified/Origin/strict JSON/rate limiter theo Workspace router.

Chỉ current Workspace Owner được đổi role của active verified eligible member; chặn target Owner, unknown/inactive/Ban, role Owner injection và stale version. Attached Workspace tạm trả WORKSPACE_ROLE_MODE_UNAVAILABLE409; không đổi Org/managerId behavior cũ hoặc tự chuyển dữ liệu. No-op giữ version và không thêm audit, vẫn kiểm quyền/version.

WorkspaceMembership có role manager/member default member; effective Owner vẫn từ ownerId và active membership. Raw legacy role thiếu là Member, không backfill. Nhiều Manager độc lập; access/read facets/members DTO trả role đúng. Org attached vẫn dùng role/managerId cũ trong transitional phase, membership.role không làm tăng quyền ở attached mode.

Manager được manage metadata/Projects/Tasks qua scoped policy hiện có, invite/revoke Member. Chỉ Owner transfer và Archive/Unarchive Workspace độc lập; Manager không tự promote hoặc xử lý peer Managers qua remove/Ban, kể cả Project Ban. Không mở quyền manual comment moderation cho Manager mới; cleanup Ban riêng giữ đường nghiệp vụ cũ. Manual moderation của Owner/Org cũ chưa gỡ trong patch này; Lead routes/quyền hiện có chưa gỡ.

Exit/remove/Ban reset role Member; rejoin không khôi phục Manager. Manager standalone được rời không cần replacement. Transfer target phải active/verified/not banned; reset base role người cũ/người mới thành Member, effective Owner chuyển nguyên tử; không hồi sinh quyền Manager cũ khi transfer lần sau. Membership versions cùng tăng, response membershipVersion người cũ cập nhật.

## Nhật ký/schema

Thêm model/collection workspace_role_audit: workspace/actor/target/previousRole/role/reason/membershipVersion/createdAt. Role change và transfer audit cùng transaction; rollback không để role mới thiếu audit. Ownership audit dùng reason ownership_transferred vì transfer DTO cũ chưa có reason input. Role audit chỉ đọc qua công cụ DB/test hiện tại; chưa API audit list/FE history mới.

Index plan thêm workspace_role_history (workspaceId,createdAt DESC,id DESC), không unique/destructive. Schema/layout/index plan cùng cập nhật. **Không apply index hoặc create/backfill collection trên DB dev trong lượt này**; bootstrap triển khai phải tạo collection/index qua db:indexes trước sử dụng role mutations. Tests tạo trên DB tạm. Không cho rằng chỉ readiness của các index cũ đã kiểm chứng index mới ở live.

## Evidence

- Unit toàn BE:70PASS,16integrationSKIP trong invocation không DB;0FAIL.
- Isolated suites Workspace/Work:26PASS ở lần cuối sau bổ sung transfer audit và demotion-vs-Task write race.
- Regression rộng trước lần cuối:50PASS gồm Moderation/Organization lifecycle/Reopen/Retention/Workspace;44PASS gồm Moderation/Organization/Work/Workspace. Các lượt chồng nhau, không cộng thành tổng distinct tests hoặc full BE integration gate.
- New cases:HTTP appointment,2Managers, managed facets/Team rights, Manager invite+metadata, self/peer/ownership/Archive restrictions, no-op audit, stale role CAS race, demotion invalidates work, concurrent demotion/edit serialization, leave/rejoin drops role, transfer twice không restore Manager, peer Ban preview denied và Manager cannot delete other-author comment.
- Model/index layout parity PASS; strict enums/reason/version tested; git diff --check PASS.

DB workflow_auth_test trên replica set tạm; mail tests fake send, không devSMTP/purge/moderationworker/oldqueues. Không mutate data dev/Mongo27017 hoặc restart Mongo27018. FE không đổi nên chưa browser gate, chưa công bố Workspace-only toàn hệ thống đã hoàn thành.

Tiếp: bỏ Lead và sửa Project/Task permission projections theo policy direct-vs-pending reopen đã chốt; sau đó data DTO list/detail, Home overview và UI create/settings/Team. Org removal/migration thật vẫn cần inventory/mapping/rehearsal riêng.
