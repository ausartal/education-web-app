import {
  KPSDifficultyLevel,
  KPSIndicator,
  KPSStagePath,
  KPSQuestion,
  KPSQuestionResponse,
  KPSStageResponse,
  KPS_CONFIG,
  KPS_INDICATOR_ORDER,
} from '@/types/kps';

// ── Adaptive Branching ──

/**
 * Tentukan path stage berikutnya berdasarkan performa stage saat ini.
 * Stage 1: menentukan stage 2 path (tinggi/rendah)
 * Stage 2+3: menentukan stage 3 path
 */
export function getNextStagePath(
  currentStage: 1 | 2 | 3,
  stage2Path: KPSStagePath | null,
  correctCount: number,
): KPSStagePath {
  const threshold = KPS_CONFIG.passingThreshold;
  const passed = correctCount >= threshold;

  if (currentStage === 1) {
    return passed ? 'tinggi' : 'rendah';
  }

  // Stage 2: determines stage 3 path
  return passed ? 'tinggi' : 'rendah';
}

/**
 * Mapping path → level soal yang diambil untuk stage berikutnya.
 */
export function getLevelForStagePath(stage: 1 | 2 | 3, path: KPSStagePath | null): KPSDifficultyLevel {
  if (stage === 1) return 'menengah';
  if (stage === 2) return path === 'tinggi' ? 'tinggi' : 'rendah';
  // Stage 3: depends on both stage 2 path and stage 3 path
  if (path === 'tinggi') return 'tetap_tinggi';
  return 'tetap_rendah';
}

/**
 * Get the actual level for stage 3 based on stage2Path and stage3Path combination.
 */
export function getStage3Level(stage2Path: KPSStagePath, stage3Path: KPSStagePath): KPSDifficultyLevel {
  // Stage 3 reuses the same question pool as stage 2.
  // Final level is determined by the path combination + numeric score in determineFinalLevel().
  if (stage3Path === 'tinggi') return 'tinggi';
  return 'rendah';
}

// ── Scoring ──

/**
 * Score a single question response. Returns 0.0-1.0.
 * Supports partial credit for complex types.
 */
export function scoreQuestion(question: KPSQuestion, response: KPSQuestionResponse): number {
  switch (question.questionType) {
    case 'multiple_choice':
      return response.selectedAnswer === question.correctAnswer ? 1.0 : 0.0;

    case 'complex_multiple_choice': {
      if (!response.selectedAnswers) return 0.0;
      const correct = question.correctAnswers;
      const selected = response.selectedAnswers;
      if (question.partialCredit) {
        const correctSelected = selected.filter((s) => correct.includes(s)).length;
        const wrongSelected = selected.filter((s) => !correct.includes(s)).length;
        const total = correct.length;
        return Math.max(0, (correctSelected - wrongSelected) / total);
      }
      return selected.length === correct.length &&
        selected.every((s) => correct.includes(s)) ? 1.0 : 0.0;
    }

    case 'true_false':
      return response.booleanAnswer === question.correctAnswer ? 1.0 : 0.0;

    case 'complex_true_false': {
      if (!response.booleanAnswers) return 0.0;
      const stmts = question.statements;
      if (question.requireAll) {
        const allCorrect = stmts.every(
          (s) => response.booleanAnswers![s.id] === s.correctAnswer,
        );
        return allCorrect ? 1.0 : 0.0;
      }
      const correctCount = stmts.filter(
        (s) => response.booleanAnswers![s.id] === s.correctAnswer,
      ).length;
      return correctCount / stmts.length;
    }

    case 'matching': {
      if (!response.matchedPairs) return 0.0;
      const correct = question.correctMatches;
      const total = Object.keys(correct).length;
      const matched = Object.entries(response.matchedPairs).filter(
        ([premiseId, optionId]) => correct[premiseId] === optionId,
      ).length;
      return matched / total;
    }

    default:
      return 0.0;
  }
}

