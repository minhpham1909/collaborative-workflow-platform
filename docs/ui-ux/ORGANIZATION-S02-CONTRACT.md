# S2 — Organization selector và Workspace trực thuộc

07/10/2026. Theo Stitch local/cluster plan. Studio chỉ là tên hiển thị của Organization, không entity hoặc role mới.

## Routes và entry

- `#organizations`: danh sách Organization của account hiện tại; tạo Organization verified → Owner scope mới. Sidebar/link giữ đường vào Home standalone và Shared Projects cho Guest.
- `#organization/:id`: ID24hex hợp lệ; load Organization và Workspace thuộc parent đã guard. Back/Forward đúng hash; Workspace detail có breadcrumb về Organization lấy từ organizationId thật trong DTO.
- Không nhận return URL tùy ý, không đổi auth/invite token scrub; invalid id fallback route nền. Không seed hàng mẫu vào dev.

## API/read projection

GET /organizations thêm q/from/to/role all|owner|admin|member. Search literal Vietnamese name, Vietnam calendar createdAt, newest first. Membership active/Ban trước filter/count/cursor. Effective Owner từ resource.ownerId, không từ membership.role hoặc body.

Response list thêm total (cùng query/role trước cursor), roleCounts (scope+q/time trước role). Không counts từ items.length. Organization DTO thêm permissions.createWorkspace/edit theo Owner/Admin hiện tại, không tạo global-account role.

GET /organizations/:id/workspaces dùng Workspace query q/from/to/state/role, total/roleCounts/stateCounts và per-visible-WS memberCount/activeProjectCount như S1. Store guard Org actual trước shared query helper trong **cùng transaction**, không nested store transactions. OrganizationId lấy từ resource, không query tenant do client gửi. Owner/Admin toàn Organization, Member chỉ WS có membership; Guest không suy quyền Org từ Project grant.

## Form và UI states

- Tạo Organization chỉ name≤200; không thêm domain/billing/description/upload chưa có contract. NameDialog shared có label/submitLabel/scope hint, giữ default Project behavior.
- Tạo attached Workspace chỉ Owner/Admin + name; server tự đặt actual organizationId/manager/membership, không lấy role từ form. Manager ban đầu là actor, Org role giữ nguyên. Mô tả sửa ở Workspace flow kế tiếp.
- Root create/reset filters/readback; NameDialog bảo vệ dirty/busy và uncertain response. Stale role giữa mở form và submit bị BE403, giữ draft/error, không tạo ngoài quyền. Refresh read cập nhật CTA theo current capabilities.
- Empty/filter empty/Org unavailable/lost rights/network/retry/loading riêng; late results dùng generation guard. Khi Org access mất thì clear Org/rows/creation UI, không giữ title private.
- Card toàn vùng bằng stretched real link; roles và counts thật, covers/icons minh họa ổn định theo id. Không aggregate members/projects toàn Org, Sprint/online/Pro/2FA/SSO/domain/bots hoặc role Collaborator giả.

## Tiếp theo

S3 Workspace description/Project collection/Archive UI. Team/role editor/Manager replacement/audit ở S4/S5, không mở thêm ở S2. UI vẫn Vi; English activation ở S10 như plan. [QA](../qa/UI-STITCH-S02-CHECK.md).
