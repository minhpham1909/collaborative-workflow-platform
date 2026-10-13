# W4c — Merge available Workspace history and security records

Date: 13/10/2026

## Canonical sources, not synthetic backfill

GET `/workspaces/:id/audit` now reads four sources under the existing current verified/session/Workspace-management/Ban guard:

| Source | Records included |
| --- | --- |
| management | Creation, metadata, invitations, join/leave/remove; excludes role/ownership/archive events also recorded in dedicated stores |
| role | Existing direct role transitions; ownership transfer represented by its new Owner row, former Owner→Member companion omitted from the combined view |
| lifecycle | Existing Archive/Unarchive records |
| security | Workspace and Project Ban/Unban records carrying this Workspace ID |

The dedicated role/lifecycle stores are canonical for these event types in all eras, because current writes update them atomically along with the management journal. No fuzzy matching on actor, reason or timestamps. Ownership is identified from the typed role transition; an ordinary role-change reason literally equal to `ownership_transferred` stays an ordinary role change. Raw dedicated history remains accessible, including both ownership companion rows.

This is a read-model change only: no record copy, destructive deduplication, backfill or migration. Missing older creation/admission/metadata history is not invented. Organization-wide moderation and manual comment deletion are excluded. Attached Organization Workspace guard remains409 after current access verification. This is **available history**, not a complete forensic log since Workspace creation.

## Read contract v2

- All thirteen actions (previous eleven + ban/unban), existing literal q/dateGMT7 filters and full filtered total.
- Sort by createdAt, raw ObjectId, source, all descending. Item ID is an opaque `source:ObjectId` identifier to avoid cross-collection collisions.
- Cursor now includes `{at,id,source}`; validate bounded Base64URL, ISO time,24hex ID and source allowlist. Old cursors without source are rejected400; Retry/Clear filters reloads the current list from page1. No mutation depends on this cursor or audit ID.
- Four sequential aggregations in the same transaction, each returning at most limit+1 rows plus its filtered total. Merge at most4*(limit+1) candidates in application memory, then select the global page. This bounds transferred candidates; DB counting/filtering still scales with scoped history and is not a large-volume performance benchmark.
- MongoDB disallows `$unionWith` inside a transaction, so this implementation uses sequential source reads instead: [official MongoDB restriction](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionwith/#restrictions).
- DTO retains event/actor/target context and adds `source`, `scopeType`, `project:{id,name}|null`, `cleanup:{mode,state,matchedCount,deletedCount}|null`. Project-name lookup is restricted to the current Workspace; missing/moved Project yields null name.
- Dedicated role resourceVersion refers to membershipVersion, lifecycle to Workspace version. Security event versions are null; cleanup status/counts are the current recorded job state, not a historical snapshot or a Ban-version CAS token. No action/restore/retry operates from this read-only DTO.
- Coverage marker: `standalone_available_records_v2`.
- No invitation/email/token, lease/worker error, credentials, metadata snapshots or comment bodies in this combined DTO. Typed human reasons remain authorized plain text.

## UI

- Management history action selector includes Ban/Unban. Scope and current Project name appear for security rows; original user names/reasons are preserved.
- Ban cleanup context identifies its recorded range relative to ban time, actual job state and removed/matched counts. Queued0/2 is not displayed as completed. Unban does not imply restoration of membership or cancellation of the prior cleanup job.
- Coverage/empty messages now describe available records, excluding task/organization activity. Existing role/security panels remain for detailed operations.
- Refresh-on-focus/paging/missing access guards from W4b retained. Cleanup progress is updated on read; no realtime worker status guarantee or new polling.

## Validation

- Full isolated BE integration: **129 PASS**,0fail/skip.
- Unit invocation BE+FE: **105 PASS**,16 DB suites skipped in this invocation and run separately above.
- New legacy fixture: same ObjectId/time across four sources, one-row cursor traversal, full count/order/unique IDs; action/date/search; legacy Project names; Organization event exclusion; inaccessible reader denied; unknown cursor source rejected; actual cleanup state reread; sentinel-looking user reason stays a role event.
- Existing W4a fixture still yields exactly13 events despite forward role/ownership/lifecycle dual writes; no doubled entries.
- Workspace Team browser Light/Dark Vi/En PASS, including prior pagination/error/race/demotion/legacy-role cases; new archived Workspace Ban row retains queued0/2 and renders at1440/768/375 with no overflow. Dark color checks enabled. Mobile dark merged Ban screenshot visually inspected.
- Build initial423902/425000bytes, largest395860; caps unchanged.
- No live collections/indexes changed, no dev queues/workers/providers, no deploy.

## Next

W5: read-only Organization inventory, explicit membership/Owner/Manager mapping and isolated migration rehearsal before any live cutover. Remaining Project/Workspace/Trash payload refinement and full UI acceptance remain in the plan. Audit coverage for recorded standalone actions is now connected; this does not complete the overall Workspace-only restructuring.
