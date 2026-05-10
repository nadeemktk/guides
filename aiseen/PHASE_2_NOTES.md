# Phase 2 — Auth + Onboarding: Notes & Decisions

## What was built

### Auth system
- **6 server actions** in `src/lib/auth/actions.ts`:
  - `signInWithEmail` — signs in and redirects to `/overview` (or `{ error }` on failure)
  - `signUpWithEmail` — creates account and returns `{ success }` for confirmation UX
  - `signInWithGoogle` — triggers Supabase OAuth flow, redirect param supported
  - `signOut` — clears session and redirects to `/`
  - `getSession` — returns current session (safe to call in Server Components)
  - `getUser` — returns authenticated user or null
- **AuthForm** (`"use client"`) — shared component for login and signup; Google SSO button with inline SVG (lucide-react has no `Chrome` icon); `useTransition` for non-blocking submits; conditional fields (fullName for signup, forgot-password link for login)
- **Auth route group** `(auth)/` — centered card layout with logo; login page reads `redirectTo` from searchParams; signup page reads `plan` param (reserved for billing post-signup)

### Dashboard shell
- **Sidebar** — sticky left nav with primary routes (overview, queries, mentions, competitors, trends, recommendations) and bottom secondary routes (settings, billing); active-route highlight via `usePathname`
- **UserMenu** — user avatar + email + sign-out button; appended below sidebar in layout
- **DashboardLayout** — `src/app/(dashboard)/layout.tsx` — checks `getUser()` server-side, redirects to `/login` if unauthenticated; renders sidebar + UserMenu in a sticky column

### Dashboard pages (8 stubs)
All pages in `src/app/(dashboard)/` with empty states and placeholder sections:
- `/overview` — 4 stat card placeholders + empty state
- `/queries` — empty state
- `/mentions` — empty state
- `/competitors` — empty state
- `/trends` — empty state
- `/recommendations` — empty state
- `/settings` — profile, notifications, danger zone sections (all stubbed)
- `/billing` — current plan badge, payment method placeholder, invoices list

### Onboarding wizard
- `src/app/onboarding/page.tsx` — server component, redirects to `/login` if unauthenticated
- `src/components/onboarding/OnboardingWizard.tsx` — 3-step `"use client"` wizard:
  1. **Platform select** — Shopify / Amazon / WooCommerce / Other (4 cards)
  2. **Store URL** — validated with `new URL()`, auto-prefixes `https://`
  3. **Brand details** — brand name + optional aliases (comma-separated)
- On finish: inserts a row into `stores` via Supabase browser client, then pushes to `/overview`
- Maps `"other"` platform → `"manual"` for DB compatibility

### New UI components
- `avatar.tsx` — Radix Avatar (Root, Image, Fallback)
- `select.tsx` — Full Radix Select with scroll buttons
- `tabs.tsx` — Radix Tabs
- `tooltip.tsx` — Radix Tooltip

### Blog dependencies installed
`gray-matter`, `remark`, `remark-html`, `@tailwindcss/typography` — all were referenced in Phase 1 code but not installed.

## Decisions

### Google icon — inline SVG
`lucide-react` does not export a `Chrome` icon (removed upstream). Used an inline brand-color Google SVG in the auth form instead of a third-party icon package.

### Platform type mapping
The wizard exposes `"other"` as a user-facing option (clearer UX) and maps it to `"manual"` before the DB insert (matching the `Platform` enum in the schema). The local `Platform` type in the wizard is intentionally separate from the DB enum.

### Supabase `as any` for store insert
Same pattern as the Stripe webhook handler — the hand-authored `Database` type doesn't perfectly satisfy the Supabase client's internal generic constraints. Cast to `any` for the insert; regenerate with `supabase gen types typescript` once the project is linked.

### Dashboard layout structure
`Sidebar` component renders nav links only (no layout CSS). The `(dashboard)/layout.tsx` owns the sticky column + height so it can also slot in `UserMenu` at the bottom without Sidebar needing to know about it.

## Open questions / deferred

- **Store auto-scrape on wizard completion**: The wizard saves the store URL but doesn't trigger an initial catalog sync. Phase 3 (Store connections) will add the Inngest event that kicks off `catalog/sync.requested` after onboarding completes.
- **Signup confirmation email flow**: `signUpWithEmail` returns `{ success }` and shows a "check your email" banner. The redirect after email confirmation hits `/api/auth/callback` which exchanges the code and redirects to `/onboarding`. This is only testable with a live Supabase project.
- **Password reset**: `/auth/reset-password` route not yet built. The "Forgot password?" link in AuthForm points to `#` as a placeholder. Will be added in a later phase.
- **Rate limiting on auth routes**: IP-based rate limiting for `/login` and `/signup` not yet applied. Can be added via the existing `rateLimiters` in Phase 11 (billing/hardening).
- **Sentry deprecation warnings**: `disableLogger` and `automaticVercelMonitors` options deprecated in Sentry Next.js SDK. Non-breaking; will update in Phase 12 polish.
