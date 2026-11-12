import { describe, expect, it } from 'vitest';
import {
  REQUIRED_TIER_PATHS,
  assembleAdaptiveQuestions,
  filterDraftAnswers,
  isQuestionVisibleTo,
  sessionDeadlineMs,
  stripCustomQuestions,
} from '@/lib/class-exam';

function q(id: string, domainId: string, tierPath: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    data: { domainId, domainName: `Domain ${domainId}`, tierPath, stem: `Soal ${id}`, options: { A: 'a' }, correctAnswer: 'A', ...extra },
  };
}

function fullDomain(domainId: string, extra: Record<string, unknown> = {}) {
  return REQUIRED_TIER_PATHS.map((p) => q(`${domainId}-${p}`, domainId, p, extra));
}

describe('isQuestionVisibleTo', () => {
  it('treats questions without visibility as global', () => {
    expect(isQuestionVisibleTo({}, 't1')).toBe(true);
  });

  it('shows approved global and the owner\'s private questions only', () => {
    expect(isQuestionVisibleTo({ visibility: 'global', approvalStatus: 'approved' }, 't1')).toBe(true);
    expect(isQuestionVisibleTo({ visibility: 'global', approvalStatus: 'pending' }, 't1')).toBe(false);
    expect(isQuestionVisibleTo({ visibility: 'private', ownerId: 't1' }, 't1')).toBe(true);
    expect(isQuestionVisibleTo({ visibility: 'private', ownerId: 't2' }, 't1')).toBe(false);
  });
});

describe('assembleAdaptiveQuestions', () => {
  it('never exposes the answer key', () => {
    const result = assembleAdaptiveQuestions(fullDomain('d1'), 't1', ['d1']);
    const anchor = result.questionsByDomain.d1.anchor;
    expect(anchor).not.toHaveProperty('correctAnswer');
    expect(anchor.stem).toBe('Soal d1-anchor');
    expect(result.missingDomains).toEqual([]);
  });

  it('reports domains that lack a tier, with readable names', () => {
    const docs = [...fullDomain('d1'), ...fullDomain('d2').slice(0, 3)];
    const result = assembleAdaptiveQuestions(docs, 't1', ['d1', 'd2', 'd3']);
    expect(result.missingDomains).toEqual(['d2', 'd3']);
    expect(result.missingNames).toEqual(['Domain d2', 'd3']);
  });

  it('maps legacy tier names', () => {
    const docs = REQUIRED_TIER_PATHS.map((_, i) => q(`k${i}`, 'd1', `K${i + 1}`));
    const result = assembleAdaptiveQuestions(docs, 't1', ['d1']);
    expect(Object.keys(result.questionsByDomain.d1).sort()).toEqual([...REQUIRED_TIER_PATHS].sort());
  });

  it('ignores questions the teacher cannot use', () => {
    const hidden = fullDomain('d1', { visibility: 'private', ownerId: 'someone-else' });
    const result = assembleAdaptiveQuestions(hidden, 't1', ['d1']);
    expect(result.missingDomains).toEqual(['d1']);
  });
});

describe('stripCustomQuestions', () => {
  it('removes the key and explanation but keeps the rest', () => {
    const out = stripCustomQuestions([{ id: 'a', stem: 's', options: { A: '1' }, correctAnswer: 'A', explanation: 'x' }]);
    expect(out).toEqual([{ id: 'a', stem: 's', options: { A: '1' } }]);
  });
});

describe('filterDraftAnswers', () => {
  it('keeps valid answers for known questions only', () => {
    const out = filterDraftAnswers({ q1: 'B', q2: 'Z', q3: 'A', q4: 7 }, ['q1', 'q2', 'q4']);
    expect(out).toEqual({ q1: 'B' });
  });

  it('copes with junk input', () => {
    expect(filterDraftAnswers(null, ['q1'])).toEqual({});
    expect(filterDraftAnswers('x', ['q1'])).toEqual({});
  });
});

describe('sessionDeadlineMs', () => {
  it('adds the exam duration to the start time', () => {
    expect(sessionDeadlineMs(1000, 50)).toBe(1000 + 50 * 60_000);
  });

  it('never allows a zero-length exam', () => {
    expect(sessionDeadlineMs(0, 0)).toBe(60_000);
  });
});
