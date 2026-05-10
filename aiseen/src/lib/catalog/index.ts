export type { NormalizedProduct } from "./shopify";
export { fetchShopifyProducts } from "./shopify";
export { fetchWooCommerceProducts } from "./woocommerce";
export { fetchAmazonProducts } from "./amazon";

export interface StoreRow {
  id: string;
  platform: string;
  store_url: string;
  api_credentials: Record<string, string> | null;
}

export async function fetchProductsForStore(store: StoreRow) {
  const { platform, store_url, api_credentials: creds } = store;

  if (platform === "shopify") {
    if (!creds?.access_token || !creds?.shop) {
      throw new Error("Shopify store not connected — reconnect via OAuth");
    }
    const { fetchShopifyProducts } = await import("./shopify");
    return fetchShopifyProducts(creds.shop, creds.access_token);
  }

  if (platform === "woocommerce") {
    if (!creds?.consumer_key || !creds?.consumer_secret) {
      throw new Error("WooCommerce store not connected");
    }
    const { fetchWooCommerceProducts } = await import("./woocommerce");
    return fetchWooCommerceProducts(store_url, creds.consumer_key, creds.consumer_secret);
  }

  if (platform === "amazon") {
    if (!creds?.lwa_refresh_token) {
      throw new Error("Amazon store not connected");
    }
    const { fetchAmazonProducts } = await import("./amazon");
    return fetchAmazonProducts(creds as any);
  }

  if (platform === "manual") {
    return []; // Manual stores have no automatic catalog — entered by hand in Phase X
  }

  throw new Error(`Unknown platform: ${platform}`);
}
