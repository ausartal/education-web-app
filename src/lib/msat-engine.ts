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

// Stage-based predikat descriptions (from customer spec)
const STAGE_BASED_PREDIKAT_DESCRIPTIONS: Record<PredikatName, string> = {
  Istimewa:
    'Peserta uji menguasai seluruh konsep dasar kimia secara mendalam (Knowing), terampil mengaplikasikan rumus dan hukum kimia tanpa kekeliruan pada berbagai variasi soal (Applying), serta mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual non-rutin melalui penalaran ilmiah yang logis dan kritis (Reasoning).',
  Unggul:
    'Peserta uji memiliki pemahaman konsep dasar kimia yang kokoh (Knowing) dan mampu menerapkannya secara akurat pada situasi prosedural (Applying), serta mulai mampu melakukan penalaran ilmiah untuk menginterpretasikan data dan menyelesaikan masalah kontekstual tingkat menengah (Reasoning).',
  Madya:
    'Peserta uji memahami istilah dan prinsip-prinsip utama kimia (Knowing) serta mampu mengaplikasikannya pada perhitungan atau masalah sederhana yang rutin (Applying), namun penalarannya masih terbatas pada hubungan sebab-akibat langsung dan belum konsisten pada kasus terintegrasi (Reasoning).',
  Semenjana:
    'Peserta uji mengenali beberapa fakta dan definisi dasar kimia (Knowing), namun masih mengalami kesulitan atau kerap terjadi miskonsepsi saat menerapkan konsep pada soal (Applying), serta belum mampu melakukan analisis penalaran secara mandiri (Reasoning).',
  Terbatas:
    'Peserta uji hanya mengingat sebagian kecil pengetahuan kimia yang sangat parsial (Knowing), belum mampu menerapkan rumus/prinsip secara tepat (Applying), dan belum mampu menunjukkan kemampuan penalaran ilmiah (Reasoning).',
};

/**
 * Determine predikat based on stage difficulty path and S3 pass/fail.
 *
 * Logic:
 *   S3 = 'tinggi'                   → pass: Istimewa  / fail: Unggul
 *   S3 = 'medium' + S2 = 'tinggi'  → pass: Unggul    / fail: Madya
 *   S3 = 'medium' + S2 = 'rendah'  → pass: Madya     / fail: Semenjana
 *   S3 = 'rendah'                   → pass: Semenjana / fail: Terbatas
 */
