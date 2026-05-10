export interface AmazonCredentials {
  seller_id: string;
  marketplace_id: string;
  lwa_client_id: string;
  lwa_client_secret: string;
  lwa_refresh_token: string;
}

export interface AmazonAccessToken {
  access_token: string;
  expires_in: number;
}

export const AMAZON_MARKETPLACES: Record<string, { label: string; endpoint: string }> = {
  ATVPDKIKX0DER: { label: "US (amazon.com)", endpoint: "sellingpartnerapi-na.amazon.com" },
  A2EUQ1WTGCTBG2: { label: "Canada (amazon.ca)", endpoint: "sellingpartnerapi-na.amazon.com" },
  A1AM78C64UM0Y8: { label: "Mexico (amazon.com.mx)", endpoint: "sellingpartnerapi-na.amazon.com" },
  A1RKKUPIHCS9HS: { label: "Spain (amazon.es)", endpoint: "sellingpartnerapi-eu.amazon.com" },
  A1F83G8C2ARO7P: { label: "UK (amazon.co.uk)", endpoint: "sellingpartnerapi-eu.amazon.com" },
  A13V1IB3VIYZZH: { label: "France (amazon.fr)", endpoint: "sellingpartnerapi-eu.amazon.com" },
  A1PA6795UKMFR9: { label: "Germany (amazon.de)", endpoint: "sellingpartnerapi-eu.amazon.com" },
  APJ6JRA9NG5V4: { label: "Italy (amazon.it)", endpoint: "sellingpartnerapi-eu.amazon.com" },
  A39IBJ37TRP1C6: { label: "Australia (amazon.com.au)", endpoint: "sellingpartnerapi-fe.amazon.com" },
  A1VC38T7YXB528: { label: "Japan (amazon.co.jp)", endpoint: "sellingpartnerapi-fe.amazon.com" },
};

export async function exchangeAmazonRefreshToken(
  creds: Pick<AmazonCredentials, "lwa_client_id" | "lwa_client_secret" | "lwa_refresh_token">
): Promise<AmazonAccessToken> {
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.lwa_client_id,
      client_secret: creds.lwa_client_secret,
      refresh_token: creds.lwa_refresh_token,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amazon LWA token exchange failed: ${text}`);
  }
  return res.json() as Promise<AmazonAccessToken>;
}

export async function testAmazonConnection(
  creds: AmazonCredentials
): Promise<{ ok: boolean; error?: string }> {
  try {
    await exchangeAmazonRefreshToken(creds);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
