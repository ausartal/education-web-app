import type {
  MSATStageDifficulty,
  MSATStageResponse,
  MSATStageAnswer,
  MSATConclusions,
  MSATAccessCode,
  MSATCognitiveDomain,
  PredikatName,
} from '@/types/msat';

// ===== Stage Weight Multiplier =====
const STAGE_WEIGHTS: Record<MSATStageDifficulty, number> = {
  rendah: 1.0,
  medium: 1.2,
  tinggi: 1.5,
};

// ===== Threshold =====
const PASS_RATE = 0.6; // 60%

/**
 * Calculate stage result from 12 answers.
 * Returns K/A/R counts, total, pass/fail, and weighted score.
 */
export function calculateStageResult(
  stageNumber: 1 | 2 | 3,
  stageDifficulty: MSATStageDifficulty,
  answers: MSATStageAnswer[],
): MSATStageResponse {
  let knowingCorrect = 0;
  let applyingCorrect = 0;
  let reasoningCorrect = 0;

  for (const ans of answers) {
    if (!ans.isCorrect) continue;
    if (ans.cognitiveDomain === 'knowing') knowingCorrect++;
    else if (ans.cognitiveDomain === 'applying') applyingCorrect++;
    else if (ans.cognitiveDomain === 'reasoning') reasoningCorrect++;
  }

  const totalCorrect = knowingCorrect + applyingCorrect + reasoningCorrect;
  const passed = totalCorrect >= Math.ceil(12 * PASS_RATE); // ≥8/12
  const weight = STAGE_WEIGHTS[stageDifficulty];
  const weightedScore = totalCorrect * weight;

  return {
    stageNumber,
    stageDifficulty,
    questions: answers,
    knowingCorrect,
    applyingCorrect,
    reasoningCorrect,
    totalCorrect,
    passed,
    weightedScore,
  };
}

/**
 * Determine next stage difficulty based on current difficulty and pass/fail.
 *
 * Branching logic (60% threshold):
 *   Stage 1: always medium
 *     ≥60% → Stage 2: tinggi, <60% → Stage 2: rendah
 *
 *   Stage 2: tinggi
 *     ≥60% → Stage 3: tinggi, <60% → Stage 3: medium (lebih tinggi)
 *   Stage 2: rendah
 *     ≥60% → Stage 3: medium (lebih rendah), <60% → Stage 3: rendah
 *
 *   Stage 3: final, no branching
 */
export function getNextStageDifficulty(
  currentStage: 1 | 2,
  currentDifficulty: MSATStageDifficulty,
  passed: boolean,
): MSATStageDifficulty {
  if (currentStage === 1) {
    return passed ? 'tinggi' : 'rendah';
  }

  // Stage 2
  if (currentDifficulty === 'tinggi') {
    return passed ? 'tinggi' : 'medium';
  }

  // currentDifficulty === 'rendah'
  return passed ? 'medium' : 'rendah';
}

/**
 * Calculate final score (0–100).
 * Score = (Σ weightedScores / Σ maxPossibleWeightedScores) × 100
 */
export function calculateFinalScore(stageResponses: MSATStageResponse[]): number {
  if (stageResponses.length === 0) return 0;

  let totalWeighted = 0;
  let totalMaxPossible = 0;

  for (const sr of stageResponses) {
    totalWeighted += sr.weightedScore;
    totalMaxPossible += 12 * STAGE_WEIGHTS[sr.stageDifficulty];
  }

  if (totalMaxPossible === 0) return 0;
  return Math.round((totalWeighted / totalMaxPossible) * 100);
}

/**
 * Determine predikat based on score and predicates config.
 */
export function getPredikat(
  score: number,
  predicates: MSATAccessCode['predicates'],
): { name: PredikatName; peringkat: number; description: string } {
  const entries: [PredikatName, keyof MSATAccessCode['predicates'], number][] = [
    ['Istimewa', 'istimewa', 1],
    ['Unggul', 'unggul', 2],
    ['Madya', 'madya', 3],
    ['Semenjana', 'semenjana', 4],
    ['Terbatas', 'terbatas', 5],
  ];

  for (const [name, key, peringkat] of entries) {
    const pred = predicates[key];
    if (score >= pred.min && score <= pred.max) {
      return { name, peringkat, description: pred.description };
    }
  }

  // Fallback
  return { name: 'Terbatas', peringkat: 5, description: predicates.terbatas.description };
}

/**
 * Calculate cognitive sub-scores (independen per domain).
 * Knowing% = (ΣK / (4 × N_stages)) × 100
 */
