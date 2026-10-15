# Calendar, mobile navigation and read refresh repair

Ngày: 15/10/2026. User-requested repair overrides the previous completion order; P1 interaction acceptance continues afterward.

## Changes

- Calendar day metrics use themed total/done/overdue badges with count, icon/text and accessible full-day labels. Compact label Trễ/Late avoids wrapping in narrow desktop columns; mobile retains symbols/counts and full accessible label. Removed the visible Tháng label; month input retains an accessible name.
- Mobile navigation overlay explicitly aligns to the left edge; preserves dialog focus trap, Escape/return focus and reduced-motion behavior. Fixes shared centered-overlay CSS at narrow CSS viewports, including browser zoom that crosses the breakpoint.
- Removed routine Làm mới/Tải lại controls from Home, Workspace, Project/Board, Task/detail/comment/history, My Tasks, Calendar, Inbox, Team/settings and related management views. Error/uncertain-result recovery remains available where required, not a routine toolbar refresh action.
- Shared read revalidation hook attached to 19 data components: focus/visible return after cooldown, online, successful business mutation signal and visible 90-second check. Debounces events; skips offline, hidden, open modal, focused edit controls, active dirty/busy drafts and deep document scroll. Rechecks draft/modal at dispatch time. Reads only; no mutation retries, no server push or claim of full realtime sync.
- My Tasks and Calendar reuse existing CollectionLoadMore alongside Inbox. Automatic loading defaults on; max three extra pages per filter, cursor dedup/in-flight guard, stop on error, manual continuation/fallback if IntersectionObserver unsupported. Workspace/Project grids and independent Board columns retain their existing paging behavior.

## Validation

- FE unit suite: 34/34 PASS, including successful-business-write invalidation versus GET/auth/failed-write exclusion.
- Browser real dev: Light/Dark calendar badges and contrast; visible month label absent; drawer left x=0 at 900/375; Escape/focus restored; online event triggers a new Home read; unsaved Settings name preserved. No business writes.
- Real dev product smoke: Owner Home/Workspace/Board/Task/MyTasks/Calendar/Inbox plus Manager/Member/Guest Board: 10 checks PASS, no pageerrors/business writes.
- Isolated lazy Inbox with 80+ notes: defaults on, three-page cap, manual continuation, cursor dedup, error retains 60 rows without immediate auto loop, recovery and unsupported-observer fallback PASS.
- Build/budget: initial 422754/425000 bytes, gzip132742, largest chunk395860. git diff check clean.
- Visually inspected dark calendar and narrow drawer screenshots in .local/calendar-nav-repair. Test initially caught a missing visually-hidden class for the month label; removed visible text entirely instead of depending on an undefined class. Test theme sessions preserve rotated refresh cookies between contexts.

## Limits

No BE/data model changes or full BE rerun for this FE patch. No SMTP/queue/purge/cleanup worker, reset, seed or deploy. Automatic refresh deliberately defers during editing and some deep-scroll contexts; this patch does not promise instant cross-tab push or preservation of every expanded pagination state across revalidation. Detailed multi-account write/lost-permission/network acceptance remains P1. Existing older browser journeys that explicitly click retired toolbar buttons must use the current revalidation behavior before counting as current acceptance.
