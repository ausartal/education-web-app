export interface RateLimitState {
  count: number;
  resetAtMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
  next: RateLimitState;
}

/** Fixed-window decision; pure so it can be tested without a database. */
export function evaluateRateLimit(
  state: RateLimitState | null | undefined,
  nowMs: number,
  limit: number,
  windowMs: number,
): RateLimitDecision {
  if (!state || nowMs >= state.resetAtMs) {
    return { allowed: true, retryAfterSec: 0, next: { count: 1, resetAtMs: nowMs + windowMs } };
  }
  if (state.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((state.resetAtMs - nowMs) / 1000)),
      next: state,
    };
  }
  return { allowed: true, retryAfterSec: 0, next: { count: state.count + 1, resetAtMs: state.resetAtMs } };
}

export function rateLimitMessage(retryAfterSec: number): string {
  const minutes = Math.ceil(retryAfterSec / 60);
  return minutes > 1
    ? `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`
    : 'Terlalu banyak percobaan. Coba lagi sebentar lagi.';
}
