# Workspace-only — fresh dev start

13/10/2026. Direct user decision supersedes the legacy migration plan: the product is not deployed and has no real users; old dev business data need not be inherited. User explicitly selected **keep accounts; delete business data**.

## Completed reset scope

Only local `workflow_dev` at loopback port27018. Preserved users, auth identities (including Google), sessions, auth tokens/challenges and auth-category email outbox. Business records removed atomically: Organizations/memberships/invitations/audits, Workspaces/memberships/invitations/creation receipts/history, Projects/Guests/labels/access history, Tasks/comments/activity/trash/reopen requests, notifications, Ban/moderation records and business mail. Old personal Project pins cleared; associated User metadata versions incremented. Protected account content checksum matched before/after. Collections/indexes kept; no dropDatabase, provider send, worker execution or access to system27017.

Verified dev result:3 Users,2 AuthIdentity rows,58 sessions,5 auth tokens,14 challenges,5 auth mail rows preserved; business collections0. Auth mail is retained and **not dispatched**. No new test business data seeded yet.

## Retired work

W5b old-data mapping, conversion inheritance and migration/backup rehearsal are canceled for this dev dataset. W5a inventory remains historical evidence and a reusable read-only tool, not a required migration gate. No requirement to copy former Org roles, authors/history, old invitation links or queued business deliveries into new data.

## Required next work

1. Retire Organization creation/management/runtime routes and entry points; remove the Org UI navigation/context so new test data cannot recreate the discarded hierarchy. Distinguish API retirement from complete removal of all old source/schema modules; do not claim the latter early.
2. Simplify BE authorization and screen contracts to Workspace Owner/Manager/Member + Guest by Project. Preserve multiple Managers appointed by Owner, Member invitation rights, no Project Lead and independent review/reopen policy. Remove remaining legacy Org-specific assumptions and review the existing manual comment moderation policy gap.
3. Finish Workspace setup, grouped toolbars/view modes/navigation/draft behavior and data loading; verify account-only starting state across Home/My Tasks/Calendar/Inbox/settings.
4. Generate a fresh explicitly scoped dev dataset only after core/route changes, then verify multi-account roles, permissions, invitations, task lifecycle, notifications and light/dark/responsive flows. Never dispatch retained auth/dev queues incidentally while seeding.
5. Web acceptance before deployment/CI-CD work.

Each implementation patch gets targeted checks and its own commit. Reset is now done; future continuation must not run it again automatically. Live/production reset is not authorized.
