/**
 * Best-effort client IP for rate limits.
 * Prefer x-real-ip (usually set by Hostinger/Nginx, overwrites client).
 * Fall back to first x-forwarded-for hop only when real-ip missing.
 */
export function clientIpFromHeaders(hdrs: {
  get(name: string): string | null;
}): string {
  const realIp = hdrs.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
