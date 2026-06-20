import { Difficulty, ConfidenceLabel, MSATTierPath, MSATDifficulty, ComprehensionCategory, CRIResponse } from '@/types/firestore';

// ── Legacy constants (kept for backward compat with old exam pages) ──
const THETA_STEP = 0.3;
const THETA_MIN = -3;
const THETA_MAX = 3;
export const STAGES = 3;
export const QUESTIONS_PER_STAGE = 7;
export const TOTAL_QUESTIONS = STAGES * QUESTIONS_PER_STAGE;

const TIME_THRESHOLDS: Record<Difficulty, { fast: number; slow: number }> = {
  easy: { fast: 15000, slow: 60000 },
  moderate: { fast: 20000, slow: 90000 },
  hard: { fast: 30000, slow: 120000 },
};

export function getNextDifficulty(current: Difficulty, isCorrect: boolean): Difficulty {
  if (isCorrect) {
    if (current === 'easy') return 'moderate';
    if (current === 'moderate') return 'hard';
    return 'hard';
  } else {
    if (current === 'hard') return 'moderate';
    if (current === 'moderate') return 'easy';
    return 'easy';
  }
}

export function updateTheta(currentTheta: number, isCorrect: boolean, difficulty: Difficulty): number {
  const weight = difficulty === 'hard' ? 1.2 : difficulty === 'moderate' ? 1.0 : 0.8;
  const delta = isCorrect ? THETA_STEP * weight : -THETA_STEP * weight;
  return Math.max(THETA_MIN, Math.min(THETA_MAX, currentTheta + delta));
}

export function calculateConfidence(isCorrect: boolean, timeSpentMs: number, difficulty: Difficulty): { score: number; label: ConfidenceLabel } {
  const thresholds = TIME_THRESHOLDS[difficulty];
  const isFast = timeSpentMs < thresholds.fast;
  const isSlow = timeSpentMs > thresholds.slow;
  if (isCorrect && isFast) return { score: 1.0, label: 'mahir' };
  if (isCorrect && isSlow) return { score: 0.6, label: 'paham_lambat' };
  if (isCorrect) return { score: 0.8, label: 'mahir' };
  if (!isCorrect && isFast) return { score: 0.2, label: 'tebak' };
  if (!isCorrect && isSlow) return { score: 0.0, label: 'tidak_paham' };
  return { score: 0.3, label: 'tidak_paham' };
}

export function getCurrentStage(questionIndex: number): number {
  return Math.floor(questionIndex / QUESTIONS_PER_STAGE) + 1;
}

export function getProficiencyLevel(theta: number): 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi' {
  if (theta >= 2) return 'sangat_tinggi';
  if (theta >= 0.5) return 'tinggi';
  if (theta >= -0.5) return 'sedang';
  return 'rendah';
}

export function detectAnomalies(responses: { timeSpentMs: number; isCorrect: boolean }[]): string[] {
  const flags: string[] = [];
  const tooFast = responses.filter((r) => r.timeSpentMs < 3000);
  if (tooFast.length >= 5) flags.push('TOO_FAST_MULTIPLE');
  const fastCorrect = responses.filter((r) => r.timeSpentMs < 5000 && r.isCorrect);
  if (fastCorrect.length >= 5) flags.push('ALL_FAST_CORRECT');
  let consecutiveRight = 0;
  let consecutiveWrong = 0;
  for (const r of responses) {
    if (r.isCorrect) {
      consecutiveRight++;
      consecutiveWrong = 0;
    } else {
      consecutiveWrong++;
      consecutiveRight = 0;
    }
    if (consecutiveWrong >= 3 && consecutiveRight === 0) {
      flags.push('SUDDEN_DROP');
      break;
    }
  }
  return flags;
}

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

// ── NEW: MSAT 3-tier adaptive branching ──

