export const MAX_ADJUSTMENT = 100;

export interface LedgerEntryLike {
  delta: number;
  createdAtMs?: number | null;
}

export type AdjustmentCheck =
  | { ok: true; delta: number; reason: string; balanceAfter: number }
  | { ok: false; error: string };

/** Validates a manual balance change: whole, non-zero, bounded, with a reason, never below zero. */
export function validateAdjustment(delta: unknown, reason: unknown, currentBalance: number): AdjustmentCheck {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: 'Jumlah token harus bilangan bulat selain 0' };
  }
  if (Math.abs(delta) > MAX_ADJUSTMENT) {
    return { ok: false, error: `Perubahan maksimal ${MAX_ADJUSTMENT} token per tindakan` };
  }
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 5 || text.length > 200) {
    return { ok: false, error: 'Alasan wajib diisi (5-200 karakter)' };
  }
  const balanceAfter = currentBalance + delta;
  if (balanceAfter < 0) {
    return { ok: false, error: `Saldo tidak cukup. Saldo peserta saat ini ${currentBalance} token.` };
  }
  return { ok: true, delta, reason: text, balanceAfter };
}

export function summarizeLedger(entries: LedgerEntryLike[], sinceMs?: number): { granted: number; deducted: number; net: number } {
  let granted = 0;
  let deducted = 0;
  for (const entry of entries) {
    if (sinceMs !== undefined && (entry.createdAtMs ?? 0) < sinceMs) continue;
    if (entry.delta > 0) granted += entry.delta;
    else deducted += -entry.delta;
  }
  return { granted, deducted, net: granted - deducted };
}

/**
 * Self-service token purchases are a placeholder until a payment provider is
 * connected, so they are off in production unless explicitly enabled.
 */
export function mockPurchasesAllowed(env: { NODE_ENV?: string; ALLOW_MOCK_TOKEN_PURCHASE?: string }): boolean {
  if (env.ALLOW_MOCK_TOKEN_PURCHASE === 'true') return true;
  return env.NODE_ENV !== 'production';
}
