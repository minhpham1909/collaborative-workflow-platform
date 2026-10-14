# F2c1 — Author-only comments

Date: 2026-10-14. First bounded patch of F2c; Organization/schema cleanup remains open.

## Current contract

- Owner, Manager, Member and Project Guest can edit/delete only their own comment, with current access and an active Workspace/Project/Task.
- Either parent Archived blocks edit/delete for every role. Owner has no manual moderation override.
- Comment permissions expose edit/delete; no moderate capability. Deletion input accepts only expectedVersion, rejects a reason/forged role or author. Non-author is rejected before inspecting CAS. Author stale CAS rejects without deleting.
- Author deletion permanently removes the comment. No content restore, comment-deleted moderation job, or notification replay is introduced. Separate existing Ban cleanup is unchanged.
- UI removes the moderator-reason prompt and hides delete in read-only context. System confirmation remains explicit about permanent deletion; cancel retains content.
- Previous moderation behavior moved to private historical test support, guarded by connected loopback test database registration. It is not enabled on workflow_dev or production.

## Evidence

- Full BE isolated replica-set integration: 133 passed, zero failures. Includes historical fixtures, default-policy four-account permissions/write matrix, plus updated standalone work/retention regression expectations.
- Units: 117 passed, 20 database suites intentionally skipped in unit invocation; 137 total. Pure matrix includes all four roles, both parent states, author/non-author and strict input.
- Current-policy integration: cross-author edit/delete denied for every role, own edit/CAS/delete verified, physical comment absence after own delete, no moderation action created, Project/Workspace Archived deny and expose no mutation capability.
- Browser Light/Vi and Dark/En: Owner cannot edit/delete Guest feedback; Guest can cancel own deletion, archived Project hides deletion, reopen restores own action, confirmation removes own comment. Existing Team/profile and collection regression across five widths passes.
- FE build/budget: initial 422635 / 425000 bytes, initial gzip 132393 bytes. Budget unchanged.
- Owned dev API restarted, /health/ready verified ready.

## Next and limits

F2c2 must inventory/remove remaining Org/Project Lead runtime and schema references, then replace obsolete fixtures and check current Workspace-only role/lifecycle/notification flows. This patch does not claim physical Org removal, complete UI acceptance, or production deployment readiness.

Tests use disposable isolated databases. No dev reset/seed/migration, SMTP or old queue dispatch, purge worker, external provider, or deployment. Mongo system port 27017 and preserved account data remain untouched.
