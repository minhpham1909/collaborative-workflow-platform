# F2d1 — Workspace store without Organization branches

Date: 2026-10-14. Current Workspace store cleanup; broad schema/module retirement still pending.

## Delivered

- Default Workspace store contains no Organization lookup, Org membership join, Org role, managerId authority or replacement/takeover restriction.
- Every default scoped operation rejects unsupported Workspace parents. Public invitation preview and LINK/EMAIL acceptance reject retired parents before returning metadata or creating membership; accept-by-ID uses the same parent rule.
- Team role/permissions derive from ownerId and active Workspace membership. Only Owner archives/transfers ownership/appoints Managers/removes another active Manager. Manager may leave normally; repeated own leave remains idempotent. Ban is rechecked before leave.
- Workspace management audit no longer skips or branches on Organization fields. Existing metadata, receipt/idempotency, CAS, invitations and cleanup behavior retained.
- Previous Workspace store moved into guarded historical test support, not loaded by the server. Test adapters do not convert or inherit dev data.
- Deleted unused FE AddWorkspaceMember component for retired Organization allocation. No remaining import existed; current Team uses Workspace invitation/role flows.

## Validation

- Full isolated BE integration after fixing relocated fixture import: 135 passed, zero failures. Historical suites remain separate from independent current-policy fixtures.
- Focused default Workspace fixture passed: unsupported LINK preview/accept and EMAIL accept-by-ID create no membership and leave invitation unaccepted; roster shows one Owner/two Managers; Manager cannot remove peer or archive; stale managerId pointer does not prevent leave; Owner can remove Manager; departed user loses reads; Owner must transfer before leave.
- Units: 120 passed; 22 DB suites skipped only in unit invocation (142 total).
- Browser Light/Vi and Dark/En: Workspace Members, Ban/unban, Project/profile, author-only comments/archive and collection layout/preference regression across five widths passed.
- FE build/budget passed after unused component deletion: initial 422635 / 425000 bytes, initial gzip 132389 bytes. No cap increase.
- Owned API restarted with patch; /health/ready returned ready.

## Remaining

F2d2: Workspace owner/Organization/manager-pointer schema fields and retired Org modules, related notification/provider category metadata, plus replacement of obsolete historical fixtures. Existing shared Team CSS lives under the retired Organization feature directory and must be preserved/moved when removing that directory. Physical Org removal is not complete. Fresh multi-account dev seed and web acceptance follow core cleanup.

No dev reset/seed/migration/backfill, SMTP/provider calls, auth/old queue dispatch, dev workers/purge or deployment. Tests isolated; account data and Mongo system 27017 unchanged.
