# F2b2 — Workspace DTO, Team and person profile

Date: 2026-10-13. Current Workspace-only runtime; historical fixtures remain explicitly test-only.

## Delivered

- Workspace DTO omits organizationId/managerId; authority derives from ownerId and scoped membership role. Forged effectiveRole does not elevate a Member. Multiple Managers may leave; Owner transfers ownership first.
- Workspace Members/Invitations and audit controls no longer branch on Organization fields. Removed internal Organization allocation action and breadcrumb.
- Person profile resolves current Owner/Manager/Member/Project Guest, or historical Workspace/Project departure. Association privacy remains intact: Guest cannot inspect an unrelated member. Ban detail remains management-only. Profile display does not restore access.
- Old response/profile behavior moved to guarded historical test support, not enabled on workflow_dev.

## Validation

- BE full isolated replica-set suite: 133 passed, zero failures. Includes historical suites plus separate default-policy Workspace/Project fixtures without historical registration.
- Unit invocation: 116 passed, 20 database suites intentionally skipped; total 136.
- FE build and unchanged initial-budget gate: initial 422635 / 425000 bytes; initial gzip 132384 bytes.
- Browser collection harness now includes current Workspace Members and associated person popup, with moderation service mounted. Light/Vietnamese and Dark/English: Members layout across 375/768/1024/1280/1440; profile Owner label; no internal Organization allocation; existing collection mode/account preference/Guest Shared checks.
- API restarted with patch; /health/ready confirms ready.

## Limits / next

This closes F2b2 scope, not full refactor or user UX acceptance. F2c must remove remaining manual comment moderation exceptions and runtime/schema/notification references to Org/Project Lead, preserving author-only comments and separate Ban cleanup. Physical old schema/module removal and replacing historical fixtures remain unfinished. Full current-policy multi-account web acceptance follows core cleanup and fresh seed.

No dev reset, business seed, migration, old queue dispatch, SMTP, purge, external provider or deployment ran. Browser/integration data was isolated and disposable; Mongo system 27017 and preserved accounts remain untouched.