/**
 * Determine if a response is "correct" (score >= 1.0 for strict, or >= 0.5 for partial).
 */
export function isResponseCorrect(score: number): boolean {
  return score >= 1.0;
}

/**
 * Calculate stage score (0-100) from question responses.
 */
export function calculateStageScore(responses: KPSQuestionResponse[]): number {
  if (responses.length === 0) return 0;
  const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
  return Math.round((totalScore / responses.length) * 100);
}

/**
 * Count correct responses in a stage.
 */
export function countCorrect(responses: KPSQuestionResponse[]): number {
  return responses.filter((r) => r.isCorrect).length;
}

/**
 * Calculate per-indicator scores across all stages (0-100).
 */
export function calculateIndicatorScores(
  allResponses: KPSQuestionResponse[],
): Record<KPSIndicator, number> {
  const grouped: Record<string, KPSQuestionResponse[]> = {} as Record<string, KPSQuestionResponse[]>;

  for (const indicator of KPS_INDICATOR_ORDER) {
    grouped[indicator] = [];
  }

  for (const response of allResponses) {
    if (grouped[response.indicator]) {
      grouped[response.indicator].push(response);
    }
  }

  const result: Record<KPSIndicator, number> = {} as Record<KPSIndicator, number>;
  for (const indicator of KPS_INDICATOR_ORDER) {
    const responses = grouped[indicator];
    if (responses.length === 0) {
      result[indicator] = 0;
    } else {
      const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
      result[indicator] = Math.round((totalScore / responses.length) * 100);
    }
  }

  return result;
}

/**
 * Calculate final numeric score (0-100).
 * Weight: S1=20%, S2=30%, S3=50%
 */
export function calculateNumericScore(stageResponses: KPSStageResponse[]): number {
  const weights = [0.2, 0.3, 0.5];
  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < stageResponses.length; i++) {
    const weight = weights[i] || 0;
    weightedSum += stageResponses[i].score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Determine final level from stage paths + numeric score.
 */
export function determineFinalLevel(
  stage2Path: KPSStagePath,
  stage3Path: KPSStagePath,
  numericScore: number,
): KPSDifficultyLevel {
  // Base level from path combination
  let baseLevel: KPSDifficultyLevel;
  if (stage2Path === 'tinggi' && stage3Path === 'tinggi') {
    baseLevel = numericScore >= 90 ? 'tetap_tinggi' : 'tinggi';
  } else if (stage2Path === 'tinggi' && stage3Path === 'rendah') {
    baseLevel = numericScore >= 60 ? 'menengah_lebih_tinggi' : 'menengah';
  } else if (stage2Path === 'rendah' && stage3Path === 'tinggi') {
    baseLevel = numericScore >= 50 ? 'menengah_lebih_rendah' : 'menengah';
  } else {
    baseLevel = numericScore >= 30 ? 'rendah' : 'tetap_rendah';
  }

  return baseLevel;
}

// ── Anomaly Detection ──

export function detectKPSAnomalies(responses: KPSQuestionResponse[]): string[] {
  const flags: string[] = [];

  // Too fast: < 3 seconds per question
  const tooFast = responses.filter((r) => r.timeSpentMs < 3000);
  if (tooFast.length >= 5) flags.push('TOO_FAST_MULTIPLE');

  // All fast and correct (suspicious)
  const fastCorrect = responses.filter((r) => r.timeSpentMs < 5000 && r.isCorrect);
  if (fastCorrect.length >= 10) flags.push('ALL_FAST_CORRECT');

  // Sudden drop: 3+ consecutive wrong
  let consecutiveWrong = 0;
  for (const r of responses) {
    consecutiveWrong = r.isCorrect ? 0 : consecutiveWrong + 1;
    if (consecutiveWrong >= 3) {
      flags.push('SUDDEN_DROP');
      break;
    }
  }

  return flags;
}

// ── Access Code ──

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
