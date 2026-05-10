# Phase 9 — Recommendations Engine: Notes & Decisions

## What was built

### LLM prompt (`src/lib/llm/index.ts`)

**`RECOMMENDATIONS_PROMPT`** — Injected variables:
- `{brand_name}`, `{score}`, `{mention_rate}` — performance context
- `{losing_queries}` — up to 10 recent query runs where the brand wasn't mentioned
- `{competitors}` — top 10 competitors by mention_count
- `{products}` — up to 15 products with title, type, and description snippet
- `{winning_reasons}` — unique `reasons_cited` from successful own-brand mentions

Returns a strict JSON array. No markdown, no prose outside the JSON. `temperature: 0.3` for variety without hallucination.

### Recommendation generator (`src/lib/recommendations/generator.ts`)

**`generateRecommendations(storeId, brandName, brandAliases)`**
1. Runs 5 DB queries in parallel via `Promise.all`:
   - Latest `visibility_snapshots` row (score + mention rate context)
   - Recent own-brand `mentions` with `reasons_cited` (what makes the brand win)
   - `competitors` ordered by `mention_count DESC`
   - Sample `products` (title, description, type, tags)
   - Recent `query_runs` joined with `queries` for this store
2. Filters losing runs: response text doesn't contain brand name or any alias (case-insensitive)
3. Builds context strings and calls Claude Haiku (`claude-haiku-4-5-20251001`, `maxOutputTokens: 2048`)
4. Extracts the first JSON array from the response with `/\[[\s\S]*\]/`
5. Validates: `rec_type` must be one of the 5 known types; `title` required
6. **Delete-then-insert** strategy: deletes all `status: "pending"` recommendations for the store before inserting fresh ones
7. Returns count inserted; returns 0 gracefully if no API key or parse failure

### Inngest function (`src/lib/inngest/functions/generateRecommendations.ts`)

Event: `recommendations/generate.requested` — receives `{ storeId: string }`
Single step `generate`: loads store details, derives brand name (same logic as runMonitoring), calls `generateRecommendations()`.

### runMonitoring integration

After the `finalize` step, `runMonitoring` fires `step.sendEvent("trigger-recommendations", ...)` to queue recommendation generation as an independent Inngest execution. This keeps monitoring + recommendations decoupled — if recommendation generation fails, it doesn't affect the monitoring run status.

### 7 Inngest functions now registered

`/api/inngest` serves: `runFreeAudit`, `syncCatalog`, `generateQueries`, `runMonitoring`, `scheduleMonitoring`, `generateRecommendations`.

### API routes

**`POST /api/stores/[id]/recommendations/generate`**
- Ownership-verified
- Fires `recommendations/generate.requested` event
- Returns immediately; LLM generation happens in background

**`GET /api/recommendations?store_id=X&status=pending`**
- Auth-gated (user ownership via `stores!inner(user_id)`)
- `status` filter: pending | approved | applied | dismissed
- Returns newest first

**`PATCH /api/recommendations/[id]`**
- Auth-gated (ownership verified)
- Accepts `{ status: "pending" | "approved" | "applied" | "dismissed" }`
- Sets `applied_at` timestamp automatically when `status = "applied"`

### StoreCard: "Get recommendations" button

Added `Lightbulb` button to StoreCard alongside monitoring and query generation. Fires the manual trigger endpoint. Message confirms the background job started.

### Recommendations page (`/recommendations`) → `RecommendationsClient`

**State:** `recs[]`, `loading`, `storeId`, `activeTab`, `generating`, `genMsg`

**UI layout:**
1. Store selector + Refresh + "Generate recommendations" button
2. **Status tab bar**: Pending / Approved / Applied / Dismissed
3. Empty state per tab (with CTA to generate if on pending tab)
4. **`RecCard`** per recommendation:
   - Type badge (color-coded: description_rewrite=blue, schema_markup=purple, content_topic=green, review_site=orange, feature_gap=yellow)
   - Title + rationale text
   - Expected impact (right-aligned italic)
   - Collapsible "Show details" section with current_value (gray) and suggested_value (primary-tinted)
   - Action buttons: Approve + Dismiss (pending), Mark as applied + Dismiss (approved), "Applied on date" label (applied), Restore button (dismissed)
   - Optimistic removal from current tab after status change

## Decisions

### Delete-then-insert for pending recommendations
Each monitoring run regenerates recommendations based on fresh data. Old pending recommendations become stale — keeping them alongside new ones would be confusing. Deleting `status: "pending"` before inserting preserves `approved` / `applied` / `dismissed` records (user intent), while replacing stale pending suggestions.

### Losing queries: response text substring match
Rather than a complex join (query_runs LEFT JOIN mentions WHERE mentions.id IS NULL), a simpler approach: fetch 30 recent query_runs for the store, filter client-side by whether the response text contains the brand name or any alias. Fast, requires no complex SQL, and correctly handles multi-provider runs.

### `temperature: 0.3` for recommendations
Unlike mention extraction (temperature 0 for determinism), recommendations benefit from some variation — different runs should suggest different angles. 0.3 gives variety without hallucination.

### Independent Inngest function vs inline step
Making `generateRecommendations` a separate Inngest function (not a step inside `runMonitoring`) means:
- It can be triggered manually without running monitoring
- Failures don't affect monitoring run status
- Inngest retries are independent
- Can be triggered on-demand from the StoreCard

### Status tabs instead of filters
Four tabs (Pending/Approved/Applied/Dismissed) give a clear workflow — items graduate from left to right. Simpler than combined filters; each tab represents a distinct action state.

### Rec type as a database enum (check constraint)
5 fixed types allow structured filtering and color-coding in the UI. Open-ended text would make consistent display impossible. New types can be added via migration.

## Open questions / deferred

- **Product-specific recommendations**: `product_id` column exists in schema but all generated recommendations have `product_id: null`. Phase 10 (Auto-apply) needs specific product IDs to push changes. Deferred — Phase 10 will implement a product-matching step during apply.
- **Recommendation deduplication**: If the same suggestion appears in two consecutive monitoring runs, it gets replaced (delete-then-insert of pending). Approved/applied ones are preserved. No fuzzy dedup of similar titles.
- **Email notification on new recommendations**: When fresh recommendations are generated, notify the user by email. Deferred to Phase 12.
- **Recommendation quality scoring**: No feedback loop on which recommendations actually improved the score. Phase 11+ could compare visibility snapshots before/after applying a recommendation.
- **Rate limiting for manual generation**: The `/api/stores/[id]/recommendations/generate` endpoint has no rate limit. Deferred to Phase 11 (billing gating — limit manual triggers by plan tier).
