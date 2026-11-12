import { describe, expect, it } from 'vitest';
import { hasSchoolRole, shouldAssignExamClaim } from '@/lib/claims';
import { evaluateRateLimit, rateLimitMessage } from '@/lib/rate-limit';

describe('exam claim rule', () => {
  it('does not replace a school role', () => {
    expect(shouldAssignExamClaim({ role: 'teacher' })).toBe(false);
    expect(shouldAssignExamClaim({ role: 'admin' })).toBe(false);
    expect(shouldAssignExamClaim({ role: 'student' })).toBe(false);
  });

  it('assigns the exam claim when no school role exists', () => {
    expect(shouldAssignExamClaim({})).toBe(true);
    expect(shouldAssignExamClaim(null)).toBe(true);
    expect(shouldAssignExamClaim({ role: 'exam_user' })).toBe(true);
  });

  it('recognises school roles only', () => {
    expect(hasSchoolRole({ role: 'exam_user' })).toBe(false);
    expect(hasSchoolRole({ role: 'teacher' })).toBe(true);
  });
});

describe('evaluateRateLimit', () => {
  const windowMs = 60_000;

  it('opens a window on the first attempt', () => {
    const d = evaluateRateLimit(null, 1000, 3, windowMs);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ count: 1, resetAtMs: 61_000 });
  });

  it('allows attempts up to the limit then blocks', () => {
    let state = evaluateRateLimit(null, 0, 3, windowMs).next;
    state = evaluateRateLimit(state, 1000, 3, windowMs).next;
    state = evaluateRateLimit(state, 2000, 3, windowMs).next;
    expect(state.count).toBe(3);
    const blocked = evaluateRateLimit(state, 3000, 3, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(57);
    expect(blocked.next.count).toBe(3);
  });

  it('starts a new window after the reset time', () => {
    const d = evaluateRateLimit({ count: 3, resetAtMs: 60_000 }, 60_000, 3, windowMs);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ count: 1, resetAtMs: 120_000 });
  });

  it('formats the wait time in minutes when long', () => {
    expect(rateLimitMessage(30)).toContain('sebentar');
    expect(rateLimitMessage(300)).toContain('5 menit');
  });
});