/** T2 path determined by T1 result */
export function getT2Path(t1Correct: boolean): 'mudah' | 'sukar' {
  return t1Correct ? 'sukar' : 'mudah';
}

/** T3 tierPath determined by T1 + T2 result */
export function getT3Path(t1Correct: boolean, t2Correct: boolean): MSATTierPath {
  if (!t1Correct && !t2Correct) return 'sangat_mudah';
  if (!t1Correct && t2Correct) return 'sedang_a';
  if (t1Correct && !t2Correct) return 'sedang_b';
  return 'sangat_sukar'; // t1 right + t2 right
}

/** Encode answer pattern as string (B=Benar/correct, S=Salah/wrong) */
export function encodePattern(t1: boolean, t2: boolean, t3: boolean): string {
  return `${t1 ? 'B' : 'S'}${t2 ? 'B' : 'S'}${t3 ? 'B' : 'S'}`;
}

/** Map answer pattern + CRI to comprehension category */
export function getComprehensionCategory(pattern: string, cri: CRIResponse): ComprehensionCategory {
  switch (pattern) {
    case 'BBB': return 'paham_konsep';
    case 'SBB': return 'paham_sebagian';
    case 'BBS': return 'paham_sebagian';
    case 'BSB': return 'paham_sebagian';
    case 'SBS': return 'tidak_paham';
    case 'SSB': return 'tidak_paham';
    case 'SSS': return cri === 'yakin' ? 'miskonsepsi' : 'tidak_paham';
    case 'BSS': return 'hasil_nebak';
    default: return 'tidak_paham';
  }
}

/** Difficulty weights for scoring */
const DIFFICULTY_WEIGHTS: Record<MSATDifficulty, number> = {
  sangat_mudah: 1,
  mudah: 2,
  sedang: 3,
  sukar: 4,
  sangat_sukar: 5,
};

/** TierPath → difficulty mapping */
const TIER_PATH_DIFFICULTY: Record<MSATTierPath, MSATDifficulty> = {
  anchor: 'sedang',
  mudah: 'mudah',
  sukar: 'sukar',
  sangat_mudah: 'sangat_mudah',
  sedang_a: 'sedang',
  sedang_b: 'sedang',
  sangat_sukar: 'sangat_sukar',
};

/** Domain score 0-100 from the 3 tier responses */
export function getDomainScore(
  t1Path: MSATTierPath, t1Correct: boolean,
  t2Path: MSATTierPath, t2Correct: boolean,
  t3Path: MSATTierPath, t3Correct: boolean,
): number {
  const pairs: [MSATTierPath, boolean][] = [[t1Path, t1Correct], [t2Path, t2Correct], [t3Path, t3Correct]];
  let earned = 0;
  let maxPossible = 0;
  for (const [path, correct] of pairs) {
    const w = DIFFICULTY_WEIGHTS[TIER_PATH_DIFFICULTY[path]];
    maxPossible += w;
    if (correct) earned += w;
  }
  return maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
}

/** Convert avg domain scores to 0-120 final score (TOEFL-style) */
export function getNumericScore(domainScores: number[]): number {
  if (domainScores.length === 0) return 0;
  const avg = domainScores.reduce((a, b) => a + b, 0) / domainScores.length;
  return Math.round((avg / 100) * 120);
}

/** Display label for comprehension category */
export const COMPREHENSION_LABELS: Record<ComprehensionCategory, string> = {
  paham_konsep: 'Paham Konsep',
  paham_sebagian: 'Paham Sebagian',
  tidak_paham: 'Tidak Paham',
  miskonsepsi: 'Miskonsepsi',
  hasil_nebak: 'Hasil Nebak',
};

/** Color classes for comprehension categories */
export const COMPREHENSION_COLORS: Record<ComprehensionCategory, { bg: string; text: string; border: string }> = {
  paham_konsep: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  paham_sebagian: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  tidak_paham: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  miskonsepsi: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  hasil_nebak: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};
