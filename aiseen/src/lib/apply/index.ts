import { updateShopifyDescription } from "./shopify";
import { updateWooCommerceDescription } from "./woocommerce";

export interface StoreForApply {
  platform: string;
  store_url: string;
  api_credentials: Record<string, string> | null;
}

/**
 * Pushes a new description for a product to the store platform.
 * Returns true if the update was sent; false if the platform doesn't support auto-apply.
 * Throws if the API call fails.
 */
export async function applyDescriptionToStore(
  store: StoreForApply,
  externalProductId: string,
  newDescription: string
): Promise<boolean> {
  const creds = store.api_credentials;

  if (store.platform === "shopify") {
    if (!creds?.access_token || !creds?.shop) {
      throw new Error("Shopify not connected — reconnect OAuth");
    }
    await updateShopifyDescription(creds.shop, creds.access_token, externalProductId, newDescription);
    return true;
  }

  if (store.platform === "woocommerce") {
    if (!creds?.consumer_key || !creds?.consumer_secret) {
      throw new Error("WooCommerce not connected");
    }
    await updateWooCommerceDescription(
      store.store_url,
      creds.consumer_key,
      creds.consumer_secret,
      externalProductId,
      newDescription
    );
    return true;
  }

  // Amazon and manual: no write-back support in this phase
  return false;
}
