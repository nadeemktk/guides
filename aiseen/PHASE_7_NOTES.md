# Phase 7 — Detection + Parsing: Notes & Decisions

## What was built

### Mention extractor (`src/lib/monitoring/extractor.ts`)

**`extractMentionDetails(responseText, brandName, brandAliases, productTitles)`**
- Reuses the existing `MENTION_EXTRACTION_PROMPT` from `src/lib/llm`
- Calls Claude Haiku (`claude-haiku-4-5-20251001`) via Vercel AI SDK `generateText`
- Parses the JSON block from the model response with a regex match (`/\{[\s\S]*\}/`)
- Extracts and validates: `own_brand_mentioned`, `own_brand_position`, `own_brand_description`, `own_brand_reasons[]`, `own_brand_sentiment`, `competitors[]`
- Falls back to a zero-value `FALLBACK` object if no API key, empty response, or JSON parse failure
- `maxOutputTokens: 1024`, `temperature: 0` — deterministic, minimal output

### Runner updates (`src/lib/monitoring/runner.ts`)

**`BatchSummary`** — new field: `ownBrandMentionData: OwnBrandMentionData[]`

**`OwnBrandMentionData`** — `{ mentionId: string; responseText: string }`

**`processBatch()`** changes:
- Mentions insert now uses `.select("id, entity_type")` to get back inserted row IDs
- Collects own-brand mention IDs + the LLM response text that produced them
- Returns `ownBrandMentionData[]` in the `BatchSummary` for downstream enrichment

### Enrichment step in `runMonitoring` (`src/lib/inngest/functions/runMonitoring.ts`)

New step: **`enrich-mentions`** (runs after all batch processing, before `finalize`)
1. Fetches up to 50 product titles for the store (for LLM context)
2. For each own-brand mention collected from all batches, calls `extractMentionDetails()`
3. Updates the `mentions` row with `description_in_response` and `reasons_cited`
4. Returns `{ enriched: N }` — skipped entirely if no own-brand mentions were found

Result: `description_in_response` and `reasons_cited` are now populated in the mentions table for all own-brand mentions.

### API routes

**`GET /api/mentions`**
- Auth-gated (user ownership via `stores!inner(user_id)` join)
- Filters: `store_id`, `provider` (via `query_runs.provider`), `sentiment`
- Returns last 100 own-brand mentions, newest first
- Joins `query_runs` → `queries` to include provider info and query text

**`GET /api/competitors`**
- Auth-gated (user ownership via `stores!inner(user_id)` join)
- Filters: `store_id`
- Returns all competitors ordered by `mention_count DESC`

### Dashboard pages

**Mentions page (`/mentions`)**
- Server component fetches user's stores; passes to `MentionsClient`
- `MentionsClient` — store selector, provider filter, sentiment filter, refresh button
- Each mention card shows: provider badge, category, position, sentiment chip, query text, LLM description, reasons-cited tags
- Falls back gracefully to context_snippet when description_in_response is absent (older runs)

**Competitors page (`/competitors`)**
- Server component fetches user's stores; passes to `CompetitorsClient`
- `CompetitorsClient` — store selector, refresh button
- Ranked list with percentage-width progress bars relative to most-mentioned competitor
- Mention count shown per competitor

## Decisions

### Reuse MENTION_EXTRACTION_PROMPT instead of a new prompt
The Phase 1 free-audit pipeline already defined and tested a structured extraction prompt. Reusing it ensures consistent JSON schema and avoids prompt drift between the audit and monitoring pipelines.

### Enrich after all batches, not per-batch
Fetching product titles once (for LLM context) rather than once per batch reduces DB reads from N to 1. Also keeps batch steps lean and fast for Inngest checkpointing.

### Regex JSON extraction (`/\{[\s\S]*\}/`)
The Haiku model sometimes wraps JSON in markdown fences. The regex extracts the first JSON object regardless of surrounding text, which is more robust than strict parsing.

### Separate `enrich-mentions` step skippable
If `allOwnBrandMentionData.length === 0`, the enrichment step is skipped entirely. This avoids the Anthropic API call when no own-brand mentions were found in a monitoring run (e.g. brand is not yet visible in AI responses).

### Enrichment updates existing rows, not upsert
The mention row already exists (inserted in `processBatch`). A targeted `.update()` on the row `id` is simpler and avoids the risk of creating duplicate rows.

### `/api/mentions` returns only `entity_type: "own_brand"`
Competitor mentions are raw names with no enrichment; they're aggregated into the `competitors` table. The mentions UI is focused on own-brand mentions where context, reasons, and sentiment are actionable.

## Open questions / deferred

- **Competitor mention details**: Competitor mentions don't have description/reasons; they only contribute to aggregate counts. Phase 8+ could add competitor-specific context extraction.
- **Enrichment failures are silent**: If `extractMentionDetails()` returns the FALLBACK, the mention row is updated with `null` values, which is indistinguishable from "not yet enriched". A separate `enriched_at` timestamp could disambiguate. Deferred.
- **Rate limiting during enrichment**: With many own-brand mentions, the enrichment step calls Haiku sequentially. At 50 RPM this is fine for typical stores (<30 own-brand mentions per run). High-volume stores could benefit from batched enrichment calls. Deferred to Phase 11 hardening.
- **Pagination on `/api/mentions`**: Currently returns last 100, newest first. Phase 8 dashboard will add cursor-based pagination if needed.
