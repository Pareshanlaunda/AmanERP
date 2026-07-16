/** Client idle logout — backup to Supabase Auth inactivity (Dashboard setting). */

const DEFAULT_IDLE_MINUTES = 30;
const DEFAULT_WARN_MINUTES = 5;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** Total inactivity allowed before sign-out. Env value is **minutes**, not seconds. */
export const SESSION_IDLE_MINUTES = parsePositiveInt(
  process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES,
  DEFAULT_IDLE_MINUTES
);

/** How long before logout the warning modal appears. Env value is **minutes**, not seconds. */
export const SESSION_IDLE_WARN_MINUTES = parsePositiveInt(
  process.env.NEXT_PUBLIC_SESSION_IDLE_WARN_MINUTES,
  DEFAULT_WARN_MINUTES
);

export const SESSION_IDLE_MS = SESSION_IDLE_MINUTES * 60 * 1000;
export const SESSION_IDLE_WARN_MS = SESSION_IDLE_WARN_MINUTES * 60 * 1000;

/**
 * Warn window capped below total idle so the modal cannot show the instant you load a page
 * when WARN_MINUTES >= IDLE_MINUTES.
 */
export const SESSION_IDLE_EFFECTIVE_WARN_MS = Math.min(
  SESSION_IDLE_WARN_MS,
  Math.max(SESSION_IDLE_MS - 1_000, 0)
);

/** Paths where idle sign-out runs (must match middleware protected routes). */
export function isSessionIdleProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/notices")
  );
}

/** Remaining ms until forced sign-out from last activity timestamp. */
export function sessionIdleRemainingMs(lastActivityMs: number, now = Date.now()): number {
  return Math.max(0, SESSION_IDLE_MS - (now - lastActivityMs));
}

export function sessionIdleShouldWarn(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= SESSION_IDLE_EFFECTIVE_WARN_MS;
}
