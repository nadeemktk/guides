# Phase 11 — Billing + Feature Gating: Notes & Decisions

## What was built

### Plan limits (`src/lib/billing/gate.ts`)

**`PLAN_LIMITS`** matrix:

| Feature | Free | Starter | Growth | Pro |
|---------|------|---------|--------|-----|
| Stores | 1 | 1 | 3 | ∞ |
| Queries | 25 | 100 | 500 | 2000 |
| Monitoring | ✗ | ✓ | ✓ | ✓ |
| Recommendations | ✗ | ✗ | ✓ | ✓ |
| Auto-apply | ✗ | ✗ | ✗ | ✓ |

**`getUserProfile(userId)`** — fetches tier + stripe fields from profiles.

**`checkGate(userId, feature)`** — checks a boolean feature gate. Returns `{ allowed, reason, upgradeTo }`. `upgradeTo` is the lowest tier that unlocks the feature (found by scanning PLAN_LIMITS in order).

**`checkStoreLimit(userId)`** — counts active stores vs plan limit. Returns same `GateResult` shape. Infinity tier (Pro) always passes. `store_id` optional param for reconnect flows (reconnect doesn't count as a new store).

### API routes

**`POST /api/billing/checkout`** — body: `{ priceId: string }`
- Gets or creates Stripe customer (stores `stripe_customer_id` in profiles)
- Creates a subscription checkout session with `allow_promotion_codes: true`
- Returns `{ url }` — client redirects browser

**`POST /api/billing/portal`** — no body
- Requires existing `stripe_customer_id`
- Creates a Stripe Customer Portal session
- Returns `{ url }` for managing subscription, payment method, invoices, cancellation

**`GET /api/billing/status`**
- Returns tier, status, periodEnd, hasStripeCustomer, usage (stores/queries with limits), and feature flags
- Uses `Promise.all` for 3 parallel queries

### Feature gates added to API routes

| Route | Gate |
|-------|------|
| `POST /api/stores/[id]/monitor` | `monitoring` — starter+ |
| `POST /api/stores/[id]/recommendations/generate` | `recommendations` — growth+ |
| `POST /api/recommendations/[id]/apply` | `autoApply` — pro only |
| `POST /api/stores/shopify/callback` (new store only) | `checkStoreLimit` |
| `POST /api/stores/woocommerce/connect` (new store only) | `checkStoreLimit` |
| `POST /api/stores/amazon/connect` (new store only) | `checkStoreLimit` |

All gates return HTTP 403 with `{ error, upgradeTo }` so the client can show targeted upgrade messaging.

### Billing page (`/billing`) → `BillingClient`

Server component fetches profile + usage data directly (no client API round-trip). Passes to `BillingClient` for interactivity.

**`BillingClient`** sections:
1. **Success banner** — shown when `?upgraded=1` is in the URL (Stripe checkout success redirect)
2. **Current plan card**: tier name + status badge + renewal date + feature flags (Monitoring / Recommendations / Auto-apply shown as green/gray chips) + "Manage subscription" → Stripe Portal button
3. **Usage meters** (`UsageMeter` component): Stores and Active queries — progress bar turns yellow at 80%, red at 100%
4. **Plan cards** (`PlanCard` component): rendered for starter/growth/pro from the `PLANS` config; current plan shows "Current plan" badge; lower plans show "Manage via billing portal" (no downgrade CTA — managed in portal); upgrade plans show checkout button. Hidden entirely when on Pro.

### Shopify OAuth scope

Updated in Phase 10 and noted here: `write_products` scope now requested. Existing tokens are read-only until the merchant reconnects.

## Decisions

### Gate at the API layer, not UI layer
UI-only gating (hiding buttons) is easily bypassed. All feature gates enforce at the API route level with HTTP 403. The UI reflects the gate but doesn't substitute for it.

### Reconnect = no new store → skip store limit check
When `store_id` is provided (reconnect flow), the WooCommerce and Amazon connect routes skip the `checkStoreLimit` call — they're updating credentials on an existing store row. Shopify callback handles this via the `existing.data?.id` branch.

### `upgradeTo` in gate errors
The gate functions return `upgradeTo: PlanTier` — the lowest tier that unlocks the feature. API responses include this so the client can show "Upgrade to Growth" rather than a generic "upgrade required" message. The StoreCard and RecommendationsClient don't yet consume this field; Phase 12 polish can wire it up.

### `?upgraded=1` flash message instead of session storage
Stripe checkout redirects to `success_url: /billing?upgraded=1`. The server component reads `searchParams.upgraded` and passes it to the client. This is simpler than session storage and works with SSR; the query param is present only on the immediate success redirect.

### Customer portal for billing management
Rather than building invoice display, payment method management, and cancellation flows, we delegate to Stripe Customer Portal. The portal is configured in the Stripe dashboard and handles: payment method updates, invoice downloads, subscription cancellation, plan changes. Only downgrade flows go through the portal.

### `allow_promotion_codes: true` in checkout
Enables Stripe's native coupon/promo code input at checkout. No extra code needed to support discount campaigns — just create promo codes in the Stripe dashboard.

### Plan cards don't show downgrade buttons
Downgrading from a higher plan is a retention concern — we don't want to make it one click. The portal handles it, which gives Stripe's built-in retention flows (pause, discount offer) a chance to run.

## Open questions / deferred

- **Free tier trial enforcement**: Currently there's no expiry check on the "free" tier — users stay on free indefinitely without time pressure. A `trial_ends_at` field and a cron job to send reminder emails could enforce the 14-day trial. Deferred to Phase 12.
- **In-app upgrade prompts**: When a gated action returns 403, the StoreCard shows the raw error message. Phase 12 should render targeted upgrade CTA dialogs based on the `upgradeTo` field.
- **Cron scheduling by tier**: The spec mentions Growth gets daily monitoring and Starter gets weekly. Currently all stores run on the same daily cron. Per-tier scheduling (filtering in `scheduleMonitoring.ts` by profile tier) is deferred to Phase 12.
- **Query count enforcement**: The `queryLimit` is shown in the UI but not enforced in the query generation Inngest function. Phase 12 should add a pre-generation check against the active query count.
- **Webhook idempotency**: Stripe can retry webhook events. The current handler is idempotent (UPDATE by `stripe_customer_id` is safe to repeat), but doesn't log webhook IDs. Adding a `processed_webhook_ids` set in Redis would prevent any edge-case double-processing.
- **Invoice display**: Currently deferred to the Stripe Customer Portal. If users want in-app invoice history, Phase 12 can use `stripe.invoices.list({ customer })` to fetch and display them.
