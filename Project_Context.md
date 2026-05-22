# AKURAT - Complete Project Context & Technical Specification

## Project Summary

**AKURAT** (Asesmen Kimia Ukur Adaptif Terpadu) adalah platform edukasi berbasis AI menggunakan teknologi **Multistage Adaptive Testing (MSAT)** khusus untuk asesmen Chemistry Stoichiometry. Platform ini dirancang untuk pembelajaran, latihan, ujian adaptif, dan analisis mendalam profil pemahaman konsep serta miskonsepsi siswa.

**Target Primary**: Asosiasi Kimia Indonesia (eksklusif untuk anggota)  
**Secondary Targets**: SMA, Lembaga Kursus, Guru Privat, Platform Tryout Online, Pelatihan Akademik

---

# TABLE OF CONTENTS

1. [Tech Stack & Architecture](#1-tech-stack--architecture)
2. [Database Schema](#2-database-schema)
3. [MSAT Algorithm Specification](#3-msat-algorithm-specification)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API & Data Flow](#5-api--data-flow)
6. [Content Management System](#6-content-management-system)
7. [MVP Scope & Phasing](#7-mvp-scope--phasing)
8. [Design System](#8-design-system)
9. [UI/UX Patterns](#9-uiux-patterns)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

# 1. TECH STACK & ARCHITECTURE

## 1.1 Frontend Stack

### Core Framework
```
Next.js 14+ (App Router)
├── TypeScript 5+
├── React 18+
└── Node.js 18+ LTS
```

**Rationale:**
- **Next.js App Router**: Server Components for better performance, built-in SEO
- **TypeScript**: Type safety, better DX, catch errors early
- **React 18**: Concurrent features, Suspense, automatic batching

### Styling & UI
```
Tailwind CSS 3.4+
├── CSS Modules (untuk complex components)
├── clsx / tailwind-merge (utility)
└── Framer Motion (animations)
```

**Rationale:**
- **Tailwind**: Rapid development, consistent design system, purge unused CSS
- **CSS Modules**: Component-specific styles tanpa conflicts
- **Framer Motion**: Smooth animations untuk gamification (Duolingo-style)

### State Management
```
Zustand (global state)
├── React Context (theme, auth)
└── TanStack Query / SWR (server state)
```

**Rationale:**
- **Zustand**: Lightweight, simple API, no boilerplate
- **Context**: Built-in, perfect untuk theme & auth
- **TanStack Query**: Powerful caching, refetching, optimistic updates

### Form Handling
```
React Hook Form
└── Zod (validation schema)
```

**Rationale:**
- Performant (minimal re-renders)
- Easy validation dengan Zod
- Great TypeScript support

### Charts & Visualization
```
Recharts (primary)
├── Chart.js (fallback)
└── D3.js (custom visualizations)
```

**Rationale:**
- **Recharts**: React-first, composable, responsive
- **Chart.js**: Simple, widely supported
- **D3**: Complex custom charts (misconception radar, learning path tree)

### Math Rendering
```
KaTeX
└── MathJax (fallback)
```

**Rationale:**
- **KaTeX**: Faster rendering, cleaner output
- Chemical formulas: H₂SO₄, CO₂, etc.

### Testing
```
Jest (unit tests)
├── React Testing Library (component tests)
├── Playwright (E2E tests)
└── Axe (accessibility tests)
```

---

## 1.2 Backend Stack (Firebase)

### Core Services
```
Firebase
├── Authentication (Email/Password, Google OAuth)
├── Firestore (NoSQL database)
├── Cloud Functions (serverless API)
├── Cloud Storage (media files)
├── Hosting (static site)
└── Analytics (user tracking)
```

### Firebase Services Detail

#### Authentication
- **Providers**: Email/Password, Google Sign-In
- **Custom Claims**: Role-based (admin, teacher, student)
- **Email Verification**: Required untuk semua users
- **Password Reset**: Firebase built-in flow

#### Firestore Database
- **Mode**: Native mode (not Datastore)
- **Region**: asia-southeast2 (Jakarta)
- **Pricing**: Pay-as-you-go (Blaze plan)
- **Indexes**: Composite indexes untuk complex queries

#### Cloud Functions (Node.js 18)
```
functions/
├── auth/
│   ├── onUserCreate.ts       (trigger: create user profile)
│   ├── onUserDelete.ts       (trigger: cleanup data)
│   └── validateInviteCode.ts (callable: check invite validity)
├── quiz/
│   ├── submitAnswer.ts       (callable: process answer, MSAT logic)
│   ├── calculateScore.ts     (trigger: on quiz complete)
│   └── updateLeaderboard.ts  (trigger: on score update)
├── gamification/
│   ├── awardXP.ts            (callable: give XP)
│   ├── checkAchievements.ts  (trigger: check badge unlock)
│   └── updateStreak.ts       (scheduled: daily at midnight)
├── content/
│   ├── publishMaterial.ts    (callable: admin approve content)
│   └── generateQuestions.ts  (callable: AI question generator - Phase 2)
└── analytics/
    ├── aggregateStats.ts     (scheduled: daily)
    └── exportData.ts         (callable: admin data export)
```

#### Cloud Storage
```
storage/
├── avatars/              (user profile pictures)
├── materials/
│   ├── images/          (lesson diagrams, illustrations)
│   └── attachments/     (PDFs, supplementary files)
├── exports/             (admin data exports)
└── temp/                (temporary uploads, auto-delete 24h)
```

### Additional Services

#### Firebase Extensions
- **Trigger Email**: Kirim email otomatis (welcome, streak reminder)
- **Resize Images**: Auto-resize uploaded avatars
- **Delete User Data**: GDPR compliance cleanup

#### Third-Party Integrations
```
Vercel (hosting)
├── Edge Functions (middleware)
└── Analytics (Web Vitals)

Sentry (error tracking)
└── Performance monitoring

Google Analytics 4 (advanced analytics)
```

---

## 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Next.js    │  │   Zustand    │  │  TanStack    │      │
│  │  App Router  │  │  (Global)    │  │   Query      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ HTTPS/WSS
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                         FIREBASE                             │
├────────────────────────────┼─────────────────────────────────┤
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │           Firebase Authentication                   │     │
│  │  (Email/Password, Google OAuth, Custom Claims)      │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │            Firestore Database                       │     │
│  │  /users, /materials, /quizzes, /results, /badges    │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │         Cloud Functions (Node.js 18)                │     │
│  │  • submitAnswer (MSAT logic)                        │     │
│  │  • calculateScore                                   │     │
│  │  • updateLeaderboard                                │     │
│  │  • awardXP, checkAchievements                       │     │
│  └─────────────────────────┬──────────────────────────┘     │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────┐     │
│  │          Cloud Storage                              │     │
│  │  avatars/, materials/, exports/                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 2. DATABASE SCHEMA

## 2.1 Firestore Collections Structure

```
firestore/
├── users/                          (collection)
├── materials/                      (collection)
├── quizzes/                        (collection)
├── exams/                          (collection)
├── quiz_results/                   (collection)
├── exam_results/                   (collection)
├── achievements/                   (collection)
├── user_achievements/              (collection)
├── leaderboards/                   (collection)
├── messages/                       (collection)
├── invite_codes/                   (collection)
├── system_config/                  (collection)
└── analytics_snapshots/            (collection)
```

---

## 2.2 Collection Schemas

### `users` Collection
```typescript
interface User {
  // Document ID: Firebase Auth UID
  uid: string;
  
  // Basic Info
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Role & Status
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'suspended' | 'deleted';
  
  // Membership
  membershipType: 'asosiasi' | 'school' | 'individual';
  membershipId?: string;  // ID anggota Asosiasi Kimia
  inviteCode?: string;    // Kode invite yang digunakan
  
  // School Info (if applicable)
  schoolId?: string;
  schoolName?: string;
  grade?: string;         // "10", "11", "12"
  classId?: string;
  
  // Profile
  bio?: string;
  dateOfBirth?: Timestamp;
  location?: string;
  
  // Gamification
  xp: number;             // Total XP earned
  level: number;          // Current level
  streak: {
    current: number;      // Current streak days
    longest: number;      // Best streak ever
    lastActivity: Timestamp;
    freezeCount: number;  // Available streak freezes
  };
  
  // Stats
  stats: {
    materialsCompleted: number;
    quizzesTaken: number;
    examsTaken: number;
    totalQuestionsAnswered: number;
    correctAnswers: number;
    averageAccuracy: number;  // percentage
    totalStudyTime: number;   // minutes
  };
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: 'id' | 'en';
    notifications: {
      email: boolean;
      push: boolean;
      streakReminder: boolean;
      achievementUnlock: boolean;
    };
    privacy: {
      showOnLeaderboard: boolean;
      showRealName: boolean;  // or use nickname
      nickname?: string;
    };
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  
  // Soft Delete
  deletedAt?: Timestamp;
}
```

**Indexes:**
```
Composite Indexes:
- role + status (untuk admin filtering)
- schoolId + grade + classId (untuk teacher dashboard)
- xp (descending) + status (untuk leaderboard)
```

---

### `materials` Collection
```typescript
interface Material {
  // Document ID: auto-generated
  id: string;
  
  // Content
  title: string;
  slug: string;               // URL-friendly
  description: string;
  content: string;            // Rich text / Markdown
  
  // Organization
  chapter: string;            // "Konsep Mol", "Stoikiometri", etc.
  chapterOrder: number;
  lessonOrder: number;        // Within chapter
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Metadata
  estimatedTime: number;      // minutes
  topics: string[];           // ["mol", "massa molekul relatif", etc.]
  prerequisites: string[];    // Material IDs yang harus diselesaikan dulu
  
  // Visual
  coverImage?: string;        // Storage URL
  thumbnailUrl?: string;
  emoji?: string;             // Display emoji (🧪, ⚗️, etc.)
  
  // Content Assets
  images?: {
    url: string;
    caption?: string;
    altText: string;
  }[];
  videos?: {
    url: string;
    title: string;
    duration: number;
  }[];
  attachments?: {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }[];
  
  // Interactive Elements
  interactiveExamples?: {
    type: 'calculator' | 'simulation' | 'quiz';
    config: any;  // Type-specific configuration
  }[];
  
  // Learning Objectives
  objectives: string[];
  
  // Publishing
  status: 'draft' | 'review' | 'published' | 'archived';
  publishedAt?: Timestamp;
  authorId: string;           // User ID (teacher/admin)
  reviewerId?: string;
  
  // Stats
  stats: {
    views: number;
    completions: number;
    averageRating: number;
    ratingsCount: number;
    averageCompletionTime: number;  // minutes
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}
```

**Indexes:**
```
Composite Indexes:
- status + chapterOrder + lessonOrder (untuk listing)
- chapter + status (untuk chapter view)
- topics (array) + status (untuk search)
```

---

### `quizzes` Collection
```typescript
interface Quiz {
  // Document ID: auto-generated
  id: string;
  
  // Basic Info
  title: string;
  description: string;
  
  // Type
  type: 'practice' | 'chapter_test' | 'diagnostic';
  
  // Association
  materialId?: string;        // Linked to specific material
  chapter?: string;
  topics: string[];
  
  // Configuration
  settings: {
    questionCount: number;
    timeLimit?: number;       // minutes, null = unlimited
    passingScore: number;     // percentage
    showFeedback: boolean;    // Immediate feedback per question
    allowRetake: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  
  // Questions (embedded subcollection for simplicity)
  // NOTE: For large question banks, use separate collection
  questions: Question[];      // See Question interface below
  
  // Publishing
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Timestamp;
  authorId: string;
  
  // Stats
  stats: {
    attemptCount: number;
    averageScore: number;
    averageTime: number;      // minutes
    completionRate: number;   // percentage who finish
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Question {
  id: string;                 // Unique within quiz
  
  // Content
  text: string;               // Question stem
  imageUrl?: string;
  
  // Difficulty & Classification
  difficulty: 'easy' | 'moderate' | 'hard';
  topic: string;
  subtopic?: string;
  
  // Options
  options: {
    id: string;               // A, B, C, D, E
    text: string;
    imageUrl?: string;
  }[];
  
  // Answer
  correctAnswer: string;      // Option ID
  
  // Explanation
  explanation: string;        // Why this is correct
  commonMisconceptions?: {
    optionId: string;
    misconception: string;    // Why students choose this
  }[];
  
  // Metadata for MSAT
  irt: {
    discrimination: number;   // a parameter (0-3)
    difficulty: number;       // b parameter (-3 to 3)
    guessing: number;         // c parameter (0-0.5)
  };
  
  // Expected time (for confidence calculation)
  expectedTime: number;       // seconds
}
```

---

### `exams` Collection
```typescript
interface Exam {
  // Document ID: auto-generated
  id: string;
  
  // Basic Info
  title: string;
  description: string;
  instructions: string;       // Exam rules, instructions
  
  // Type
  type: 'msat' | 'standard';  // MSAT = adaptive, Standard = fixed
  
  // Scope
  chapters: string[];
  topics: string[];
  
  // MSAT Configuration
  msatConfig: {
    stages: number;           // e.g., 3 stages
    questionsPerStage: number;
    difficultyLevels: ['easy', 'moderate', 'hard'];
    startingDifficulty: 'moderate';
    
    // Advancement Thresholds
    advanceThreshold: number; // e.g., 0.7 (70% correct to level up)
    dropThreshold: number;    // e.g., 0.3 (30% correct to level down)
    
    // Time Configuration
    timePerQuestion: {
      easy: number;           // seconds
      moderate: number;
      hard: number;
    };
    
    // Confidence System (implicit)
    confidenceWeights: {
      timeMultiplier: number; // How much time affects confidence
      accuracyMultiplier: number;
    };
  };
  
  // Standard Exam Configuration (if type = 'standard')
  standardConfig?: {
    questionCount: number;
    timeLimit: number;        // minutes
    questionPool: string[];   // Question IDs
  };
  
  // Availability
  availability: {
    startDate: Timestamp;
    endDate: Timestamp;
    allowLateSubmission: boolean;
    lateSubmissionPenalty?: number;  // percentage
  };
  
  // Access Control
  accessControl: {
    requiresInvite: boolean;
    inviteCodes?: string[];
    allowedClasses?: string[];
    allowedSchools?: string[];
  };
  
  // Publishing
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';
  publishedAt?: Timestamp;
  authorId: string;
  
  // Stats
  stats: {
    participantCount: number;
    completionCount: number;
    averageScore: number;
    averageTime: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `quiz_results` Collection
```typescript
interface QuizResult {
  // Document ID: auto-generated
  id: string;
  
  // References
  userId: string;
  quizId: string;
  
  // Attempt Info
  attemptNumber: number;      // 1st, 2nd, 3rd attempt
  status: 'in_progress' | 'completed' | 'abandoned';
  
  // Responses
  responses: {
    questionId: string;
    selectedAnswer: string;   // Option ID
    isCorrect: boolean;
    timeSpent: number;        // seconds
    timestamp: Timestamp;
  }[];
  
  // Score
  score: {
    correct: number;
    incorrect: number;
    total: number;
    percentage: number;
    passed: boolean;
  };
  
  // Time
  time: {
    started: Timestamp;
    completed?: Timestamp;
    totalSeconds: number;
  };
  
  // XP & Rewards
  xpEarned: number;
  achievementsUnlocked?: string[];  // Achievement IDs
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
```
Composite Indexes:
- userId + quizId + attemptNumber
- userId + createdAt (descending)
- quizId + status
```

---

### `exam_results` Collection
```typescript
interface ExamResult {
  // Document ID: auto-generated
  id: string;
  
  // References
  userId: string;
  examId: string;
  
  // Status
  status: 'in_progress' | 'completed' | 'submitted' | 'graded';
  
  // MSAT Session Data
  msatSession?: {
    currentStage: number;
    currentDifficulty: 'easy' | 'moderate' | 'hard';
    
    stageHistory: {
      stage: number;
      difficulty: 'easy' | 'moderate' | 'hard';
      questionsAsked: string[];     // Question IDs
      correctCount: number;
      incorrectCount: number;
      averageTime: number;          // seconds
      competencyLevel: string;      // "Mahir", "Paham Konsep", etc.
    }[];
    
    difficultyTransitions: {
      fromDifficulty: string;
      toDifficulty: string;
      trigger: 'advance' | 'drop';
      timestamp: Timestamp;
    }[];
  };
  
  // Responses (same structure as quiz)
  responses: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    expectedTime: number;
    
    // MSAT-specific
    difficulty: 'easy' | 'moderate' | 'hard';
    stage: number;
    
    // Implicit Confidence Calculation
    confidence: {
      level: 'high' | 'medium' | 'low';  // Calculated by system
      timeRatio: number;        // timeSpent / expectedTime
      classification: 'mahir_paham' | 'kurang_mahir' | 'kurang_memahami' | 'beruntung';
    };
    
    timestamp: Timestamp;
  }[];
  
  // Final Score
  score: {
    correct: number;
    incorrect: number;
    total: number;
    percentage: number;
    
    // Per Difficulty
    byDifficulty: {
      easy: { correct: number; total: number; percentage: number };
      moderate: { correct: number; total: number; percentage: number };
      hard: { correct: number; total: number; percentage: number };
    };
  };
  
  // Competency Analysis
  competency: {
    overallLevel: 'belum_paham' | 'kurang_paham' | 'paham_konsep' | 'mahir' | 'sangat_mahir';
    confidenceScore: number;    // 0-100
    
    // Per Topic
    byTopic: {
      topic: string;
      mastery: number;          // 0-100
      questionsAnswered: number;
      correctAnswers: number;
    }[];
    
    // Misconception Detection
    misconceptions: {
      topic: string;
      misconceptionType: string;
      frequency: number;
      questionIds: string[];
    }[];
  };
  
  // Time
  time: {
    started: Timestamp;
    completed?: Timestamp;
    totalSeconds: number;
    averagePerQuestion: number;
  };
  
  // XP & Achievements
  xpEarned: number;
  achievementsUnlocked?: string[];
  
  // Teacher Feedback (optional)
  feedback?: {
    teacherId: string;
    comment: string;
    timestamp: Timestamp;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
}
```

**Indexes:**
```
Composite Indexes:
- userId + examId
- examId + status
- userId + submittedAt (descending)
```

---

### `achievements` Collection
```typescript
interface Achievement {
  // Document ID: achievement slug (e.g., "first-lesson", "perfect-quiz")
  id: string;
  
  // Display
  name: string;
  description: string;
  emoji: string;              // 🌱, 📚, 🎓, etc.
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  
  // Icon
  iconUrl?: string;
  badgeUrl?: string;
  
  // Category
  category: 'learning' | 'performance' | 'exploration' | 'social' | 'special';
  
  // Unlock Criteria
  criteria: {
    type: 'lesson_complete' | 'quiz_score' | 'streak' | 'xp' | 'custom';
    
    // Type-specific params
    threshold?: number;       // e.g., 10 lessons, 100 XP, 7 days streak
    targetValue?: any;        // For custom criteria
    
    // Additional conditions
    conditions?: {
      quizType?: string;
      scorePercentage?: number;
      timeLimit?: number;
    };
  };
  
  // Rewards
  rewards: {
    xp: number;
    title?: string;           // Unlockable title/badge
  };
  
  // Visibility
  isSecret: boolean;          // Hidden until unlocked
  isActive: boolean;
  
  // Stats
  stats: {
    unlockedCount: number;
    unlockRate: number;       // percentage of users
  };
  
  // Metadata
  createdAt: Timestamp;
  order: number;              // Display order
}
```

---

### `user_achievements` Collection
```typescript
interface UserAchievement {
  // Document ID: auto-generated
  id: string;
  
  // References
  userId: string;
  achievementId: string;
  
  // Unlock Info
  unlockedAt: Timestamp;
  progress: number;           // For progressive achievements (0-100)
  
  // Context
  triggerEvent?: {
    type: string;             // "quiz_complete", "lesson_finish", etc.
    relatedId?: string;       // Quiz ID, Material ID, etc.
  };
  
  // Display Status
  isViewed: boolean;          // User saw unlock notification
  isFeatured: boolean;        // Show on profile
  
  // Metadata
  createdAt: Timestamp;
}
```

**Indexes:**
```
Composite Indexes:
- userId + unlockedAt (descending)
- userId + achievementId (unique)
- achievementId + unlockedAt (for stats)
```

---

### `leaderboards` Collection
```typescript
interface Leaderboard {
  // Document ID: composite key (e.g., "global-weekly-2024-W20")
  id: string;
  
  // Type & Scope
  type: 'global' | 'class' | 'school' | 'friends';
  scope: string;              // "all", classId, schoolId, etc.
  
  // Time Period
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  startDate: Timestamp;
  endDate?: Timestamp;
  
  // Rankings
  rankings: {
    rank: number;
    userId: string;
    displayName: string;      // or nickname if privacy enabled
    photoURL?: string;
    score: number;            // XP earned in period
    xp: number;
    level: number;
    
    // Change from previous period
    rankChange?: number;      // +5, -3, 0, etc.
  }[];
  
  // Stats
  stats: {
    totalParticipants: number;
    averageScore: number;
    topScore: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  calculatedAt: Timestamp;    // Last recalculation time
}
```

**Indexes:**
```
Composite Indexes:
- type + scope + period + startDate
```

---

### `messages` Collection
```typescript
interface Message {
  // Document ID: auto-generated
  id: string;
  
  // Participants
  senderId: string;
  receiverId: string;
  
  // Thread (optional grouping)
  threadId?: string;
  parentMessageId?: string;   // For replies
  
  // Content
  subject?: string;           // For initial message
  body: string;
  attachments?: {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }[];
  
  // Type
  type: 'direct' | 'announcement' | 'feedback';
  
  // Status
  status: 'sent' | 'delivered' | 'read';
  readAt?: Timestamp;
  
  // Context (optional)
  contextType?: 'quiz' | 'exam' | 'material';
  contextId?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Soft Delete
  deletedBySender?: boolean;
  deletedByReceiver?: boolean;
}
```

**Indexes:**
```
Composite Indexes:
- senderId + createdAt (descending)
- receiverId + createdAt (descending)
- threadId + createdAt
```

---

### `invite_codes` Collection
```typescript
interface InviteCode {
  // Document ID: the code itself (e.g., "AKURAT2024-ABC123")
  code: string;
  
  // Type
  type: 'asosiasi' | 'school' | 'individual' | 'teacher' | 'trial';
  
  // Association
  organizationId?: string;    // Asosiasi ID, School ID
  organizationName?: string;
  
  // Limits
  maxUses: number;            // -1 = unlimited
  usedCount: number;
  
  // User Type Access
  allowedRoles: ('student' | 'teacher')[];
  
  // Validity
  validFrom: Timestamp;
  validUntil: Timestamp;
  isActive: boolean;
  
  // Usage Tracking
  usedBy: {
    userId: string;
    usedAt: Timestamp;
  }[];
  
  // Creator
  createdBy: string;          // Admin user ID
  
  // Metadata
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `system_config` Collection
```typescript
interface SystemConfig {
  // Document ID: config key (e.g., "gamification", "msat")
  id: string;
  
  // Config Type
  category: 'gamification' | 'msat' | 'content' | 'notifications' | 'feature_flags';
  
  // Configuration Data
  config: {
    [key: string]: any;       // Flexible config object
  };
  
  // Examples:
  // - gamification: { xpPerLesson: 50, levelUpFormula: "100 * (level^1.5)" }
  // - msat: { stages: 3, advanceThreshold: 0.7 }
  // - feature_flags: { enableAIExplanations: false, enableSocialFeatures: true }
  
  // Metadata
  description?: string;
  updatedBy: string;          // Admin user ID
  updatedAt: Timestamp;
  version: number;
}
```

---

### `analytics_snapshots` Collection
```typescript
interface AnalyticsSnapshot {
  // Document ID: date-based (e.g., "2024-05-22")
  id: string;
  
  // Date
  date: Timestamp;
  type: 'daily' | 'weekly' | 'monthly';
  
  // User Metrics
  users: {
    total: number;
    active: number;           // Active in period
    new: number;              // Registered in period
    retained: number;         // Active from previous period
    
    byRole: {
      students: number;
      teachers: number;
      admins: number;
    };
  };
  
  // Engagement Metrics
  engagement: {
    sessions: number;
    averageSessionDuration: number;  // minutes
    
    lessons: {
      started: number;
      completed: number;
      completionRate: number;
    };
    
    quizzes: {
      started: number;
      completed: number;
      averageScore: number;
    };
    
    exams: {
      started: number;
      completed: number;
      averageScore: number;
    };
  };
  
  // Content Metrics
  content: {
    popularMaterials: {
      materialId: string;
      views: number;
      completions: number;
    }[];
    
    popularTopics: {
      topic: string;
      engagement: number;
    }[];
  };
  
  // Gamification Metrics
  gamification: {
    xpAwarded: number;
    achievementsUnlocked: number;
    streaksActive: number;
    
    topPerformers: {
      userId: string;
      xp: number;
    }[];
  };
  
  // Metadata
  calculatedAt: Timestamp;
  createdAt: Timestamp;
}
```

---

## 2.3 Security Rules Structure

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isTeacher() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Materials Collection
    match /materials/{materialId} {
      allow read: if isAuthenticated() && resource.data.status == 'published';
      allow create: if isTeacher() || isAdmin();
      allow update: if isTeacher() || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Quizzes Collection
    match /quizzes/{quizId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isTeacher() || isAdmin();
    }
    
    // Quiz Results Collection
    match /quiz_results/{resultId} {
      allow read: if isOwner(resource.data.userId) || isTeacher() || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isAdmin();
    }
    
    // Exam Results Collection
    match /exam_results/{resultId} {
      allow read: if isOwner(resource.data.userId) || isTeacher() || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isAdmin();
    }
    
    // Achievements Collection (read-only for students)
    match /achievements/{achievementId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // User Achievements Collection
    match /user_achievements/{userAchievementId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create, update: if isAdmin(); // Only system creates
      allow delete: if isAdmin();
    }
    
    // Leaderboards (read-only)
    match /leaderboards/{leaderboardId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only Cloud Functions write
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if isOwner(resource.data.senderId) || 
                     isOwner(resource.data.receiverId) || 
                     isAdmin();
      allow create: if isAuthenticated() && 
                       request.auth.uid == request.resource.data.senderId;
      allow update: if isOwner(resource.data.senderId) || 
                       isOwner(resource.data.receiverId);
      allow delete: if isOwner(resource.data.senderId) || isAdmin();
    }
    
    // Invite Codes
    match /invite_codes/{code} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // System Config
    match /system_config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Analytics Snapshots
    match /analytics_snapshots/{snapshotId} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

---

# 3. MSAT ALGORITHM SPECIFICATION

## 3.1 Core Principles

**Multistage Adaptive Testing (MSAT)** di AKURAT menggunakan pendekatan **dynamic difficulty adjustment** dengan **implicit confidence measurement** untuk mengukur tingkat pemahaman siswa secara akurat dan efisien.

### Key Features:
1. **Three Difficulty Levels**: Easy, Moderate, Hard
2. **Dynamic Adjustment**: Difficulty naik/turun based on performance
3. **Implicit Confidence**: Calculated dari waktu pengerjaan (tidak diminta eksplisit)
4. **Multi-Stage**: Multiple rounds untuk validasi
5. **IRT-Based**: Item Response Theory untuk question selection

---

## 3.2 Difficulty Levels

### Easy Level
- **Target**: Konsep dasar, soal straightforward
- **IRT b-parameter**: -1.5 to -0.5
- **Expected Time**: 30-45 seconds
- **Example**: "Berapa massa molekul relatif (Mr) H₂O? (Ar H=1, O=16)"

### Moderate Level
- **Target**: Aplikasi konsep, perhitungan multi-step
- **IRT b-parameter**: -0.5 to 0.5
- **Expected Time**: 60-90 seconds
- **Example**: "Jika 5 mol Ca(OH)₂ bereaksi sempurna dengan HCl, berapa mol HCl yang dibutuhkan?"

### Hard Level
- **Target**: Analisis kompleks, sintesis konsep
- **IRT b-parameter**: 0.5 to 2.0
- **Expected Time**: 90-150 seconds
- **Example**: "Dalam reaksi limiting reactant antara 10g Zn dengan 50mL HCl 2M, tentukan massa ZnCl₂ yang terbentuk."

---

## 3.3 MSAT Flow

```
START EXAM
    ↓
┌─────────────────────────────────┐
│ STAGE 1: DIAGNOSTIC             │
│ - Start at MODERATE difficulty  │
│ - Ask 5 questions               │
│ - Measure initial competency    │
└─────────────────────────────────┘
    ↓
    ├──→ ≥70% correct? → ADVANCE to HARD
    ├──→ 30-70% correct? → STAY at MODERATE
    └──→ <30% correct? → DROP to EASY
    ↓
┌─────────────────────────────────┐
│ STAGE 2: REFINEMENT             │
│ - Adjusted difficulty           │
│ - Ask 5 questions               │
│ - Refine competency estimate    │
└─────────────────────────────────┘
    ↓
    ├──→ Apply same thresholds
    └──→ Adjust difficulty if needed
    ↓
┌─────────────────────────────────┐
│ STAGE 3: VALIDATION             │
│ - Final difficulty level        │
│ - Ask 5 questions               │
│ - Validate competency           │
└─────────────────────────────────┘
    ↓
CALCULATE FINAL SCORE & COMPETENCY
```

---

## 3.4 Confidence Calculation (Implicit)

Confidence level dihitung otomatis dari **waktu pengerjaan** dan **akurasi**, tanpa meminta input user.

### Formula:

```typescript
function calculateConfidence(
  timeSpent: number,      // actual time in seconds
  expectedTime: number,   // expected time for this difficulty
  isCorrect: boolean
): {
  level: 'high' | 'medium' | 'low';
  classification: 'mahir_paham' | 'kurang_mahir' | 'kurang_memahami' | 'beruntung';
  timeRatio: number;
} {
  const timeRatio = timeSpent / expectedTime;
  
  // Classification Matrix
  if (isCorrect && timeRatio <= 0.7) {
    // Cepat + Benar = MAHIR & PAHAM KONSEP
    return {
      level: 'high',
      classification: 'mahir_paham',
      timeRatio
    };
  }
  else if (isCorrect && timeRatio > 0.7 && timeRatio <= 1.2) {
    // Normal Speed + Benar = PAHAM KONSEP tapi kurang mahir
    return {
      level: 'medium',
      classification: 'kurang_mahir',
      timeRatio
    };
  }
  else if (isCorrect && timeRatio > 1.2) {
    // Lambat + Benar = KURANG MAHIR (ragu-ragu)
    return {
      level: 'low',
      classification: 'kurang_mahir',
      timeRatio
    };
  }
  else if (!isCorrect && timeRatio > 0.7) {
    // Lambat + Salah = KURANG MEMAHAMI
    return {
      level: 'low',
      classification: 'kurang_memahami',
      timeRatio
    };
  }
  else {
    // Cepat + Salah = BERUNTUNG / TEBAKAN
    return {
      level: 'low',
      classification: 'beruntung',
      timeRatio
    };
  }
}
```

### Confidence Score Aggregation:

```typescript
function calculateOverallConfidence(responses: Response[]): number {
  // Weight by difficulty
  const weights = {
    easy: 1.0,
    moderate: 1.5,
    hard: 2.0
  };
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const response of responses) {
    const weight = weights[response.difficulty];
    const score = response.confidence.level === 'high' ? 100 :
                  response.confidence.level === 'medium' ? 60 :
                  response.confidence.level === 'low' ? 30 : 0;
    
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }
  
  return Math.round(totalWeightedScore / totalWeight);
}
```

---

## 3.5 Difficulty Transition Logic

```typescript
interface StageResult {
  stage: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  responses: Response[];
}

function determineNextDifficulty(
  currentDifficulty: 'easy' | 'moderate' | 'hard',
  stageResult: StageResult,
  config: MSATConfig
): 'easy' | 'moderate' | 'hard' {
  
  const correctCount = stageResult.responses.filter(r => r.isCorrect).length;
  const totalCount = stageResult.responses.length;
  const accuracy = correctCount / totalCount;
  
  const { advanceThreshold, dropThreshold } = config;
  
  // Advancement Logic
  if (accuracy >= advanceThreshold) {
    // Promote to higher difficulty
    if (currentDifficulty === 'easy') return 'moderate';
    if (currentDifficulty === 'moderate') return 'hard';
    return 'hard'; // Already at max
  }
  
  // Demotion Logic
  if (accuracy <= dropThreshold) {
    // Demote to lower difficulty
    if (currentDifficulty === 'hard') return 'moderate';
    if (currentDifficulty === 'moderate') return 'easy';
    return 'easy'; // Already at min
  }
  
  // Stay at current level
  return currentDifficulty;
}
```

---

## 3.6 Question Selection Algorithm

```typescript
function selectNextQuestion(
  difficulty: 'easy' | 'moderate' | 'hard',
  topics: string[],
  askedQuestions: string[], // Already asked question IDs
  userAbilityEstimate: number, // IRT theta
  questionPool: Question[]
): Question | null {
  
  // Filter available questions
  const availableQuestions = questionPool.filter(q => 
    q.difficulty === difficulty &&
    topics.includes(q.topic) &&
    !askedQuestions.includes(q.id)
  );
  
  if (availableQuestions.length === 0) {
    return null; // No more questions
  }
  
  // IRT-based selection: Pick question closest to user ability
  // Information function: I(θ) = a² * P(θ) * Q(θ)
  // where P(θ) = probability of correct response
  
  const scored = availableQuestions.map(q => {
    const { a, b, c } = q.irt; // discrimination, difficulty, guessing
    const theta = userAbilityEstimate;
    
    // 3PL IRT model
    const exponent = a * (theta - b);
    const probability = c + (1 - c) / (1 + Math.exp(-exponent));
    
    // Information function
    const information = (a * a * (probability - c) * (probability - c) * (1 - probability)) /
                       ((1 - c) * (1 - c) * probability);
    
    return { question: q, information };
  });
  
  // Sort by information (descending) and pick top
  scored.sort((a, b) => b.information - a.information);
  
  return scored[0].question;
}
```

---

## 3.7 Competency Level Determination

```typescript
type CompetencyLevel = 
  | 'belum_paham'      // <40% overall, mostly wrong
  | 'kurang_paham'     // 40-60%, mixed performance
  | 'paham_konsep'     // 60-80%, consistent correct
  | 'mahir'            // 80-90%, high confidence
  | 'sangat_mahir';    // 90-100%, mastered all levels

function determineCompetency(
  finalScore: number,
  confidenceScore: number,
  finalDifficulty: 'easy' | 'moderate' | 'hard',
  responses: Response[]
): CompetencyLevel {
  
  // Count high-confidence correct answers
  const highConfidenceCorrect = responses.filter(r => 
    r.isCorrect && r.confidence.level === 'high'
  ).length;
  
  const totalQuestions = responses.length;
  const highConfidenceRatio = highConfidenceCorrect / totalQuestions;
  
  // Multi-criteria decision
  if (finalScore >= 90 && confidenceScore >= 80 && finalDifficulty === 'hard') {
    return 'sangat_mahir';
  }
  else if (finalScore >= 80 && confidenceScore >= 70) {
    return 'mahir';
  }
  else if (finalScore >= 60 && confidenceScore >= 50) {
    return 'paham_konsep';
  }
  else if (finalScore >= 40) {
    return 'kurang_paham';
  }
  else {
    return 'belum_paham';
  }
}
```

---

## 3.8 Misconception Detection

```typescript
interface Misconception {
  topic: string;
  misconceptionType: string;
  frequency: number;
  questionIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

function detectMisconceptions(
  responses: Response[],
  questions: Question[]
): Misconception[] {
  
  const misconceptionMap = new Map<string, Misconception>();
  
  for (const response of responses) {
    if (response.isCorrect) continue; // Only analyze wrong answers
    
    const question = questions.find(q => q.id === response.questionId);
    if (!question) continue;
    
    // Find the misconception for selected wrong answer
    const misconception = question.commonMisconceptions?.find(
      m => m.optionId === response.selectedAnswer
    );
    
    if (misconception) {
      const key = `${question.topic}-${misconception.misconception}`;
      
      if (misconceptionMap.has(key)) {
        const existing = misconceptionMap.get(key)!;
        existing.frequency += 1;
        existing.questionIds.push(question.id);
      } else {
        misconceptionMap.set(key, {
          topic: question.topic,
          misconceptionType: misconception.misconception,
          frequency: 1,
          questionIds: [question.id],
          confidence: 'low' // Will be updated
        });
      }
    }
  }
  
  // Calculate confidence based on frequency
  const misconceptions = Array.from(misconceptionMap.values());
  
  for (const m of misconceptions) {
    if (m.frequency >= 3) m.confidence = 'high';
    else if (m.frequency === 2) m.confidence = 'medium';
    else m.confidence = 'low';
  }
  
  // Sort by frequency (descending)
  return misconceptions.sort((a, b) => b.frequency - a.frequency);
}
```

---

## 3.9 Complete MSAT Execution Flow

```typescript
async function executeMSATExam(
  examId: string,
  userId: string
): Promise<ExamResult> {
  
  const exam = await getExam(examId);
  const config = exam.msatConfig;
  const questionPool = await getQuestionPool(exam.topics);
  
  let currentDifficulty: 'easy' | 'moderate' | 'hard' = config.startingDifficulty;
  let userAbilityEstimate = 0; // Initial IRT theta
  const askedQuestions: string[] = [];
  const allResponses: Response[] = [];
  const stageHistory: StageHistory[] = [];
  
  // Execute all stages
  for (let stage = 1; stage <= config.stages; stage++) {
    const stageResponses: Response[] = [];
    
    // Ask questions for this stage
    for (let i = 0; i < config.questionsPerStage; i++) {
      const question = selectNextQuestion(
        currentDifficulty,
        exam.topics,
        askedQuestions,
        userAbilityEstimate,
        questionPool
      );
      
      if (!question) {
        console.warn(`No more questions available at ${currentDifficulty}`);
        break;
      }
      
      // Present question to user
      const response = await askQuestion(question, config);
      
      // Calculate confidence
      response.confidence = calculateConfidence(
        response.timeSpent,
        question.expectedTime,
        response.isCorrect
      );
      
      stageResponses.push(response);
      askedQuestions.push(question.id);
      
      // Update ability estimate (simplified IRT)
      if (response.isCorrect) {
        userAbilityEstimate += 0.3;
      } else {
        userAbilityEstimate -= 0.3;
      }
    }
    
    // Calculate stage result
    const correctCount = stageResponses.filter(r => r.isCorrect).length;
    const accuracy = correctCount / stageResponses.length;
    
    // Record stage history
    stageHistory.push({
      stage,
      difficulty: currentDifficulty,
      questionsAsked: stageResponses.map(r => r.questionId),
      correctCount,
      incorrectCount: stageResponses.length - correctCount,
      averageTime: stageResponses.reduce((sum, r) => sum + r.timeSpent, 0) / stageResponses.length,
      competencyLevel: determineCompetency(
        accuracy * 100,
        calculateOverallConfidence(stageResponses),
        currentDifficulty,
        stageResponses
      )
    });
    
    allResponses.push(...stageResponses);
    
    // Determine next difficulty (if not last stage)
    if (stage < config.stages) {
      const nextDifficulty = determineNextDifficulty(
        currentDifficulty,
        { stage, difficulty: currentDifficulty, responses: stageResponses },
        config
      );
      
      if (nextDifficulty !== currentDifficulty) {
        // Record transition
        console.log(`Stage ${stage}: ${currentDifficulty} → ${nextDifficulty}`);
      }
      
      currentDifficulty = nextDifficulty;
    }
  }
  
  // Calculate final results
  const totalCorrect = allResponses.filter(r => r.isCorrect).length;
  const totalQuestions = allResponses.length;
  const finalScore = (totalCorrect / totalQuestions) * 100;
  const confidenceScore = calculateOverallConfidence(allResponses);
  const competencyLevel = determineCompetency(
    finalScore,
    confidenceScore,
    currentDifficulty,
    allResponses
  );
  
  // Detect misconceptions
  const misconceptions = detectMisconceptions(allResponses, questionPool);
  
  // Topic mastery analysis
  const topicMastery = calculateTopicMastery(allResponses, exam.topics);
  
  // Create exam result
  const examResult: ExamResult = {
    id: generateId(),
    userId,
    examId,
    status: 'completed',
    
    msatSession: {
      currentStage: config.stages,
      currentDifficulty,
      stageHistory,
      difficultyTransitions: [] // TODO: Extract from stageHistory
    },
    
    responses: allResponses,
    
    score: {
      correct: totalCorrect,
      incorrect: totalQuestions - totalCorrect,
      total: totalQuestions,
      percentage: finalScore,
      byDifficulty: calculateScoreByDifficulty(allResponses)
    },
    
    competency: {
      overallLevel: competencyLevel,
      confidenceScore,
      byTopic: topicMastery,
      misconceptions
    },
    
    time: {
      started: allResponses[0].timestamp,
      completed: allResponses[allResponses.length - 1].timestamp,
      totalSeconds: allResponses.reduce((sum, r) => sum + r.timeSpent, 0),
      averagePerQuestion: allResponses.reduce((sum, r) => sum + r.timeSpent, 0) / totalQuestions
    },
    
    xpEarned: calculateXPEarned(finalScore, competencyLevel),
    
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    submittedAt: Timestamp.now()
  };
  
  // Save to Firestore
  await saveExamResult(examResult);
  
  // Award XP and check achievements
  await awardXP(userId, examResult.xpEarned);
  await checkAchievements(userId, examResult);
  
  return examResult;
}
```

---

## 3.10 Visual Representation

### MSAT Flow Diagram

```
User starts exam
      ↓
┌──────────────────────────────────────┐
│ STAGE 1: MODERATE (baseline)        │
│ Questions: 5                         │
│ • Q1 (moderate) → ✓ (45s / 60s)    │
│ • Q2 (moderate) → ✓ (50s / 60s)    │
│ • Q3 (moderate) → ✓ (40s / 60s)    │
│ • Q4 (moderate) → ✗ (80s / 60s)    │
│ • Q5 (moderate) → ✓ (55s / 60s)    │
│                                      │
│ Result: 4/5 correct (80%)            │
│ Decision: ADVANCE to HARD            │
└──────────────────────────────────────┘
      ↓
┌──────────────────────────────────────┐
│ STAGE 2: HARD (challenge)            │
│ Questions: 5                         │
│ • Q6 (hard) → ✓ (90s / 120s)       │
│ • Q7 (hard) → ✗ (140s / 120s)      │
│ • Q8 (hard) → ✓ (85s / 120s)       │
│ • Q9 (hard) → ✗ (130s / 120s)      │
│ • Q10 (hard) → ✓ (95s / 120s)      │
│                                      │
│ Result: 3/5 correct (60%)            │
│ Decision: DROP to MODERATE           │
└──────────────────────────────────────┘
      ↓
┌──────────────────────────────────────┐
│ STAGE 3: MODERATE (refinement)       │
│ Questions: 5                         │
│ • Q11 (moderate) → ✓ (42s / 60s)   │
│ • Q12 (moderate) → ✓ (38s / 60s)   │
│ • Q13 (moderate) → ✓ (48s / 60s)   │
│ • Q14 (moderate) → ✓ (35s / 60s)   │
│ • Q15 (moderate) → ✓ (40s / 60s)   │
│                                      │
│ Result: 5/5 correct (100%)           │
│ Final Level: MODERATE                │
└──────────────────────────────────────┘
      ↓
┌──────────────────────────────────────┐
│ FINAL ANALYSIS                       │
│                                      │
│ Overall Score: 12/15 = 80%           │
│ Confidence Score: 75                 │
│ Competency: MAHIR                    │
│                                      │
│ Classification breakdown:            │
│ • Mahir & Paham: 8 questions         │
│ • Kurang Mahir: 3 questions          │
│ • Kurang Memahami: 1 question        │
│ • Beruntung: 0 questions             │
│                                      │
│ Misconceptions detected:             │
│ • Konsep limiting reactant (2×)      │
│                                      │
│ XP Earned: +150                      │
└──────────────────────────────────────┘
```

---

# 4. AUTHENTICATION & AUTHORIZATION

## 4.1 Authentication Flow

### Sign Up Process

```
User visits signup page
      ↓
1. User enters:
   - Email
   - Password
   - Full Name
   - Invite Code (required)
      ↓
2. Frontend validates invite code
   - Call Cloud Function: validateInviteCode()
   - Check: code exists, active, not expired, has remaining uses
      ↓
3. If valid:
   - Create Firebase Auth user
   - Send email verification
   - Extract role & membership from invite code
      ↓
4. Cloud Function trigger: onUserCreate
   - Create user profile in Firestore (/users/{uid})
   - Set custom claims based on invite code
   - Record invite code usage
   - Initialize gamification (XP, level, streak)
   - Award "Welcome" achievement
      ↓
5. Redirect to email verification page
      ↓
6. User clicks verification link
      ↓
7. Redirect to onboarding/dashboard
```

### Sign In Process

```
User visits login page
      ↓
1. Enter email + password
   OR click "Sign in with Google"
      ↓
2. Firebase Authentication validates
      ↓
3. If successful:
   - Retrieve custom claims (role)
   - Fetch user profile from Firestore
   - Initialize Zustand store
   - Check streak status (update if needed)
      ↓
4. Redirect based on role:
   - Admin → Admin Dashboard
   - Teacher → Teacher Dashboard
   - Student → Student Dashboard
```

---

## 4.2 Invite Code System

### Code Format
```
AKURAT2024-{TYPE}-{RANDOM}

Examples:
- AKURAT2024-ASO-ABC123   (Asosiasi Kimia)
- AKURAT2024-SCH-XYZ789   (School)
- AKURAT2024-TCH-DEF456   (Teacher)
- AKURAT2024-TRL-GHI999   (Trial - 30 days)
```

### Code Types & Access

| Type | Full Name | Max Uses | Duration | Allowed Roles | Features |
|------|-----------|----------|----------|---------------|----------|
| `ASO` | Asosiasi Kimia Indonesia | Unlimited | Permanent | Student, Teacher | Full access, priority support |
| `SCH` | School License | 500-1000 | 1 year | Student, Teacher | Class management, analytics |
| `TCH` | Teacher Individual | 1 | Permanent | Teacher | Create materials, view students |
| `IND` | Individual Student | 1 | 1 year | Student | Basic features |
| `TRL` | Trial | 1 | 30 days | Student | Limited features |

### Validation Logic

```typescript
async function validateInviteCode(code: string): Promise<{
  valid: boolean;
  type?: string;
  allowedRoles?: string[];
  error?: string;
}> {
  
  const inviteDoc = await db.collection('invite_codes').doc(code).get();
  
  if (!inviteDoc.exists) {
    return { valid: false, error: 'Kode tidak ditemukan' };
  }
  
  const invite = inviteDoc.data() as InviteCode;
  
  // Check if active
  if (!invite.isActive) {
    return { valid: false, error: 'Kode sudah tidak aktif' };
  }
  
  // Check validity period
  const now = Timestamp.now();
  if (now < invite.validFrom || now > invite.validUntil) {
    return { valid: false, error: 'Kode sudah kadaluarsa' };
  }
  
  // Check usage limit
  if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
    return { valid: false, error: 'Kode sudah mencapai batas penggunaan' };
  }
  
  return {
    valid: true,
    type: invite.type,
    allowedRoles: invite.allowedRoles
  };
}
```

---

## 4.3 Role-Based Access Control (RBAC)

### Roles & Permissions

#### Admin
```typescript
const adminPermissions = {
  users: ['create', 'read', 'update', 'delete'],
  materials: ['create', 'read', 'update', 'delete', 'publish'],
  quizzes: ['create', 'read', 'update', 'delete', 'publish'],
  exams: ['create', 'read', 'update', 'delete', 'publish'],
  inviteCodes: ['create', 'read', 'update', 'delete'],
  analytics: ['read', 'export'],
  systemConfig: ['read', 'update'],
  messages: ['read', 'send'],
};
```

#### Teacher
```typescript
const teacherPermissions = {
  users: ['read'], // Only students in their class
  materials: ['create', 'read', 'update'], // Own materials
  quizzes: ['create', 'read', 'update', 'delete'], // Own quizzes
  exams: ['create', 'read', 'update'], // Own exams
  studentResults: ['read'], // Their students only
  analytics: ['read'], // Class-level only
  messages: ['read', 'send'], // With their students
};
```

#### Student
```typescript
const studentPermissions = {
  materials: ['read'], // Published only
  quizzes: ['read', 'attempt'],
  exams: ['read', 'attempt'],
  ownResults: ['read'],
  leaderboard: ['read'],
  messages: ['read', 'send'], // With their teacher
  profile: ['read', 'update'], // Own profile only
};
```

### Custom Claims

```typescript
// Set on user creation
await admin.auth().setCustomUserClaims(uid, {
  role: 'student', // 'admin' | 'teacher' | 'student'
  membershipType: 'asosiasi',
  schoolId: 'school_123',
  expiresAt: null // or Timestamp for trial users
});

// Access in client
const idTokenResult = await user.getIdTokenResult();
const role = idTokenResult.claims.role;
const membershipType = idTokenResult.claims.membershipType;
```

---

## 4.4 Middleware & Route Protection

```typescript
// middleware.ts (Next.js)
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return NextResponse.next();
  }
  
  // Check authentication
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token and get claims
  const decodedToken = await verifyToken(token);
  const role = decodedToken.role;
  
  // Role-based routing
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/quiz/:path*',
    '/exam/:path*',
  ],
};
```

---

# 5. API & DATA FLOW

## 5.1 Architecture Pattern

**Pattern**: BFF (Backend for Frontend) menggunakan Firebase Cloud Functions

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  (React Components, Zustand State, TanStack Query)       │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│   Firebase    │          │  Cloud         │
│   SDK Client  │          │  Functions     │
│   (Direct)    │          │  (Callable)    │
└───────┬───────┘          └────────┬───────┘
        │                           │
        │      ┌────────────────────┘
        │      │
        ▼      ▼
┌──────────────────────────┐
│   Firestore Database     │
└──────────────────────────┘
```

### Data Access Patterns

#### Direct Firestore Access (Read-Heavy)
- User profile
- Material content
- Quiz questions
- Leaderboards
- Messages

**Why**: Low latency, real-time updates, optimistic UI

#### Cloud Functions (Write-Heavy / Complex Logic)
- Submit quiz/exam answers (MSAT logic)
- Award XP & achievements
- Update leaderboards
- Generate analytics
- Send notifications

**Why**: Centralized business logic, security, consistency

---

## 5.2 Key API Endpoints (Cloud Functions)

### Authentication Functions

#### `validateInviteCode`
```typescript
// Callable function
export const validateInviteCode = functions.https.onCall(
  async (data: { code: string }, context) => {
    // Check if authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
    }
    
    const { code } = data;
    const result = await validateInviteCodeLogic(code);
    
    return result;
  }
);
```

---

### Quiz Functions

#### `submitQuizAnswer`
```typescript
// Callable function
export const submitQuizAnswer = functions.https.onCall(
  async (data: {
    quizId: string;
    resultId: string;
    questionId: string;
    selectedAnswer: string;
    timeSpent: number;
  }, context) => {
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
    }
    
    const userId = context.auth.uid;
    const { quizId, resultId, questionId, selectedAnswer, timeSpent } = data;
    
    // Get question
    const quiz = await db.collection('quizzes').doc(quizId).get();
    const question = quiz.data()?.questions.find(q => q.id === questionId);
    
    if (!question) {
      throw new functions.https.HttpsError('not-found', 'Question not found');
    }
    
    // Check answer
    const isCorrect = question.correctAnswer === selectedAnswer;
    
    // Calculate confidence
    const confidence = calculateConfidence(
      timeSpent,
      question.expectedTime,
      isCorrect
    );
    
    // Save response
    const response = {
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpent,
      timestamp: Timestamp.now(),
      confidence
    };
    
    await db.collection('quiz_results').doc(resultId).update({
      responses: FieldValue.arrayUnion(response),
      updatedAt: Timestamp.now()
    });
    
    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      confidence: confidence.level
    };
  }
);
```

---

#### `submitExamAnswer` (MSAT Version)
```typescript
export const submitExamAnswer = functions.https.onCall(
  async (data: {
    examId: string;
    resultId: string;
    questionId: string;
    selectedAnswer: string;
    timeSpent: number;
  }, context) => {
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
    }
    
    const userId = context.auth.uid;
    const { examId, resultId, questionId, selectedAnswer, timeSpent } = data;
    
    // Get exam result
    const resultDoc = await db.collection('exam_results').doc(resultId).get();
    const result = resultDoc.data() as ExamResult;
    
    // Get question
    const question = await getQuestion(questionId);
    
    // Check answer
    const isCorrect = question.correctAnswer === selectedAnswer;
    
    // Calculate confidence
    const confidence = calculateConfidence(
      timeSpent,
      question.expectedTime,
      isCorrect
    );
    
    // Save response
    const response: Response = {
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpent,
      expectedTime: question.expectedTime,
      difficulty: question.difficulty,
      stage: result.msatSession.currentStage,
      confidence,
      timestamp: Timestamp.now()
    };
    
    result.responses.push(response);
    
    // Check if stage is complete
    const currentStageResponses = result.responses.filter(
      r => r.stage === result.msatSession.currentStage
    );
    
    const exam = await getExam(examId);
    const isStageComplete = currentStageResponses.length >= exam.msatConfig.questionsPerStage;
    
    let nextQuestion: Question | null = null;
    let nextDifficulty = result.msatSession.currentDifficulty;
    
    if (isStageComplete) {
      // Determine next difficulty
      nextDifficulty = determineNextDifficulty(
        result.msatSession.currentDifficulty,
        {
          stage: result.msatSession.currentStage,
          difficulty: result.msatSession.currentDifficulty,
          responses: currentStageResponses
        },
        exam.msatConfig
      );
      
      // Record stage history
      result.msatSession.stageHistory.push({
        stage: result.msatSession.currentStage,
        difficulty: result.msatSession.currentDifficulty,
        questionsAsked: currentStageResponses.map(r => r.questionId),
        correctCount: currentStageResponses.filter(r => r.isCorrect).length,
        incorrectCount: currentStageResponses.filter(r => !r.isCorrect).length,
        averageTime: currentStageResponses.reduce((sum, r) => sum + r.timeSpent, 0) / currentStageResponses.length,
        competencyLevel: 'paham_konsep' // Placeholder
      });
      
      // Advance to next stage
      result.msatSession.currentStage += 1;
      result.msatSession.currentDifficulty = nextDifficulty;
      
      // Check if exam is complete
      if (result.msatSession.currentStage > exam.msatConfig.stages) {
        // Exam finished
        result.status = 'completed';
        
        // Calculate final score and competency
        const finalAnalysis = calculateFinalAnalysis(result, exam);
        result.score = finalAnalysis.score;
        result.competency = finalAnalysis.competency;
        result.xpEarned = finalAnalysis.xpEarned;
        
        // Award XP
        await awardXP(userId, result.xpEarned);
        
        // Check achievements
        await checkAchievements(userId, result);
        
      } else {
        // Get next question for new stage
        nextQuestion = await selectNextQuestion(
          nextDifficulty,
          exam.topics,
          result.responses.map(r => r.questionId),
          0, // userAbilityEstimate
          await getQuestionPool(exam.topics)
        );
      }
    } else {
      // Continue current stage
      nextQuestion = await selectNextQuestion(
        result.msatSession.currentDifficulty,
        exam.topics,
        result.responses.map(r => r.questionId),
        0,
        await getQuestionPool(exam.topics)
      );
    }
    
    // Update result
    await db.collection('exam_results').doc(resultId).set(result);
    
    return {
      isCorrect,
      isStageComplete,
      isExamComplete: result.status === 'completed',
      nextQuestion,
      currentStage: result.msatSession.currentStage,
      currentDifficulty: result.msatSession.currentDifficulty,
      finalScore: result.status === 'completed' ? result.score : null
    };
  }
);
```

---

### Gamification Functions

#### `awardXP`
```typescript
export const awardXP = functions.https.onCall(
  async (data: {
    userId: string;
    amount: number;
    source: string; // 'quiz', 'exam', 'lesson', 'streak'
  }, context) => {
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
    }
    
    // Verify caller is user themselves or admin
    if (context.auth.uid !== data.userId && !isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }
    
    const { userId, amount, source } = data;
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const user = userDoc.data() as User;
    
    const newXP = user.xp + amount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > user.level;
    
    // Update user
    await userRef.update({
      xp: newXP,
      level: newLevel,
      updatedAt: Timestamp.now()
    });
    
    // If leveled up, award achievement
    if (leveledUp) {
      await checkLevelUpAchievement(userId, newLevel);
    }
    
    return {
      newXP,
      newLevel,
      leveledUp,
      xpEarned: amount
    };
  }
);

function calculateLevel(xp: number): number {
  // Formula: XP = 100 * (level^1.5)
  // Inverse: level = (XP / 100)^(2/3)
  return Math.floor(Math.pow(xp / 100, 2/3));
}
```

---

#### `checkAchievements`
```typescript
export const checkAchievements = functions.https.onCall(
  async (data: {
    userId: string;
    eventType: string;
    eventData: any;
  }, context) => {
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
    }
    
    const { userId, eventType, eventData } = data;
    
    // Get all achievements
    const achievementsSnapshot = await db.collection('achievements')
      .where('isActive', '==', true)
      .get();
    
    const achievements = achievementsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Achievement[];
    
    // Get user's unlocked achievements
    const userAchievementsSnapshot = await db.collection('user_achievements')
      .where('userId', '==', userId)
      .get();
    
    const unlockedIds = userAchievementsSnapshot.docs.map(doc => doc.data().achievementId);
    
    const newlyUnlocked: Achievement[] = [];
    
    for (const achievement of achievements) {
      // Skip if already unlocked
      if (unlockedIds.includes(achievement.id)) continue;
      
      // Check criteria
      const shouldUnlock = await evaluateAchievementCriteria(
        achievement,
        userId,
        eventType,
        eventData
      );
      
      if (shouldUnlock) {
        // Unlock achievement
        await db.collection('user_achievements').add({
          userId,
          achievementId: achievement.id,
          unlockedAt: Timestamp.now(),
          progress: 100,
          isViewed: false,
          isFeatured: false,
          createdAt: Timestamp.now()
        });
        
        // Award XP
        if (achievement.rewards.xp > 0) {
          await awardXP({ userId, amount: achievement.rewards.xp, source: 'achievement' }, context);
        }
        
        newlyUnlocked.push(achievement);
      }
    }
    
    return {
      unlockedCount: newlyUnlocked.length,
      achievements: newlyUnlocked
    };
  }
);

async function evaluateAchievementCriteria(
  achievement: Achievement,
  userId: string,
  eventType: string,
  eventData: any
): Promise<boolean> {
  
  const { criteria } = achievement;
  
  switch (criteria.type) {
    case 'lesson_complete':
      if (eventType === 'lesson_complete') {
        const user = await getUser(userId);
        return user.stats.materialsCompleted >= (criteria.threshold || 1);
      }
      break;
      
    case 'quiz_score':
      if (eventType === 'quiz_complete') {
        const { score } = eventData;
        return score >= (criteria.conditions?.scorePercentage || 100);
      }
      break;
      
    case 'streak':
      if (eventType === 'streak_update') {
        const user = await getUser(userId);
        return user.streak.current >= (criteria.threshold || 7);
      }
      break;
      
    case 'xp':
      const user = await getUser(userId);
      return user.xp >= (criteria.threshold || 1000);
  }
  
  return false;
}
```

---

### Analytics Functions

#### `aggregateStats` (Scheduled)
```typescript
export const aggregateStats = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM
  .timeZone('Asia/Jakarta')
  .onRun(async (context) => {
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    // Calculate daily stats
    const stats = await calculateDailyStats(todayTimestamp);
    
    // Save snapshot
    await db.collection('analytics_snapshots').doc(today.toISOString().split('T')[0]).set({
      id: today.toISOString().split('T')[0],
      date: todayTimestamp,
      type: 'daily',
      ...stats,
      calculatedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    });
    
    console.log('Daily analytics aggregated');
  });
```

---

## 5.3 Real-Time Data Flow

### Leaderboard Updates

```typescript
// Client-side (React component)
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  
  useEffect(() => {
    const q = query(
      collection(db, 'leaderboards'),
      where('type', '==', 'global'),
      where('period', '==', 'weekly'),
      orderBy('startDate', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const leaderboard = snapshot.docs[0].data();
        setRankings(leaderboard.rankings);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div>
      {rankings.map((rank, index) => (
        <div key={rank.userId}>
          {index + 1}. {rank.displayName} - {rank.score} XP
        </div>
      ))}
    </div>
  );
}
```

---

### Streak Updates

```typescript
// Cloud Function: updateStreak (Scheduled daily)
export const updateStreak = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('Asia/Jakarta')
  .onRun(async (context) => {
    
    const now = Timestamp.now();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Get all active users
    const usersSnapshot = await db.collection('users')
      .where('status', '==', 'active')
      .get();
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data() as User;
      const lastActivity = user.streak.lastActivity.toDate();
      
      // Check if user was active yesterday
      const wasActiveYesterday = lastActivity >= yesterday;
      
      if (!wasActiveYesterday) {
        // Streak broken
        await userDoc.ref.update({
          'streak.current': 0,
          'updatedAt': now
        });
        
        // Send notification
        await sendStreakBrokenNotification(user.uid);
      }
    }
    
    console.log('Streaks updated');
  });
```

---

## 5.4 Optimistic Updates

```typescript
// Example: Submit quiz answer with optimistic update
async function submitAnswer(questionId: string, answer: string) {
  // Optimistic update
  setQuizState(prev => ({
    ...prev,
    responses: [...prev.responses, {
      questionId,
      selectedAnswer: answer,
      isCorrect: null, // Unknown yet
      isPending: true
    }]
  }));
  
  try {
    // Call Cloud Function
    const result = await submitQuizAnswer({
      quizId,
      resultId,
      questionId,
      selectedAnswer: answer,
      timeSpent: elapsed
    });
    
    // Update with actual result
    setQuizState(prev => ({
      ...prev,
      responses: prev.responses.map(r =>
        r.questionId === questionId
          ? { ...r, isCorrect: result.isCorrect, isPending: false }
          : r
      )
    }));
    
  } catch (error) {
    // Revert optimistic update
    setQuizState(prev => ({
      ...prev,
      responses: prev.responses.filter(r => r.questionId !== questionId)
    }));
    
    toast.error('Gagal mengirim jawaban');
  }
}
```

---

# 6. CONTENT MANAGEMENT SYSTEM

## 6.1 Content Creation Workflow

```
Teacher/Admin creates content
      ↓
1. Draft Phase
   - Write material in rich text editor
   - Add images, diagrams, formulas
   - Embed interactive examples
   - Set metadata (chapter, topics, difficulty)
      ↓
2. Review Phase (if required)
   - Submit for review
   - Admin/Senior Teacher reviews
   - Provide feedback or approve
      ↓
3. Publish Phase
   - Set as "Published"
   - Visible to students
   - Indexed for search
      ↓
4. Analytics
   - Track views, completions
   - Collect ratings
   - Identify improvement areas
```

---

## 6.2 Content Editor Features

### Rich Text Editor (Tiptap or Lexical)
```typescript
// React component
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mathematics from '@tiptap-pro/extension-mathematics';
import Image from '@tiptap/extension-image';

function MaterialEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mathematics,
      Image,
      // Custom extensions
    ],
    content: '',
  });
  
  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

### Features:
- **Text Formatting**: Bold, italic, underline, headings
- **Lists**: Bulleted, numbered
- **Tables**: For data presentation
- **Math**: KaTeX rendering untuk formulas
- **Images**: Upload via Cloud Storage
- **Code Blocks**: For example calculations
- **Callouts**: Warning, info, tip boxes
- **Interactive Embeds**: Calculators, simulations

---

## 6.3 Question Bank Management

### Question Creation Interface

```typescript
interface QuestionForm {
  text: string;
  imageUrl?: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  topic: string;
  subtopic?: string;
  options: {
    id: string;
    text: string;
    imageUrl?: string;
  }[];
  correctAnswer: string;
  explanation: string;
  commonMisconceptions: {
    optionId: string;
    misconception: string;
  }[];
  expectedTime: number;
}
```

### IRT Parameter Estimation

**Initial Assignment** (Manual):
- Admin assigns initial IRT parameters based on content review
- Easy: a=1.0, b=-1.0, c=0.2
- Moderate: a=1.2, b=0.0, c=0.2
- Hard: a=1.5, b=1.0, c=0.2

**Adaptive Calibration** (Automatic):
```typescript
// Cloud Function: recalibrateQuestions (Weekly)
export const recalibrateQuestions = functions.pubsub
  .schedule('0 3 * * 0') // Every Sunday at 3 AM
  .onRun(async (context) => {
    
    // Get all questions
    const questionsSnapshot = await db.collection('quizzes').get();
    const allQuestions: Question[] = [];
    
    for (const quizDoc of questionsSnapshot.docs) {
      const quiz = quizDoc.data();
      allQuestions.push(...quiz.questions);
    }
    
    for (const question of allQuestions) {
      // Get all responses to this question
      const responses = await getQuestionResponses(question.id);
      
      if (responses.length < 50) {
        // Not enough data, skip
        continue;
      }
      
      // Estimate IRT parameters using MLE or Bayesian methods
      const newParams = estimateIRTParameters(responses);
      
      // Update question
      await updateQuestionIRTParams(question.id, newParams);
    }
    
    console.log('Questions recalibrated');
  });
```

---

## 6.4 Content Review Process

### Review Workflow

```typescript
interface ReviewTask {
  contentId: string;
  contentType: 'material' | 'quiz' | 'exam';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  assignedTo?: string; // Reviewer user ID
  submittedBy: string; // Author user ID
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  feedback?: string;
}
```

### Admin Review Dashboard

- **Pending Queue**: All content awaiting review
- **Assign**: Assign to specific reviewer
- **Review Interface**:
  - Preview content as student would see
  - Check for errors, clarity, alignment with curriculum
  - Provide feedback
  - Approve or reject

---

## 6.5 Version Control

```typescript
interface MaterialVersion {
  materialId: string;
  version: number;
  content: string;
  updatedBy: string;
  updatedAt: Timestamp;
  changeLog: string;
}

// Save version on every update
async function updateMaterial(materialId: string, newContent: string) {
  const materialRef = db.collection('materials').doc(materialId);
  const material = (await materialRef.get()).data() as Material;
  
  // Save current version to history
  await db.collection('material_versions').add({
    materialId,
    version: material.version,
    content: material.content,
    updatedBy: material.authorId,
    updatedAt: material.updatedAt,
    changeLog: ''
  });
  
  // Update material
  await materialRef.update({
    content: newContent,
    version: material.version + 1,
    updatedAt: Timestamp.now()
  });
}
```

---

# 7. MVP SCOPE & PHASING

## 7.1 Phase 1: MVP (Months 1-3)

### Core Features (MUST HAVE)

#### Authentication & User Management
- ✅ Sign up dengan invite code
- ✅ Email verification
- ✅ Login/Logout
- ✅ Basic profile (name, email, role)
- ✅ Password reset

#### Content Delivery
- ✅ Material reading interface
  - Rich text content
  - Images & diagrams
  - Math formulas (KaTeX)
  - Table of contents
  - Progress tracking
- ✅ Material listing dengan filters (chapter, difficulty)
- ✅ Mark material as complete

#### Quiz System
- ✅ Practice quizzes (non-adaptive)
  - Multiple choice questions
  - Immediate feedback (practice mode)
  - Explanation for correct answer
  - Time tracking
- ✅ Quiz results & scoring
- ✅ Review past attempts

#### Basic Gamification
- ✅ XP system
  - Earn XP from lessons & quizzes
  - Level progression
- ✅ Streak tracking (basic)
  - Daily login streak
  - Visual streak counter
- ✅ Basic achievements (5-10 achievements)
  - First lesson
  - Perfect quiz
  - 7-day streak

#### Student Dashboard
- ✅ Welcome hero section
- ✅ Stats cards (XP, progress, quizzes taken)
- ✅ Learning path (material cards)
- ✅ Recent activity feed

#### Admin Dashboard
- ✅ User management (view, activate/deactivate)
- ✅ Material CRUD
- ✅ Quiz CRUD
- ✅ Invite code management
- ✅ Basic analytics (user count, engagement)

### Tech Foundation
- ✅ Next.js 14 setup dengan App Router
- ✅ Firebase project setup
  - Authentication
  - Firestore database
  - Cloud Functions (basic)
  - Cloud Storage
- ✅ Design system implementation
  - CSS variables
  - Component library (buttons, cards, inputs)
- ✅ Responsive design (mobile & desktop)

---

## 7.2 Phase 2: MSAT & Advanced Features (Months 4-6)

### MSAT Exam System
- ✅ Multistage adaptive testing
  - 3 difficulty levels
  - Dynamic difficulty adjustment
  - Implicit confidence calculation
- ✅ IRT-based question selection
- ✅ Detailed competency analysis
- ✅ Misconception detection
- ✅ Exam results dengan detailed breakdown

### Enhanced Gamification
- ✅ Expanded achievements (20+ achievements)
- ✅ Leaderboards
  - Global, class, friends
  - Daily, weekly, monthly, all-time
- ✅ Streak freezes & reminders
- ✅ XP multipliers & bonuses

### Teacher Features
- ✅ Teacher dashboard
- ✅ Student management
  - View class roster
  - Track individual progress
  - View quiz/exam results
- ✅ Messaging system (teacher ↔ student)
- ✅ Class analytics
  - Average scores
  - Topic mastery heatmap
  - Common misconceptions

### Content Enhancements
- ✅ Interactive examples
  - Embedded calculators
  - Simple simulations
- ✅ Video integration
- ✅ Attachments (PDFs, worksheets)
- ✅ Content versioning

### Advanced Analytics
- ✅ Detailed user journey tracking
- ✅ A/B testing framework
- ✅ Cohort analysis
- ✅ Retention metrics
- ✅ Automated reports

---

## 7.3 Phase 3: AI & Social Features (Months 7-9)

### AI-Powered Features
- ✅ AI explanation generator
  - Natural language explanations for wrong answers
  - Adaptive depth (beginner vs advanced)
- ✅ Personalized learning paths
  - AI recommends next lessons
  - Skip mastered content
  - Focus on weak areas
- ✅ Question generator (GPT-based)
  - Generate quiz questions from material
  - Automatic distractor generation

### Social Learning
- ✅ Study groups
  - Create/join groups
  - Group leaderboards
  - Shared achievements
- ✅ Peer messaging
- ✅ Discussion forums (per material/topic)
- ✅ Share achievements on social media

### Advanced Teacher Tools
- ✅ Custom quiz builder dengan AI assist
- ✅ Auto-grading for short answer questions (AI)
- ✅ Intervention recommendations
  - "Student X struggling with Topic Y"
- ✅ Class performance predictions

### Enhanced Content
- ✅ AR molecule visualization (mobile)
- ✅ Advanced simulations (chemical reactions)
- ✅ Collaborative problem solving

---

## 7.4 Phase 4: Scale & Enterprise (Months 10-12)

### Mobile App
- ✅ React Native app (iOS & Android)
- ✅ Native push notifications
- ✅ Offline mode
- ✅ Camera for equation scanning

### Institutional Features
- ✅ Multi-school deployment
- ✅ District-level analytics
- ✅ LMS integration (Moodle, Canvas, Google Classroom)
- ✅ SSO (Single Sign-On)
- ✅ API for third-party integrations

### Research & Export
- ✅ Data export for researchers (anonymized)
- ✅ Public datasets
- ✅ Research partnership program
- ✅ White-label version

### Performance & Scale
- ✅ CDN for global distribution
- ✅ Database sharding
- ✅ Advanced caching strategies
- ✅ Load testing & optimization
- ✅ 99.9% uptime SLA

---

## 7.5 Feature Prioritization Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Authentication | High | Low | Must Have | 1 |
| Material Reading | High | Medium | Must Have | 1 |
| Practice Quiz | High | Medium | Must Have | 1 |
| Basic Gamification | High | Low | Must Have | 1 |
| Student Dashboard | High | Medium | Must Have | 1 |
| Admin Dashboard | High | Medium | Must Have | 1 |
| MSAT Exam | High | High | Core Feature | 2 |
| Leaderboards | Medium | Low | Nice to Have | 2 |
| Teacher Dashboard | Medium | Medium | Important | 2 |
| Messaging | Medium | Medium | Important | 2 |
| AI Explanations | High | High | Advanced | 3 |
| Study Groups | Low | Medium | Optional | 3 |
| Mobile App | Medium | High | Future | 4 |
| AR Visualization | Low | High | Future | 4 |

---

## 7.6 MVP Success Metrics

### Week 4 (Soft Launch)
- 50 active users (beta testers)
- 10 materials published
- 100 quiz attempts
- 0 critical bugs

### Month 3 (MVP Complete)
- 500 active users
- 50 materials published
- 2,000 quiz attempts
- 10,000 questions answered
- 80% user satisfaction (survey)
- 40% D7 retention
- <2s page load time

### Month 6 (Phase 2 Complete)
- 2,000 active users
- 100 materials
- 50 MSAT exams conducted
- 20% MAU retention
- 70% quiz completion rate
- <3s MSAT response time

---

# 8. DESIGN SYSTEM

*(Keeping original design system from earlier document)*

## 8.1 Color Palette

### Primary Colors
```css
:root {
  --primary-blue: #1A73E8;
  --primary-cyan: #00C2FF;
  --primary-orange: #FF9500;
  --primary-bg: #EDF2F2;
  
  --success: #00B84D;
  --warning: #FFB800;
  --error: #E63946;
  
  --gray-50: #F8FAFB;
  --gray-900: #0F172A;
  
  --gradient-primary: linear-gradient(135deg, #1A73E8 0%, #00C2FF 100%);
}
```

## 8.2 Typography

```css
:root {
  --font-display: 'Poppins', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  --text-5xl: 3.5rem;
  --text-base: 1rem;
  --text-xs: 0.75rem;
}
```

## 8.3 Spacing & Layout

```css
:root {
  --space-4: 1rem;
  --space-8: 2rem;
  
  --radius-md: 0.5rem;
  --radius-xl: 1rem;
  
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
}
```

---

# 9. UI/UX PATTERNS

*(Keeping original UI/UX patterns)*

## 9.1 Navigation

### Desktop Header
- Fixed position
- 64px height
- Logo + nav links + user menu

### Mobile Bottom Tab
- 56px height
- 5 icons: Home, Materi, Latihan, Ujian, Profil

## 9.2 Cards

### Material Card
```jsx
<div className="material-card">
  <div className="emoji">🧪</div>
  <h3>Konsep Mol</h3>
  <p>Pelajari dasar-dasar mol...</p>
  <ProgressBar value={65} />
  <Badge>In Progress</Badge>
</div>
```

## 9.3 Modals & Dialogs

- Overlay dengan blur
- Max-width 600px
- Animation: fade in + scale

---

# 10. IMPLEMENTATION ROADMAP

## 10.1 Month 1: Foundation

### Week 1-2: Setup & Infrastructure
- [ ] Initialize Next.js project
- [ ] Set up Firebase project
- [ ] Configure Firestore security rules
- [ ] Deploy Cloud Functions (basic)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Design system implementation (CSS variables)

### Week 3-4: Authentication & User Management
- [ ] Sign up flow dengan invite code validation
- [ ] Email verification
- [ ] Login/logout
- [ ] Password reset
- [ ] User profile page
- [ ] Admin: User management UI

---

## 10.2 Month 2: Content & Quiz

### Week 5-6: Material System
- [ ] Material editor (rich text)
- [ ] Material listing & filtering
- [ ] Material reading interface
- [ ] Table of contents
- [ ] Progress tracking
- [ ] Mark as complete

### Week 7-8: Quiz System
- [ ] Quiz creation UI (admin)
- [ ] Quiz taking interface
- [ ] Submit answers
- [ ] Immediate feedback (practice mode)
- [ ] Quiz results page
- [ ] Review past attempts

---

## 10.3 Month 3: Dashboard & Gamification

### Week 9-10: Student Dashboard
- [ ] Hero section
- [ ] Stats cards
- [ ] Learning path
- [ ] Recent activity feed
- [ ] Quick actions

### Week 11-12: Basic Gamification
- [ ] XP system implementation
- [ ] Level calculation
- [ ] Streak tracking
- [ ] Achievement definitions
- [ ] Achievement unlock logic
- [ ] Badge display

**End of MVP - Beta Launch**

---

## 10.4 Month 4-5: MSAT Implementation

### Week 13-14: MSAT Algorithm
- [ ] IRT parameter setup
- [ ] Question selection logic
- [ ] Difficulty transition logic
- [ ] Confidence calculation
- [ ] Cloud Function: submitExamAnswer

### Week 15-16: MSAT UI
- [ ] Exam interface (adaptive)
- [ ] Stage progression
- [ ] Results page dengan detailed analysis
- [ ] Competency level display
- [ ] Misconception report

### Week 17-18: Testing & Optimization
- [ ] MSAT algorithm validation
- [ ] Performance optimization
- [ ] User testing
- [ ] Bug fixes

---

## 10.5 Month 6: Teacher Features

### Week 19-20: Teacher Dashboard
- [ ] Student roster
- [ ] Individual student progress
- [ ] Class analytics dashboard
- [ ] Topic mastery heatmap

### Week 21-22: Communication
- [ ] Messaging system (teacher ↔ student)
- [ ] Notifications
- [ ] Feedback on results

### Week 23-24: Polish & Launch
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] Final testing
- [ ] Public launch

---

## 10.6 Month 7-9: AI & Social (Phase 3)

*Detailed planning TBD based on Phase 2 outcomes*

---

## 10.7 Month 10-12: Scale & Enterprise (Phase 4)

*Detailed planning TBD*

---

# APPENDIX

## A. Glossary

- **MSAT**: Multistage Adaptive Testing
- **IRT**: Item Response Theory
- **XP**: Experience Points
- **KPI**: Key Performance Indicator
- **RBAC**: Role-Based Access Control
- **BFF**: Backend for Frontend

---

## B. References

### Design Inspiration
- [Brilliant.org](https://brilliant.org)
- [Duolingo](https://www.duolingo.com)
- [ClassDojo](https://www.classdojo.com)

### Technical Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [IRT Models](https://en.wikipedia.org/wiki/Item_response_theory)

---

## C. Contact & Support

**Project Lead**: [Your Name]  
**Email**: [your-email@example.com]  
**GitHub**: [repository-link]  
**Slack**: #akurat-project

---

**Document Version**: 4.0 Complete Technical Specification  
**Last Updated**: May 22, 2026  
**Status**: Ready for Implementation  
**Next Review**: After MVP Launch

---

*End of Complete Project Context*