import type { SerializeOptions } from "cookie";

/**
 * CRM-style session cookies: no Max-Age / Expires so the browser drops auth when
 * the browser session ends. Supabase SSR defaults to ~400d; we strip that on write.
 */
export function toServerSessionCookieOptions(
  options?: Record<string, unknown>
): SerializeOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options ?? {};
  return {
    ...(rest as SerializeOptions),
    path: "/",
    sameSite: "strict",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Browser-readable auth chunks (non-httpOnly); still session-scoped. */
export function toBrowserSessionCookieOptions(
  options?: Record<string, unknown>
): SerializeOptions {
  const { maxAge: _maxAge, expires: _expires, httpOnly: _httpOnly, ...rest } = options ?? {};
  return {
    ...(rest as SerializeOptions),
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };
}

export const SUPABASE_SESSION_COOKIE_OPTIONS = {
  sameSite: "strict" as const,
  path: "/",
};
