import { timingSafeEqual } from "crypto";

export function verifyBotbizWebhook(request: Request): boolean {
  const secret = process.env.BOTBIZ_WEBHOOK_SECRET?.trim();

  // Fail CLOSED: if no secret is configured, reject all webhooks.
  // This prevents accidental exposure if the env var is deleted.
  if (!secret) {
    console.error("[botbiz webhook] BOTBIZ_WEBHOOK_SECRET is not set — rejecting request");
    return false;
  }

  // Accept secret from headers (preferred) or query string (Botbiz limitation).
  // Botbiz does not support custom HTTP headers on outbound webhooks,
  // so query string auth is currently the only option.
  const headerSecret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-botbiz-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  const provided = (headerSecret ?? querySecret ?? "").trim();
  if (!provided) return false;

  try {
    const expected = Buffer.from(secret);
    const actual = Buffer.from(provided);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
