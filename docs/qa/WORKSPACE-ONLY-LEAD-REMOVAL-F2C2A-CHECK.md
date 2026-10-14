# F2c2a — Remove Project Lead storage and obsolete cleanup

Date: 2026-10-14. Bounded part of F2c2; Organization cleanup remains unfinished.

## Delivered

- Project schema no longer contains leadId; strict model construction rejects it. Project access audit no longer accepts lead_changed or stores previousUserId (a retired Lead-only field).
- Removed Project Lead clearing from Workspace leave/remove, Ban and retired Organization exit paths. These operations no longer increment Project versions solely for a discarded field.
- Old /projects/:projectId/lead mutation still returns authenticated 410 PROJECT_LEAD_RETIRED. This tombstone does not store data or grant rights.
- Current Project breadcrumb no longer uses an Organization link. Workspace link and Task/Board navigation stay intact.
- DATABASE-LAYOUT-v0.2.json updated alongside model schema. Read-only historical inventory still reports legacy raw leadId if supplied; it is not a migration/inheritance path.

## Validation

- Full isolated BE integration: 134 passed, zero failures; historical suites plus new independent Workspace-only reopen suite without historical registration.
- New four-account current-policy fixture covers Owner and Manager direct reopen with reason, Member request-only, Guest rejection, pending-request bypass denial, CAS, Manager demotion/reappointment, self-review denial, Owner review of Manager request, archived-parent denial and requester departure cancellation. Leave preserves Project version.
- Model units reject retired Lead writes/actions; current Project creation has no leadId. Existing historical raw-injection checks retain evidence that such a field grants no authority and causes no departure cleanup/version mutation.
- Units: 118 passed; 21 database suites skipped only in unit invocation (139 total).
- Browser Light/Vi and Dark/En: current Project header/navigation, Members/profile, comment author-only/cancel/delete/archive, collection modes and five-width regression passed.
- FE build and budget passed: initial 422635 / 425000 bytes, initial gzip 132389 bytes. No budget increase.
- Owned API restarted with patch and /health/ready checked.

## Remaining work

F2c2b: Workspace/Project Ban authority and notification/delivery paths still contain Org branches; isolate/remove those, then remove retired schemas/modules and replace historical fixtures. Full Workspace-only multi-account seed and web acceptance follows core cleanup. This is not complete physical Org removal or final UX acceptance.

No dev reset/seed, data backfill/migration, SMTP/old queues, purge worker, providers or deployment. Existing account data and system Mongo 27017 remain untouched; test databases disposable.
