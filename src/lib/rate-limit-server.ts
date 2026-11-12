import { adminDb, runTransaction } from '@/lib/firebase-admin';
import { evaluateRateLimit, type RateLimitState } from '@/lib/rate-limit';

/**
 * Counts one attempt for `key` and reports whether it is within the limit.
 * Counters live in the `rate_limits` collection (admin-only through the data API).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const ref = adminDb.collection('rate_limits').doc(key);
  return runTransaction(async (tx) => {
    await tx.lock(`rate_limit:${key}`);
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as RateLimitState) : null;
    const decision = evaluateRateLimit(current, Date.now(), limit, windowMs);
    if (decision.allowed) await tx.set(ref, { ...decision.next });
    return { allowed: decision.allowed, retryAfterSec: decision.retryAfterSec };
  });
}
