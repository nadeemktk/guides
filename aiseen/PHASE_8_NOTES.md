# Phase 8 — Visibility Dashboard: Notes & Decisions

## What was built

### API routes

**`GET /api/overview?store_id=X`**
- Returns all dashboard stats in a single request using `Promise.all` (5 parallel DB queries):
  - Latest `visibility_snapshots` row: score, queries_run, queries_with_mention, avg_position, share_of_voice, by_provider
  - Week-ago snapshot (closest snapshot ≤7 days ago): for score delta calculation
  - Own-brand mention count (COUNT query, no rows returned)
  - Active query count (COUNT query)
  - Competitor count (COUNT query)
- Verifies store ownership before returning data

**`GET /api/snapshots?store_id=X&days=30`**
- Returns visibility_snapshots ordered by `snapshot_date ASC` within the requested window
- `days` defaults to 30; supports 7, 30, 90
- Returns all columns needed for the chart + provider breakdown table

### Chart component (`src/components/charts/VisibilityLineChart.tsx`)
- Recharts `LineChart` wrapped in `ResponsiveContainer` (height 260)
- X-axis: formatted `snapshot_date` (short month + day), `preserveStartEnd` interval
- Y-axis: fixed domain `[0, 100]`, 30px wide
- `connectNulls` — handles gaps when monitoring didn't run every day
- Uses CSS custom properties (`hsl(var(--primary))`, `hsl(var(--border))`) so it respects the theme

### Overview page (`/overview`) → `OverviewClient`

**State:** `data: OverviewData | null`, `loading`, `storeId`

**UI layout:**
1. Store selector + refresh button
2. Empty states: no stores connected → link to /stores; no monitoring data → link to /stores
3. **4 stat cards** (when data available):
   - Visibility Score — large number + DeltaBadge (▲/▼ vs last week)
   - Total Mentions — links to /mentions
   - Active Queries — links to /queries
   - Competitors Tracked — links to /competitors
4. **2-column panel:**
   - Left: ScoreGauge — colored number (green ≥60, yellow ≥35, red <35) + full-width progress bar + last-run date
   - Right: Provider breakdown bars (by_provider JSON) + sub-metrics (avg_position, share_of_voice)
5. Teaser row linking to /trends

**`DeltaBadge`** — inline component: shows `+X.X vs last week` in green, `-X.X` in red, or "No change" neutral

### Trends page (`/trends`) → `TrendsClient`

**State:** `snapshots[]`, `loading`, `storeId`, `days`

**UI layout:**
1. Store selector + days selector (7/30/90) + refresh button
2. Empty state (no snapshots)
3. **3 summary stat cards:** Current Score, Change (Δ over selected window), Data points
4. **Recharts LineChart** of `visibility_score` over `snapshot_date`
5. **Provider breakdown bars** from latest snapshot's `by_provider` (colored: ChatGPT=emerald, Gemini=blue, Perplexity=purple)

## Decisions

### Single `/api/overview` endpoint with parallel queries
Five `Promise.all` queries instead of 5 sequential round-trips. At typical Supabase latency (~20ms per query), parallel saves ~80ms vs sequential. The endpoint returns everything the Overview page needs in one call.

### Score delta: 7-day lookback with `≤` not `=`
Monitoring doesn't necessarily run every day (depends on tier/manual runs). Using `lte("snapshot_date", <7 days ago>).limit(1).order(desc)` finds the closest available snapshot before 7 days ago, making the delta meaningful even with gaps.

### `connectNulls` on the line chart
Users may miss a day's monitoring run. Without `connectNulls`, the chart shows breaks; with it, the line interpolates across gaps — better UX for sparse data.

### Color thresholds: ≥60 green, ≥35 yellow, <35 red
Mirrors the free audit page's score interpretation. Users who've seen the free audit report will recognize the same color coding in the dashboard.

### `hsl(var(--*))` in chart styles
Recharts inline styles don't inherit Tailwind classes. Using CSS custom properties (`hsl(var(--primary))`, `hsl(var(--border))`) ensures the chart respects dark/light theme without custom Recharts themes.

### Snapshot windowing in `/api/snapshots`
Computes `since = today - days` in the server. Returning ASC order means the chart renders left-to-right without client-side sorting. The client only controls `days` via a select.

## Open questions / deferred

- **Recharts SSR**: Recharts is a client-only library; all chart components are `"use client"`. This is correct — no server-side chart rendering. Potential hydration flicker on first load is acceptable.
- **Cumulative metric display**: `total_queries_run` from the snapshot is the count for that run only. A cumulative "total queries ever run" stat would require summing all snapshots — deferred as the per-run count is more actionable.
- **Historical backfill message**: The first monitoring run creates the first snapshot. Trend chart starts with a single point — only becomes a "trend" after ≥2 runs. A tooltip or empty state message explaining this is deferred to Phase 12 polish.
- **Time zone handling**: `snapshot_date` is stored as a date string (YYYY-MM-DD UTC). Chart labels format as `new Date(date + "T00:00:00")` which resolves in local timezone — minor offset for non-UTC users. Deferred.
- **Provider scores in by_provider**: The scorer computes per-provider sub-scores from the audit. Format is `{ openai: 42.3, gemini: 61.1, perplexity: 38.9 }`. The overview and trends pages handle missing keys gracefully.
