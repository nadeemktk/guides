# Phase 4 — Catalog Ingestion: Notes & Decisions

## What was built

### AWS SigV4 signer (`src/lib/aws/sigv4.ts`)
Pure Node.js implementation using `node:crypto` — no external AWS SDK dependency. Signs any HTTP request with AWS Signature Version 4. Used by the Amazon SP-API catalog fetcher. Key details:
- Timing-safe HMAC-SHA256 via `createHmac`
- Canonical headers sorted alphabetically, signed headers list semicolon-joined
- Query params sorted by key before canonicalization
- Returns a complete headers object ready to pass to `fetch()`

### Platform catalog fetchers (`src/lib/catalog/`)
All three fetchers normalize platform-specific product shapes into a common `NormalizedProduct` type that maps directly to the `products` table schema.

**shopify.ts** — `fetchShopifyProducts(shop, accessToken)`
- Shopify Admin REST API 2024-04: `GET /admin/api/2024-04/products.json?limit=250`
- Cursor-based pagination via `Link: <...?page_info=xxx>; rel="next"` response header
- Strips HTML tags from `body_html` (truncated to 2000 chars) for clean description storage
- Defaults currency to USD (Shopify REST doesn't return per-product currency)

**woocommerce.ts** — `fetchWooCommerceProducts(storeUrl, consumerKey, consumerSecret)`
- WooCommerce REST v3: `GET /wp-json/wc/v3/products?per_page=100&status=publish`
- Page-based pagination via `X-WP-TotalPages` response header
- 15-second timeout per request

**amazon.ts** — `fetchAmazonProducts(creds)`
- Amazon SP-API Listings Items v2021-08-01: `GET /listings/2021-08-01/items/{sellerId}`
- Exchanges LWA refresh token for access token before each sync
- Signs requests with SigV4 using app-level AWS IAM credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`)
- Cursor pagination via `pagination.nextToken` in response body
- 20-second timeout per request

**index.ts** — `fetchProductsForStore(store)` dispatcher
- Routes to the correct platform fetcher based on `store.platform`
- Manual stores return an empty array (no automatic catalog)
- Lazy imports prevent all three fetchers from loading if unused

### Inngest `syncCatalog` function (`src/lib/inngest/functions/syncCatalog.ts`)
Event: `catalog/sync.requested` — receives `{ storeId: string }`

Steps:
1. `fetch-store` — loads store with credentials from DB
2. `mark-syncing` — clears `catalog_last_synced_at` to signal sync in progress
3. `fetch-products` — calls `fetchProductsForStore()` (full catalog pull)
4. `upsert-batch-N-of-M` — upserts products in batches of 100 using `onConflict: "store_id,external_id"` (the unique constraint from the schema)
5. `finalize` — stamps `catalog_last_synced_at` with current timestamp

Each step is independently retried on failure (Inngest step checkpoint). The function itself retries up to 2 times on unhandled errors. Batch size of 100 keeps Supabase payload sizes safe.

Registered in `/api/inngest` alongside `runFreeAuditFunction`.

### Sync trigger route (`POST /api/stores/[id]/sync`)
- Ownership-verified before firing the Inngest event
- Returns `422` for manual stores (no automatic sync possible)
- Returns `{ ok: true, message: "Catalog sync started" }` immediately — sync is async

### StoreCard updates
- Added **"Sync catalog"** button (Database icon) — fires `POST /api/stores/[id]/sync`, shows "Starting…" spinner, then a confirmation message with auto-refresh after 3 seconds
- "Catalog not synced yet" shown when `catalog_last_synced_at` is null (was previously hidden)
- Sync button hidden for manual-platform stores

### `.env.example` updated
Replaced `AMAZON_SP_API_CLIENT_ID` / `AMAZON_SP_API_CLIENT_SECRET` (unused — those are stored per-seller in `stores.api_credentials`) with:
- `AWS_ACCESS_KEY_ID` — IAM access key for SigV4 signing
- `AWS_SECRET_ACCESS_KEY` — IAM secret key
- `AWS_REGION` — defaults to `us-east-1`

## Decisions

### SigV4 in pure Node.js (no AWS SDK)
The full `@aws-sdk/client-*` suite would add ~3 MB to the bundle and introduce complex initialization. Our SigV4 needs are narrow (one endpoint, GET only). The custom implementation is ~80 lines using only `node:crypto` builtins.

### Batch upsert of 100
Supabase has a 1 MB payload limit per request. At ~5 KB per product row (including `raw_data`), 100 rows ≈ 500 KB — well within limits for most catalogs. Large catalogs (1000+ products) are handled safely via multiple named Inngest steps.

### Upsert strategy: `onConflict: "store_id,external_id"`
The schema has a `UNIQUE (store_id, external_id)` constraint. Upserting on this conflict key means re-syncing is idempotent — all fields including `last_synced_at` are updated on each run.

### Amazon: IAM credentials are app-level, LWA is per-seller
The SP-API requires both IAM credentials (used to authenticate the application making the call) and an LWA access token (proving which seller's data is being accessed). IAM credentials live in environment variables; LWA tokens are derived at sync time from the stored refresh token.

## Open questions / deferred

- **Shopify webhook for real-time updates**: Register a `products/update` Shopify webhook pointing to a new `/api/webhooks/shopify/products` route so the catalog stays fresh without manual re-sync. Deferred to Phase 12 polish.
- **Manual catalog entry**: `platform=manual` stores currently return an empty catalog. A UI to manually add products (paste URLs, enter names) would be needed for users without API-supported platforms. Not in scope for MVP.
- **Currency normalization**: Shopify defaults to USD; WooCommerce doesn't return currency per-product at the listing endpoint. Phase 8 (dashboard) should surface this as a caveat or attempt to fetch currency via the store settings endpoint.
- **Deleted products**: The current sync only upserts — it doesn't deactivate products removed from the store. A future improvement would compare `external_id` sets and mark missing products inactive.
- **Amazon currency per-marketplace**: The SP-API Listings Items endpoint does return `price.currencyCode` per marketplace; this is correctly captured in `raw_data` and the `currency` field.
