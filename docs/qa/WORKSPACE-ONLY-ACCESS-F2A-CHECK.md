# F2a — Workspace authority foundation

Date:13/10/2026. Fresh dev data remains the target; no migration or seed/reset in this patch.

## Runtime policy

- Canonical policy moved to `workspaces/access.js`; runtime consumers (Workspace, work, guest, moderation, notification and work mail) import this module instead of deriving Workspace authority in the Organization package.
- Workspace scalar access requires a supported Workspace (no non-null organizationId, a present ownerId), an active requesting membership and no Workspace Ban. OwnerId identifies Owner; active membership.role identifies Manager/Member. Missing/inactive membership denies Owner as well as other users. Legacy managerId and Org Owner/Admin roles do not grant Workspace authority.
- List stages enforce supported parent + active membership + Workspace Ban **before** pagination/facets. Managed filters/counts derive solely from OwnerId and membership.role. Active member counting no longer joins Organization membership. Historical attached Workspaces are hidden from this runtime Workspace reader.
- Old Organization import path is a temporary re-export alias, not a second runtime policy. Remaining mutation/schema/DTO conditions are not all removed in this patch.

## Historical test adapter

Prior policy/query code moved to test-support. Historical suites explicitly register these fixtures. Registration is ignored unless a loopback connected `workflow_*_test` database is active, and is disabled in production; normal workflow_dev cannot activate it. Server never imports the registration fixture. This is test scaffolding to preserve prior regression evidence while remaining old scenarios are replaced, not product compatibility or data inheritance.

Full-suite totals include tests exercising historical adapter behavior. Independent `workspace-only-access-mongo.test.js` and the updated Home fixture run **without** this adapter and validate current policy. Do not treat every old fixture as a production-policy test.

## Verification

- Full isolated BE integration:132 PASS,0fail/skip. Added independent4-account policy case: Owner/Manager/Member, Org-admin nonpromotion, unsupported parents, legacy managerId ignored, inactive Owner/member, Workspace Ban, managed/member facets.
- Final independent policy case additionally verifies real Workspace store create, explicit Owner appointment, Manager metadata edit/invitation, no Manager self-role mutation, and invitation denial after demotion, with authenticated session claims. Targeted final rerun PASS after these assertions were added.
- BE+FE unit:116 PASS,19 DB suites skipped only in unit invocation. New unit confirms a historical registration cannot activate without an isolated connected test DB. Production-mode adapter guard added after the full integration run; current-policy target and unit runs rechecked.
- Home browser Light/Dark Vi/En5width PASS with a genuine standalone Manager Workspace replacing the former attached-Org fixture. Existing create/recovery/search/filter/paging/navigation cases retained; no Organization role label present.
- No frontend product code changed; only the browser fixture changed, so no new build claim. API dev restarted with the new reader; readiness checked before commit.
- No dev business data, role mutation, reset, index change, worker/provider call or migration by tooling. Test records are isolated.

## Remaining F2b+

Project Guest fallback and shared-list scopes, remaining Org-sensitive DTO/profile/Team/store conditions, notification invitation paths, moderation scopes/jobs and schema/module cleanup still need explicit retirement. In particular this Workspace layer does not yet prove every Project/Guest path rejects a retired Org parent. Comment-author policy exceptions also remain to review. Do not claim full physical removal of Organization.
