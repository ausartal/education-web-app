import { Timestamp } from 'firebase/firestore';

// ===== ENUMS =====
export type MASTExamMode = 'auto_start' | 'manual_start';
export type MASTExamStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'archived';
export type MASTSessionStatus = 'waiting' | 'in_progress' | 'on_break' | 'completed' | 'timed_out' | 'flagged';
export type MASTWaitingRoomStatus = 'waiting' | 'started' | 'ended';
export type MASTCognitiveDomain = 'knowing' | 'applying' | 'reasoning';
export type MASTStageDifficulty = 'low' | 'medium' | 'high';
export type MASTPredikat = 'Istimewa' | 'Unggul' | 'Madya' | 'Semenjana' | 'Terbatas';
export type MASTAnswerKey = 'A' | 'B' | 'C' | 'D' | 'E';

// ===== MAST EXAM (mast_exams) =====
export interface MASTStage2Questions {
  high: string[];
  low: string[];
}

export interface MASTStage3Questions {
  high: string[];
  medium: string[];
  low: string[];
}

export interface MASTExam {
  id: string;
  title: string;
  description: string;
  examCode: string;
  createdBy: string;
  createdAt: Timestamp;

  // Konfigurasi
  mode: MASTExamMode;
  durationPerStage: number;
  breakDuration: number;
  totalStages: 3;

  // Soal per stage
  stage1QuestionIds: string[];
  stage2QuestionIds: MASTStage2Questions;
  stage3QuestionIds: MASTStage3Questions;

  // Status
  status: MASTExamStatus;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;

  // Peserta
  enrolledStudentIds: string[];
}

// ===== MAST QUESTION (mast_questions) =====
export interface MASTQuestion {
  id: string;
  stem: string;
  options: Record<MASTAnswerKey, string>;
  correctAnswer: MASTAnswerKey;
  explanation: string;

  // Klasifikasi
  cognitiveDomain: MASTCognitiveDomain;
  stageDifficulty: MASTStageDifficulty;

  // Metadata
  topic: string;
  subtopic: string;
  createdBy: string;
  createdAt: Timestamp;
  status: 'active' | 'inactive';
  usageCount: number;
  avgCorrectRate: number;
}

// Question tanpa jawaban benar (untuk siswa)
export type MASTQuestionForStudent = Omit<MASTQuestion, 'correctAnswer' | 'explanation'>;

// ===== MAST SESSION (mast_sessions) =====
export interface MASTQuestionResponse {
  questionId: string;
  cognitiveDomain: MASTCognitiveDomain;
  selectedAnswer: MASTAnswerKey;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface MASTStageResponse {
  stageNumber: 1 | 2 | 3;
  stageDifficulty: MASTStageDifficulty;
  questions: MASTQuestionResponse[];
  knowingCorrect: number;
  applyingCorrect: number;
  reasoningCorrect: number;
  totalCorrect: number;
  passed: boolean;
  weightedScore: number;
}

export interface MASTConclusion {
  score: number;
  description: string;
}

export interface MASTConclusions {
  overall: MASTConclusion;
  knowing: MASTConclusion;
  applying: MASTConclusion;
  reasoning: MASTConclusion;
}

export interface MASTSession {
  id: string;
  studentId: string;
  examId: string;
  examCode: string;

  // Status
  status: MASTSessionStatus;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;

  // Stage tracking
  currentStage: 1 | 2 | 3;
  currentStageDifficulty: MASTStageDifficulty;
  stagePath: MASTStageDifficulty[];

  // Jawaban per stage
  stageResponses: MASTStageResponse[];

  // Istirahat
  breakStartedAt: Timestamp | null;
  breakSkippedBy: string | null;
  breakEndsAt: Timestamp | null;

  // Hasil akhir
  finalScore: number | null;
  predikat: MASTPredikat | null;
  conclusions: MASTConclusions | null;

  // Metadata
  anomalyFlags: string[];
  durationMinutes: number;
}

// ===== MAST WAITING ROOM (mast_waiting_room) =====
export interface MASTWaitingRoomStudent {
  joinedAt: Timestamp;
  displayName: string;
  ready: boolean;
}

export interface MASTBreakState {
  active: boolean;
  stageNumber: number;
  startedAt: Timestamp | null;
  endsAt: Timestamp | null;
  skippedBy: string | null;
}

export interface MASTWaitingRoom {
  examId: string;
  status: MASTWaitingRoomStatus;
  students: Record<string, MASTWaitingRoomStudent>;
  startedAt: Timestamp | null;
  breakState: MASTBreakState | null;
}

// ===== API CONTRACTS =====
export interface MASTJoinRequest {
  examCode: string;
}

export interface MASTJoinResponseAutoStart {
  sessionId: string;
  mode: 'auto_start';
  exam: MASTExam;
  questions: MASTQuestionForStudent[];
}

export interface MASTJoinResponseManualStart {
  sessionId: string;
  mode: 'manual_start';
  waitingRoom: true;
}

export type MASTJoinResponse = MASTJoinResponseAutoStart | MASTJoinResponseManualStart;

export interface MASTSubmitStageRequest {
  answers: {
    questionId: string;
    selectedAnswer: MASTAnswerKey;
    timeSpentMs: number;
  }[];
}

export interface MASTStageResult {
  stageNumber: 1 | 2 | 3;
  stageDifficulty: MASTStageDifficulty;
  knowingCorrect: number;
  applyingCorrect: number;
  reasoningCorrect: number;
  totalCorrect: number;
  passed: boolean;
  nextStageDifficulty: MASTStageDifficulty | null;
}

export interface MASTSubmitStageResponse {
  stageResult: MASTStageResult;
  break: {
    active: boolean;
    durationMinutes: number;
    endsAt: string;
  } | null;
}

export interface MASTCompleteResponse {
  finalScore: number;
  predikat: MASTPredikat;
  peringkat: number;
  stagePath: MASTStageDifficulty[];
  conclusions: MASTConclusions;
  stageResponses: MASTStageResponse[];
}

// ===== SCORING CONSTANTS =====
export const MAST_STAGE_MULTIPLIER: Record<MASTStageDifficulty, number> = {
  low: 1.0,
  medium: 1.2,
  high: 1.5,
};

export const MAST_PASS_THRESHOLD = 8; // ≥8/12 benar untuk naik

export const MAST_PREDIKAT_RANGES: { min: number; max: number; predikat: MASTPredikat; peringkat: number }[] = [
  { min: 81, max: 100, predikat: 'Istimewa', peringkat: 1 },
  { min: 61, max: 80, predikat: 'Unggul', peringkat: 2 },
  { min: 41, max: 60, predikat: 'Madya', peringkat: 3 },
  { min: 21, max: 40, predikat: 'Semenjana', peringkat: 4 },
  { min: 0, max: 20, predikat: 'Terbatas', peringkat: 5 },
];
