import { describe, it, expect } from 'vitest';
import {
  calculateStageResult,
  getNextStageDifficulty,
  calculateFinalScore,
  getPredikatFromStageResults,
  calculateCognitiveScores,
  generateConclusions,
  detectAnomalies,
  hasPassedStage,
} from '@/lib/msat-engine';
import type { MSATStageAnswer, MSATStageResponse, MSATAccessCode, MSATCognitiveDomain, MSATStageDifficulty } from '@/types/msat';

// Helper: generate 12 answers with specified correct counts per domain
function makeAnswers(
  knowingCorrect: number,
  applyingCorrect: number,
  reasoningCorrect: number,
  timePerQuestionMs = 30000,
): MSATStageAnswer[] {
  const domains: MSATCognitiveDomain[] = [
    ...Array(4).fill('knowing') as MSATCognitiveDomain[],
    ...Array(4).fill('applying') as MSATCognitiveDomain[],
    ...Array(4).fill('reasoning') as MSATCognitiveDomain[],
  ];

  return domains.map((domain, i) => {
    let isCorrect = false;
    if (domain === 'knowing') isCorrect = i < knowingCorrect;
    else if (domain === 'applying') isCorrect = i - 4 < applyingCorrect;
    else isCorrect = i - 8 < reasoningCorrect;

    return {
      questionId: `q${i}`,
      cognitiveDomain: domain,
      selectedAnswer: 'A' as const,
      isCorrect,
      timeSpentMs: timePerQuestionMs,
    };
  });
}

describe('calculateStageResult', () => {
  it('calculates correct K/A/R counts', () => {
    const answers = makeAnswers(3, 2, 4); // 3K + 2A + 4R = 9/12
    const result = calculateStageResult(1, 'medium', answers);
    expect(result.knowingCorrect).toBe(3);
    expect(result.applyingCorrect).toBe(2);
    expect(result.reasoningCorrect).toBe(4);
    expect(result.totalCorrect).toBe(9);
  });

  it('passes when ≥8/12 correct', () => {
    const answers = makeAnswers(3, 3, 2); // 8/12
    const result = calculateStageResult(1, 'medium', answers);
    expect(result.passed).toBe(true);
  });

  it('fails when <8/12 correct', () => {
    const answers = makeAnswers(2, 2, 2); // 6/12
    const result = calculateStageResult(1, 'medium', answers);
    expect(result.passed).toBe(false);
  });

  it('applies correct stage weight', () => {
    const answers = makeAnswers(4, 4, 4); // 12/12
    const rendah = calculateStageResult(1, 'rendah', answers);
    const medium = calculateStageResult(1, 'medium', answers);
    const tinggi = calculateStageResult(1, 'tinggi', answers);
    expect(rendah.weightedScore).toBe(12 * 1.0);
    expect(medium.weightedScore).toBe(12 * 1.2);
    expect(tinggi.weightedScore).toBe(12 * 1.5);
  });
});

describe('getNextStageDifficulty', () => {
  it('Stage 1 pass → tinggi', () => {
    expect(getNextStageDifficulty(1, 'medium', true)).toBe('tinggi');
  });

  it('Stage 1 fail → rendah', () => {
    expect(getNextStageDifficulty(1, 'medium', false)).toBe('rendah');
  });

  it('Stage 2 tinggi pass → tinggi', () => {
    expect(getNextStageDifficulty(2, 'tinggi', true)).toBe('tinggi');
  });

  it('Stage 2 tinggi fail → medium', () => {
    expect(getNextStageDifficulty(2, 'tinggi', false)).toBe('medium');
  });

  it('Stage 2 rendah pass → medium', () => {
    expect(getNextStageDifficulty(2, 'rendah', true)).toBe('medium');
  });

  it('Stage 2 rendah fail → rendah', () => {
    expect(getNextStageDifficulty(2, 'rendah', false)).toBe('rendah');
  });
});

