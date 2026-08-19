import { Timestamp } from 'firebase/firestore';

// ── KPS Difficulty Levels (7 levels) ──
export type KPSDifficultyLevel =
  | 'tetap_rendah'
  | 'rendah'
  | 'menengah_lebih_rendah'
  | 'menengah'
  | 'menengah_lebih_tinggi'
  | 'tinggi'
  | 'tetap_tinggi';

// ── KPS Indicators (7 Science Process Skills) ──
export type KPSIndicator =
  | 'merumuskan_masalah'
  | 'membuat_hipotesis'
  | 'mengontrol_variabel'
  | 'merancang_investigasi'
  | 'mengumpulkan_mencatat_data'
  | 'menganalisis_menginterpretasi_data'
  | 'membuat_kesimpulan';

// ── Stage Path ──
export type KPSStagePath = 'tinggi' | 'rendah';

// ── Question Types ──
export type KPSQuestionType =
  | 'multiple_choice'
  | 'complex_multiple_choice'
  | 'true_false'
  | 'complex_true_false'
  | 'matching';

// ── Stimulus (context passage for a set of 7 questions) ──
export interface KPSStimulus {
  id: string;
  level: KPSDifficultyLevel;
  stage: 1 | 2 | 3;
  title: string;
  content: string;
  topic: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
}

// ── Question base (shared across all types) ──
export interface KPSQuestionBase {
  id: string;
  stimulusId: string;
  indicator: KPSIndicator;
  stage: 1 | 2 | 3;
  difficultyLevel: KPSDifficultyLevel;
  questionType: KPSQuestionType;
  stem: string;
  explanation: string;
  order: number;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
  usageCount: number;
  avgCorrectRate: number;
}

// ── Multiple Choice (single correct) ──
export interface KPSMultipleChoice extends KPSQuestionBase {
  questionType: 'multiple_choice';
  options: Record<string, string>;
  correctAnswer: string;
}

// ── Complex Multiple Choice (multiple correct) ──
export interface KPSComplexMC extends KPSQuestionBase {
  questionType: 'complex_multiple_choice';
  options: Record<string, string>;
  correctAnswers: string[];
  partialCredit: boolean;
}

// ── True/False (single statement) ──
export interface KPSTrueFalse extends KPSQuestionBase {
  questionType: 'true_false';
  statement: string;
  correctAnswer: boolean;
}

// ── Complex True/False (multiple statements) ──
export interface KPSComplexTF extends KPSQuestionBase {
  questionType: 'complex_true_false';
  statements: Array<{
    id: string;
    text: string;
    correctAnswer: boolean;
  }>;
  requireAll: boolean;
}

// ── Matching ──
export interface KPSMatching extends KPSQuestionBase {
  questionType: 'matching';
  premises: Array<{ id: string; text: string }>;
  matchingOptions: Array<{ id: string; text: string }>;
  correctMatches: Record<string, string>;
}

// ── Union type ──
export type KPSQuestion =
  | KPSMultipleChoice
  | KPSComplexMC
  | KPSTrueFalse
  | KPSComplexTF
  | KPSMatching;

// ── Client-safe question (no correct answers) ──
export type KPSQuestionClient = Omit<KPSMultipleChoice, 'correctAnswer'> & { correctAnswer?: never }
  | Omit<KPSComplexMC, 'correctAnswers'> & { correctAnswers?: never }
  | Omit<KPSTrueFalse, 'correctAnswer'> & { correctAnswer?: never }
  | Omit<KPSComplexTF, 'statements'> & { statements: Array<{ id: string; text: string }> }
  | Omit<KPSMatching, 'correctMatches'> & { correctMatches?: never };

// ── Per-question response ──
export interface KPSQuestionResponse {
  questionId: string;
  indicator: KPSIndicator;
  questionType: KPSQuestionType;
  selectedAnswer?: string;
  selectedAnswers?: string[];
  booleanAnswer?: boolean;
  booleanAnswers?: Record<string, boolean>;
  matchedPairs?: Record<string, string>;
  isCorrect: boolean;
  score: number;
  timeSpentMs: number;
}

// ── Stage response (7 questions for one stage) ──
export interface KPSStageResponse {
  stage: 1 | 2 | 3;
  path: KPSStagePath | null;
  questions: KPSQuestionResponse[];
  correctCount: number;
  score: number;
  submittedAt: Timestamp;
}

// ── KPS Exam Session (Firestore document) ──
export interface KPSExamSession {
  id: string;
  studentId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'flagged';
  currentStage: 1 | 2 | 3;
  stageResponses: KPSStageResponse[];
  stage2Path: KPSStagePath | null;
  stage3Path: KPSStagePath | null;
  finalLevel: KPSDifficultyLevel | null;
  numericScore: number | null;
  indicatorScores: Record<KPSIndicator, number> | null;
  anomalyFlags: string[];
  tabSwitchCount: number;
  stimulusIds: string[];
  accessCodeId: string;
}

// ── Access Code (admin-created) ──
export interface KPSAccessCode {
  id: string;
  code: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  maxUses: number;
  currentUses: number;
  status: 'active' | 'expired' | 'deactivated';
  title: string;
  description: string;
}

// ── Display Constants ──

export const KPS_LEVEL_LABELS: Record<KPSDifficultyLevel, string> = {
  tetap_rendah: 'Tetap Rendah',
  rendah: 'Rendah',
  menengah_lebih_rendah: 'Menengah Lebih Rendah',
  menengah: 'Menengah',
  menengah_lebih_tinggi: 'Menengah Lebih Tinggi',
  tinggi: 'Tinggi',
  tetap_tinggi: 'Tetap Tinggi',
};

export const KPS_LEVEL_COLORS: Record<KPSDifficultyLevel, { bg: string; text: string; border: string }> = {
  tetap_rendah: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  rendah: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  menengah_lebih_rendah: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  menengah: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  menengah_lebih_tinggi: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  tinggi: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  tetap_tinggi: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export const KPS_INDICATOR_LABELS: Record<KPSIndicator, string> = {
  merumuskan_masalah: 'Merumuskan Masalah',
  membuat_hipotesis: 'Membuat Hipotesis',
  mengontrol_variabel: 'Mengontrol Variabel',
  merancang_investigasi: 'Merancang Investigasi',
  mengumpulkan_mencatat_data: 'Mengumpulkan & Mencatat Data',
  menganalisis_menginterpretasi_data: 'Menganalisis & Menginterpretasi Data',
  membuat_kesimpulan: 'Membuat Kesimpulan',
};

export const KPS_INDICATOR_ORDER: KPSIndicator[] = [
  'merumuskan_masalah',
  'membuat_hipotesis',
  'mengontrol_variabel',
  'merancang_investigasi',
  'mengumpulkan_mencatat_data',
  'menganalisis_menginterpretasi_data',
  'membuat_kesimpulan',
];

export const KPS_QUESTION_TYPE_LABELS: Record<KPSQuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  complex_multiple_choice: 'Pilihan Ganda Kompleks',
  true_false: 'Benar/Salah',
  complex_true_false: 'Benar/Salah Kompleks',
  matching: 'Menjodohkan',
};

// ── Config ──
export const KPS_CONFIG = {
  totalStages: 3,
  questionsPerStage: 7,
  totalQuestions: 21,
  totalDurationMinutes: 80,
  breakDurationMinutes: 10,
  passingThreshold: 5,
  stageTimeMinutes: 20,
} as const;
