import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getShopifyAuthUrl, isValidShopDomain, normalizeShop } from "@/lib/stores/shopify";
import { getUser } from "@/lib/auth/actions";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });

  const normalized = normalizeShop(shop);
  if (!isValidShopDomain(normalized)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = getShopifyAuthUrl(normalized, state);

  const res = NextResponse.redirect(authUrl);
  // Store state + user in a short-lived cookie for CSRF verification
  res.cookies.set("shopify_oauth_state", `${state}:${user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });
  return res;
}