describe('calculateFinalScore', () => {
  it('calculates score for high-performing student', () => {
    const stages: MSATStageResponse[] = [
      { ...calculateStageResult(1, 'medium', makeAnswers(4, 3, 3)), stageNumber: 1, stageDifficulty: 'medium' },
      { ...calculateStageResult(2, 'tinggi', makeAnswers(3, 3, 3)), stageNumber: 2, stageDifficulty: 'tinggi' },
      { ...calculateStageResult(3, 'tinggi', makeAnswers(4, 4, 3)), stageNumber: 3, stageDifficulty: 'tinggi' },
    ];
    // S1: 10×1.2=12, S2: 9×1.5=13.5, S3: 11×1.5=16.5 → total=42, max=12×1.2+12×1.5+12×1.5=50.4
    // 42/50.4 × 100 = 83.3
    const score = calculateFinalScore(stages);
    expect(score).toBe(83);
  });

  it('returns 0 for empty stages', () => {
    expect(calculateFinalScore([])).toBe(0);
  });
});

// Helper: build a stage response with a given pass/fail status
function makeStageResponse(stageNumber: 1 | 2 | 3, passed: boolean, difficulty: MSATStageDifficulty = 'medium'): MSATStageResponse {
  const totalCorrect = passed ? 9 : 5;
  return {
    stageNumber,
    stageDifficulty: difficulty,
    questions: makeAnswers(
      passed ? 3 : 2,
      passed ? 3 : 2,
      passed ? 3 : 1,
    ),
    knowingCorrect: passed ? 3 : 2,
    applyingCorrect: passed ? 3 : 2,
    reasoningCorrect: passed ? 3 : 1,
    totalCorrect,
    passed,
    weightedScore: totalCorrect * STAGE_WEIGHTS[difficulty],
  };
}

const STAGE_WEIGHTS: Record<string, number> = { rendah: 1.0, medium: 1.2, tinggi: 1.5 };

