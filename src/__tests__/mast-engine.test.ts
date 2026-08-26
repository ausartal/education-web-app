import { describe, it, expect } from 'vitest';
import {
  getNextStageDifficulty,
  scoreStage,
  calculateFinalScore,
  getPredikat,
  calculateCognitiveScores,
  generateConclusions,
  detectMASTAnomalies,
} from '@/lib/mast-engine';
import { MASTStageResponse } from '@/types/mast';

// ===== getNextStageDifficulty =====

describe('MAST Engine - Stage Branching', () => {
  it('Stage 1 medium, passed → high', () => {
    expect(getNextStageDifficulty(1, 'medium', true)).toBe('high');
  });

  it('Stage 1 medium, failed → low', () => {
    expect(getNextStageDifficulty(1, 'medium', false)).toBe('low');
  });

  it('Stage 2 high, passed → high', () => {
    expect(getNextStageDifficulty(2, 'high', true)).toBe('high');
  });

  it('Stage 2 high, failed → medium', () => {
    expect(getNextStageDifficulty(2, 'high', false)).toBe('medium');
  });

  it('Stage 2 low, passed → medium', () => {
    expect(getNextStageDifficulty(2, 'low', true)).toBe('medium');
  });

  it('Stage 2 low, failed → low', () => {
    expect(getNextStageDifficulty(2, 'low', false)).toBe('low');
  });

  it('Stage 3 → null (no next stage)', () => {
    expect(getNextStageDifficulty(3, 'high', true)).toBeNull();
    expect(getNextStageDifficulty(3, 'low', false)).toBeNull();
  });
});

// ===== scoreStage =====

describe('MAST Engine - Stage Scoring', () => {
  const makeAnswers = (correctIndices: number[], domains: ('knowing' | 'applying' | 'reasoning')[]) => {
    return domains.map((domain, i) => ({
      questionId: `q${i}`,
      cognitiveDomain: domain,
      isCorrect: correctIndices.includes(i),
    }));
  };

  it('should count K/A/R correctly', () => {
    // 4K, 4A, 4R — domains in order
    const domains = [
      'knowing', 'knowing', 'knowing', 'knowing',
      'applying', 'applying', 'applying', 'applying',
      'reasoning', 'reasoning', 'reasoning', 'reasoning',
    ] as const;
    // Benar: K=3, A=2, R=4 → total 9
    const answers = makeAnswers([0, 1, 2, 4, 5, 8, 9, 10, 11], [...domains]);
    const result = scoreStage(1, 'medium', answers);

    expect(result.knowingCorrect).toBe(3);
    expect(result.applyingCorrect).toBe(2);
    expect(result.reasoningCorrect).toBe(4);
    expect(result.totalCorrect).toBe(9);
    expect(result.passed).toBe(true); // ≥8
  });

  it('should fail when < 8/12', () => {
    const domains = Array(12).fill('knowing') as ('knowing' | 'applying' | 'reasoning')[];
    const answers = makeAnswers([0, 1, 2, 3, 4, 5, 6], domains); // 7 correct
    const result = scoreStage(1, 'medium', answers);

    expect(result.totalCorrect).toBe(7);
    expect(result.passed).toBe(false);
  });

  it('should apply correct multiplier', () => {
    const domains = Array(12).fill('knowing') as ('knowing' | 'applying' | 'reasoning')[];
    const answers = makeAnswers([0, 1, 2, 3, 4, 5, 6, 7], domains); // 8 correct

    const low = scoreStage(1, 'low', answers);
    const medium = scoreStage(1, 'medium', answers);
    const high = scoreStage(1, 'high', answers);

    expect(low.weightedScore).toBe(8 * 1.0);
    expect(medium.weightedScore).toBe(8 * 1.2);
    expect(high.weightedScore).toBe(8 * 1.5);
  });
});

// ===== calculateFinalScore =====

