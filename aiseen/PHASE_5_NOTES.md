# Phase 5 — Auto-generated Queries: Notes & Decisions

## What was built

### Query generator (`src/lib/queries/generator.ts`)
- `generateQueriesForStore(store, count)` — fetches up to 100 products from `products` table, converts to `ScrapedProduct` shape, calls the existing `generateQueries()` from Phase 1 (which uses Claude Haiku or the template fallback). Brand name derived from `stores.brand_name`, falling back to the domain hostname.
- `upsertQueries(storeId, queries)` — batch-upserts into `queries` table on `(store_id, query_text)` unique conflict. Uses `ignoreDuplicates: true` so re-running doesn't overwrite manually-adjusted queries that happen to have the same text.

### Inngest `generateQueries` function (`src/lib/inngest/functions/generateQueries.ts`)
Event: `queries/generate.requested` — receives `{ storeId: string }`

Steps:
1. `fetch-store` — load store row
2. `check-product-count` — skip (return early) if catalog is empty; prevents confusing empty query sets
3. `generate-queries` — calls `generateQueriesForStore()`; query count scales with catalog size: `min(max(25, floor(productCount / 5)), 60)` — 25 minimum, 60 maximum
4. `upsert-queries` — inserts new queries; existing queries with the same text are left untouched

### Auto-trigger after catalog sync
`syncCatalog` Inngest function now fires `queries/generate.requested` via `step.sendEvent()` after `finalize`. This means a full sync → generate cycle runs automatically when a user clicks "Sync catalog". The two functions run as independent Inngest executions (non-blocking), each with their own retry budget.

### API routes
- `POST /api/stores/[id]/generate-queries` — ownership-verified, fires the Inngest event
- `GET /api/queries?store_id=...` — returns queries for authenticated user's stores (enforced via `stores!inner(user_id)` join filter); optionally scoped to one store
- `PATCH /api/queries` — toggles `is_active` on a single query; ownership-verified via stores join

### Queries dashboard page
Replaced the stub with a real client-driven page (`QueriesClient` component):
- **Store selector** — shown only when user has >1 store
- **Filter tabs** — All / Active / Inactive with counts
- **Grouped by category** — sections collapsed by category label (comparison, budget-tier, use-case, etc.) sorted alphabetically
- **Intent badge** — colour-coded: blue=commercial, purple=informational, gray=navigational
- **Active toggle** — per-row toggle button with optimistic update (PATCH fires in background)
- **Generate queries button** — fires the API, shows confirmation, auto-refreshes after 5 seconds
- **Empty state** — prompts to sync catalog first if no queries exist

### StoreCard updated
Added "Generate queries" button alongside the existing "Sync catalog" and "Test connection" buttons.

## Decisions

### `ignoreDuplicates: true` on upsert
If a user has manually deactivated a query, re-running generation should not re-activate it. Since the conflict key is `(store_id, query_text)` and duplicates are ignored, existing queries survive re-generation unchanged. Only genuinely new query texts are inserted.

### Query count scaling
`min(max(25, floor(productCount / 5)), 60)` gives:
- 5 products → 25 queries (floor of 1, clamped to 25 minimum)
- 100 products → 20 queries from formula → clamped to 25
- 200 products → 40 queries
- 300+ products → 60 queries (capped)

The idea is larger catalogs justify broader query coverage. The 60-query cap keeps Inngest run times and LLM token costs bounded.

### Queries page: client-side fetch, not server RSC data
The page server component fetches the store list (small, changes rarely). The queries themselves are fetched client-side via `GET /api/queries` so the store selector + filter work without full-page navigation. This avoids the need for URL search param state management for a dashboard-style UI.

### Auto-generate after sync (always, not just first time)
The sync always fires query generation. This ensures if a seller adds new product lines, queries expand to cover them on the next sync. `ignoreDuplicates: true` means old queries aren't disturbed; only new query texts (covering new product types) are added.

## Open questions / deferred

- **Query deduplication across re-runs**: Currently `ignoreDuplicates: true` means re-running generation adds new queries but can't remove stale ones (e.g., for discontinued product lines). A future improvement would compare the full generated set and deactivate queries no longer relevant.
- **`related_product_ids` field**: The `queries` table has a `related_product_ids uuid[]` column. The current generator doesn't populate it. Phase 8 or 9 could link each query to the specific products it's designed to surface.
- **Expected competitor brands**: The `GeneratedQuery` type includes `expected_competitor_brands` returned by the LLM, but this isn't stored (the `queries` table has no such column). This data is used implicitly in Phase 7 mention detection but could be materialized in a separate table for competitor tracking.
- **Manual query entry**: No UI to add custom queries by hand. A "Add query" button on the Queries page would be a useful MVP addition.
- **Rate limiting on generate-queries endpoint**: The `/api/stores/[id]/generate-queries` route isn't rate-limited. Should use the existing Upstash rate limiters in Phase 11 hardening.
