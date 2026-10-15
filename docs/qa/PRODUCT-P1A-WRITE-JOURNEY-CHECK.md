# P1a — Native Workspace-only browser write journey

15/10/2026. Converted the existing cross-screen journey from retired Organization fixtures to native Workspace membership and four accounts. No historical policy adapter.

## Passed

- Owner creates Project and assigned Task through UI; rich description, due date and Task code persist.
- Member opens My Tasks, updates assigned Task status, posts own comment; creator-only edit/delete controls remain unavailable.
- Owner sees work notifications and marks one read.
- Guest sees only shared Project, comments without Task edit/status rights and cannot open Workspace detail.
- Simulated shared-list 503 shows an error and recovers through Retry. Native revalidation replaces removed toolbar refresh clicks.
- Comment draft survives theme changes and cancel-confirm leaves no comment behind.
- Trash/restore preserves Task code/comments and does not replay notifications.
- Manager creates Project through UI; Owner demotes Manager to Member; a fresh Workspace load removes Create Project.
- Archived Project/parent states and empty content are checked; no document overflow or pageerrors.

Runs: Light/VI/1440 and Dark/EN/375, isolated Mongo replica + API, no providers/dev business writes. The 503 browser diagnostic is intentionally injected by the journey.

Not covered by P1a: role revoked in an already-open save form, CAS conflict while editing, ambiguous write response/draft recovery and all reopen combinations. Those remain P1b; existing BE tests are not a substitute for those UI checks. P1 is not complete yet.
