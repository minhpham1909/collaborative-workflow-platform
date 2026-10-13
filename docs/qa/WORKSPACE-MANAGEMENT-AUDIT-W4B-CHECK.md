# W4b — Workspace management history UI

Current merged read contract/coverage: [W4c](WORKSPACE-MERGED-AUDIT-W4C-CHECK.md). This file retains the earlier patch evidence.
Date: 13/10/2026

## Implemented

- Owner/Manager of standalone Workspaces see a collapsed **Workspace management history** section under Members; opening it lazily loads the W4a audit API. Existing appointments/ownership history remains a separate section, preserving access to older role records.
- Reuses the existing FilterPanel, feedback components, responsive Team table, Jakarta typography and light/dark semantic colors; no new design system or library.
- Search current actor/target names or user reasons; action selector covers all eleven BE events; Vietnam-day date range in the existing advanced filters; twelve rows per page, explicit Load more and full filtered total.
- Action, metadata field keys and invitation type are localized; user names/reasons retain their original text. Shows role transition, null target/name fallback and GMT+7 event date. No invitation tokens/emails, metadata snapshots or additional protected profile data are fetched for display.
- Coverage note/empty state explicitly describe forward records and exclude earlier history, Ban and Project/Task activity. Historical role records remain in the role section; security records remain in the existing moderation panel.
- Loads clear on changed filters/revision; stale responses are ignored. Same-generation duplicate page requests are blocked. Network failure while loading the next page retains confirmed rows; Retry reloads the current filter from its first page.
- Open history refreshes on window focus, with no new permanent manual-refresh button. This refresh returns to the first page; no claim of preserving expanded-page position.
- Management rejection clears rows, reads fresh Workspace context and hides history after demotion while retaining legitimate Member access. Authentication/Ban/read-access failure is forwarded to the existing parent handler.

## Validation

- FE unit: **30 PASS**, including action coverage parity with the BE enum, localized field/action labels and preservation of user text.
- Full Workspace Team browser fixture **Light and Dark PASS**, covering current management history plus existing membership/roles/invitations/Archive/Ban flows and Vi/En controls. Dark run also enables the existing management color checks.
- New browser cases: >12 forward events/load-more; failed next page keeps12 confirmed rows; retry; action/search/no-results filters; delayed old query cannot replace newer result; invalid dates; legacy role history remains readable; Manager can read then loses visible audit rows on demotion/focus readback; English action/field labels.
- Management history screenshots/overflow checks at 1440/1280/1024/768/375 for Vi. Existing Vi/En Team responsive probes remain; new English audit labels also checked at desktop. Screenshots share a fixture folder, so separate Light/Dark logs are the theme evidence, not a claim that every PNG retains both versions.
- Mobile dark history screenshot visually inspected. Build PASS: initial423902/425000 bytes, largest395860; budget unchanged.
- No BE change in this patch; no claim that the full128 BE suite was rerun here. Browser fixtures use isolated Mongo/API accounts; no dev data, provider, live SMTP/purge/moderation worker or deployment calls.

## Remaining

W4c: security/Ban event integration and read-model approach to existing role/lifecycle history. Do not mark the complete management/security audit accepted until that coverage is finished. Organization inventory/mapping/rehearsal and remaining Workspace-only UI/data acceptance also remain.
