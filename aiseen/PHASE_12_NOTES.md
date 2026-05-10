# Phase 12 — Polish + Launch: Notes & Decisions

## What was built

### Real Settings page (`/settings`) → `SettingsClient`

**`PATCH /api/profile`** — updates `full_name` in the profiles table. Validates with zod (1–100 chars).

**`DELETE /api/profile`** — calls `supabase.auth.admin.deleteUser(userId)` via the service client, which cascades to all user data. Client is redirected to `/` after success.

**`SettingsClient`** sections:
1. **Profile**: Full name input with inline Save button; Email shown read-only with note that it cannot be changed here.
2. **Danger zone**: Account deletion button with a `confirm()` prompt before calling DELETE. Shows an error message if deletion fails.

Server component (`settings/page.tsx`) fetches `full_name` and `email` from the profiles table and passes them as props — no client-side API round-trip on load.

### Upgrade prompt dialogs (`UpgradeDialog`)

**`UpgradeDialog`** component (`src/components/dashboard/billing/UpgradeDialog.tsx`):
- Shown as a fixed overlay when a gated API call returns HTTP 403 with `upgradeTo` in the body
- Displays the feature name and lowest tier that unlocks it
- "View plans" button navigates to `/billing`; clicking outside or Cancel closes it

**Wired into:**
- `StoreCard` — `handleMonitor()` and `handleGenerateRecs()` now check `res.status === 403` and `data.upgradeTo`
- `RecommendationsClient` — `handleApply()` and `handleGenerate()` do the same

Previously these handlers just concatenated `Error: ${data.error}` into a plain text message. Now a modal dialog is shown with a direct path to the billing page.

### Tier-based cron scheduling (`scheduleMonitoring.ts`)

Two Inngest cron functions replace the single daily function:

| Function | Schedule | Tiers |
|---|---|---|
| `scheduleMonitoringFunction` | Daily 6 AM UTC (`0 6 * * *`) | Growth, Pro |
| `scheduleWeeklyMonitoringFunction` | Sundays 6 AM UTC (`0 6 * * 0`) | Starter |

Free-tier stores are not scheduled automatically — they can only trigger monitoring manually.

Both functions share a `fetchStoresByTiers(tiers)` helper that:
1. Fetches active stores with at least one active query
2. Fetches profiles for those stores' owners filtered by the given tiers
3. Returns the intersection (store IDs whose owner is on a qualifying tier)

Both registered in `src/app/api/inngest/route.ts`.

### Query limit enforcement (`generateQueries.ts`)

A new `check-query-limit` step runs before query generation:
1. Looks up the store's `user_id`
2. Fetches the owner's `subscription_tier` from profiles
3. Gets the `queries` limit from `PLAN_LIMITS[tier]`
4. Counts all active queries across the user's active stores (cross-store aggregate)
5. If `current >= limit`, returns `{ skipped: true, reason }` without generating

This makes the UI-visible query count meter in `/billing` a hard enforcement point for the background generation job.

## Decisions

### `confirm()` for account deletion — no custom dialog
The account deletion flow uses the browser's native `confirm()` instead of a custom modal. Two sequential confirms ("Are you sure?" then the actual trigger) provide the required friction without building a full dialog component. This is acceptable for a settings page where users navigate intentionally.

### `UpgradeDialog` as a portal-less fixed overlay
No `createPortal` needed because the dialog is rendered inside the full-page layout which has no `overflow: hidden` ancestor. The `z-50` class ensures it sits above the sidebar and content. If the layout ever gains an overflow container, move the render to a portal.

### Weekly cron for Starter, not a day-of-week check inside daily
Two separate cron functions (daily vs. weekly) is cleaner than checking `new Date().getDay() === 0` inside a single function. Inngest shows both as separate jobs in the dashboard, making scheduling transparent. It also prevents accidental Starter runs on non-Sunday daily triggers if the day-check logic were ever dropped.

### Cross-store query count aggregate
The query limit in `PLAN_LIMITS` is a per-user cap, not per-store. A user on the Starter plan (100 queries) should not be able to circumvent the limit by spreading queries across multiple stores. The enforcement in `generateQueries.ts` sums active queries across all the user's stores before deciding whether to generate more.

### Free tier: no cron scheduling, no generation block
Free-tier users are not scheduled in either cron function. They can still manually trigger monitoring and query generation from the store card. The query limit for free (25) is enforced by the `check-query-limit` step. This is intentional: a free user can explore the product but hits limits quickly, nudging them to upgrade.

## Open questions / deferred

- **Email change flow**: The Settings page shows a "contact support" note. A proper email change via Supabase OTP (`updateUser({ email })`) could be added in a future polish pass.
- **Notification preferences**: The stub section was removed from the settings page in favour of building what's actually useful. Email notification preferences (weekly digest, monitoring alerts) are deferred.
- **Trial enforcement**: `trial_ends_at` and a cron reminder job remain deferred. Free tier has no time expiry.
- **Webhook idempotency**: Still deferred — the webhook handler is safe to replay but doesn't log processed event IDs.
- **In-app invoice history**: Delegated to Stripe Customer Portal as decided in Phase 11.
