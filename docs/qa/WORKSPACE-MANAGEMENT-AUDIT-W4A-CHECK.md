# W4a — Workspace management audit backend

Current merged read contract/coverage: [W4c](WORKSPACE-MERGED-AUDIT-W4C-CHECK.md). This file retains the earlier patch evidence.
Date: 13/10/2026

## Implemented scope

Standalone Workspace mutations now append an immutable management event **in the same Mongo transaction**:

| Action | Stored context |
| --- | --- |
| created | Actor, Workspace version |
| metadata_updated | Sorted changed field keys, Workspace version |
| invitation_created / invitation_revoked | Internal invitation reference, EMAIL/LINK type, invitation version |
| member_joined | Actor/target, internal invitation reference/type, membership version |
| member_left / member_removed | Actor/target, membership version |
| role_changed | Actor/target, previous/new role, reason, membership version |
| ownership_transferred | Previous Owner as actor, recipient as target, recipient previous/new role, Workspace version |
| archived / unarchived | Actor, reason, Workspace version |

No raw invitation token/email, metadata old/new values, rich description snapshots, credentials or delivery payload are copied into this journal. User-provided reasons remain bounded plain text and are visible to current authorized managers. Actor/target display names are resolved from current User records, not historical name snapshots; missing User produces null name while retaining its ID.

No-op updates, repeated joins/leaves/revokes, same-key creation replay, rejected/CAS-conflicting writes and pure reads create no extra event. An audit-write failure aborts the accompanying business mutation. Existing role/lifecycle audit records and APIs remain intact.

## UI read contract

GET `/workspaces/:workspaceId/audit`

- Current verified account/session, Workspace access, Ban and Owner/Manager management checks on every page. Member403, outsider404; Archived remains readable to authorized managers.
- Transitional Organization-attached Workspace: authenticated current management access is checked first, then `409 WORKSPACE_AUDIT_MODE_UNAVAILABLE`. Organization-controlled operations remain in their existing audit paths.
- Query: `limit` default20/max100, `cursor`, literal AND `q` matching current actor/target names or reason, `from`/`to` using Vietnam calendar days, `action` defaultall or one of the eleven supported actions. Unknown/action injection/date/cursor inputs400.
- Sort createdAt descending then ObjectId descending; filters apply before page and full filtered total. Cursor excludes prior rows, including same timestamp ties.
- Result: `{items,nextCursor,total,coverage:'standalone_forward_events_v1'}`.
- Item: `id,createdAt,action,invitationType,changedFields,reason,previousRole,role,versionScope,resourceVersion,actor:{id,displayName},target:{id,displayName}|null`.
- Internal Workspace/invitation references are scoped storage fields, not generic entity DTOs. No target email/avatar/profile or invitation link is returned.

UI should label metadata field keys, action, role and invitation type in the selected language, format dates in GMT+7, distinguish null target/name, provide loading/empty/error/paging and hide stale rows when current management access is lost. Empty means **no covered events recorded since this upgrade**, not that no historical changes ever occurred. Do not describe this as a full historical or security audit.

## Storage and coverage boundaries

`workspace_management_audit`: append-only schema, typed action/version scope/context validation, reviewed additive Workspace/time/id index in runtime/layout plans. No live index application, old-data backfill, TTL, retention/purge or migration performed.

This feed does not yet merge historical role/lifecycle records, Organization admission changes, Ban/Unban/moderation actions, Project/Task activity, private email preference changes or mail-worker retry events. Existing stores preserve those records; no fabricated older activity. The UI and security-event integration are subsequent patches.

## Verification

- Full isolated replica-set BE suite: **128 PASS**, zero fail/skip.
- BE+FE unit invocation: **103 PASS**,16 DB suites skipped in this invocation and run separately above.
- Final targeted Workspace integration and schema/query unit reruns cover invitation type, Ban denial, attached Workspace guard, changed-fields privacy and rollback.
- Real HTTP tests cover current management/access, action/query rejection and pagination; no frontend changes or browser/build claims in this patch.
- No dev-data writes, migration/backfill, live SMTP/purge queues, provider calls or deployment.

Next W4b: connect management history UI, retaining access to existing role history and making coverage limits visible. Remaining security event/historical feed integration must be completed before full audit acceptance.
