/**
 * Updates a WooCommerce product's description via the REST API.
 */
export async function updateWooCommerceDescription(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  externalProductId: string,
  newDescription: string
): Promise<void> {
  const base = storeUrl.replace(/\/$/, "");
  const auth = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;

  const res = await fetch(`${base}/wp-json/wc/v3/products/${externalProductId}`, {
    method: "PUT",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: newDescription }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WooCommerce update failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
