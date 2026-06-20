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

// ===== AUDIT LOGS =====
export type AuditAction =
  | 'create_user' | 'update_user' | 'delete_user'
  | 'change_role' | 'toggle_active'
  | 'create_material' | 'update_material' | 'delete_material'
  | 'create_question' | 'update_question' | 'delete_question'
  | 'update_config' | 'delete_exam'
  | 'create_class' | 'update_class' | 'delete_class'
  | 'create_exam_schedule' | 'update_exam_schedule' | 'delete_exam_schedule'
  | 'join_class' | 'start_exam' | 'complete_exam';

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  targetId: string;
  targetType: 'user' | 'material' | 'question' | 'config' | 'exam' | 'class' | 'exam_schedule' | 'exam_session';
  details: Record<string, unknown>;
  timestamp: Timestamp;
}

// ===== CLASS SYSTEM =====
export type ClassStatus = 'active' | 'archived';

export interface Class {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  joinCode: string; // 6-char uppercase alphanumeric
  studentIds: string[];
  status: ClassStatus;
  createdAt: Timestamp;
}

// ===== EXAM SCHEDULE =====
export type ExamScheduleStatus = 'draft' | 'active' | 'closed';

export interface ExamSchedule {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  module: string; // e.g. 'stoikiometri'
  domainIds: string[]; // which domain IDs to include (e.g. ['tp1','tp2'])
  examToken: string; // 6-char token students enter
  scheduledAt: Timestamp;
  durationMinutes: number; // default 50
  status: ExamScheduleStatus;
  createdAt: Timestamp;
}

// ===== MSAT EXAM QUESTIONS =====
export type MSATTierPath =
  | 'anchor'         // T1, always sedang
  | 'mudah'          // T2 path (T1 wrong)
  | 'sukar'          // T2 path (T1 right)
  | 'sangat_mudah'   // T3 path (T1 wrong, T2 wrong)
  | 'sedang_a'       // T3 path (T1 wrong, T2 right)
  | 'sedang_b'       // T3 path (T1 right, T2 wrong)
  | 'sangat_sukar';  // T3 path (T1 right, T2 right)

export type MSATDifficulty = 'sangat_mudah' | 'mudah' | 'sedang' | 'sukar' | 'sangat_sukar';
export type CognitiveLevel = 'C1' | 'C2' | 'C3' | 'C4';

export interface ExamQuestion {
  id: string;
  domainId: string;
  domainName: string;
  module: string;
  tier: 1 | 2 | 3;
  tierPath: MSATTierPath;
  difficulty: MSATDifficulty;
  cognitiveLevel: CognitiveLevel;
  stem: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: AnswerKey;
  explanation: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
  usageCount: number;
  avgCorrectRate: number;
}

// ===== MSAT EXAM SESSIONS =====
export type ComprehensionCategory =
  | 'paham_konsep'
  | 'paham_sebagian'
  | 'tidak_paham'
  | 'miskonsepsi'
  | 'hasil_nebak';

export type CRIResponse = 'yakin' | 'tidak_yakin';

export interface MSATTierResponse {
  questionId: string;
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface MSATDomainResponse {
  domainId: string;
  domainName: string;
  tier1: MSATTierResponse;
  tier2: MSATTierResponse & { path: 'mudah' | 'sukar' };
  tier3: MSATTierResponse & { path: MSATTierPath };
  pattern: string; // e.g. 'BBB', 'SBB', 'BSS', etc.
  cri: CRIResponse;
  comprehensionCategory: ComprehensionCategory;
  domainScore: number; // 0-100
}

export interface MSATExamSession {
  id: string;
  studentId: string;
  examScheduleId: string;
  classId: string;
  teacherId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  durationMinutes: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'flagged';
  currentDomainIndex: number;
  domainResponses: MSATDomainResponse[];
  numericScore: number | null; // 0-120
  anomalyFlags: string[];
}