describe('getPredikatFromStageResults', () => {
  // System A: predikat based on stage difficulty path + S3 pass/fail
  // S3='tinggi'                   → pass: Istimewa  / fail: Unggul
  // S3='medium' + S2='tinggi'    → pass: Unggul    / fail: Madya
  // S3='medium' + S2='rendah'    → pass: Madya     / fail: Semenjana
  // S3='rendah'                   → pass: Semenjana / fail: Terbatas

  it('Istimewa: S2=tinggi, S3=tinggi, S3 passed (Lebih Tinggi path)', () => {
    const stages = [
      makeStageResponse(1, true, 'medium'),
      makeStageResponse(2, true, 'tinggi'),
      makeStageResponse(3, true, 'tinggi'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Istimewa');
    expect(result.peringkat).toBe(1);
  });

  it('Unggul: S2=tinggi, S3=tinggi, S3 failed (Lebih Tinggi path)', () => {
    const stages = [
      makeStageResponse(1, true, 'medium'),
      makeStageResponse(2, true, 'tinggi'),
      makeStageResponse(3, false, 'tinggi'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Unggul');
    expect(result.peringkat).toBe(2);
  });

  it('Unggul: S2=tinggi, S3=medium, S3 passed (Medium Lebih Tinggi path)', () => {
    const stages = [
      makeStageResponse(1, true, 'medium'),
      makeStageResponse(2, true, 'tinggi'),
      makeStageResponse(3, true, 'medium'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Unggul');
    expect(result.peringkat).toBe(2);
  });

  it('Madya: S2=tinggi, S3=medium, S3 failed (Medium Lebih Tinggi path)', () => {
    const stages = [
      makeStageResponse(1, true, 'medium'),
      makeStageResponse(2, true, 'tinggi'),
      makeStageResponse(3, false, 'medium'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Madya');
    expect(result.peringkat).toBe(3);
  });

  it('Madya: S2=rendah, S3=medium, S3 passed (Medium Lebih Rendah path)', () => {
    const stages = [
      makeStageResponse(1, false, 'medium'),
      makeStageResponse(2, false, 'rendah'),
      makeStageResponse(3, true, 'medium'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Madya');
    expect(result.peringkat).toBe(3);
  });

  it('Semenjana: S2=rendah, S3=medium, S3 failed (Medium Lebih Rendah path)', () => {
    const stages = [
      makeStageResponse(1, false, 'medium'),
      makeStageResponse(2, false, 'rendah'),
      makeStageResponse(3, false, 'medium'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Semenjana');
    expect(result.peringkat).toBe(4);
  });

  it('Semenjana: S2=rendah, S3=rendah, S3 passed (Lebih Rendah path)', () => {
    const stages = [
      makeStageResponse(1, false, 'medium'),
      makeStageResponse(2, false, 'rendah'),
      makeStageResponse(3, true, 'rendah'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Semenjana');
    expect(result.peringkat).toBe(4);
  });

  it('Terbatas: S2=rendah, S3=rendah, S3 failed (Lebih Rendah path)', () => {
    const stages = [
      makeStageResponse(1, false, 'medium'),
      makeStageResponse(2, false, 'rendah'),
      makeStageResponse(3, false, 'rendah'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.name).toBe('Terbatas');
    expect(result.peringkat).toBe(5);
  });

  it('returns description from customer spec', () => {
    const stages = [
      makeStageResponse(1, true, 'medium'),
      makeStageResponse(2, true, 'tinggi'),
      makeStageResponse(3, true, 'tinggi'),
    ];
    const result = getPredikatFromStageResults(stages);
    expect(result.description).toContain('menguasai seluruh konsep dasar kimia');
  });

  it('returns Terbatas when stages are missing', () => {
    const result = getPredikatFromStageResults([]);
    expect(result.name).toBe('Terbatas');
    expect(result.peringkat).toBe(5);
  });
});

describe('calculateCognitiveScores', () => {
  it('calculates correct percentages', () => {
    const stages: MSATStageResponse[] = [
      { ...calculateStageResult(1, 'medium', makeAnswers(3, 2, 4)), stageNumber: 1, stageDifficulty: 'medium' },
      { ...calculateStageResult(2, 'tinggi', makeAnswers(4, 3, 2)), stageNumber: 2, stageDifficulty: 'tinggi' },
    ];
    const scores = calculateCognitiveScores(stages);
    // K: (3+4)/(4×2) = 87.5%, A: (2+3)/(4×2) = 62.5%, R: (4+2)/(4×2) = 75%
    expect(scores.knowing).toBe(88);
    expect(scores.applying).toBe(63);
    expect(scores.reasoning).toBe(75);
  });
});

describe('hasPassedStage', () => {
  it('passes at 8/12', () => expect(hasPassedStage(8)).toBe(true));
  it('passes at 12/12', () => expect(hasPassedStage(12)).toBe(true));
  it('fails at 7/12', () => expect(hasPassedStage(7)).toBe(false));
  it('fails at 0/12', () => expect(hasPassedStage(0)).toBe(false));
});

describe('detectAnomalies', () => {
  it('flags too-fast answers', () => {
    const stages: MSATStageResponse[] = [
      calculateStageResult(1, 'medium', makeAnswers(4, 4, 4, 2000)), // 2s per question, all correct
    ];
    const flags = detectAnomalies(stages);
    expect(flags).toContain('TOO_FAST_STAGE_1');
    expect(flags).toContain('PERFECT_FAST_STAGE_1');
  });

  it('flags sudden performance drop', () => {
    const stages: MSATStageResponse[] = [
      calculateStageResult(1, 'medium', makeAnswers(4, 3, 3)), // 10/12
      calculateStageResult(2, 'tinggi', makeAnswers(1, 1, 1)),  // 3/12
    ];
    const flags = detectAnomalies(stages);
    expect(flags).toContain('SUDDEN_DROP_STAGE_1_TO_2');
  });

  it('returns no flags for normal performance', () => {
    const stages: MSATStageResponse[] = [
      calculateStageResult(1, 'medium', makeAnswers(3, 3, 2, 30000)),
      calculateStageResult(2, 'tinggi', makeAnswers(3, 2, 3, 25000)),
    ];
    expect(detectAnomalies(stages)).toHaveLength(0);
  });
});
