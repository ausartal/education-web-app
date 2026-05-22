import { Timestamp } from 'firebase/firestore';

// ===== USERS =====
export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isActive: boolean;
  profile: {
    school?: string;
    grade?: string;
    city?: string;
  };
  stats: {
    xp: number;
    level: number;
    streak: number;
    longestStreak: number;
    totalLessons: number;
    totalQuizzes: number;
  };
  settings: {
    notifications: boolean;
    language: string;
  };
}

// ===== MATERIALS =====
export type MaterialStatus = 'draft' | 'published';

export interface Material {
  id: string;
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  order: number;
  content: string;
  estimatedTime: number;
  prerequisites: string[];
  learningObjectives: string[];
  createdBy: string;
  status: MaterialStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== QUESTION BANK =====
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type QuestionStatus = 'active' | 'inactive';
export type AnswerKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  stem: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  misconceptions: Partial<Record<AnswerKey, string>>;
  explanation: string;
  baseTime: number;
  usageCount: number;
  avgCorrectRate: number;
  avgTimeSpent: number;
  createdBy: string;
  status: QuestionStatus;
  createdAt: Timestamp;
}

// ===== EXAM SESSIONS =====
export type ExamStatus = 'in_progress' | 'completed' | 'abandoned' | 'flagged';
export type ConfidenceLabel =
  | 'mahir'
  | 'paham_lambat'
  | 'tebak'
  | 'tidak_paham';
export type ProficiencyLevel = 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi';

export interface ExamResponse {
  questionId: string;
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  difficulty: Difficulty;
  timeSpent: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  timestamp: Timestamp;
}

export interface ExamResult {
  finalTheta: number;
  proficiencyLevel: ProficiencyLevel;
  accuracy: number;
  misconceptions: string[];
  confidenceDistribution: Record<ConfidenceLabel, number>;
}

export interface ExamSession {
  id: string;
  userId: string;
  examId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  currentStage: number;
  currentDifficulty: Difficulty;
  theta: number;
  responses: ExamResponse[];
  result: ExamResult | null;
  anomalyFlags: string[];
  status: ExamStatus;
}

// ===== QUIZ RESULTS =====
export interface QuizResponse {
  questionId: string;
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  topic: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeSpent: number;
  responses: QuizResponse[];
  completedAt: Timestamp;
}

// ===== USER PROGRESS =====
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface UserProgress {
  id: string;
  userId: string;
  materialId: string;
  status: ProgressStatus;
  completedAt: Timestamp | null;
  timeSpent: number;
  lastAccessedAt: Timestamp;
}

// ===== ACHIEVEMENTS =====
export type AchievementTier = 'gold' | 'silver' | 'bronze';
export type AchievementCategory =
  | 'learning'
  | 'performance'
  | 'streak'
  | 'exploration'
  | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  condition: Record<string, unknown>;
  xpReward: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Timestamp;
}

// ===== MESSAGES =====
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: Timestamp | null;
  createdAt: Timestamp;
}

// ===== APP CONFIG =====
export interface MSATConfig {
  stagesCount: number;
  questionsPerStage: number;
  startDifficulty: Difficulty;
  thetaInitial: number;
  thetaMin: number;
  thetaMax: number;
  promotionRule: 'correct';
  demotionRule: 'incorrect';
  timeThresholds: Record<Difficulty, { fast: number; slow: number }>;
  anomalyThresholds: {
    tooFastMs: number;
    allFastCorrectCount: number;
    suddenDropThreshold: number;
  };
}

export interface AppConfig {
  msat: MSATConfig;
  gamification: {
    xpPerLesson: number;
    xpPerCorrectAnswer: number;
    xpPerExam: number;
    xpDailyLogin: number;
    xpStreakBonus: number;
    levelFormula: string;
  };
}
