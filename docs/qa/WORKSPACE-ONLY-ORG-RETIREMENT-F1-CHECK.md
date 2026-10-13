# F1 — Retire Organization entry points

Date:13/10/2026. Follows the user-approved fresh dev start; business data was already reset and is not reset again by this patch.

## Runtime/API

- `src/server.js` no longer constructs/injects the Organization service; `src/app.js` cannot mount Organization management even when an old caller supplies that dependency.
- `/organizations`, `/organization-invitations` and `/moderation/organization` return410 `ORGANIZATIONS_RETIRED` after current authentication/verification and origin policy. Unauthorized401/foreign-origin403 still apply; no retired service callback/body mutation occurs.
- No runtime feature flag can reenable these routes. A separate `test-support/legacy-organizations.js` wrapper mounts historical APIs only on loopback `workflow_*_test` DBs, for four existing isolated fixture suites. It is not imported by the production app/server and refuses the dev DB. This preserves old scenario evidence while subsequent F2 patches remove remaining scope branches; it is not a product compatibility mode.

## Frontend

- Removed lazy imports/rendering of Organization list/detail/team pages and removed the Organization sidebar entry.
- Removed the redundant sidebar “Your space” context block, as previously requested. Current shell style, brand, sidebar controls and account access remain.
- Former Organization hashes resolve to Home, with no old-page render or Organization fetch. Hash aliases may remain in the address bar; this patch does not claim universal URL canonicalization.
- `/organization-invite#token=...` scrubs/discards its token and resolves to Home; it cannot become an invitation intent, call an Organization preview/accept endpoint or redirect into an old Workspace. Normal Workspace/Project invitations and auth verification/reset links retain their behavior.
- Retired API error includes an actionable Vi/En message to continue from Workspace.

## Evidence

-131 existing isolated BE integration cases PASS, including legacy scenario suites through the test-only wrapper. This total is not a claim that historical Organization HTTP tests run against the new production routes.
-115 BE+FE unit cases PASS,18 DB suites skipped only in unit invocation. New runtime-route unit covers retirement, legacy-dependency noninvocation, authentication/origin rejection; new FE unit covers token discard and retired intent.
-Home browser Light and Dark Vi/En +5 widths PASS: sidebar/context removal, old detail/team hash fallback, Organization invite token scrubbing with zero Organization network calls, plus existing Workspace search/create/idempotency/paging/draft/navigation cases. Legacy attached fixture data still exercise current transitional readers; that is not newly seeded live Org data.
-Build initial422635/425000bytes, largest395860; cap unchanged. Message copy was added after the full unit run; focused tests and final build rechecked.
-API dev resumed on4000, `/health/ready` returns ready. Project DB remains27018; no new dev business seeding, reset, mail/purge/moderation worker or provider calls by tooling.

## F2 remaining

This closes creation/management entry points, not physical removal of every legacy module/schema. Remaining Org assumptions in Workspace/Project access, Team allocation/labels, person profiles, notification invitation handling, moderation scopes/jobs and read models must be simplified to Owner/Manager/Member + Project Guest. Organization feature source files, schema refs and old QA scripts are not all deleted yet. Old Org-specific UI scripts are historical and will need replacement/retirement; current Home smoke is the applicable browser evidence here.

Next: simplify the core readers/capabilities and replace relevant legacy fixtures with Workspace-only role tests before generating fresh multi-account demo data. No inheritance/migration is planned.
