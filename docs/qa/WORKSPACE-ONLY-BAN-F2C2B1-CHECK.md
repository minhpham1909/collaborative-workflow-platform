# F2c2b1 — Workspace/Project Ban runtime

Date: 2026-10-14. Bounded Ban patch; notification/delivery and physical Organization schema cleanup remain open.

## Delivered

- Current moderation store has Workspace/Project scope only, active scoped membership authority, Owner protection and Owner-only moderation of active Managers. No Organization lookup, managerId authority, Org administrator role or automatic Manager takeover/admission.
- Organization scope is rejected by the service contract (410 ORGANIZATIONS_RETIRED), including direct service calls; HTTP retirement remains guarded.
- Workspace Ban removes membership/normalizes role; Project Ban blocks that Project while retaining Workspace membership and access elsewhere. Pending reopen requests cancel; unfinished tasks lose assignee, Done history retains attribution. Unban does not revive membership, Guest grant, assignee or canceled requests.
- Default comment cleanup selects supported Workspace parents, exact scope, author and frozen date range. Org-bearing/invalid scope criteria match no comments. Default worker does not claim Organization jobs. No worker executed against dev data.
- Previous Organization moderation store/criteria moved to guarded, loopback test-database-only support, never imported by the server. Historical fixtures remain separate from default current-policy tests.

## Validation

- Full isolated BE integration: 134 passed, zero failures. Current four-account Project fixture exercises Member/Guest denial, self/Owner protection, two Managers, Owner Manager Ban, direct Org scope rejection, signed preview target binding, scoped Ban and cleanup, requester cancellation, unfinished vs Done assignments, retained other Project feedback and rights, no restoration after unban, and skipped pending Org cleanup job.
- Latest focused current-policy fixture: 1 passed after adding Done/reopen assertions.
- Units: 119 passed; 21 database suites skipped only in unit invocation (140 total).
- Browser Light/Vi and Dark/En: actual Workspace Ban preview/submit/unban dialogs; confirmed Member stays absent after unban. Existing Project header, Team/profile, author-only comments/archive and five-width collection regressions pass. English test selector corrected to actual Remove ban label.
- FE application source unchanged; previous build/budget remains applicable. This patch changes BE policy and browser harness only.
- Owned API restarted; /health/ready verified ready.

## Remaining

F2c2b2: remaining Org-aware guard/query calls and notification/delivery paths. Then remove retired schemas/modules and replace obsolete fixtures before fresh multi-account dev seed and full web acceptance. This patch does not claim all Org references removed or completed UX acceptance.

No dev reset/seed, migration/backfill, SMTP/auth queue dispatch, dev purge/cleanup workers, providers or deployment. Cleanup ran solely inside disposable integration databases. Preserved accounts and Mongo system port 27017 untouched.
