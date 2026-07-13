import { timingSafeEqual } from "crypto";

function secretsEqual(expected: string, provided: string): boolean {
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Extract secret from Authorization: Bearer … or Basic … */
function secretFromAuthorization(header: string | null): string | null {
  if (!header) return null;
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const basic = header.match(/^Basic\s+(.+)$/i)?.[1]?.trim();
  if (!basic) return null;
  try {
    const decoded = Buffer.from(basic, "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    if (colon < 0) return decoded.trim() || null;
    const user = decoded.slice(0, colon).trim();
    const pass = decoded.slice(colon + 1).trim();
    // URL userinfo form https://hook:SECRET@host → password is the secret
    return pass || user || null;
  } catch {
    return null;
  }
}

/**
 * Verify Botbiz inbound webhook.
 * Prefer path token (`/api/webhooks/botbiz/<secret>`) — Botbiz only supports a URL,
 * not custom headers. Query `?secret=` is off unless BOTBIZ_ALLOW_QUERY_SECRET=true.
 */
export function verifyBotbizWebhook(request: Request, pathToken?: string): boolean {
  const secret = process.env.BOTBIZ_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error("[botbiz webhook] BOTBIZ_WEBHOOK_SECRET is not set — rejecting request");
    return false;
  }

  const headerSecret =
    request.headers.get("x-webhook-secret")?.trim() ||
    request.headers.get("x-botbiz-secret")?.trim() ||
    secretFromAuthorization(request.headers.get("authorization"));

  const candidates: string[] = [];
  if (pathToken?.trim()) candidates.push(pathToken.trim());
  if (headerSecret) candidates.push(headerSecret);

  if (process.env.BOTBIZ_ALLOW_QUERY_SECRET === "true") {
    const querySecret = new URL(request.url).searchParams.get("secret")?.trim();
    if (querySecret) candidates.push(querySecret);
  }

  if (candidates.length === 0) return false;
  return candidates.some((provided) => secretsEqual(secret, provided));
}
