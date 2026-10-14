# F2c2b2 — Current guard, assignee query, Inbox and invitation mail

Date: 2026-10-14. Current-policy cleanup, not complete physical Organization removal.

## Delivered

- Default scalar Ban guard and aggregation stages consider only Workspace/Project scopes. Retired Organization Ban records do not influence a supported Workspace. Unsupported parent rejection still occurs in Workspace/Project access; ignoring Org Ban is not access admission.
- Batched Task list assignee eligibility reads current active Workspace membership and scoped Workspace/Project Ban only. Org membership/role/Ban reads moved into explicit historical test support. Default list/Board state remains consistent with detail when Ban is applied/removed. Workspace management facet uses the membership role after the supported-parent gate.
- Inbox default Org notice remains unavailable, with no payload/target. Org resolver/Project parent lookup moved to historical support, removing Org database reads from the current response path.
- Invitation dispatcher excludes Organization jobs from claiming. Workspace and Project invitation delivery require a supported Workspace before opening ciphertext or calling send. Removed Organization delivery implementation from runtime mail directory; historical fixture handler remains test-only.
- No production worker was started. Existing auth dispatcher policy is unchanged; the invitation-only test dispatcher left auth jobs untouched.

## Validation

- Full isolated replica-set integration after all changes: 135 passed, zero failures; includes historical suites and independent current-policy fixtures.
- New mail fixture uses a fake send collector: valid Workspace and Project invitations produce two fake deliveries; Org and auth jobs stay pending/attempts unchanged; unsupported attached-parent Workspace/Project/work jobs cancel without opening invalid ciphertext or invoking send.
- Scalar and aggregation guard checked against a retired Org Ban row; supported Workspace remains visible.
- Default-policy Board/list checked for assignee-left parity: Project Ban marks retained Done assignee unavailable, other Project remains eligible, Unban restores current eligibility without restoring cleared unfinished assignee.
- Units: 120 passed; 22 DB suites skipped only in unit invocation (142 total).
- Browser Light/Vi and Dark/En: Ban/unban, Project navigation, Team/profile, author-only comments, archive, collection modes/preferences and five-width regression passed.
- FE application source unchanged; no new build required for BE-only policy changes. Owned API restarted; /health/ready returned ready.

## Remaining

F2d: remaining Organization-specific metadata branches in Workspace source, notification category/schema/provider references, retired modules and historical fixture replacement. Current test adapter policy is not dev data inheritance. Full fresh multi-account dev seed and web acceptance follow core cleanup; no final UX or deployment acceptance claim.

No dev reset/seed/migration/backfill, real SMTP/provider send, auth queue dispatch, dev purge/cleanup/mail workers or deployment. Mail tests used disposable databases and fake callbacks only. Preserved accounts and Mongo system 27017 untouched.
