import { describe, expect, it } from 'vitest';
import {
  STAGE_BRANCHES,
  getBranchKey,
  isBreakDue,
  isCompleteStageSet,
  isLateSubmission,
  normalizeStageAnswers,
  pickStageQuestions,
  remainingSeconds,
  stripAnswerKey,
  toMillis,
} from '@/lib/msat-session';

const domains = ['knowing', 'applying', 'reasoning'] as const;

function makePool(perDomain: number) {
  return domains.flatMap((d) =>
    Array.from({ length: perDomain }, (_, i) => ({ id: `${d}-${i}`, cognitiveDomain: d })),
  );
}

describe('getBranchKey', () => {
  it('maps stage 1 and stage 2', () => {
    expect(getBranchKey(1, 'medium', ['medium'])).toBe('stage1_medium');
    expect(getBranchKey(2, 'tinggi', ['medium', 'tinggi'])).toBe('stage2_tinggi');
    expect(getBranchKey(2, 'rendah', ['medium', 'rendah'])).toBe('stage2_rendah');
  });

  it('separates the two medium branches of stage 3 by the stage 2 path', () => {
    expect(getBranchKey(3, 'medium', ['medium', 'tinggi', 'medium'])).toBe('stage3_medium_tinggi');
    expect(getBranchKey(3, 'medium', ['medium', 'rendah', 'medium'])).toBe('stage3_medium_rendah');
  });

  it('maps the extreme stage 3 branches', () => {
    expect(getBranchKey(3, 'tinggi', ['medium', 'tinggi', 'tinggi'])).toBe('stage3_lebih_tinggi');
    expect(getBranchKey(3, 'rendah', ['medium', 'rendah', 'rendah'])).toBe('stage3_sangat_rendah');
  });

  it('only returns branches known to the admin create flow', () => {
    const keys = [
      getBranchKey(1, 'medium', ['medium']),
      getBranchKey(2, 'tinggi', []),
      getBranchKey(2, 'rendah', []),
      getBranchKey(3, 'tinggi', []),
      getBranchKey(3, 'rendah', []),
      getBranchKey(3, 'medium', ['medium', 'tinggi']),
      getBranchKey(3, 'medium', ['medium', 'rendah']),
    ];
    for (const key of keys) expect(Object.keys(STAGE_BRANCHES)).toContain(key);
    expect(new Set(keys).size).toBe(7);
  });
});

describe('pickStageQuestions', () => {
  it('picks 4 per domain', () => {
    const picked = pickStageQuestions(makePool(6));
    expect(picked).toHaveLength(12);
    for (const d of domains) {
      expect(picked!.filter((q) => q.cognitiveDomain === d)).toHaveLength(4);
    }
  });

  it('returns null when a domain has fewer than 4 questions', () => {
    const pool = [...makePool(4).filter((q) => q.cognitiveDomain !== 'reasoning'), ...makePool(3).filter((q) => q.cognitiveDomain === 'reasoning')];
    expect(pickStageQuestions(pool)).toBeNull();
  });

  it('does not repeat a question', () => {
    const picked = pickStageQuestions(makePool(8))!;
    expect(new Set(picked.map((q) => q.id)).size).toBe(12);
  });
});

describe('isCompleteStageSet', () => {
  it('accepts exactly 4 per domain', () => {
    expect(isCompleteStageSet(makePool(4))).toBe(true);
  });

  it('rejects other counts and unbalanced sets', () => {
    expect(isCompleteStageSet(makePool(3))).toBe(false);
    expect(isCompleteStageSet(makePool(5))).toBe(false);
    const unbalanced = [...makePool(4).slice(0, 11), { id: 'x', cognitiveDomain: 'knowing' }];
    expect(isCompleteStageSet(unbalanced)).toBe(false);
  });
});

describe('normalizeStageAnswers', () => {
  const served = ['q1', 'q2', 'q3'];

  it('keeps served order and fills unanswered questions with null', () => {
    const result = normalizeStageAnswers([{ questionId: 'q3', selectedAnswer: 'B', timeSpentMs: 1200 }], served);
    expect(result).toEqual({
      ok: true,
      answers: [
        { questionId: 'q1', selectedAnswer: null, timeSpentMs: 0 },
        { questionId: 'q2', selectedAnswer: null, timeSpentMs: 0 },
        { questionId: 'q3', selectedAnswer: 'B', timeSpentMs: 1200 },
      ],
    });
  });

  it('rejects questions that were not served', () => {
    const result = normalizeStageAnswers([{ questionId: 'other', selectedAnswer: 'A', timeSpentMs: 1 }], served);
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate answers for one question', () => {
    const result = normalizeStageAnswers(
      [
        { questionId: 'q1', selectedAnswer: 'A', timeSpentMs: 1 },
        { questionId: 'q1', selectedAnswer: 'B', timeSpentMs: 1 },
      ],
      served,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects invalid answer keys and non-array bodies', () => {
    expect(normalizeStageAnswers([{ questionId: 'q1', selectedAnswer: 'Z', timeSpentMs: 1 }], served).ok).toBe(false);
    expect(normalizeStageAnswers('nope', served).ok).toBe(false);
  });

  it('rejects more answers than questions', () => {
    const many = Array.from({ length: 4 }, () => ({ questionId: 'q1', selectedAnswer: 'A', timeSpentMs: 1 }));
    expect(normalizeStageAnswers(many, served).ok).toBe(false);
  });

  it('clamps negative or invalid times to zero', () => {
    const result = normalizeStageAnswers([{ questionId: 'q1', selectedAnswer: 'A', timeSpentMs: -50 }], served);
    expect(result.ok && result.answers[0].timeSpentMs).toBe(0);
  });
});

describe('break and deadline helpers', () => {
  it('detects a finished break', () => {
    const now = 2_000_000;
    expect(isBreakDue({ status: 'on_break', breakEndsAt: { _seconds: 1000 } }, now)).toBe(true);
    expect(isBreakDue({ status: 'on_break', breakEndsAt: { _seconds: 3000 } }, now)).toBe(false);
    expect(isBreakDue({ status: 'in_progress', breakEndsAt: { _seconds: 1000 } }, now)).toBe(false);
    expect(isBreakDue({ status: 'on_break', breakEndsAt: null }, now)).toBe(false);
  });

  it('reads timestamps in the shapes stored in the database', () => {
    expect(toMillis(new Date(5000))).toBe(5000);
    expect(toMillis({ seconds: 5 })).toBe(5000);
    expect(toMillis({ _seconds: 5 })).toBe(5000);
    expect(toMillis({ toMillis: () => 7 })).toBe(7);
    expect(toMillis(null)).toBeNull();
  });

  it('flags submissions after the grace period only', () => {
    const state = { questionIds: [], startedAtMs: 0, endsAtMs: 100_000 };
    expect(isLateSubmission(state, 100_000)).toBe(false);
    expect(isLateSubmission(state, 150_000)).toBe(false);
    expect(isLateSubmission(state, 170_000)).toBe(true);
  });

  it('never returns negative remaining time', () => {
    const state = { questionIds: [], startedAtMs: 0, endsAtMs: 10_000 };
    expect(remainingSeconds(state, 4_000)).toBe(6);
    expect(remainingSeconds(state, 20_000)).toBe(0);
  });
});

describe('stripAnswerKey', () => {
  it('removes the answer key and explanation', () => {
    const out = stripAnswerKey({ id: 'q', stem: 's', correctAnswer: 'A', explanation: 'why' });
    expect(out).toEqual({ id: 'q', stem: 's' });
  });
});