export function getPredikatFromStageResults(
  stageResponses: MSATStageResponse[],
): { name: PredikatName; peringkat: number; description: string } {
  const s2 = stageResponses.find(sr => sr.stageNumber === 2);
  const s3 = stageResponses.find(sr => sr.stageNumber === 3);

  // Fallback if stages are missing
  if (!s2 || !s3) {
    const name: PredikatName = 'Terbatas';
    return { name, peringkat: 5, description: STAGE_BASED_PREDIKAT_DESCRIPTIONS[name] };
  }

  let name: PredikatName;

  if (s3.stageDifficulty === 'tinggi') {
    // Lebih Tinggi path
    name = s3.passed ? 'Istimewa' : 'Unggul';
  } else if (s3.stageDifficulty === 'medium') {
    if (s2.stageDifficulty === 'tinggi') {
      // Medium Lebih Tinggi path
      name = s3.passed ? 'Unggul' : 'Madya';
    } else {
      // Medium Lebih Rendah path
      name = s3.passed ? 'Madya' : 'Semenjana';
    }
  } else {
    // Lebih Rendah path (s3.stageDifficulty === 'rendah')
    name = s3.passed ? 'Semenjana' : 'Terbatas';
  }

  const peringkat = (['Istimewa', 'Unggul', 'Madya', 'Semenjana', 'Terbatas'].indexOf(name) + 1) as 1 | 2 | 3 | 4 | 5;
  return {
    name,
    peringkat,
    description: STAGE_BASED_PREDIKAT_DESCRIPTIONS[name],
  };
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
function getCognitiveLevel(score: number): { level: string } {
  if (score >= 75) return { level: 'Tinggi' };
  if (score >= 50) return { level: 'Sedang' };
  return { level: 'Rendah' };
}

// Detailed cognitive descriptions per level (from PENDEKATAN SIMPULAN HASIL)
const COGNITIVE_DESCRIPTIONS: Record<string, Record<string, string>> = {
  knowing: {
    Tinggi: 'Menguasai seluruh konsep dasar kimia secara mendalam dan konsisten di semua stage. Mampu mengingat, memahami, dan menjelaskan prinsip-prinsip kimia tanpa kekeliruan.',
    Sedang: 'Memahami istilah dan prinsip-prinsip utama kimia. Mampu mengenali fakta dan definisi dasar, namun masih memiliki beberapa celah pemahaman pada konsep yang lebih kompleks.',
    Rendah: 'Hanya mengingat sebagian kecil pengetahuan kimia yang sangat parsial. Pemahaman konsep dasar masih lemah dan perlu penguatan pada hafalan serta definisi.',
  },
  applying: {
    Tinggi: 'Terampil mengaplikasikan rumus dan hukum kimia tanpa kekeliruan pada berbagai variasi soal, termasuk situasi prosedural dan non-rutin.',
    Sedang: 'Mampu menerapkan konsep pada perhitungan atau masalah sederhana yang rutin. Namun masih kesulitan pada variasi baru atau situasi yang belum pernah dihadapi.',
    Rendah: 'Belum mampu menerapkan rumus dan prinsip kimia secara tepat. Masih mengalami kesulitan atau kerap terjadi miskonsepsi saat menerapkan konsep pada soal.',
  },
  reasoning: {
    Tinggi: 'Mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual non-rutin melalui penalaran ilmiah yang logis dan kritis.',
    Sedang: 'Mulai mampu melakukan penalaran ilmiah untuk menginterpretasikan data dan menyelesaikan masalah kontekstual tingkat menengah. Namun penalaran masih terbatas pada hubungan sebab-akibat langsung.',
    Rendah: 'Penalaran masih terbatas pada hubungan sebab-akibat langsung dan belum konsisten pada kasus terintegrasi. Belum mampu melakukan analisis penalaran secara mandiri.',
  },
};

// Stage path description helper
function getStagePathDescription(stageResponses: MSATStageResponse[]): string {
  const paths: string[] = [];
  for (const sr of stageResponses) {
    const status = sr.passed ? 'lulus' : 'tidak lulus';
    paths.push(`Stage ${sr.stageNumber} (${sr.stageDifficulty}): ${sr.totalCorrect}/12 benar — ${status}`);
  }
  return paths.join('; ');
}

/**
 * Generate all 4 conclusions for the exam results.
 * Overall predikat is determined by stage difficulty path + S3 pass/fail.
 */
export function generateConclusions(
  stageResponses: MSATStageResponse[],
  _predicates?: MSATAccessCode['predicates'],
): MSATConclusions {
  const finalScore = calculateFinalScore(stageResponses);
  const { name: predikat, description: overallDesc } = getPredikatFromStageResults(stageResponses);
  const cognitive = calculateCognitiveScores(stageResponses);

  const knowingLevel = getCognitiveLevel(cognitive.knowing);
  const applyingLevel = getCognitiveLevel(cognitive.applying);
  const reasoningLevel = getCognitiveLevel(cognitive.reasoning);

  const kDesc = COGNITIVE_DESCRIPTIONS.knowing[knowingLevel.level];
  const aDesc = COGNITIVE_DESCRIPTIONS.applying[applyingLevel.level];
  const rDesc = COGNITIVE_DESCRIPTIONS.reasoning[reasoningLevel.level];

  return {
    overall: {
      score: finalScore,
      predikat,
      description: overallDesc,
    },
    knowing: {
      score: cognitive.knowing,
      level: knowingLevel.level,
      description: kDesc,
    },
    applying: {
      score: cognitive.applying,
      level: applyingLevel.level,
      description: aDesc,
    },
    reasoning: {
      score: cognitive.reasoning,
      level: reasoningLevel.level,
      description: rDesc,
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
