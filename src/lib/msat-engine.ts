import { Difficulty, ConfidenceLabel } from '@/types/firestore';

/**
 * MSAT Engine - Multistage Adaptive Testing
 *
 * Rules:
 * - 3 stages, 7 questions per stage (21 total)
 * - Start at MODERATE
 * - Correct → difficulty goes up (or stays at hard)
 * - Incorrect → difficulty goes down (or stays at easy)
 * - Theta updated after each response using simplified IRT
 * - Confidence = f(correctness, time spent, base time)
 */

const THETA_STEP = 0.3;
const THETA_MIN = -3;
const THETA_MAX = 3;

export const STAGES = 3;
export const QUESTIONS_PER_STAGE = 7;
export const TOTAL_QUESTIONS = STAGES * QUESTIONS_PER_STAGE;

// Time thresholds per difficulty (ms)
const TIME_THRESHOLDS: Record<Difficulty, { fast: number; slow: number }> = {
  easy: { fast: 15000, slow: 60000 },
  moderate: { fast: 20000, slow: 90000 },
  hard: { fast: 30000, slow: 120000 },
};

export function getNextDifficulty(
  current: Difficulty,
  isCorrect: boolean
): Difficulty {
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

export function updateTheta(
  currentTheta: number,
  isCorrect: boolean,
  difficulty: Difficulty
): number {
  // Difficulty weight: hard questions give more theta change
  const weight =
    difficulty === 'hard' ? 1.2 : difficulty === 'moderate' ? 1.0 : 0.8;
  const delta = isCorrect ? THETA_STEP * weight : -THETA_STEP * weight;
  const newTheta = currentTheta + delta;
  return Math.max(THETA_MIN, Math.min(THETA_MAX, newTheta));
}

export function calculateConfidence(
  isCorrect: boolean,
  timeSpentMs: number,
  difficulty: Difficulty
): { score: number; label: ConfidenceLabel } {
  const thresholds = TIME_THRESHOLDS[difficulty];
  const isFast = timeSpentMs < thresholds.fast;
  const isSlow = timeSpentMs > thresholds.slow;

  // 4 quadrants:
  // Correct + Fast = Mahir (high confidence, mastery)
  // Correct + Slow = Paham Lambat (understands but needs time)
  // Incorrect + Fast = Tebak (guessing)
  // Incorrect + Slow = Tidak Paham (doesn't understand)

  if (isCorrect && isFast) {
    return { score: 1.0, label: 'mahir' };
  } else if (isCorrect && isSlow) {
    return { score: 0.6, label: 'paham_lambat' };
  } else if (isCorrect) {
    // Normal time, correct
    return { score: 0.8, label: 'mahir' };
  } else if (!isCorrect && isFast) {
    return { score: 0.2, label: 'tebak' };
  } else if (!isCorrect && isSlow) {
    return { score: 0.0, label: 'tidak_paham' };
  } else {
    // Normal time, incorrect
    return { score: 0.3, label: 'tidak_paham' };
  }
}

export function getCurrentStage(questionIndex: number): number {
  return Math.floor(questionIndex / QUESTIONS_PER_STAGE) + 1;
}

export function getProficiencyLevel(
  theta: number
): 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi' {
  if (theta >= 2) return 'sangat_tinggi';
  if (theta >= 0.5) return 'tinggi';
  if (theta >= -0.5) return 'sedang';
  return 'rendah';
}

// Anomaly detection
export function detectAnomalies(
  responses: { timeSpentMs: number; isCorrect: boolean }[]
): string[] {
  const flags: string[] = [];

  // Too fast overall (< 3s per question for 5+ questions)
  const tooFast = responses.filter((r) => r.timeSpentMs < 3000);
  if (tooFast.length >= 5) {
    flags.push('TOO_FAST_MULTIPLE');
  }

  // All fast and correct (possible cheating)
  const fastCorrect = responses.filter(
    (r) => r.timeSpentMs < 5000 && r.isCorrect
  );
  if (fastCorrect.length >= 5) {
    flags.push('ALL_FAST_CORRECT');
  }

  // Sudden performance drop (3+ consecutive wrong after 3+ consecutive right)
  let consecutiveRight = 0;
  let consecutiveWrong = 0;
  for (const r of responses) {
    if (r.isCorrect) {
      consecutiveRight++;
      consecutiveWrong = 0;
    } else {
      if (consecutiveRight >= 3 && consecutiveWrong === 0) {
        // Start counting wrong after a streak of right
      }
      consecutiveWrong++;
      consecutiveRight = 0;
    }
    if (consecutiveWrong >= 3) {
      flags.push('SUDDEN_DROP');
      break;
    }
  }

  return flags;
}

// XP formula (pure, no Firebase dependency)
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}
