# Phase 3 — Store Connections: Notes & Decisions

## What was built

### Platform clients (`src/lib/stores/`)
- **shopify.ts** — `normalizeShop()`, `isValidShopDomain()`, `getShopifyAuthUrl()` (builds OAuth authorize URL with `read_products,read_inventory` scopes), `verifyShopifyHmac()` (timing-safe comparison), `exchangeShopifyCode()` (permanent token exchange), `testShopifyConnection()` (hits `/admin/api/2024-04/products.json`)
- **amazon.ts** — `AMAZON_MARKETPLACES` lookup (10 marketplaces across NA/EU/FE), `exchangeAmazonRefreshToken()` (LWA token endpoint), `testAmazonConnection()` (wraps token exchange as a live credential check)
- **woocommerce.ts** — `testWooCommerceConnection()` (GET `/wp-json/wc/v3/products?per_page=1` with Basic auth, 8s timeout)

### Shopify OAuth flow (full implementation)
- `GET /api/stores/shopify/auth` — validates shop domain, generates CSRF nonce stored in `shopify_oauth_state` cookie (5-min TTL), redirects to Shopify OAuth page
- `GET /api/stores/shopify/callback` — verifies CSRF state from cookie, verifies Shopify HMAC signature, exchanges code for permanent access token, upserts store row in DB, redirects to `/stores?connected=shopify`
- HMAC verification uses `timingSafeEqual` to prevent timing attacks

### Amazon SP-API credential storage
- `POST /api/stores/amazon/connect` — validates 5 required fields, calls `testAmazonConnection()` (live LWA token exchange) before saving; creates or updates store row
- Credentials stored: `seller_id`, `marketplace_id`, `lwa_client_id`, `lwa_client_secret`, `lwa_refresh_token`

### WooCommerce credential storage
- `POST /api/stores/woocommerce/connect` — validates URL + key/secret, tests connection by hitting the WC REST API, creates or updates store row
- Auto-prefixes `https://` if missing from URL

### Stores CRUD API
- `GET /api/stores` — lists all stores for the authenticated user (excludes `api_credentials` from response)
- `DELETE /api/stores/[id]` — ownership-verified delete
- `PATCH /api/stores/[id]` — allowlist-gated update (`brand_name`, `brand_aliases`, `is_active`, `store_name`)
- `POST /api/stores/[id]/test` — dispatches to correct platform tester based on stored `platform` field

### Dashboard — Stores page
- `src/app/(dashboard)/stores/page.tsx` — server component; reads `connected` and `error` query params from Shopify OAuth callback to show flash messages
- `StoreManager` — client container; handles empty state (shows all 3 connect buttons) and populated state (store cards + "add another" section)
- `StoreCard` — per-store card showing platform, URL, brand name, sync date; Test connection button with inline pass/fail feedback; Reconnect button (appropriate to platform); Remove button with confirm dialog
- `ConnectShopify` — Dialog with shop name input; on submit, redirects browser to OAuth auth route
- `ConnectAmazon` — Dialog with marketplace select + 4 credential fields; POSTs to API, shows "Testing…" during live credential check
- `ConnectWooCommerce` — Dialog with URL + key/secret fields; same live-test pattern

### UI — Dialog component
Added `src/components/ui/dialog.tsx` (Radix Dialog — already in dependencies, just not wired up).

### Sidebar updated
Added "Stores" link (ShoppingBag icon) between Overview and Queries.

### Onboarding redirect updated
After the 3-step onboarding wizard completes, users now land on `/stores` (was `/overview`) so they can immediately connect their platform credentials.

## Decisions

### Shopify: HMAC verification before token exchange
Shopify's OAuth flow provides an HMAC signature over all callback query params. Verifying it before calling the token exchange endpoint prevents attackers from constructing fake callback URLs. We additionally verify the CSRF nonce from the cookie.

### Amazon: LWA token exchange as connection test
The only way to verify Amazon credentials without making a full SP-API request (which requires AWS SigV4 signing) is to exchange the refresh token for an access token via the LWA endpoint. If that succeeds, credentials are valid. Full SP-API calls (catalog reads) are deferred to Phase 4.

### Credential storage: plaintext JSON in `api_credentials`
Credentials are stored as JSONB in `stores.api_credentials`. Access is restricted by Supabase RLS (only the owning user can read their own stores, and API routes double-check `user_id` before any operation). Production hardening should move secrets to a dedicated secrets manager (AWS Secrets Manager, Doppler) or encrypt at the application layer using `SUPABASE_SERVICE_ROLE_KEY`-gated encryption before Phase 12.

### `api_credentials` omitted from GET /api/stores response
The list endpoint deliberately excludes the credentials field to avoid leaking tokens to the browser. The `[id]/test` route reads credentials server-side only.

### Stores page redirect from onboarding
The onboarding wizard previously redirected to `/overview`. Changed to `/stores` so users immediately complete the connection flow after account setup — the natural next step.

## Open questions / deferred

- **Shopify webhook registration**: After OAuth, we should register a `products/update` webhook so the catalog stays fresh without polling. Deferred to Phase 4.
- **Amazon SP-API SigV4 signing**: The actual catalog call (`GET /catalog/2022-04-01/items`) requires AWS SigV4 request signing. Not implemented here — Phase 4 will add this using a lightweight signing helper.
- **Token refresh**: Shopify permanent tokens don't expire. Amazon LWA access tokens expire in 1h — Phase 4's catalog sync will handle refresh. WooCommerce keys don't expire.
- **Multi-store per platform**: The UI allows connecting multiple stores per platform. The monitoring engine in Phase 6 will need to fan out queries across all active stores.
- **Credential encryption**: See note above — plaintext storage is acceptable for MVP with RLS; encrypt before launch in Phase 12.
