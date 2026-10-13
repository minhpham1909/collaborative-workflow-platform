# F2b1 — Project/Guest and Inbox parent isolation

Date:13/10/2026. Fresh dev state; no migration, reset or seed.

## Runtime behavior

- Project access rejects an unsupported Workspace parent (Organization reference or missing Owner) **before** active membership/Guest fallback. Guest grant cannot restore retired parent access. Valid Owner/Manager/Member derive authority from Workspace; external Guest remains per-Project view/comment only.
- Shared Project list matches supported Workspace parent and Workspace/Project Ban before sorting/limit/cursor, preventing hidden records from consuming pages. Removed the runtime Organization lookup for this path.
- Guest invitation target validation checks the same supported parent for public preview, authenticated acceptance and management; runtime target no longer reads/locks Organization. Valid Workspace Guest invites remain supported.
- Pins use Project access and retain only unavailable/removable state for rejected old parents; no cached Project/Workspace names disclosed.
- Inbox no longer returns an available Organization-invitation CTA/payload/target in runtime, even if an old record exists. It returns available=false/codeORGANIZATIONS_RETIRED. Unsupported Project/Workspace invitation parents also return unavailable/redacted state. Inbox previously called the already-retired Organization endpoint; this patch removes obsolete presentation, rather than claiming a separate acceptance backdoor existed.
- Recorded Org data is not converted/deleted by these guards. Historical Project/parent policy remains exclusively in test-support under F2a's isolated test DB/nonproduction adapter; production/dev has no legacy activation.

## Evidence

- Full isolated BE:133 PASS,0fail/skip, including explicitly historical fixtures and a new independent default-policy test without legacy registration.
- Independent4-account test: Owner and Manager Project creation/invitation; Guest reads/comments only on its grant, cannot create Task/read sibling Project; old Org-parent active Guest grant rejected on Project/Task/preview/accept; shared limit1 excludes newer invalid row and search cannot expose it; pin redaction; Archived readOnly; Project Ban denial/list filtering; Org Inbox and unsupported EMAIL Project invitation payload/CTA redaction.
- BE+FE unit:116 PASS,20 DB suites skipped only in this invocation and executed separately above. Full BE rerun after Inbox/EMAIL-parent assertions added.
- Collection browser fixture converted from Org to standalone Workspace+Member+Guest. Light/Vi and Dark/En PASS: Home/Workspace/MyTasks/Guest Shared modes/persistence/account isolation/5width/no overflow/readability. This is functional/contrast regression evidence, not acceptance of the previously disputed compact/detail UX design.
- No frontend product code changed; no new build claim. Dev API restarted and readiness checked. No real Google/provider/worker invocation or dev business data writes by tools.

## Remaining

F2b2: Workspace DTO/Team/person-profile Org fields and copy, notification/schema ref cleanup. F2c: remaining moderation/role-sensitive branches and comment-author-only policy; physical Org schema/module removal. No full Organization removal claim yet. Fresh multi-account demo seeding follows core cleanup, not before it.
