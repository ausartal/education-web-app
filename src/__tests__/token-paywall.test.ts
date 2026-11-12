import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase-admin', () => ({ adminDb: {}, runTransaction: vi.fn() }));
vi.mock('@/lib/pg-firestore', () => ({ FieldValue: { serverTimestamp: () => 'ts' } }));

import { canJoinWithBalance, validateToggle } from '@/lib/token-paywall';

describe('validateToggle', () => {
  it('accepts turning the paywall on with a reason', () => {
    expect(validateToggle(true, 'Mulai gelombang berbayar', false)).toEqual({
      ok: true, enabled: true, reason: 'Mulai gelombang berbayar',
    });
  });

  it('accepts turning it off', () => {
    expect(validateToggle(false, 'Promo gratis bulan ini', true)).toMatchObject({ ok: true, enabled: false });
  });

  it('rejects a change to the state it already has', () => {
    expect(validateToggle(true, 'Mulai gelombang berbayar', true)).toMatchObject({ ok: false });
    expect(validateToggle(false, 'Promo gratis bulan ini', false)).toMatchObject({ ok: false });
  });

  it('requires a boolean', () => {
    expect(validateToggle('true', 'Alasan valid', false)).toMatchObject({ ok: false });
    expect(validateToggle(undefined, 'Alasan valid', false)).toMatchObject({ ok: false });
  });

  it('requires a reason of 5 to 200 characters', () => {
    expect(validateToggle(true, '', false)).toMatchObject({ ok: false });
    expect(validateToggle(true, 'abc', false)).toMatchObject({ ok: false });
    expect(validateToggle(true, 'x'.repeat(201), false)).toMatchObject({ ok: false });
    expect(validateToggle(true, undefined, false)).toMatchObject({ ok: false });
  });
});

describe('canJoinWithBalance', () => {
  it('needs at least the join cost', () => {
    expect(canJoinWithBalance(1)).toBe(true);
    expect(canJoinWithBalance(5)).toBe(true);
    expect(canJoinWithBalance(0)).toBe(false);
  });
});
