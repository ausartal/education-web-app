import { describe, expect, it } from 'vitest';
import { MAX_ADJUSTMENT, mockPurchasesAllowed, summarizeLedger, validateAdjustment } from '@/lib/token-ledger';

describe('validateAdjustment', () => {
  it('accepts a valid grant and reports the new balance', () => {
    expect(validateAdjustment(5, 'Kompensasi gangguan ujian', 2)).toEqual({
      ok: true, delta: 5, reason: 'Kompensasi gangguan ujian', balanceAfter: 7,
    });
  });

  it('accepts a deduction that stays at or above zero', () => {
    expect(validateAdjustment(-3, 'Koreksi salah input', 3)).toMatchObject({ ok: true, balanceAfter: 0 });
  });

  it('rejects a deduction larger than the balance', () => {
    const result = validateAdjustment(-4, 'Koreksi salah input', 3);
    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.error).toContain('3 token');
  });

  it('rejects zero, fractions and non-numbers', () => {
    for (const bad of [0, 1.5, '5', null, NaN]) {
      expect(validateAdjustment(bad, 'Alasan yang cukup', 10)).toMatchObject({ ok: false });
    }
  });

  it('caps one action', () => {
    expect(validateAdjustment(MAX_ADJUSTMENT + 1, 'Alasan yang cukup', 0)).toMatchObject({ ok: false });
    expect(validateAdjustment(MAX_ADJUSTMENT, 'Alasan yang cukup', 0)).toMatchObject({ ok: true });
  });

  it('requires a reason of sensible length', () => {
    expect(validateAdjustment(1, '', 0)).toMatchObject({ ok: false });
    expect(validateAdjustment(1, 'abc', 0)).toMatchObject({ ok: false });
    expect(validateAdjustment(1, 'x'.repeat(201), 0)).toMatchObject({ ok: false });
    expect(validateAdjustment(1, '   tiga   ', 0)).toMatchObject({ ok: false });
  });
});

describe('summarizeLedger', () => {
  const entries = [
    { delta: 10, createdAtMs: 1000 },
    { delta: -4, createdAtMs: 2000 },
    { delta: 5, createdAtMs: 500 },
  ];

  it('totals grants and deductions', () => {
    expect(summarizeLedger(entries)).toEqual({ granted: 15, deducted: 4, net: 11 });
  });

  it('can limit to a recent period', () => {
    expect(summarizeLedger(entries, 900)).toEqual({ granted: 10, deducted: 4, net: 6 });
  });
});

describe('mockPurchasesAllowed', () => {
  it('is off in production by default', () => {
    expect(mockPurchasesAllowed({ NODE_ENV: 'production' })).toBe(false);
  });

  it('is on in development and when explicitly enabled', () => {
    expect(mockPurchasesAllowed({ NODE_ENV: 'development' })).toBe(true);
    expect(mockPurchasesAllowed({})).toBe(true);
    expect(mockPurchasesAllowed({ NODE_ENV: 'production', ALLOW_MOCK_TOKEN_PURCHASE: 'true' })).toBe(true);
    expect(mockPurchasesAllowed({ NODE_ENV: 'production', ALLOW_MOCK_TOKEN_PURCHASE: 'false' })).toBe(false);
  });
});
