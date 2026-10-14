# F2d2b1 — Retire Organization implementation directories

Date: 2026-10-14. Implementation modules retired; model registry and category metadata remain pending.

## Delivered

- BE Organization service/store/router/access/input/index/audit implementation moved from src/organizations to explicit test-support/organizations. App still serves authenticated/origin-guarded 410 retirement routes. No application source imports the retired implementation.
- Historical Mongo store construction requires the private non-production loopback test-database adapter. Historical tests/tools now reference their actual location. Current Workspace-only tests use src services and never register that adapter.
- Removed six unused FE Organization components. Preserved both shared CSS files with byte-for-byte normalized-content comparison, moving them to Project shared-team.css and studio-collections.css. Existing Project team.css stays separate; import order retained.
- Old Organization seed function and executable entrypoint fail with LEGACY_ORGANIZATION_SEED_RETIRED. Existing-account QA wrapper retains Workspace/Task services without constructing Org service; no data seeded.
- Removed unused Org service construction from browser fixtures that never called it; redirected imports in older Org-based scripts. Such scripts still need flow conversion and are not reported as current UI acceptance.
- Browser failure diagnostics retain the original connection failure when no main element exists, rather than replacing it with a secondary main timeout.

## Validation

- Full isolated BE integration: 135 passed, zero failures, after fixing one relocated fixture HTTP import. Initial Mongo fixture startup timeout was retried; no test gate waived.
- Units: 122 passed, 22 DB suites skipped only in unit invocation (144 total). Focused retirement units 2 passed after final wrapper cleanup.
- Tests confirm no Org implementation JS/JSX in application directories, default legacy-store construction blocked, seed rejected, and retirement routes never call injected Org services.
- 24 modified browser scripts passed syntax checks; this is not acceptance of their historical Org flows.
- Current browser Light/Vi and Dark/En passed Workspace/Project/Team/profile/Ban/comment/archive/collection regression at five widths after restarting the stopped local FE server.
- FE build/budget: initial 422635 / 425000 bytes, initial gzip 132389 bytes. Shared CSS content unchanged.
- FE local server resumed. Persistent project Mongo27018 was also stopped; resumed the existing .local/mongodb-dev directory with explicit port27018, then resumed owned API; /health/ready returned ready. No reset, seed or system27017 process change.

## Remaining

F2d2b2: remove Org models from runtime registry and retire related notification/mail/moderation category and reference fields; keep test-only negative/historical fixtures distinct. Then fresh Workspace-only seed and multi-account web acceptance. This patch does not claim complete physical Org schema removal or completed UX acceptance.

No dev reset, seed, data/index mutation, migration/backfill, SMTP/providers, auth/old queues, dev workers/purge or deployment. Existing accounts and Mongo system 27017 unchanged.
