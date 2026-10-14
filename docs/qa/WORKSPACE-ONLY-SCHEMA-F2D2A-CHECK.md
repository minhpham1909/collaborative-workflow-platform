# F2d2a — Strict Workspace-only schema

Date: 2026-10-14. Workspace schema retirement, not removal of every Organization module/schema.

## Delivered

- Current Workspace requires one ownerId; strict schema rejects organizationId and managerId. Managers live on WorkspaceMembership, and runtime authority still requires active membership. Cross-collection membership existence is enforced by service/access policy, not claimed as a Mongo foreign key.
- Removed old Organization Workspace index from the source index plan and reviewed DATABASE-LAYOUT. No live index was dropped or created; old dev index may remain until a separately reviewed index setup.
- Separate HistoricalWorkspace model for discarded Org fixtures does not widen or mutate the runtime Workspace schema. Its save and document factory require the private non-production loopback test-database adapter. The server does not import this helper.
- Retired Organization Workspace creation can only build that historical document in a guarded test connection; default direct creation rejects with ORGANIZATIONS_RETIRED. Organization routing remains retired.
- Independent current-policy tests now insert retired/corrupt parent rows directly as negative fixtures, instead of relying on a model that permits creating them.

## Validation

- Full isolated BE integration after all changes: 135 passed, zero failures; historical suites plus separate current-policy Workspace/Project/Guest/Ban/mail/reopen fixtures.
- Units: 121 passed, 22 DB suites skipped only in unit invocation (143 total). Required/nullable/array Owner checks, strict retired-field rejection, index/reference plan parity, separate schema identity, and blocked historical save outside a guarded test connection.
- Browser Light/Vi and Dark/En: current Workspace/Project, Team/profile, Ban/unban, author-only comments/archive and collection modes/preferences across five widths passed.
- FE source unchanged; no new build needed for this schema-only patch. Owned dev API restarted and /health/ready checked.

## Remaining

F2d2b: retired Organization module/model registry and notification/mail/moderation metadata categories. Replace obsolete historical suites with current policy fixtures in bounded patches. Shared Team CSS under the old Organization folder must be preserved/moved. Full physical Organization removal and fresh multi-account web acceptance remain unfinished.

No dev reset/seed, collection/data transforms, backfill, live index modification, SMTP/provider calls, auth/old queues, dev workers/purge or deployment. Preserved accounts and system Mongo port 27017 unchanged.