describe('MAST Engine - Final Score', () => {
  it('should return 0 for empty responses', () => {
    expect(calculateFinalScore([])).toBe(0);
  });

  it('should calculate score correctly for Simpulan A (high path)', () => {
    // Stage 1: medium, 10/12 → SW = 10×1.2 = 12.0
    // Stage 2: high, 9/12 → SW = 9×1.5 = 13.5
    // Stage 3: high, 11/12 → SW = 11×1.5 = 16.5
    const stages: MASTStageResponse[] = [
      { stageNumber: 1, stageDifficulty: 'medium', questions: [], knowingCorrect: 4, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 10, passed: true, weightedScore: 12.0 },
      { stageNumber: 2, stageDifficulty: 'high', questions: [], knowingCorrect: 3, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 9, passed: true, weightedScore: 13.5 },
      { stageNumber: 3, stageDifficulty: 'high', questions: [], knowingCorrect: 4, applyingCorrect: 4, reasoningCorrect: 3, totalCorrect: 11, passed: true, weightedScore: 16.5 },
    ];

    const score = calculateFinalScore(stages);
    // (12.0 + 13.5 + 16.5) / (12×1.2 + 12×1.5 + 12×1.5) × 100 = 42.0 / 50.4 × 100 = 83.3
    expect(score).toBe(83);
  });

  it('should calculate score correctly for Simpulan B (adaptive path)', () => {
    // Stage 1: medium, 8/12 → SW = 8×1.2 = 9.6
    // Stage 2: high, 5/12 → SW = 5×1.5 = 7.5
    // Stage 3: medium, 9/12 → SW = 9×1.2 = 10.8
    const stages: MASTStageResponse[] = [
      { stageNumber: 1, stageDifficulty: 'medium', questions: [], knowingCorrect: 3, applyingCorrect: 3, reasoningCorrect: 2, totalCorrect: 8, passed: true, weightedScore: 9.6 },
      { stageNumber: 2, stageDifficulty: 'high', questions: [], knowingCorrect: 2, applyingCorrect: 2, reasoningCorrect: 1, totalCorrect: 5, passed: false, weightedScore: 7.5 },
      { stageNumber: 3, stageDifficulty: 'medium', questions: [], knowingCorrect: 4, applyingCorrect: 3, reasoningCorrect: 2, totalCorrect: 9, passed: true, weightedScore: 10.8 },
    ];

    const score = calculateFinalScore(stages);
    // (9.6 + 7.5 + 10.8) / (12×1.2 + 12×1.5 + 12×1.2) × 100 = 27.9 / 46.8 × 100 = 59.6
    expect(score).toBe(60);
  });

  it('should calculate score correctly for Simpulan C (low path)', () => {
    // Stage 1: medium, 4/12 → SW = 4×1.2 = 4.8
    // Stage 2: low, 6/12 → SW = 6×1.0 = 6.0
    // Stage 3: low, 8/12 → SW = 8×1.0 = 8.0
    const stages: MASTStageResponse[] = [
      { stageNumber: 1, stageDifficulty: 'medium', questions: [], knowingCorrect: 2, applyingCorrect: 1, reasoningCorrect: 1, totalCorrect: 4, passed: false, weightedScore: 4.8 },
      { stageNumber: 2, stageDifficulty: 'low', questions: [], knowingCorrect: 3, applyingCorrect: 2, reasoningCorrect: 1, totalCorrect: 6, passed: false, weightedScore: 6.0 },
      { stageNumber: 3, stageDifficulty: 'low', questions: [], knowingCorrect: 4, applyingCorrect: 3, reasoningCorrect: 1, totalCorrect: 8, passed: true, weightedScore: 8.0 },
    ];

    const score = calculateFinalScore(stages);
    // (4.8 + 6.0 + 8.0) / (12×1.2 + 12×1.0 + 12×1.0) × 100 = 18.8 / 38.4 × 100 = 48.96 → 49
    expect(score).toBe(49);
  });
});

// ===== getPredikat =====

