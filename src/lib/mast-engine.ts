import {
  MASTStageDifficulty,
  MASTPredikat,
  MASTStageResponse,
  MASTConclusions,
  MAST_STAGE_MULTIPLIER,
  MAST_PASS_THRESHOLD,
  MAST_PREDIKAT_RANGES,
} from '@/types/mast';

// ===== Stage Branching =====

/** Tentukan difficulty stage berikutnya berdasarkan hasil stage saat ini */
export function getNextStageDifficulty(
  currentStage: 1 | 2 | 3,
  currentDifficulty: MASTStageDifficulty,
  passed: boolean,
): MASTStageDifficulty | null {
  if (currentStage === 3) return null; // stage terakhir

  if (currentStage === 1) {
    return passed ? 'high' : 'low';
  }

  // Stage 2
  if (currentDifficulty === 'high') {
    return passed ? 'high' : 'medium';
  }
  // currentDifficulty === 'low'
  return passed ? 'medium' : 'low';
}

// ===== Stage Scoring =====

/** Hitung skor 1 stage dari 12 jawaban */
export function scoreStage(
  stageNumber: 1 | 2 | 3,
  stageDifficulty: MASTStageDifficulty,
  answers: { questionId: string; cognitiveDomain: 'knowing' | 'applying' | 'reasoning'; isCorrect: boolean }[],
): MASTStageResponse {
  let knowingCorrect = 0;
  let applyingCorrect = 0;
  let reasoningCorrect = 0;

  for (const a of answers) {
    if (!a.isCorrect) continue;
    if (a.cognitiveDomain === 'knowing') knowingCorrect++;
    else if (a.cognitiveDomain === 'applying') applyingCorrect++;
    else reasoningCorrect++;
  }

  const totalCorrect = knowingCorrect + applyingCorrect + reasoningCorrect;
  const passed = totalCorrect >= MAST_PASS_THRESHOLD;
  const multiplier = MAST_STAGE_MULTIPLIER[stageDifficulty];
  const weightedScore = totalCorrect * multiplier;

  return {
    stageNumber,
    stageDifficulty,
    questions: answers.map((a) => ({
      questionId: a.questionId,
      cognitiveDomain: a.cognitiveDomain,
      selectedAnswer: 'A' as const, // placeholder, caller fills real answers
      isCorrect: a.isCorrect,
      timeSpentMs: 0,
    })),
    knowingCorrect,
    applyingCorrect,
    reasoningCorrect,
    totalCorrect,
    passed,
    weightedScore,
  };
}

// ===== Final Score =====

/** Hitung skor akhir 0–100 dari semua stage responses */
export function calculateFinalScore(stageResponses: MASTStageResponse[]): number {
  if (stageResponses.length === 0) return 0;

  const totalWeighted = stageResponses.reduce((sum, s) => sum + s.weightedScore, 0);
  const maxPossible = stageResponses.reduce(
    (sum, s) => sum + 12 * MAST_STAGE_MULTIPLIER[s.stageDifficulty],
    0,
  );

  return maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;
}

// ===== Predikat =====

/** Tentukan predikat dari skor 0–100 */
export function getPredikat(score: number): { predikat: MASTPredikat; peringkat: number } {
  for (const range of MAST_PREDIKAT_RANGES) {
    if (score >= range.min && score <= range.max) {
      return { predikat: range.predikat, peringkat: range.peringkat };
    }
  }
  return { predikat: 'Terbatas', peringkat: 5 };
}

// ===== Cognitive Sub-scores =====

/** Hitung persentase penguasaan per domain kognitif */
export function calculateCognitiveScores(stageResponses: MASTStageResponse[]): {
  knowing: number;
  applying: number;
  reasoning: number;
} {
  const n = stageResponses.length;
  if (n === 0) return { knowing: 0, applying: 0, reasoning: 0 };

  const totalK = stageResponses.reduce((sum, s) => sum + s.knowingCorrect, 0);
  const totalA = stageResponses.reduce((sum, s) => sum + s.applyingCorrect, 0);
  const totalR = stageResponses.reduce((sum, s) => sum + s.reasoningCorrect, 0);

  return {
    knowing: Math.round((totalK / (4 * n)) * 100),
    applying: Math.round((totalA / (4 * n)) * 100),
    reasoning: Math.round((totalR / (4 * n)) * 100),
  };
}

// ===== Simpulan Descriptions =====

