# W5a — Read-only Workspace-only inventory

Date: 13/10/2026

Superseded by the user-authorized [fresh dev start](../project/WORKSPACE-ONLY-FRESH-START-v0.1.md): business data was reset; the inventory below is historical and its inheritance/migration gates no longer apply to this discarded dev dataset.

## Tool and safety

`BE/scripts/workspace-only-inventory.js`, or `db:workspace-only-inventory` from BE, accepts no arguments and exposes no apply mode. Requires development mode, loopback MongoDB URI, explicit database name and **port27018**. Refuses system27017, remote/srv and production targets. Generic errors never print the connection string or credentials.

Reads26 projected collections sequentially within a read-only snapshot transaction using native find calls. No model write hooks, user/auth revision increments, index creation, collection mutations, mail/provider/worker calls or migration. Projection excludes email/displayName, credentials, tokens, encrypted delivery, descriptions/comment bodies, notification payloads, receipt fingerprints and worker lease data. Runtime report is written to ignored `.local/w5a-inventory.json` by shell redirection; raw projected snapshot remains in process memory.

The source fingerprint canonically hashes **projected scope/state/version data**. It is not a complete content backup, permission approval or authorization to migrate. CAS versions missing from source are reported for review rather than treated as zero.

Project replica set was initially offline; only the project launcher/.local/mongodb-dev instance was resumed on27018. System Mongo27017 was not targeted. No app/SMTP/purge/moderation worker was started by this patch.

## Actual dev inventory (point-in-time)

- 6 Workspaces:4 standalone,2 Organization-attached;2 Organizations,3 Users,7 Workspace memberships,2 Organization memberships.
- 6 Projects,31 Tasks,18 comments;3 Project labels,78 Task activity records.
- 0 Project Guests,0 active Ban records,0 historical Lead references.
- 3 Workspace invitations,1 Project Guest invitation,24 notifications,5 outbox records,4 moderation actions. These totals are not permission to send/process any queue.
- 0 active Organization invitations,0 Organization notifications/pending Organization mail/pending Organization cleanup.
- 2 reopen request records; **1 pending in a standalone Workspace,0 pending in the two attached Workspaces**. Preserve its status; verify unchanged behavior in the control cohort during W5b.
- 0 current inventory findings and0 candidate gain/loss actors in the limited Workspace-level comparison. This is not a full DB integrity or per-Task permission acceptance.

## Mapping candidates only

| Candidate group | Owner proposal | Manager proposal |
| --- | --- | --- |
| Attached Workspace1 | Current Org Owner, already an active Workspace member | No separate Manager; current Manager is the Owner candidate |
| Attached Workspace2 | Same current Org Owner, already an active Workspace member | No separate Manager; current Manager is the Owner candidate |

Exact account/Workspace/Organization IDs and projected source fingerprint are in the ignored local report. They are not embedded into this reusable tooling document.

Both candidates already have active Workspace membership and management authority, so the modeled read/manage/member bits do not gain or lose access. Standalone Workspaces are not converted or replaced. Candidate role decisions are not applied or finally approved by this inventory.

For general datasets, the analyzer flags Owner eligibility/membership approval, Admin-specific mapping, stale Organization exits, banned members/Guests, invalid Task parents/assignees, duplicate memberships, missing references/CAS and incompatible ownership. OrgAdmin is **never automatically Manager/member of every Workspace**. Org bans produce required per-Workspace mapping rows; no ban/grant is copied. External Guest with no historical Org membership is distinguished from an exited Org member with a stale Guest grant.

Before/after comparisons cover verified Workspace-level read/manage/member eligibility for mapping candidates. They omit Project Guest access, Project/Task creator exceptions, archive/danger actions, assignment lists, reopen reviews, comments, Inbox/pins/calendar and job/delivery decisions; those need real-service assertions in W5b. They are not an RBAC proof.

## Verification

- 6 unit cases cover Admin/Owner/exit/Ban/Guest/missing reference/duplicate/CAS/target restrictions/projection safety and stable projected fingerprint.
- 1 isolated replica snapshot test verifies unchanged full document checksum before/after reads, exclusion of private fixture markers and candidate role flags.
- Full isolated BE suite: **130 PASS**,0fail/skip. BE+FE unit invocation: **111 PASS**,17 DB suites skipped only in this invocation and executed separately in the BE suite.
- No frontend changes; no browser/build claims for this tooling patch.

## Next gates

W5b must create a reviewable explicit mapping manifest and run an isolated **actual transformation rehearsal**, with pre/post entity/content/permission checks, pending-request/job decisions and rollback/restore. This patch has not performed that migration rehearsal or backup validation.

Live cutover requires the reviewed mapping and explicit user authorization, stopped/controlled writes and workers, fresh source checks, backup+restore evidence and a concurrency/rollback plan. Legacy Organization invitations/links/notifications must be retired/redacted without issuing or replaying delivery. Preserve historical authors, Done assignments, existing trash schedule and audit provenance. No auto-restoration of departed roles or Guest access.