describe('MAST Engine - Predikat', () => {
  it('Istimewa: 81–100', () => {
    expect(getPredikat(100)).toEqual({ predikat: 'Istimewa', peringkat: 1 });
    expect(getPredikat(81)).toEqual({ predikat: 'Istimewa', peringkat: 1 });
  });

  it('Unggul: 61–80', () => {
    expect(getPredikat(80)).toEqual({ predikat: 'Unggul', peringkat: 2 });
    expect(getPredikat(61)).toEqual({ predikat: 'Unggul', peringkat: 2 });
  });

  it('Madya: 41–60', () => {
    expect(getPredikat(60)).toEqual({ predikat: 'Madya', peringkat: 3 });
    expect(getPredikat(41)).toEqual({ predikat: 'Madya', peringkat: 3 });
  });

  it('Semenjana: 21–40', () => {
    expect(getPredikat(40)).toEqual({ predikat: 'Semenjana', peringkat: 4 });
    expect(getPredikat(21)).toEqual({ predikat: 'Semenjana', peringkat: 4 });
  });

  it('Terbatas: 0–20', () => {
    expect(getPredikat(20)).toEqual({ predikat: 'Terbatas', peringkat: 5 });
    expect(getPredikat(0)).toEqual({ predikat: 'Terbatas', peringkat: 5 });
  });
});

// ===== calculateCognitiveScores =====

describe('MAST Engine - Cognitive Sub-scores', () => {
  it('should calculate percentages correctly', () => {
    const stages: MASTStageResponse[] = [
      { stageNumber: 1, stageDifficulty: 'medium', questions: [], knowingCorrect: 4, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 10, passed: true, weightedScore: 12 },
      { stageNumber: 2, stageDifficulty: 'high', questions: [], knowingCorrect: 3, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 9, passed: true, weightedScore: 13.5 },
      { stageNumber: 3, stageDifficulty: 'high', questions: [], knowingCorrect: 4, applyingCorrect: 4, reasoningCorrect: 3, totalCorrect: 11, passed: true, weightedScore: 16.5 },
    ];

    const result = calculateCognitiveScores(stages);
    // K: (4+3+4)/(4×3) = 11/12 = 91.7 → 92
    // A: (3+3+4)/(4×3) = 10/12 = 83.3 → 83
    // R: (3+3+3)/(4×3) = 9/12 = 75
    expect(result.knowing).toBe(92);
    expect(result.applying).toBe(83);
    expect(result.reasoning).toBe(75);
  });

  it('should return 0 for empty', () => {
    expect(calculateCognitiveScores([])).toEqual({ knowing: 0, applying: 0, reasoning: 0 });
  });
});

// ===== generateConclusions =====

describe('MAST Engine - Simpulan', () => {
  it('should generate 4 conclusions with correct predikat description', () => {
    const stages: MASTStageResponse[] = [
      { stageNumber: 1, stageDifficulty: 'medium', questions: [], knowingCorrect: 4, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 10, passed: true, weightedScore: 12 },
      { stageNumber: 2, stageDifficulty: 'high', questions: [], knowingCorrect: 3, applyingCorrect: 3, reasoningCorrect: 3, totalCorrect: 9, passed: true, weightedScore: 13.5 },
      { stageNumber: 3, stageDifficulty: 'high', questions: [], knowingCorrect: 4, applyingCorrect: 4, reasoningCorrect: 3, totalCorrect: 11, passed: true, weightedScore: 16.5 },
    ];

    const conclusions = generateConclusions(stages);
    expect(conclusions.overall.score).toBe(83);
    expect(conclusions.overall.description).toContain('Knowing');
    expect(conclusions.knowing.score).toBe(92);
    expect(conclusions.applying.score).toBe(83);
    expect(conclusions.reasoning.score).toBe(75);
  });
});

// ===== detectMASTAnomalies =====

describe('MAST Engine - Anomaly Detection', () => {
  it('should detect too fast responses', () => {
    const responses = Array(6).fill({ timeSpentMs: 2000, isCorrect: true });
    expect(detectMASTAnomalies(responses)).toContain('MAST_TOO_FAST_MULTIPLE');
  });

  it('should detect all fast correct', () => {
    const responses = Array(6).fill({ timeSpentMs: 4000, isCorrect: true });
    expect(detectMASTAnomalies(responses)).toContain('MAST_ALL_FAST_CORRECT');
  });

  it('should not flag normal responses', () => {
    const responses = [
      { timeSpentMs: 30000, isCorrect: true },
      { timeSpentMs: 45000, isCorrect: false },
      { timeSpentMs: 25000, isCorrect: true },
    ];
    expect(detectMASTAnomalies(responses)).toHaveLength(0);
  });
});
