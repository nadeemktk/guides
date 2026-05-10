# Phase 1 Notes — Marketing Site + Free Audit Lead Magnet

**Completed:** 2026-05-10  
**Branch:** claude/review-project-spec-4u8l3

---

## What was built

### Pages
- **`/`** — Full landing page: hero with URL input CTA, 5-provider strip, feature blocks (Track/Diagnose/Fix), how-it-works, social proof cards, pricing preview, FAQ accordion, bottom CTA
- **`/pricing`** — Three-tier cards (Starter/Growth/Pro) with feature checklist, feature comparison table, free audit CTA
- **`/blog`** — Listing page with cards per post (date, category, read time)
- **`/blog/[slug]`** — Full post page with prose styling and embedded audit CTA
- **`/free-audit`** — URL input form with validation
- **`/free-audit/[id]`** — Live result page with polling (2.5s interval), progress display, score gauge, winning/losing queries, email gate, competitor table, all-queries table

### Blog posts (3 sample posts)
1. `ai-search-visibility-guide.md` — Strategy guide (8 min read)
2. `shopify-llm-optimization.md` — Technical Shopify guide (6 min read)
3. `perplexity-vs-chatgpt-ecommerce.md` — Research post (5 min read)

### Free audit backend
- **Scraper** (`src/lib/audit/scraper.ts`) — Shopify `/products.json` endpoint first, then generic HTML scraper fallback. Extracts brand name from vendor field or meta tags.
- **Query generator** (`src/lib/audit/queryGenerator.ts`) — Claude Haiku generates 25 categorized queries. Falls back to 25 template queries if no API key.
- **LLM runner** (`src/lib/audit/llmRunner.ts`) — Calls OpenAI (gpt-4o-mini), Gemini (gemini-2.5-flash), Perplexity (sonar) in parallel. Returns mock responses if no API keys configured.
- **Mention detector** (`src/lib/audit/mentionDetector.ts`) — Lexical detection with brand alias variants, position extraction, sentiment detection from surrounding context.
- **Scorer** (`src/lib/audit/scorer.ts`) — Implements visibility score formula from spec. Outputs winning/losing queries, top competitors, per-provider breakdown.
- **Orchestrator** (`src/lib/audit/index.ts`) — Runs all steps with progress callbacks for DB updates.

### API routes
- `POST /api/audits` — Creates `public_audits` record, dispatches `audit/run.requested` Inngest event
- `GET /api/audits/[id]` — Returns audit status + summary (polled by client)
- `POST /api/audits/[id]/unlock` — Accepts email, marks report unlocked, sends Resend email

### Inngest function
- `runFreeAuditFunction` — Full async audit pipeline: scrape → generate queries → run LLMs (batches of 5) → detect mentions → score → store results → send email

### Infrastructure fixes from Phase 0
- Resend client made lazy-init (was crashing at build time without API key)
- Stripe client already lazy (from Phase 0)
- AI SDK v6: `maxTokens` → `maxOutputTokens`
- `@tailwindcss/typography` added for blog prose styles
- Inngest `createFunction` updated to v4 API (2 args with `triggers` array in config)

---

## Decisions made

1. **Polling vs SSE for live results:** Used 2.5s polling from the result page rather than SSE. Simpler, more reliable across Vercel edge, and still delivers good "progressive" UX.
2. **Email gate timing:** Shows score + 3 winning + 3 losing queries before gate appears (as spec requires — "AFTER showing genuine value").
3. **Mock mode:** If no LLM API keys are set, the runner returns mock responses that demonstrate the UI. This allows testing the full flow without credentials.
4. **Blog:** Used gray-matter + remark for markdown rendering (server-side, no client bundle cost).
5. **`serverActions.bodySizeLimit`:** Left under `experimental` (where it was) since Turbopack build complains about top-level options it doesn't know.

---

## Open questions / deferred

1. **Inngest in dev:** Need `npx inngest-cli@latest dev` running locally for the audit background job to execute. Without it, the audit will sit at "pending" status. Alternative: implement a synchronous fallback route for dev.
2. **Supabase required for audit result page:** The result page fetches from the DB. Without Supabase credentials, it shows a "setup required" message.
3. **Email delivery domain:** `reports@aiseen.com` and `hello@aiseen.com` need to be verified in Resend before sending.
4. **Rate limiting on `/api/audits`:** Not yet wired to Upstash Redis. Should add IP-based rate limiting (3 audits per IP per 24h) before production.
5. **`/login` and `/signup` routes:** Referenced in Nav + pricing CTAs but not yet built. Will be Phase 2.

---

## What's next: Phase 2
- Sign up / log in pages (Supabase Auth email + Google OAuth)
- Onboarding wizard (platform select → store connect → brand confirm)
- Dashboard shell with sidebar navigation
