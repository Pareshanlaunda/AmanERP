/**
 * Simple in-memory rate limiters.
 *
 * Login: failed attempts per IP.
 * Webhook: requests per IP window.
 * Notice download: generations per user.
 *
 * Fine on a single Hostinger Node process. Resets on process restart.
 */

type AttemptRecord = {
  count: number;
  firstAttempt: number;
};

function createLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, AttemptRecord>();
  const cleanupIntervalMs = Math.min(windowMs, 10 * 60 * 1000);
  let lastCleanup = Date.now();

  function cleanupStaleEntries() {
    const now = Date.now();
    if (now - lastCleanup < cleanupIntervalMs) return;
    lastCleanup = now;
    for (const [key, record] of attempts) {
      if (now - record.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }
  }

  return {
    isLimited(identifier: string): boolean {
      cleanupStaleEntries();
      const record = attempts.get(identifier);
      if (!record) return false;
      if (Date.now() - record.firstAttempt > windowMs) {
        attempts.delete(identifier);
        return false;
      }
      return record.count >= maxAttempts;
    },
    record(identifier: string): void {
      const now = Date.now();
      const record = attempts.get(identifier);
      if (!record || now - record.firstAttempt > windowMs) {
        attempts.set(identifier, { count: 1, firstAttempt: now });
        return;
      }
      record.count += 1;
    },
    clear(identifier: string): void {
      attempts.delete(identifier);
    },
    remainingLockoutSeconds(identifier: string): number {
      const record = attempts.get(identifier);
      if (!record) return 0;
      const remaining = windowMs - (Date.now() - record.firstAttempt);
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },
  };
}

const loginLimiter = createLimiter(5, 15 * 60 * 1000);
/** ~60 webhook POSTs / minute per IP. */
const webhookLimiter = createLimiter(60, 60 * 1000);
/** Doc generation is CPU-heavy — 20 downloads / minute per user. */
const noticeDownloadLimiter = createLimiter(20, 60 * 1000);

export function isRateLimited(identifier: string): boolean {
  return loginLimiter.isLimited(identifier);
}

export function recordFailedAttempt(identifier: string): void {
  loginLimiter.record(identifier);
}

export function clearAttempts(identifier: string): void {
  loginLimiter.clear(identifier);
}

export function getRemainingLockoutSeconds(identifier: string): number {
  return loginLimiter.remainingLockoutSeconds(identifier);
}

export function isWebhookRateLimited(identifier: string): boolean {
  return webhookLimiter.isLimited(identifier);
}

export function recordWebhookAttempt(identifier: string): void {
  webhookLimiter.record(identifier);
}

export function isNoticeDownloadRateLimited(identifier: string): boolean {
  return noticeDownloadLimiter.isLimited(identifier);
}

export function recordNoticeDownloadAttempt(identifier: string): void {
  noticeDownloadLimiter.record(identifier);
}
