# Authorized dev business reset

Date:13/10/2026. User selected keep accounts and clear business data; old-data inheritance is no longer required.

## Guards and verification

- `reset-dev-business.js` defaults to count-only preview. Apply requires explicit `--apply --confirm=workflow_dev`, development mode, loopback Mongo at27018 with exact DB name, known collection allowlist and stopped API on IPv4/IPv6. Operator asserts stopped workers; actual local process/listener checks found0 known API/workers before reset. This is operator-controlled quiescence, not a distributed maintenance lock.
- No public destructive endpoint. No dropDatabase/index drop or mutation of systemMongo27017. Unknown collections refuse the operation.
- Native deletes of24 business collections + non-auth email jobs and stale Project pin cleanup occur in one transaction. Same-transaction verification requires business counts0 and identical protected account/auth-mail digest before commit; failure aborts all changes.
- User fields excluded from protected digest are only projectPins/version/authMutationRevision/updatedAt. Identity, credentials, verification, authVersion and other preferences are preserved; auth IDs/session/token/challenge documents and auth mail are compared fully. Digest code never emits raw documents/secrets.
- Isolated replica test: forced rollback retains Task/pins; success clears business rows, retains all five account collections/auth mail, leaves indexes intact, refuses unknown collections.

## Actual dev outcome

Deleted2 Organizations,6 Workspaces,6 Projects,31 Tasks,18 comments,24 notifications,78 Task activities and related memberships/invitations/history/moderation/reopen data. One User's old projectPins cleared. Business email jobs deleted0; the5 existing email jobs were auth-category and retained without sending.

Post-read confirms business counts0;3 Users,2 auth identities,58 sessions,5 auth tokens,14 auth challenges and5 auth mail rows retained. Reset report confirms protectedAccountsUnchanged=true. No real Google login/provider send was performed to validate preservation; preservation is document/digest based.

Focused checks:2 unit tests +1 isolated transactional reset test. Full isolated BE suite: **131 PASS**,0fail/skip. BE+FE unit invocation: **113 PASS**,18 DB suites skipped only in the unit invocation and executed separately above. No FE change/build/browser claim for reset tooling.

Plan now follows [fresh start](../project/WORKSPACE-ONLY-FRESH-START-v0.1.md). Core still exposes legacy Org code/routes until the next retirement patch; clearing data alone does not complete Workspace-only implementation.
