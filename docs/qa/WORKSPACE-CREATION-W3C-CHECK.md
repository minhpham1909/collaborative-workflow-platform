# W3c — Recoverable Workspace creation

## Behavior and contract

- POST `/workspaces` optionally accepts UUID v4 `requestId`. Current Home always supplies it. Older callers without it remain compatible and do not receive duplicate-prevention guarantees.
- Receipt identity is SHA256 of versioned operation scope + authenticated Account ID + UUID. A full SHA256 fingerprint covers validated normalized name, rich description and identity defaults. Same key/input returns the same Workspace; changed input returns `409 WORKSPACE_CREATION_INPUT_MISMATCH`.
- Workspace, Owner membership and minimal receipt commit in one transaction. Existing actor locking serializes concurrent requests, including concurrent first use. Receipt uses the built-in unique string `_id`; no extra uniqueness index or live index deployment needed.
- GET `/workspaces/creation-requests/:requestId` accepts no query parameters. Returns `{status:'not_found'}` for absent account-scoped receipts, or `{status:'completed', workspace}` after fresh access/Ban/session/verification checks. A completed replay performs the same fresh access check. Current Archived state is returned; receipt stores no historical Workspace metadata.
- Another Account sees no receipt belonging to the original Account. It may use the same UUID for its own distinct Workspace.
- Receipt fields: hashed operation identity, User ID, Workspace ID, input fingerprint, createdAt. No raw input, UUID, credentials or delivery job. No TTL/expiry/purge; deleting a receipt would allow an old retry to create again. Account deletion/storage retention must consider these minimal receipts separately before implementation.
- Home saves its bounded account-scoped pending request in **sessionStorage before sending**. Reload/navigation back can recover it within the same tab session. Successful completion or definite original-request rejection clears it. No cross-device or closed-tab recovery is claimed. If session storage is blocked, creation is withheld with an actionable message.
- Unknown outcome freezes fields, exposes Check result, and never automatically repeats POST. Only a successful `not_found` readback enables an explicit resend using the identical request key/body. Not-found does not prove no concurrent request exists; the idempotency key makes that race safe.
- Closing an unresolved form retains its request; Home offers Check request rather than another fresh creation. Readback errors keep it blocked and retain the draft; it does not search by name or disclose inaccessible Workspace data.

## Validation

- Full isolated replica-set integration: **127 PASS, 0 fail/skip**. Includes simultaneous same-key creation, one membership, normalization/default replay, mismatched payload, account isolation, strict HTTP readback, malformed UUID, Archived readback and lost-access replay refusal.
- Unit suites: **101 PASS**, 16 DB suites skipped only in unit invocation; those run separately above.
- Home browser: committed-response drop → reload → GET readback without another POST; pre-write drop → reload → not-found → identical-key resend. Both assert exactly one Workspace and pending-cache cleanup. Existing Vi/En flows, pagination and five widths remain covered.
- Home browser fixture also run with dark system preference; responsive Vi/En probes preserve their existing fixture configuration. No new styling system introduced.
- Build initial budget remains 423902 / 425000 bytes; no cap increase. Build rechecked before commit.

## Scope / next

No live migration/backfill, collection edits, SMTP/purge worker or deployment. New receipt records are created only by keyed creation calls, not backfilled for legacy Workspaces.

Next: unified Workspace management audit (metadata/admission/exit/role/lifecycle), then remaining screen data/UI acceptance and Organization inventory/mapping/rehearsal. Current role-history UI remains a subset rather than a full audit.
