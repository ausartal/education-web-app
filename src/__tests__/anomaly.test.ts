import { describe, expect, it } from 'vitest';
import {
  describeFlag,
  filterAnomalies,
  reviewState,
  sortAnomalies,
  topSeverity,
  validateReview,
  type AnomalyItem,
} from '@/lib/anomaly';

function item(overrides: Partial<AnomalyItem>): AnomalyItem {
  return {
    id: 'a', examId: 'e1', examTitle: 'MSAT Kimia', studentName: 'Ani', flags: ['TOO_FAST_STAGE_1'],
    severity: 'medium', review: null, status: 'completed', completedAtMs: 1000, ...overrides,
  };
}

describe('describeFlag', () => {
  it('explains known flags with their stage', () => {
    expect(describeFlag('TOO_FAST_STAGE_2')).toEqual({ label: 'Stage 2: jawaban terlalu cepat', severity: 'medium' });
    expect(describeFlag('PERFECT_FAST_STAGE_3').severity).toBe('high');
    expect(describeFlag('SUDDEN_DROP_STAGE_1_TO_2').label).toBe('Skor turun mendadak stage 1 ke 2');
    expect(describeFlag('TERMINATED_TAB_VIOLATIONS').severity).toBe('high');
    expect(describeFlag('TERMINATED_BY_ADMIN').label).toBe('Dihentikan pengawas');
  });

  it('keeps unknown flags readable', () => {
    expect(describeFlag('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', severity: 'low' });
  });
});

describe('topSeverity', () => {
  it('returns the most serious flag', () => {
    expect(topSeverity(['SUDDEN_DROP_STAGE_1_TO_2', 'TOO_FAST_STAGE_1'])).toBe('medium');
    expect(topSeverity(['TOO_FAST_STAGE_1', 'TERMINATED_BY_ADMIN'])).toBe('high');
    expect(topSeverity([])).toBe('low');
  });
});

describe('filterAnomalies and sortAnomalies', () => {
  const items = [
    item({ id: '1', studentName: 'Ani', severity: 'low', completedAtMs: 1 }),
    item({ id: '2', studentName: 'Budi', severity: 'high', completedAtMs: 2 }),
    item({ id: '3', studentName: 'Citra', severity: 'high', completedAtMs: 3, review: { verdict: 'dismissed', note: '', reviewedBy: 'x' } }),
    item({ id: '4', studentName: 'Dewi', examId: 'e2', examTitle: 'Ujian Lain', severity: 'medium', completedAtMs: 4 }),
  ];

  it('filters by review state, severity, exam and search text', () => {
    expect(filterAnomalies(items, { state: 'pending' }).map((i) => i.id)).toEqual(['1', '2', '4']);
    expect(filterAnomalies(items, { state: 'dismissed' }).map((i) => i.id)).toEqual(['3']);
    expect(filterAnomalies(items, { severity: 'high' }).map((i) => i.id)).toEqual(['2', '3']);
    expect(filterAnomalies(items, { examId: 'e2' }).map((i) => i.id)).toEqual(['4']);
    expect(filterAnomalies(items, { query: 'bud' }).map((i) => i.id)).toEqual(['2']);
    expect(filterAnomalies(items, { query: 'ujian lain' }).map((i) => i.id)).toEqual(['4']);
    expect(filterAnomalies(items, { state: 'all' })).toHaveLength(4);
  });

  it('puts pending first, then by severity, then newest', () => {
    expect(sortAnomalies(items).map((i) => i.id)).toEqual(['2', '4', '1', '3']);
  });
});

describe('review helpers', () => {
  it('treats a missing review as pending', () => {
    expect(reviewState(null)).toBe('pending');
    expect(reviewState({ verdict: 'confirmed', note: 'x', reviewedBy: 'a' })).toBe('confirmed');
  });

  it('requires a note to confirm an anomaly', () => {
    expect(validateReview('confirmed', '')).toMatchObject({ ok: false });
    expect(validateReview('confirmed', 'Bukti jelas dari log')).toEqual({ ok: true, verdict: 'confirmed', note: 'Bukti jelas dari log' });
  });

  it('allows dismissing or reopening without a note', () => {
    expect(validateReview('dismissed', undefined)).toEqual({ ok: true, verdict: 'dismissed', note: '' });
    expect(validateReview('reopen', '')).toEqual({ ok: true, verdict: 'reopen', note: '' });
  });

  it('rejects unknown verdicts and oversized notes', () => {
    expect(validateReview('maybe', 'x')).toMatchObject({ ok: false });
    expect(validateReview('dismissed', 'x'.repeat(501))).toMatchObject({ ok: false });
  });
});
