/**
 * Updates a Shopify product's body_html (description) via the Admin REST API.
 * Requires the access token to have write_products scope.
 */
export async function updateShopifyDescription(
  shop: string,
  accessToken: string,
  externalProductId: string,
  newDescription: string
): Promise<void> {
  const res = await fetch(
    `https://${shop}/admin/api/2024-04/products/${externalProductId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product: {
          id: Number(externalProductId),
          body_html: `<p>${newDescription.replace(/\n/g, "</p><p>")}</p>`,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify update failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
