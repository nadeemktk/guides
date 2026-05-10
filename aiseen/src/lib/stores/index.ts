export * from "./shopify";
export * from "./amazon";
export * from "./woocommerce";

export type StorePlatformCredentials =
  | { platform: "shopify"; credentials: import("./shopify").ShopifyCredentials }
  | { platform: "amazon"; credentials: import("./amazon").AmazonCredentials }
  | { platform: "woocommerce"; credentials: import("./woocommerce").WooCommerceCredentials }
  | { platform: "manual"; credentials: null };
