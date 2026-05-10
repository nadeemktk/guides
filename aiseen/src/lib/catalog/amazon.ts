import { signRequest } from "@/lib/aws/sigv4";
import { exchangeAmazonRefreshToken, AMAZON_MARKETPLACES } from "@/lib/stores/amazon";
import type { NormalizedProduct } from "./shopify";

export interface AmazonCreds {
  seller_id: string;
  marketplace_id: string;
  lwa_client_id: string;
  lwa_client_secret: string;
  lwa_refresh_token: string;
}

interface ListingsSummary {
  asin: string;
  itemName?: string;
  productType?: string;
  mainImage?: { link: string };
  price?: { amount: number; currencyCode: string };
}

interface ListingsItem {
  sku: string;
  summaries?: ListingsSummary[];
}

function normalize(sellerId: string, marketplaceId: string, item: ListingsItem): NormalizedProduct | null {
  const summary = item.summaries?.[0];
  if (!summary) return null;
  return {
    external_id: item.sku,
    title: summary.itemName ?? item.sku,
    description: null,
    product_type: summary.productType ?? null,
    vendor: null,
    price: summary.price?.amount ?? null,
    currency: summary.price?.currencyCode ?? null,
    image_url: summary.mainImage?.link ?? null,
    product_url: summary.asin
      ? `https://www.amazon.com/dp/${summary.asin}`
      : null,
    tags: null,
    raw_data: item as unknown as Record<string, unknown>,
  };
}

export async function fetchAmazonProducts(creds: AmazonCreds): Promise<NormalizedProduct[]> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION ?? "us-east-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for Amazon SP-API");
  }

  // Exchange refresh token for access token
  const { access_token } = await exchangeAmazonRefreshToken(creds);

  const marketplaceInfo = AMAZON_MARKETPLACES[creds.marketplace_id];
  const endpoint = marketplaceInfo?.endpoint ?? "sellingpartnerapi-na.amazon.com";

  const all: NormalizedProduct[] = [];
  let nextToken: string | undefined;
  let firstPage = true;

  while (firstPage || nextToken) {
    firstPage = false;
    const params = new URLSearchParams({
      marketplaceIds: creds.marketplace_id,
      includedData: "summaries",
    });
    if (nextToken) params.set("pageToken", nextToken);

    const url = `https://${endpoint}/listings/2021-08-01/items/${creds.seller_id}?${params}`;

    const signedHeaders = signRequest({
      method: "GET",
      url,
      headers: { "x-amz-access-token": access_token },
      service: "execute-api",
      region: awsRegion,
      accessKeyId,
      secretAccessKey,
    });

    const res = await fetch(url, { headers: signedHeaders, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Amazon Listings API failed: ${res.status} ${text.slice(0, 300)}`);
    }

    const data = await res.json() as { items: ListingsItem[]; pagination?: { nextToken?: string } };
    const normalized = (data.items ?? [])
      .map((item) => normalize(creds.seller_id, creds.marketplace_id, item))
      .filter((p): p is NormalizedProduct => p !== null);
    all.push(...normalized);

    nextToken = data.pagination?.nextToken;
  }

  return all;
}
