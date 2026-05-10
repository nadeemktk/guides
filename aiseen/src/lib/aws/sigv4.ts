import { createHash, createHmac } from "node:crypto";

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function toHex(buf: Buffer): string {
  return buf.toString("hex");
}

export interface SignedHeaders {
  [key: string]: string;
}

export interface SignRequestOptions {
  method: string;
  url: string;
  /** Additional headers to include and sign (host is auto-added) */
  headers?: Record<string, string>;
  /** Request body (empty string for GET) */
  body?: string;
  service: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** ISO datetime string — defaults to now */
  datetime?: string;
}

/**
 * Minimal AWS SigV4 request signer.
 * Returns a complete headers object (including Authorization) ready to pass to fetch().
 */
export function signRequest(opts: SignRequestOptions): SignedHeaders {
  const { method, service, region, accessKeyId, secretAccessKey } = opts;
  const body = opts.body ?? "";

  const parsed = new URL(opts.url);
  const now = opts.datetime ? new Date(opts.datetime) : new Date();
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const datestamp = amzdate.slice(0, 8);

  // Build canonical headers (must include host; sort alphabetically)
  const rawHeaders: Record<string, string> = {
    host: parsed.host,
    "x-amz-date": amzdate,
    ...(opts.headers ?? {}),
  };

  const sortedKeys = Object.keys(rawHeaders).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = sortedKeys
    .map((k) => `${k}:${rawHeaders[k.replace(/^x-amz/, "x-amz")]?.trim() ?? rawHeaders[k]?.trim()}`)
    .join("\n") + "\n";
  const signedHeaders = sortedKeys.join(";");

  // Canonical query string — sort parameters
  const sortedParams = Array.from(parsed.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const payloadHash = sha256Hex(body);

  const canonicalRequest = [
    method.toUpperCase(),
    parsed.pathname || "/",
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to sign
  const scope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzdate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  // Signing key
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, datestamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = toHex(hmacSha256(kSigning, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`;

  // Merge all headers the caller needs to send
  const finalHeaders: SignedHeaders = { ...rawHeaders, authorization };
  // Normalize casing to match the raw headers the caller passed
  finalHeaders["x-amz-date"] = amzdate;
  return finalHeaders;
}
