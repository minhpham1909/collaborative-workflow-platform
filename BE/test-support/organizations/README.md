# Retired Organization fixtures

Moved from BE/src/organizations on 2026-10-14. These implementations are not runtime product features. The Mongo store refuses construction unless the private historical adapter is active on a non-production, loopback workflow_*_test database. Production app keeps only authenticated/origin-guarded 410 retirement routes.

Historical BE suites import this directory explicitly. Current Workspace-only suites use src services and never register the adapter. Existing browser scripts with Organization data/routes need conversion before they can count as current UI acceptance; changing their import path does not make their old flow valid.

Organization schemas still exist in the current model registry pending the next bounded cleanup. This move does not claim physical registry/schema removal or dev data inheritance.

The prior seed-qa-account script can still supply its existing-account QA wrapper, but its seed function and executable entrypoint fail with LEGACY_ORGANIZATION_SEED_RETIRED before seeding business records. A fresh Workspace-only seed will be implemented after core cleanup.
