import { describe, it, expect } from 'vitest';
import {
  getNextDifficulty,
  updateTheta,
  calculateConfidence,
  getCurrentStage,
  getProficiencyLevel,
  detectAnomalies,
  xpForLevel,
  TOTAL_QUESTIONS,
} from '@/lib/msat-engine';

describe('MSAT Engine - Difficulty Adjustment', () => {
  it('should increase difficulty on correct answer', () => {
    expect(getNextDifficulty('easy', true)).toBe('moderate');
    expect(getNextDifficulty('moderate', true)).toBe('hard');
    expect(getNextDifficulty('hard', true)).toBe('hard');
  });

  it('should decrease difficulty on incorrect answer', () => {
    expect(getNextDifficulty('hard', false)).toBe('moderate');
    expect(getNextDifficulty('moderate', false)).toBe('easy');
    expect(getNextDifficulty('easy', false)).toBe('easy');
  });
});

describe('MSAT Engine - Theta', () => {
  it('should increase theta on correct answer', () => {
    expect(updateTheta(0, true, 'moderate')).toBeGreaterThan(0);
  });

  it('should decrease theta on incorrect answer', () => {
    expect(updateTheta(0, false, 'moderate')).toBeLessThan(0);
  });

  it('should clamp theta to [-3, 3]', () => {
    expect(updateTheta(2.9, true, 'hard')).toBeLessThanOrEqual(3);
    expect(updateTheta(-2.9, false, 'hard')).toBeGreaterThanOrEqual(-3);
  });

  it('should give more weight to hard questions', () => {
    const hardDelta = updateTheta(0, true, 'hard');
    const easyDelta = updateTheta(0, true, 'easy');
    expect(hardDelta).toBeGreaterThan(easyDelta);
  });
});

describe('MSAT Engine - Confidence', () => {
  it('correct + fast = mahir', () => {
    expect(calculateConfidence(true, 5000, 'moderate').label).toBe('mahir');
  });

  it('correct + slow = paham_lambat', () => {
    expect(calculateConfidence(true, 100000, 'moderate').label).toBe(
      'paham_lambat'
    );
  });

  it('incorrect + fast = tebak', () => {
    expect(calculateConfidence(false, 5000, 'moderate').label).toBe('tebak');
  });

  it('incorrect + slow = tidak_paham', () => {
    expect(calculateConfidence(false, 100000, 'moderate').label).toBe(
      'tidak_paham'
    );
  });
});

describe('MSAT Engine - Stage & Constants', () => {
  it('should return correct stage', () => {
    expect(getCurrentStage(0)).toBe(1);
    expect(getCurrentStage(6)).toBe(1);
    expect(getCurrentStage(7)).toBe(2);
    expect(getCurrentStage(14)).toBe(3);
  });

  it('total questions should be 21', () => {
    expect(TOTAL_QUESTIONS).toBe(21);
  });
});

describe('MSAT Engine - Proficiency', () => {
  it('should return correct proficiency level', () => {
    expect(getProficiencyLevel(-1)).toBe('rendah');
    expect(getProficiencyLevel(0)).toBe('sedang');
    expect(getProficiencyLevel(1)).toBe('tinggi');
    expect(getProficiencyLevel(2.5)).toBe('sangat_tinggi');
  });
});

describe('MSAT Engine - Anomaly Detection', () => {
  it('should detect too fast responses', () => {
    const responses = Array(6).fill({ timeSpentMs: 2000, isCorrect: true });
    expect(detectAnomalies(responses)).toContain('TOO_FAST_MULTIPLE');
  });

  it('should detect all fast correct', () => {
    const responses = Array(6).fill({ timeSpentMs: 4000, isCorrect: true });
    expect(detectAnomalies(responses)).toContain('ALL_FAST_CORRECT');
  });

  it('should not flag normal responses', () => {
    const responses = [
      { timeSpentMs: 30000, isCorrect: true },
      { timeSpentMs: 45000, isCorrect: false },
      { timeSpentMs: 25000, isCorrect: true },
    ];
    expect(detectAnomalies(responses)).toHaveLength(0);
  });
});

describe('Gamification - XP Formula', () => {
  it('xpForLevel should increase with level', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(3));
  });

  it('xpForLevel(1) should be 100', () => {
    expect(xpForLevel(1)).toBe(100);
  });
});
