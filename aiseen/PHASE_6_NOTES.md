# Phase 6 — Multi-LLM Monitoring: Notes & Decisions

## What was built

### Monitoring batch runner (`src/lib/monitoring/runner.ts`)

**`processBatch(queries, storeId, brandName, brandAliases)`**
- Loops over each query in the batch; for each, calls `runQueryAgainstProviders()` in parallel across all 3 providers (OpenAI gpt-4o-mini, Gemini 2.5 Flash, Perplexity Sonar)
- Per LLM result: inserts a `query_runs` row, then calls `detectMention()` for own-brand detection
- Writes `mentions` rows for both own-brand mentions (`entity_type: "own_brand"`) and competitor mentions (`entity_type: "competitor_brand"`)
- Returns `BatchSummary` including the `QueryResult[]` array for scoring

**`finalizeMonitoringRun(storeId, allQueryResults)`**
- Upserts to `competitors` table with cumulative `mention_count` (fetches existing counts, adds new mentions from this run, upserts merged values — avoids resetting historical data)
- Calls `computeScore()` from Phase 1's scorer with all results
- Upserts one `visibility_snapshots` row for today's date (`onConflict: "store_id,snapshot_date"` — re-running same day overwrites rather than duplicating)
- Returns the computed `visibilityScore`

### Inngest `runMonitoring` function (`src/lib/inngest/functions/runMonitoring.ts`)
Event: `monitoring/run.requested` — receives `{ storeId: string }`

Steps:
1. `load-store-queries` — loads store details + all active queries for the store
2. `process-batch-N-of-M` — processes 5 queries per step; each step is independently checkpointed by Inngest
3. `cool-down-N` — `step.sleep("8s")` between batches to respect provider rate limits
4. `finalize` — calls `finalizeMonitoringRun()` to upsert competitors and save snapshot

Concurrency: max 3 monitoring runs globally in parallel (prevents thundering-herd on LLM APIs during daily cron).
Retries: 1 (query_run inserts are idempotent via step replay; monitoring for the same store twice in a day overwrites the snapshot).

### Inngest `scheduleMonitoring` cron function (`src/lib/inngest/functions/scheduleMonitoring.ts`)
Cron: `"0 6 * * *"` (6:00 AM UTC daily)

Steps:
1. `fetch-active-stores` — queries stores joined with queries (`queries!inner`) to find stores with ≥1 active query; deduplicates store IDs
2. `fan-out-monitoring` — `step.sendEvent()` with an array of `monitoring/run.requested` events, one per store; Inngest fans these out as independent executions

### Manual trigger (`POST /api/stores/[id]/monitor`)
- Ownership-verified
- Returns 422 if no active queries exist (prevents empty runs)
- Returns active query count in response for UX feedback

### StoreCard updated
Added "Run monitoring" button (Play icon) alongside Sync catalog, Generate queries, and Test connection.

### All 5 Inngest functions registered
`/api/inngest` now serves: `runFreeAudit`, `syncCatalog`, `generateQueries`, `runMonitoring`, `scheduleMonitoring`.

## Decisions

### Batch size of 5 with 8s cool-down
5 queries × 3 providers = 15 LLM calls per batch. At ~2-3s per call (parallel), each batch takes ~5-8s. The 8s cool-down between batches keeps the per-minute call rate well below the most restrictive limit (Anthropic: 50 RPM). For a 60-query store: 12 batches × ~15s = ~3 minutes total.

### `step.sleep()` between batches instead of rate limiter
The existing Upstash rate limiters were built for per-request server actions. Within an Inngest step, using Redis for rate limiting would add network round-trips and complexity. A fixed 8s sleep is simpler and predictable. Phase 11 hardening can replace this with the Upstash rate limiter if needed.

### Competitors: fetch-then-upsert for cumulative counts
Unlike the competitors table's `mention_count`, which should accumulate over time, a naive upsert would reset it to the current run's count. The runner fetches existing counts first, adds new mentions, then upserts the merged value. This is 1 SELECT + 1 upsert (not N queries), keeping it efficient even with 20+ competitors.

### Visibility snapshots: one per store per day
`UNIQUE(store_id, snapshot_date)` means re-running monitoring same day overwrites the snapshot (the most recent run wins). This is intentional: daily snapshots are the unit of trend data, and running multiple times a day produces the most up-to-date score for that day.

### Mock responses in development
`runQueryAgainstProviders()` (from Phase 1) falls back to mock responses when no API keys are configured. This means the full monitoring pipeline works locally without credentials — query_runs and mentions are written with mock data, and a real visibility score is computed from that mock data.

### Cron time: 6:00 AM UTC
Chosen to run before typical US business-hours traffic, giving dashboard users fresh data by morning. Can be changed to any cron expression without code changes.

## Open questions / deferred

- **Per-store monitoring schedule**: Currently all stores are monitored at the same time. Pro/Growth tiers could get more frequent monitoring (e.g., 2×/day) — Phase 11 billing gating.
- **Provider failures don't stop the run**: If one provider fails (e.g., Perplexity is down), that `query_run` row gets `status: "failed"` and the run continues with the other providers. Score is computed from available results only. This is the correct graceful degradation behavior.
- **`reasons_cited` and `description_in_response` in mentions**: These fields are in the schema but not populated — Phase 7 (Detection + Parsing) will enhance the mention extraction to populate them using a structured LLM extraction pass.
- **Rate limiting per user/tier**: The cron fan-out sends all stores to monitoring simultaneously. High-tier users could be prioritized or given more frequent runs. Deferred to Phase 11.
- **Snapshot backfill**: First run populates today's snapshot. Historical data before the first run is empty — trends chart will start flat. No backfill mechanism.
