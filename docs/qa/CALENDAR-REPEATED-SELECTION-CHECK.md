# Calendar repeated-selection repair

15/10/2026. Root cause: change() incremented the request generation and cleared both datasets on every click, even when serialized filters were unchanged. The effect depended on the serialized query, so no new request started; the old request was invalidated. Later background revalidation made the data reappear.

Fix: canonical no-op check before invalidation; preserve month summary when only agenda day changes; preserve confirmed data on same-query background refresh/transient errors. Changed query clears relevant agenda; month/filter changes clear summary. 401/403/404 still remove data.

Validation: FE unit regression for repeated Today/day/default filters. Browser Light/Dark: six repeated Today clicks trigger zero reads and preserve badges; day-switch plus repeated Today under delayed requests resolves to current selection; month badges remain visible. Existing drawer, online refresh and draft guard checks pass.

Reviewed other generation-invalidating filter handlers: Inbox had an additional whitespace-only search/reset issue because q is trimmed in the request but not in the change guard; fixed its canonical comparison and tested populated rows remain. MyTasks.change and ProjectManagement.changeTab already compare effective values before invalidation. This is a scoped audit, not proof against every possible asynchronous interaction.

No BE/data mutation, providers, workers or deploy.
