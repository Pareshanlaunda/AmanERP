/**
 * Rate limiters — login, webhook, notice download.
 *
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN: shared across workers.
 * - Without: in-memory Map (single Node process; resets on restart).
 */

type MemRecord = { count: number; firstAttempt: number };

function upstashReady() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function upstashFetch(parts: (string | number)[]): Promise<unknown> {
  const base = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
  const res = await fetch(`${base}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

function createMemoryStore() {
  const map = new Map<string, MemRecord>();
  return {
    get(id: string, windowMs: number): MemRecord | null {
      const row = map.get(id);
      if (!row) return null;
      if (Date.now() - row.firstAttempt > windowMs) {
        map.delete(id);
        return null;
      }
      return row;
    },
    incr(id: string, windowMs: number): number {
      const now = Date.now();
      const row = map.get(id);
      if (!row || now - row.firstAttempt > windowMs) {
        map.set(id, { count: 1, firstAttempt: now });
        return 1;
      }
      row.count += 1;
      return row.count;
    },
    clear(id: string) {
      map.delete(id);
    },
    remainingSeconds(id: string, windowMs: number): number {
      const row = this.get(id, windowMs);
      if (!row) return 0;
      return Math.max(0, Math.ceil((windowMs - (Date.now() - row.firstAttempt)) / 1000));
    },
  };
}

const memory = createMemoryStore();

async function isLimited(prefix: string, id: string, max: number, windowMs: number) {
  if (upstashReady()) {
    try {
      const count = Number(await upstashFetch(["GET", `rl:${prefix}:${id}`]));
      if (Number.isFinite(count) && count >= max) return true;
    } catch (err) {
      console.error("[rate-limit] Upstash GET failed", err);
    }
  }
  const row = memory.get(`${prefix}:${id}`, windowMs);
  return Boolean(row && row.count >= max);
}

async function record(prefix: string, id: string, max: number, windowMs: number) {
  memory.incr(`${prefix}:${id}`, windowMs);
  if (!upstashReady()) return;
  const key = `rl:${prefix}:${id}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const count = Number(await upstashFetch(["INCR", key]));
    if (count === 1) await upstashFetch(["EXPIRE", key, windowSec]);
    void max;
  } catch (err) {
    console.error("[rate-limit] Upstash INCR failed", err);
  }
}

async function clear(prefix: string, id: string) {
  memory.clear(`${prefix}:${id}`);
  if (!upstashReady()) return;
  try {
    await upstashFetch(["DEL", `rl:${prefix}:${id}`]);
  } catch (err) {
    console.error("[rate-limit] Upstash DEL failed", err);
  }
}

const LOGIN_MAX = 5;
const LOGIN_WINDOW = 15 * 60 * 1000;
const WEBHOOK_MAX = 60;
const WEBHOOK_WINDOW = 60 * 1000;
const NOTICE_MAX = 20;
const NOTICE_WINDOW = 60 * 1000;

/** Sync wrappers keep old call sites working (memory). Prefer async variants. */
export function isRateLimited(identifier: string): boolean {
  const row = memory.get(`login:${identifier}`, LOGIN_WINDOW);
  return Boolean(row && row.count >= LOGIN_MAX);
}

export function recordFailedAttempt(identifier: string): void {
  memory.incr(`login:${identifier}`, LOGIN_WINDOW);
  if (upstashReady()) {
    void record("login", identifier, LOGIN_MAX, LOGIN_WINDOW);
  }
}

export function clearAttempts(identifier: string): void {
  void clear("login", identifier);
}

export function getRemainingLockoutSeconds(identifier: string): number {
  return memory.remainingSeconds(`login:${identifier}`, LOGIN_WINDOW);
}

export function isWebhookRateLimited(identifier: string): boolean {
  const row = memory.get(`webhook:${identifier}`, WEBHOOK_WINDOW);
  return Boolean(row && row.count >= WEBHOOK_MAX);
}

export function recordWebhookAttempt(identifier: string): void {
  memory.incr(`webhook:${identifier}`, WEBHOOK_WINDOW);
  if (upstashReady()) {
    void record("webhook", identifier, WEBHOOK_MAX, WEBHOOK_WINDOW);
  }
}

export function isNoticeDownloadRateLimited(identifier: string): boolean {
  const row = memory.get(`notice:${identifier}`, NOTICE_WINDOW);
  return Boolean(row && row.count >= NOTICE_MAX);
}

export function recordNoticeDownloadAttempt(identifier: string): void {
  memory.incr(`notice:${identifier}`, NOTICE_WINDOW);
  if (upstashReady()) {
    void record("notice", identifier, NOTICE_MAX, NOTICE_WINDOW);
  }
}

/** Async checks — use when request handlers can await (accurate with Upstash). */
export async function isLoginRateLimitedAsync(identifier: string): Promise<boolean> {
  return isLimited("login", identifier, LOGIN_MAX, LOGIN_WINDOW);
}

export async function recordLoginFailureAsync(identifier: string): Promise<void> {
  await record("login", identifier, LOGIN_MAX, LOGIN_WINDOW);
}

export async function clearLoginAttemptsAsync(identifier: string): Promise<void> {
  await clear("login", identifier);
}

export async function isWebhookRateLimitedAsync(identifier: string): Promise<boolean> {
  return isLimited("webhook", identifier, WEBHOOK_MAX, WEBHOOK_WINDOW);
}

export async function recordWebhookAttemptAsync(identifier: string): Promise<void> {
  await record("webhook", identifier, WEBHOOK_MAX, WEBHOOK_WINDOW);
}

export async function isNoticeDownloadRateLimitedAsync(identifier: string): Promise<boolean> {
  return isLimited("notice", identifier, NOTICE_MAX, NOTICE_WINDOW);
}

export async function recordNoticeDownloadAttemptAsync(identifier: string): Promise<void> {
  await record("notice", identifier, NOTICE_MAX, NOTICE_WINDOW);
}
