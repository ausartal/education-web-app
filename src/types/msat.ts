import { Timestamp } from 'firebase/firestore';

// ===== MSAT QUESTION (from msat_question collection) =====
export type MSATDifficulty = 'sangat_mudah' | 'mudah' | 'sedang' | 'sukar' | 'sangat_sukar';
export type MSATCognitiveDomain = 'knowing' | 'applying' | 'reasoning';
export type MSATCognitiveLevel = 'L1' | 'L2' | 'L3';
export type MSATStage = 1 | 2 | 3;
export type MSATAnswerKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface MSATQuestion {
  id: string;
  module: string;
  topic: string;
  stage: MSATStage;
  difficulty: MSATDifficulty;
  tierPath: string;
  stageWeight: number;
  categoryLabel: string;
  cognitiveDomain: MSATCognitiveDomain;
  cognitiveLevel: MSATCognitiveLevel;
  questionType: 'multiple_choice';
  stem: string;
  options: Record<MSATAnswerKey, string>;
  correctAnswer: MSATAnswerKey;
  subElement: string;
  competency: string;
  order: number;
  status: 'active' | 'inactive';
  createdBy: string;
  usageCount: number;
  avgCorrectRate: number;
  createdAt: Timestamp | { _seconds: number; _nanoseconds: number };
}

// ===== MSAT ACCESS CODE (from msat_access_code collection) =====
export interface MSATPredicate {
  min: number;
  max: number;
  label: string;
  description: string;
}

export interface MSATAccessCode {
  id: string;
  code: string;
  title: string;
  description: string;
  module: string;
  totalStages: 3;
  questionsPerStage: 12;
  passingThreshold: number; // e.g. 8 (out of 12)
  stageWeights: {
    rendah: number;   // 1.0
    medium: number;   // 1.2
    tinggi: number;   // 1.5
  };
  predicates: {
    istimewa: MSATPredicate;
    unggul: MSATPredicate;
    madya: MSATPredicate;
    semenjana: MSATPredicate;
    terbatas: MSATPredicate;
  };
  maxUses: number;    // 0 = unlimited
  currentUses: number;
  status: 'active' | 'inactive' | 'expired';
  expiresAt: Timestamp | { _seconds: number; _nanoseconds: number } | null;
  createdBy: string;
  createdAt: Timestamp | { _seconds: number; _nanoseconds: number };
}

// ===== MSAT SESSION (stored in Firestore) =====
export type MSATSessionStatus = 'waiting' | 'in_progress' | 'on_break' | 'completed' | 'timed_out' | 'flagged';
export type MSATStageDifficulty = 'rendah' | 'medium' | 'tinggi';

export interface MSATStageAnswer {
  questionId: string;
  cognitiveDomain: MSATCognitiveDomain;
  selectedAnswer: MSATAnswerKey;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface MSATStageResponse {
  stageNumber: MSATStage;
  stageDifficulty: MSATStageDifficulty;
  questions: MSATStageAnswer[];
  knowingCorrect: number;    // 0–4
  applyingCorrect: number;   // 0–4
  reasoningCorrect: number;  // 0–4
  totalCorrect: number;      // 0–12
  passed: boolean;           // ≥60%
  weightedScore: number;     // totalCorrect × stageWeight
}

export interface MSATConclusions {
  overall: { score: number; predikat: string; description: string };
  knowing: { score: number; level: string; description: string };
  applying: { score: number; level: string; description: string };
  reasoning: { score: number; level: string; description: string };
}

export interface MSATSession {
  id: string;
  studentId: string;
  studentName?: string;
  examId: string;           // ref to msat_access_code
  examCode: string;

  // Status
  status: MSATSessionStatus;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;

  // Stage tracking
  currentStage: MSATStage;
  currentStageDifficulty: MSATStageDifficulty;
  stagePath: MSATStageDifficulty[];  // e.g. ['medium', 'tinggi', 'tinggi']

  // Answers per stage
  stageResponses: MSATStageResponse[];

  // Break state
  breakStartedAt: Timestamp | null;
  breakEndsAt: Timestamp | null;
  breakSkippedBy: string | null;

  // Final results
  finalScore: number | null;       // 0–100
  predikat: string | null;
  peringkat: number | null;        // I–V
  conclusions: MSATConclusions | null;

  // Metadata
  anomalyFlags: string[];
  durationMinutes: number;
}

// ===== DIFFICULTY BRANCHING =====
// Maps difficulty to stage weight key
export const DIFFICULTY_TO_WEIGHT_KEY: Record<MSATStageDifficulty, keyof MSATAccessCode['stageWeights']> = {
  rendah: 'rendah',
  medium: 'medium',
  tinggi: 'tinggi',
};

// Maps Firestore difficulty to stage difficulty for branching
export const FIRESTORE_DIFFICULTY_MAP: Record<string, MSATStageDifficulty> = {
  sangat_mudah: 'rendah',
  mudah: 'rendah',
  sedang: 'medium',
  sukar: 'tinggi',
  sangat_sukar: 'tinggi',
};

// Reverse: stage difficulty → Firestore difficulty for question selection
export const STAGE_TO_QUESTION_DIFFICULTY: Record<MSATStageDifficulty, MSATDifficulty[]> = {
  rendah: ['sangat_mudah', 'mudah'],
  medium: ['sedang'],
  tinggi: ['sukar', 'sangat_sukar'],
};

// ===== PREDIKAT HELPERS =====
export const PREDIKAT_ORDER = ['Istimewa', 'Unggul', 'Madya', 'Semenjana', 'Terbatas'] as const;
export type PredikatName = typeof PREDIKAT_ORDER[number];

export const PREDIKAT_COLORS: Record<PredikatName, { text: string; bg: string; ring: string }> = {
  Istimewa: { text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-200' },
  Unggul: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  Madya: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  Semenjana: { text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200' },
  Terbatas: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
};