const OVERALL_DESCRIPTIONS: Record<MASTPredikat, string> = {
  Istimewa:
    'Menguasai seluruh konsep dasar kimia secara mendalam (Knowing), terampil mengaplikasikan rumus dan hukum kimia tanpa kekeliruan (Applying), serta mampu menganalisis masalah kompleks melalui penalaran ilmiah yang logis dan kritis (Reasoning).',
  Unggul:
    'Memiliki pemahaman konsep dasar kimia yang kokoh (Knowing) dan mampu menerapkannya secara akurat (Applying), serta mulai mampu melakukan penalaran ilmiah tingkat menengah (Reasoning).',
  Madya:
    'Memahami istilah dan prinsip-prinsip utama kimia (Knowing) serta mampu mengaplikasikannya pada perhitungan sederhana (Applying), namun penalaran masih terbatas pada hubungan sebab-akibat langsung (Reasoning).',
  Semenjana:
    'Mengenali beberapa fakta dan definisi dasar kimia (Knowing), namun masih mengalami kesulitan saat menerapkan konsep (Applying), serta belum mampu melakukan analisis penalaran secara mandiri (Reasoning).',
  Terbatas:
    'Hanya mengingat sebagian kecil pengetahuan kimia yang sangat parsial (Knowing), belum mampu menerapkan rumus/prinsip secara tepat (Applying), dan belum mampu menunjukkan kemampuan penalaran ilmiah (Reasoning).',
};

function getCognitiveLevel(score: number): 'Tinggi' | 'Sedang' | 'Rendah' {
  if (score >= 75) return 'Tinggi';
  if (score >= 50) return 'Sedang';
  return 'Rendah';
}

const KNOWING_DESCRIPTIONS: Record<string, string> = {
  Tinggi: 'Menguasai konsep dasar kimia secara mendalam dan konsisten di semua stage.',
  Sedang: 'Memahami sebagian besar konsep dasar, namun ada beberapa celah pemahaman.',
  Rendah: 'Pemahaman konsep dasar masih lemah, perlu penguatan pada hafalan dan definisi.',
};

const APPLYING_DESCRIPTIONS: Record<string, string> = {
  Tinggi: 'Terampil mengaplikasikan rumus dan hukum kimia pada berbagai variasi soal.',
  Sedang: 'Mampu menerapkan konsep pada soal rutin, namun masih kesulitan pada variasi baru.',
  Rendah: 'Belum mampu menerapkan rumus/prinsip secara tepat, perlu latihan prosedural.',
};

const REASONING_DESCRIPTIONS: Record<string, string> = {
  Tinggi: 'Mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual.',
  Sedang: 'Mulai mampu melakukan penalaran ilmiah, namun masih terbatas pada kasus sederhana.',
  Rendah: 'Penalaran masih terbatas pada hubungan sebab-akibat langsung, belum mampu analisis mandiri.',
};

/** Generate 4 simpulan lengkap */
export function generateConclusions(stageResponses: MASTStageResponse[]): MASTConclusions {
  const finalScore = calculateFinalScore(stageResponses);
  const { predikat } = getPredikat(finalScore);
  const cognitive = calculateCognitiveScores(stageResponses);

  const knowingLevel = getCognitiveLevel(cognitive.knowing);
  const applyingLevel = getCognitiveLevel(cognitive.applying);
  const reasoningLevel = getCognitiveLevel(cognitive.reasoning);

  return {
    overall: {
      score: finalScore,
      description: OVERALL_DESCRIPTIONS[predikat],
    },
    knowing: {
      score: cognitive.knowing,
      description: KNOWING_DESCRIPTIONS[knowingLevel],
    },
    applying: {
      score: cognitive.applying,
      description: APPLYING_DESCRIPTIONS[applyingLevel],
    },
    reasoning: {
      score: cognitive.reasoning,
      description: REASONING_DESCRIPTIONS[reasoningLevel],
    },
  };
}

// ===== Anomaly Detection =====

export function detectMASTAnomalies(
  responses: { timeSpentMs: number; isCorrect: boolean }[],
): string[] {
  const flags: string[] = [];

  const tooFast = responses.filter((r) => r.timeSpentMs < 3000);
  if (tooFast.length >= 5) flags.push('MAST_TOO_FAST_MULTIPLE');

  const fastCorrect = responses.filter((r) => r.timeSpentMs < 5000 && r.isCorrect);
  if (fastCorrect.length >= 5) flags.push('MAST_ALL_FAST_CORRECT');

  return flags;
}