export function calculateCognitiveScores(stageResponses: MSATStageResponse[]): {
  knowing: number;
  applying: number;
  reasoning: number;
} {
  const n = stageResponses.length;
  if (n === 0) return { knowing: 0, applying: 0, reasoning: 0 };

  let totalK = 0;
  let totalA = 0;
  let totalR = 0;

  for (const sr of stageResponses) {
    totalK += sr.knowingCorrect;
    totalA += sr.applyingCorrect;
    totalR += sr.reasoningCorrect;
  }

  const max = 4 * n; // 4 per domain per stage
  return {
    knowing: Math.round((totalK / max) * 100),
    applying: Math.round((totalA / max) * 100),
    reasoning: Math.round((totalR / max) * 100),
  };
}

/**
 * Get cognitive level description based on score percentage.
 */
function getCognitiveLevel(score: number): { level: string; description: string } {
  if (score >= 75) {
    return { level: 'Tinggi', description: '' };
  }
  if (score >= 50) {
    return { level: 'Sedang', description: '' };
  }
  return { level: 'Rendah', description: '' };
}

const COGNITIVE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  knowing: {
    Tinggi: 'Menguasai konsep dasar kimia secara mendalam dan konsisten di semua stage.',
    Sedang: 'Memahami sebagian besar konsep dasar, namun ada beberapa celah pemahaman.',
    Rendah: 'Pemahaman konsep dasar masih lemah, perlu penguatan pada hafalan dan definisi.',
  },
  applying: {
    Tinggi: 'Terampil mengaplikasikan rumus dan hukum kimia pada berbagai variasi soal.',
    Sedang: 'Mampu menerapkan konsep pada soal rutin, namun masih kesulitan pada variasi baru.',
    Rendah: 'Belum mampu menerapkan rumus/prinsip secara tepat, perlu latihan prosedural.',
  },
  reasoning: {
    Tinggi: 'Mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual.',
    Sedang: 'Mulai mampu melakukan penalaran ilmiah, namun masih terbatas pada kasus sederhana.',
    Rendah: 'Penalaran masih terbatas pada hubungan sebab-akibat langsung, belum mampu analisis mandiri.',
  },
};

/**
 * Generate all 4 conclusions for the exam results.
 */
export function generateConclusions(
  stageResponses: MSATStageResponse[],
  predicates: MSATAccessCode['predicates'],
): MSATConclusions {
  const finalScore = calculateFinalScore(stageResponses);
  const { name: predikat, description: overallDesc } = getPredikat(finalScore, predicates);
  const cognitive = calculateCognitiveScores(stageResponses);

  const knowingLevel = getCognitiveLevel(cognitive.knowing);
  const applyingLevel = getCognitiveLevel(cognitive.applying);
  const reasoningLevel = getCognitiveLevel(cognitive.reasoning);

  return {
    overall: {
      score: finalScore,
      predikat,
      description: overallDesc,
    },
    knowing: {
      score: cognitive.knowing,
      level: knowingLevel.level,
      description: COGNITIVE_DESCRIPTIONS.knowing[knowingLevel.level],
    },
    applying: {
      score: cognitive.applying,
      level: applyingLevel.level,
      description: COGNITIVE_DESCRIPTIONS.applying[applyingLevel.level],
    },
    reasoning: {
      score: cognitive.reasoning,
      level: reasoningLevel.level,
      description: COGNITIVE_DESCRIPTIONS.reasoning[reasoningLevel.level],
    },
  };
}

/**
 * Detect anomaly flags based on answer patterns.
 */
export function detectAnomalies(stageResponses: MSATStageResponse[]): string[] {
  const flags: string[] = [];

  for (const sr of stageResponses) {
    const totalTime = sr.questions.reduce((sum, q) => sum + q.timeSpentMs, 0);
    const avgTimePerQuestion = totalTime / sr.questions.length;

    // Too fast: average < 5 seconds per question
    if (avgTimePerQuestion < 5000 && sr.totalCorrect >= 8) {
      flags.push(`TOO_FAST_STAGE_${sr.stageNumber}`);
    }

    // All correct with very fast time
    if (sr.totalCorrect === 12 && avgTimePerQuestion < 10000) {
      flags.push(`PERFECT_FAST_STAGE_${sr.stageNumber}`);
    }
  }

  // Sudden performance drop between stages
  if (stageResponses.length >= 2) {
    for (let i = 1; i < stageResponses.length; i++) {
      const prev = stageResponses[i - 1];
      const curr = stageResponses[i];
      if (prev.totalCorrect >= 10 && curr.totalCorrect <= 3) {
        flags.push(`SUDDEN_DROP_STAGE_${prev.stageNumber}_TO_${curr.stageNumber}`);
      }
    }
  }

  return flags;
}

/**
 * Get stage weight for a given difficulty.
 */
export function getStageWeight(difficulty: MSATStageDifficulty): number {
  return STAGE_WEIGHTS[difficulty];
}

/**
 * Check if student passed a stage (≥60%).
 */
export function hasPassedStage(totalCorrect: number): boolean {
  return totalCorrect >= Math.ceil(12 * PASS_RATE);
}
