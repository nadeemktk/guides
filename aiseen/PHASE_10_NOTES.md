# Phase 10 — Auto-Apply (Pro): Notes & Decisions

## What was built

### Platform write-back libraries

**`src/lib/apply/shopify.ts`** — `updateShopifyDescription(shop, accessToken, externalProductId, newDescription)`
- `PUT /admin/api/2024-04/products/{id}.json` with `{ product: { id, body_html } }`
- Wraps plain text in `<p>` tags; newlines become `</p><p>`
- Throws on non-2xx with truncated response body for debugging

**`src/lib/apply/woocommerce.ts`** — `updateWooCommerceDescription(storeUrl, key, secret, externalProductId, newDescription)`
- `PUT /wp-json/wc/v3/products/{id}` with `{ description: newDescription }`
- Basic auth (same header as catalog fetch)
- 15s timeout via `AbortSignal.timeout`

**`src/lib/apply/index.ts`** — `applyDescriptionToStore(store, externalProductId, newDescription)`
- Dispatches to Shopify or WooCommerce based on `store.platform`
- Returns `true` if the API call was made, `false` for unsupported platforms (Amazon, manual)
- Throws if credentials are missing or API returns an error

**`src/lib/apply/matcher.ts`** — `findMatchingProduct(storeId, recText)`
- Fetches up to 200 products from the DB
- Scores each product: `hits / titleWords` where hits = title words (>3 chars) found in `recText`
- Returns the highest-scoring product if score ≥ 0.30 (30% word overlap), else `null`

### Shopify OAuth scope

Updated `SHOPIFY_SCOPES` from `"read_products,read_inventory"` to `"read_products,read_inventory,write_products"`. Existing connected stores retain their old (read-only) tokens — users must reconnect Shopify to get write access. New connections will have write scope.

### API routes

**`POST /api/recommendations/[id]/apply`** — body: `{ productId?: string }`

Flow:
1. Verify ownership + recommendation exists
2. Check status === "approved" (422 if not)
3. **Non-description_rewrite types**: just mark `status: "applied"` — no API call
4. **Amazon / manual platforms**: mark applied, return `autoApplied: false` with instructions
5. **Shopify / WooCommerce + description_rewrite**:
   - If `productId` provided: fetch product from DB, verify store ownership
   - If not provided: call `findMatchingProduct()` on rec title+rationale+suggested_value
   - If auto-match fails: return `{ needsProductSelection: true }` so client shows product picker
   - Call `applyDescriptionToStore()` — throws → 502 with platform error message
   - Update recommendation: `status: "applied"`, `product_id`, `applied_at`
   - Return `{ ok: true, autoApplied: true, productTitle, message }`

**`GET /api/products?store_id=X&q=search`** — product search for the picker
- Ownership-verified via direct store lookup
- `ilike("title", "%q%")` for case-insensitive substring search
- Returns first 50 results ordered by title

### RecommendationsClient — auto-apply flow

**`ProductPicker`** component:
- Inline search input + scrollable product list
- Calls `GET /api/products` on mount (all products) and on query change
- User clicks a product → calls apply with `productId`

**`RecCard`** changes:
- Receives `storePlatform` prop
- `canAutoApply = rec_type === "description_rewrite" && platform ∈ {shopify, woocommerce}`
- For approved + canAutoApply: shows "Auto-apply" (Zap icon) instead of "Mark as applied"
- On auto-apply click:
  1. Calls `POST /api/recommendations/[id]/apply` with no productId
  2. If `needsProductSelection: true` → shows `ProductPicker`
  3. If product selected → calls apply again with `productId`
  4. Shows success message or error inline
- Auto-applied recs are removed from the approved tab (now in applied tab)
- Platform context notice banner shown above approved tab for Shopify/WooCommerce stores

## Decisions

### Two-step apply: auto-match → picker fallback
Auto-matching by word overlap is fast and works well when recommendations reference specific product names. When it fails (score < 30%), rather than blocking the user, the UI shows a product picker. This gives a smooth path in both cases without requiring upfront product selection.

### 30% word overlap threshold for auto-match
Low enough to match common cases (e.g. recommendation mentions "yoga mat" and product title is "Premium Yoga Mat Non-Slip"), high enough to avoid false matches (e.g. "mat" alone shouldn't match "welcome mat" for a yoga brand). Tunable in Phase 11.

### Separate `/apply` route, not merged with `/patch`
`PATCH /api/recommendations/[id]` handles lifecycle status transitions (pending→approved→dismissed etc.). `POST /api/recommendations/[id]/apply` handles the write-back side effect. Keeps concerns separate — apply can fail on the platform side without corrupting the status, and it returns richer feedback (`productTitle`, `autoApplied`).

### Non-description types just mark applied
`schema_markup`, `content_topic`, `review_site`, `feature_gap` require the user to manually edit their website, write content, or register on a platform. The API marks them applied when the user confirms they've done the work. No API write-back is possible or desirable.

### Amazon excluded from auto-apply
The Amazon SP-API Listings Items PATCH endpoint requires complex feed-based submission, a custom schema for each product category, and 24-48h processing time. The complexity is disproportionate to the value at this stage. Users see "cannot auto-apply" and are told to update manually.

### Shopify scope update requires reconnection
Existing Shopify tokens have `read_products,read_inventory` scope. The scope string in OAuth is updated to include `write_products`, but this only applies to new OAuth connections. Existing stores need to reconnect. This is a standard Shopify OAuth limitation — no migration path exists without user action.

### `product_id` set on apply, not on generation
Phase 9 notes anticipated this: recommendations are generated without a product_id. The apply route resolves the product at apply-time (via matcher or picker) and writes `product_id` back to the row. This creates a clean record of which product was changed.

## Open questions / deferred

- **Scope migration UX**: The StoreCard/settings page should show a "Reconnect to enable auto-apply" prompt when a Shopify token doesn't have write scope. Checking scope from the stored `api_credentials.scope` string is straightforward. Deferred to Phase 12 polish.
- **Rollback / undo**: Once a description is pushed to Shopify/WooCommerce, the old description is overwritten. The `current_value` field on the recommendation contains the old text — a "Revert" button could push it back. Deferred.
- **Shopify `body_html` vs metafields**: Some stores use Shopify metafields for extended descriptions. The current implementation only updates `body_html`. Metafield targeting requires the recommendation to specify the target, which would need prompt changes. Deferred.
- **Rate limiting on apply**: No rate limiting on the apply endpoint. A user could rapidly apply 20 recommendations, hammering the Shopify API. Deferred to Phase 11.
- **Matcher improvement**: Word-overlap is naive. A smarter approach uses embedding similarity between the recommendation text and product titles (via OpenAI text-embedding-3-small). At ~$0.0001/request, cheap — but adds latency. Deferred to Phase 11.
