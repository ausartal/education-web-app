# Ujian KPS — Complete Architecture Design

## 1. Data Models

### 1.1 TypeScript Interfaces (`src/types/kps.ts`)

```typescript
// ── KPS Difficulty Levels ──
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
  title: string;                    // e.g. "Eksperimen Kesetimbangan Kimia"
  content: string;                  // Markdown + KaTeX stimulus text
  topic: string;                    // "kesetimbangan_kimia"
  createdAt: Timestamp;
  createdBy: string;
  status: 'active' | 'inactive';
}

// ── Question base (shared across all types) ──
export interface KPSQuestionBase {
  id: string;
  stimulusId: string;
  indicator: KPSIndicator;
  stage: 1 | 2 | 3;
  difficultyLevel: KPSDifficultyLevel;
  questionType: KPSQuestionType;
  stem: string;                     // Markdown + KaTeX
  explanation: string;              // Shown in review
  order: number;                    // 1-7 within the stimulus set
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: Timestamp;
  usageCount: number;
  avgCorrectRate: number;
}

// ── Multiple Choice (single correct) ──
export interface KPSMultipleChoice extends KPSQuestionBase {
  questionType: 'multiple_choice';
  options: Record<string, string>;  // { A: "...", B: "...", C: "...", D: "..." }
  correctAnswer: string;            // "A"
}

// ── Complex Multiple Choice (multiple correct) ──
export interface KPSComplexMC extends KPSQuestionBase {
  questionType: 'complex_multiple_choice';
  options: Record<string, string>;  // { A: "...", B: "...", C: "...", D: "...", E: "..." }
  correctAnswers: string[];         // ["A", "C", "E"]
  partialCredit: boolean;           // true = partial scoring
}

// ── True/False (single statement) ──
export interface KPSTrueFalse extends KPSQuestionBase {
  questionType: 'true_false';
  statement: string;                // The T/F statement
  correctAnswer: boolean;           // true or false
}

// ── Complex True/False (multiple statements, all must be correct) ──
export interface KPSComplexTF extends KPSQuestionBase {
  questionType: 'complex_true_false';
  statements: Array<{
    id: string;
    text: string;
    correctAnswer: boolean;
  }>;
  requireAll: boolean;              // true = all must be correct for full credit
}

// ── Matching ──
export interface KPSMatching extends KPSQuestionBase {
  questionType: 'matching';
  premises: Array<{ id: string; text: string }>;       // Left column
  options: Array<{ id: string; text: string }>;         // Right column
  correctMatches: Record<string, string>;               // { premiseId: optionId }
}

// ── Union type ──
export type KPSQuestion =
  | KPSMultipleChoice
  | KPSComplexMC
  | KPSTrueFalse
  | KPSComplexTF
  | KPSMatching;

// ── Server-side answer payload (stripped of correctAnswer before client) ──
export type KPSQuestionClient = Omit<KPSMultipleChoice, 'correctAnswer'> |
  Omit<KPSComplexMC, 'correctAnswers'> |
  Omit<KPSTrueFalse, 'correctAnswer'> |
  Omit<KPSComplexTF, 'statements'> & { statements: Array<{ id: string; text: string }> } |
  Omit<KPSMatching, 'correctMatches'>;

// ── Per-question response ──
export interface KPSQuestionResponse {
  questionId: string;
  indicator: KPSIndicator;
  questionType: KPSQuestionType;
  // Answer varies by type:
  selectedAnswer?: string;                // MC: "A"
  selectedAnswers?: string[];             // Complex MC: ["A","C"]
  booleanAnswer?: boolean;                // T/F: true/false
  booleanAnswers?: Record<string, boolean>; // Complex TF: { stmtId: true/false }
  matchedPairs?: Record<string, string>;  // Matching: { premiseId: optionId }
  // Computed server-side:
  isCorrect: boolean;
  score: number;                          // 0.0 - 1.0 (partial credit support)
  timeSpentMs: number;
}

// ── Stage response (7 questions for one stage) ──
export interface KPSStageResponse {
  stage: 1 | 2 | 3;
  path: KPSStagePath | null;              // null for stage 1, 'tinggi'/'rendah' for 2+3
  questions: KPSQuestionResponse[];
  correctCount: number;                   // 0-7
  score: number;                          // 0-100 weighted
  submittedAt: Timestamp;
}

// ── KPS Exam Session (Firestore document) ──
export interface KPSExamSession {
  id: string;
  studentId: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  durationMinutes: number;                // 60
  status: 'in_progress' | 'completed' | 'abandoned' | 'flagged';
  // Stage tracking
  currentStage: 1 | 2 | 3;
  stageResponses: KPSStageResponse[];
  // Adaptive state
  stage1Path: null;                       // always null
  stage2Path: KPSStagePath | null;        // determined after stage 1
  stage3Path: KPSStagePath | null;        // determined after stage 2
  // Final results (computed on completion)
  finalLevel: KPSDifficultyLevel | null;
  numericScore: number | null;            // 0-100
  indicatorScores: Record<KPSIndicator, number> | null; // per-indicator 0-100
  // Anti-cheat
  anomalyFlags: string[];
  tabSwitchCount: number;
  // Stimulus IDs used (for audit)
  stimulusIds: string[];
}

// ── Level labels/colors (for display) ──
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
```

### 1.2 Firestore Collections

**`kps_stimuli`** — stimulus passages (context for 7 questions)
```
{
  id: string (auto)
  level: KPSDifficultyLevel
  stage: 1 | 2 | 3
  title: string
  content: string (markdown+KaTeX)
  topic: "kesetimbangan_kimia"
  status: "active" | "inactive"
  createdBy: string (uid)
  createdAt: Timestamp
}
```
**Index**: `(topic, stage, level, status)` — for efficient question assembly

**`kps_questions`** — individual questions
```
{
  id: string (auto)
  stimulusId: string (ref → kps_stimuli)
  indicator: KPSIndicator
  stage: 1 | 2 | 3
  difficultyLevel: KPSDifficultyLevel
  questionType: KPSQuestionType
  stem: string (markdown+KaTeX)
  explanation: string
  order: number (1-7)
  status: "active" | "inactive"
  createdBy: string (uid)
  createdAt: Timestamp
  usageCount: number
  avgCorrectRate: number
  // Type-specific fields (flat in Firestore):
  options?: Record<string, string>
  correctAnswer?: string | boolean
  correctAnswers?: string[]
  partialCredit?: boolean
  statement?: string
  statements?: Array<{ id: string; text: string; correctAnswer: boolean }>
  requireAll?: boolean
  premises?: Array<{ id: string; text: string }>
  matchingOptions?: Array<{ id: string; text: string }>
  correctMatches?: Record<string, string>
}
```
**Index**: `(stimulusId, order)` — for ordered question set retrieval

**`kps_exam_sessions`** — exam sessions (separate from `exam_sessions`)
```
{
  id: string (auto)
  studentId: string (ref → users)
  startedAt: Timestamp
  completedAt: Timestamp | null
  durationMinutes: 60
  status: "in_progress" | "completed" | "abandoned" | "flagged"
  currentStage: 1 | 2 | 3
  stageResponses: KPSStageResponse[]  (embedded array)
  stage1Path: null
  stage2Path: "tinggi" | "rendah" | null
  stage3Path: "tinggi" | "rendah" | null
  finalLevel: KPSDifficultyLevel | null
  numericScore: number | null
  indicatorScores: Record<KPSIndicator, number> | null
  anomalyFlags: string[]
  tabSwitchCount: number
  stimulusIds: string[]
}
```
**Index**: `(studentId, status)` — for history queries; `(studentId, completedAt)` — for riwayat

---

## 2. Adaptive Engine (`src/lib/kps-engine.ts`)

### 2.1 Core Algorithm

```
STAGE 1: Always "menengah" level
  - 7 questions, 1 per KPS indicator
  - All students get the same stage 1 stimulus set

SCORING THRESHOLD: 5/7 correct (71.4%)

STAGE 2 BRANCH:
  If stage1.correctCount >= 5 → path = 'tinggi'  (high difficulty)
  Else                         → path = 'rendah'  (low difficulty)
  - 7 questions from the corresponding difficulty level

STAGE 3 BRANCH:
  If stage2 path = 'tinggi' AND stage2.correctCount >= 5 → path = 'tinggi'
  If stage2 path = 'tinggi' AND stage2.correctCount < 5  → path = 'rendah'
  If stage2 path = 'rendah' AND stage2.correctCount >= 5 → path = 'tinggi'
  If stage2 path = 'rendah' AND stage2.correctCount < 5  → path = 'rendah'

FINAL LEVEL MAPPING (3-stage total score):
  The final level is determined by the COMBINATION of stage 2 path and stage 3 path,
  plus overall performance across all 21 questions.

  Mapping table:
  ┌─────────────┬─────────────┬──────────────────────┐
  │  Stage 2    │  Stage 3    │  Final Level         │
  ├─────────────┼─────────────┼──────────────────────┤
  │  tinggi     │  tinggi     │  Tetap Tinggi        │
  │  tinggi     │  rendah     │  Menengah Lebih      │
  │             │             │  Tinggi              │
  │  rendah     │  tinggi     │  Menengah Lebih      │
  │             │             │  Rendah              │
  │  rendah     │  rendah     │  Tetap Rendah        │
  └─────────────┴─────────────┴──────────────────────┘

  Refined with overall score for intermediate levels:
  - If final = "Tetap Tinggi" AND totalScore >= 90 → Tetap Tinggi
  - If final = "Tetap Tinggi" AND totalScore < 90  → Tinggi
  - If final = "Tetap Rendah" AND totalScore >= 30 → Rendah
  - If final = "Tetap Rendah" AND totalScore < 30  → Tetap Rendah
  - "Menengah" maps when stage2 and stage3 paths differ but score is mid-range

  NOTE: The intermediate levels (Tinggi, Rendah, Menengah) are refinement zones.
  The primary driver is the path combination; the numeric score refines within that zone.
```

### 2.2 Scoring Functions

```typescript
// Stage score: weighted by indicator importance
function calculateStageScore(responses: KPSQuestionResponse[]): number
  // Each question worth 1/7 of stage score
  // With partial credit: score per question is 0.0-1.0
  // Stage score = avg(question scores) * 100

// Indicator score: across all stages
function calculateIndicatorScores(
  allResponses: KPSQuestionResponse[]
): Record<KPSIndicator, number>
  // Group by indicator, average scores per indicator, scale to 0-100

// Numeric score (0-100): weighted combination
function calculateNumericScore(
  stageResponses: KPSStageResponse[],
  indicatorScores: Record<KPSIndicator, number>
): number
  // 60% stage performance (weighted: S1=20%, S2=30%, S3=50%)
  // 40% indicator average
  // Result: 0-100

// Final level determination
function determineFinalLevel(
  stage2Path: KPSStagePath,
  stage3Path: KPSStagePath,
  numericScore: number
): KPSDifficultyLevel
```

### 2.3 Question Type Scoring

```typescript
function scoreQuestion(question: KPSQuestion, response: KPSQuestionResponse): number
  // MC: 1.0 if correct, 0.0 if wrong
  // Complex MC (partialCredit=true): fraction of correct selections minus fraction of wrong selections, min 0
  // Complex MC (partialCredit=false): 1.0 only if exact match
  // T/F: 1.0 if correct, 0.0 if wrong
  // Complex TF (requireAll=true): 1.0 only if all correct
  // Complex TF (requireAll=false): fraction correct
  // Matching: fraction of correct pairs
```

---

## 3. API Routes

All under `src/app/api/kps/`.

### 3.1 `POST /api/kps/sessions/start`
**Auth**: Student (Bearer)
**Purpose**: Start a new KPS exam session or resume an existing one
**Request**: `{}` (no body needed — student-initiated, no token)
**Logic**:
1. Verify student auth
2. Check for existing in-progress session → return it (resume)
3. Fetch stage 1 stimulus + questions (level=menengah, stage=1)
4. Create `kps_exam_sessions` document
5. Strip correct answers, return questions
**Response (201)**:
```json
{
  "sessionId": "abc123",
  "resumed": false,
  "durationMinutes": 60,
  "stage": 1,
  "stimulus": { "id": "...", "title": "...", "content": "..." },
  "questions": [ /* KPSQuestionClient[] — 7 questions, no answers */ ]
}
```

### 3.2 `POST /api/kps/sessions/[id]/answer`
**Auth**: Student (Bearer)
**Purpose**: Submit answer for a single question (immediate feedback NOT given)
**Request**:
```json
{
  "questionId": "q1",
  "answer": { /* varies by type — see KPSQuestionResponse answer fields */ },
  "timeSpentMs": 45000
}
```
**Logic**:
1. Verify session ownership + status = in_progress
2. Fetch question from `kps_questions` to get correct answer
3. Score the answer server-side
4. Store response in session's stage response
**Response (200)**:
```json
{
  "questionId": "q1",
  "isCorrect": true,
  "score": 1.0
}
```

### 3.3 `POST /api/kps/sessions/[id]/stage`
**Auth**: Student (Bearer)
**Purpose**: Submit completed stage (all 7 questions answered) → triggers adaptive branching
**Request**:
```json
{
  "stage": 2,
  "responses": [ /* KPSQuestionResponse[] — 7 items */ ]
}
```
**Logic**:
1. Validate all 7 questions answered
2. Calculate stage score + correct count
3. Determine next stage path (adaptive branch)
4. Fetch next stage stimulus + questions based on new path
5. Update session document
6. If stage 3 was submitted → don't return questions, trigger completion
**Response (200)**:
```json
{
  "stageCompleted": 2,
  "correctCount": 5,
  "stageScore": 71.4,
  "nextStage": 3,
  "nextPath": "tinggi",
  "stimulus": { "id": "...", "title": "...", "content": "..." },
  "questions": [ /* 7 questions for stage 3 */ ]
}
```

### 3.4 `POST /api/kps/sessions/[id]/complete`
**Auth**: Student (Bearer)
**Purpose**: Complete the exam, compute final scores
**Request**: `{}` (empty — server reads session state)
**Logic**:
1. Validate all 3 stages completed
2. Compute: finalLevel, numericScore, indicatorScores
3. Detect anomalies
4. Update session status → completed
5. Log audit event
**Response (200)**:
```json
{
  "sessionId": "abc123",
  "finalLevel": "tetap_tinggi",
  "numericScore": 87,
  "indicatorScores": {
    "merumuskan_masalah": 100,
    "membuat_hipotesis": 85.7,
    ...
  },
  "totalCorrect": 18,
  "totalQuestions": 21
}
```

### 3.5 `GET /api/kps/sessions/[id]`
**Auth**: Student (Bearer)
**Purpose**: Fetch session data (for results page)
**Response**: Full `KPSExamSession` with computed results

### 3.6 `GET /api/kps/history`
**Auth**: Student (Bearer)
**Purpose**: List all completed KPS sessions for the student
**Query**: `?limit=10&offset=0`
**Response**:
```json
{
  "sessions": [
    {
      "id": "...",
      "completedAt": "...",
      "finalLevel": "tinggi",
      "numericScore": 82,
      "totalCorrect": 17
    }
  ],
  "total": 5
}
```

---

## 4. File Structure

```
src/
├── types/
│   └── kps.ts                              # All KPS TypeScript interfaces
│
├── lib/
│   └── kps-engine.ts                       # Adaptive engine + scoring functions
│
├── app/
│   ├── (kps-ujian)/                        # New route group (isolated)
│   │   ├── layout.tsx                      # Minimal layout (AuthGuard, no sidebar)
│   │   ├── ujian-kps/
│   │   │   ├── page.tsx                    # Landing/intro page
│   │   │   ├── [sessionId]/
│   │   │   │   ├── page.tsx                # Exam session page (main exam UI)
│   │   │   │   └── results/
│   │   │   │       └── page.tsx            # Results page
│   │   │   └── riwayat/
│   │   │       └── page.tsx                # History of past attempts
│   │   └── (components)/                   # Route-group-scoped components (optional)
│   │
│   └── api/
│       └── kps/
│           ├── sessions/
│           │   ├── start/
│           │   │   └── route.ts            # POST — start/resume session
│           │   └── [id]/
│           │       ├── route.ts            # GET — fetch session
│           │       ├── answer/
│           │       │   └── route.ts        # POST — submit single answer
│           │       ├── stage/
│           │       │   └── route.ts        # POST — submit completed stage
│           │       └── complete/
│           │           └── route.ts        # POST — complete exam
│           └── history/
│               └── route.ts               # GET — exam history
│
├── components/
│   └── kps/
│       ├── KPSQuestionRenderer.tsx         # Router: delegates to type-specific renderer
│       ├── KPSMultipleChoice.tsx           # MC renderer
│       ├── KPSComplexMC.tsx                # Complex MC renderer
│       ├── KPSTrueFalse.tsx                # T/F renderer
│       ├── KPSComplexTF.tsx                # Complex T/F renderer
│       ├── KPSMatching.tsx                 # Matching renderer
│       ├── KPSStageIndicator.tsx           # Stage progress (1→2→3)
│       ├── KPSProgressBar.tsx              # Per-stage question progress
│       ├── KPSTimer.tsx                    # Countdown timer component
│       ├── KPSAntiCheat.tsx                # Fullscreen + tab-switch logic
│       ├── KPSScoreCard.tsx                # Score display card (results page)
│       ├── KPSIndicatorRadar.tsx           # Radar/spider chart for 7 indicators
│       └── KPSSessionCard.tsx              # History card for riwayat page
│
└── hooks/
    └── useKPSSession.ts                    # Session state management hook
```

---

## 5. Component Architecture

### 5.1 Reuse from Existing Codebase
| What | From | How |
|------|------|-----|
| `QuestionRenderer` | `src/components/shared/` | Reuse for rendering stem/options markdown+KaTeX |
| `AuthGuard` | `src/components/guards/` | Wrap `(kps-ujian)` layout |
| `Button` | `src/components/ui/` | All buttons |
| `Card` | `src/components/ui/` | Result cards, session cards |
| `Modal` | `src/components/ui/` | Tab warning, fullscreen gate |
| `Radio` | `src/components/ui/` | MC options |
| `Checkbox` | `src/components/ui/` | Complex MC options |
| `useAuth` | `src/context/AuthContext.tsx` | Auth state |
| `useAuthSWR` | `src/hooks/` | Data fetching (history) |
| `useToast` | `src/hooks/` | Error/success notifications |
| Anti-cheat pattern | Exam session page | Copy pattern: fullscreen gate, tab detection |
| Timer pattern | Exam session page | Copy pattern: countdown, auto-submit |

### 5.2 New Components (KPS-specific)

**`KPSQuestionRenderer`** — Meta component that switches by `questionType`:
```tsx
interface KPSQuestionRendererProps {
  question: KPSQuestionClient;
  currentAnswer: KPSQuestionResponse | null;
  onAnswer: (answer: Partial<KPSQuestionResponse>) => void;
  disabled?: boolean;
}
```
Internally renders:
- `KPSMultipleChoice` — radio-style options (A/B/C/D)
- `KPSComplexMC` — checkbox-style options (select multiple)
- `KPSTrueFalse` — two large buttons (Benar/Salah)
- `KPSComplexTF` — table of statements with T/F toggles per row
- `KPSMatching` — drag-and-drop or dropdown matching

**`KPSMatching`** — Two-column layout:
- Left: premises (fixed)
- Right: options (draggable or select-to-match)
- Implementation: dropdown select per premise (simpler than drag-drop, mobile-friendly)

**`KPSIndicatorRadar`** — SVG-based radar chart:
- 7 axes (one per KPS indicator)
- Shows student's score per indicator as a polygon
- Uses raw SVG `<polygon>` + `<circle>` (no chart library dependency)

### 5.3 `useKPSSession` Hook

```typescript
function useKPSSession(sessionId: string) {
  // State
  const [session, setSession] = useState<KPSExamSessionState>();
  const [currentStage, setCurrentStage] = useState<1|2|3>(1);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [stageQuestions, setStageQuestions] = useState<KPSQuestionClient[]>([]);
  const [stageStimulus, setStageStimulus] = useState<KPSStimulus | null>(null);
  const [responses, setResponses] = useState<KPSQuestionResponse[]>([]);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 min in seconds
  const [submitting, setSubmitting] = useState(false);

  // Actions
  function selectAnswer(answer: Partial<KPSQuestionResponse>): void;
  function submitAnswer(): Promise<void>;          // POST to /answer
  function submitStage(): Promise<void>;           // POST to /stage → get next stage
  function completeExam(): Promise<void>;          // POST to /complete
  function restoreFromLocalStorage(): boolean;     // Resume support
  function saveToLocalStorage(): void;             // Persist state

  return {
    currentStage, currentQuestionIdx, stageQuestions, stageStimulus,
    responses, timeLeft, submitting,
    selectAnswer, submitAnswer, submitStage, completeExam,
  };
}
```

---

## 6. Page Layouts & UX Flow

### 6.1 `(kps-ujian)/layout.tsx`
```tsx
// Minimal layout — no sidebar, no teacher nav
// Just AuthGuard + clean container
<AuthGuard>
  <main className="min-h-screen bg-[#f8f8fc]">{children}</main>
</AuthGuard>
```

### 6.2 Landing Page: `/ujian-kps`
- Hero section: "Ujian KPS — Tes Penempatan Keterampilan Proses Sains"
- Brief explanation of what KPS is (3-4 sentences)
- Info cards: 21 soal, 60 menit, 7 indikator KPS, 3 tahap adaptif
- "Mulai Ujian" button → POST /api/kps/sessions/start → redirect to /[sessionId]
- If in-progress session exists → "Lanjutkan Ujian" button
- Past attempts link → /ujian-kps/riwayat

### 6.3 Exam Session: `/ujian-kps/[sessionId]`

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [Stage 1→2→3 progress]  [Timer: 58:42]     │  ← Sticky header
├─────────────────────────────────────────────┤
│  [Q1 ● Q2 ○ Q3 ○ Q4 ○ Q5 ○ Q6 ○ Q7 ○ ]   │  ← Question dots
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Stimulus (Markdown + KaTeX)        │    │  ← Scrollable stimulus
│  │  "Dalam sebuah eksperimen..."       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Question stem                      │    │
│  │                                     │    │
│  │  ○ A. option text                   │    │
│  │  ○ B. option text                   │    │
│  │  ○ C. option text                   │    │
│  │  ○ D. option text                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [← Sebelumnya]  [Kumpulkan Tahap →]        │  ← Navigation
└─────────────────────────────────────────────┘
```

**Anti-cheat** (same pattern as existing exam):
- Fullscreen gate on load
- Tab-switch detection → warning popup → count stored
- beforeunload handler
- Online/offline detection
- Auto-submit on timer expiry

**Stage transition UX:**
1. Student answers all 7 questions in stage
2. "Kumpulkan Tahap X" button enabled when all answered
3. Brief loading spinner while server processes
4. Stage transition animation (fade)
5. New stimulus + questions load for next stage

**State persistence:**
- `localStorage` key: `kps_session_${sessionId}`
- Stores: currentStage, currentQuestionIdx, responses, timeLeft
- On page reload: restore from localStorage, verify with server

### 6.4 Results Page: `/ujian-kps/[sessionId]/results`

**Layout:**
```
┌─────────────────────────────────────────────┐
│         Level Badge: "Tetap Tinggi"          │  ← Large colored badge
│         Skor: 87/100                         │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────┐  ┌───────────────┐       │
│  │  Tahap 1      │  │  Tahap 2      │       │  ← Stage breakdown
│  │  6/7 Benar    │  │  5/7 Benar    │       │
│  │  Path: —      │  │  Path: Tinggi │       │
│  └───────────────┘  └───────────────┘       │
│  ┌───────────────┐                          │
│  │  Tahap 3      │                          │
│  │  7/7 Benar    │                          │
│  │  Path: Tinggi │                          │
│  └───────────────┘                          │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Radar Chart: 7 KPS Indicators      │    │
│  │       (SVG spider chart)            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Detail per Indikator               │    │
│  │  ● Merumuskan Masalah: 100%         │    │
│  │  ● Membuat Hipotesis: 85.7%         │    │
│  │  ● ...                              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Riwayat]  [Dashboard]  [Ujian Lain]       │  ← Action buttons
└─────────────────────────────────────────────┘
```

### 6.5 History Page: `/ujian-kps/riwayat`

- List of past KPS sessions (newest first)
- Each card: date, level badge, score, correct count
- Click → expand to see indicator breakdown
- Empty state: "Belum ada riwayat ujian KPS"

---

## 7. Firestore Security Rules Addition

```
// Add to firestore.rules:
match /kps_stimuli/{docId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin SDK only
}
match /kps_questions/{docId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin SDK only
}
match /kps_exam_sessions/{docId} {
  allow read: if request.auth != null && (
    resource.data.studentId == request.auth.uid
  );
  allow create: if false; // Admin SDK only
  allow update: if false; // Admin SDK only
}
```

---

## 8. Implementation Order

### Phase 1: Foundation (build first)
1. `src/types/kps.ts` — All interfaces
2. `src/lib/kps-engine.ts` — Scoring + adaptive logic (pure functions, fully testable)
3. `src/app/api/kps/sessions/start/route.ts` — Session creation

### Phase 2: Core Exam Flow
4. `src/app/(kps-ujian)/layout.tsx` — Route group layout
5. `src/components/kps/KPSQuestionRenderer.tsx` — Question type router
6. `src/components/kps/KPSMultipleChoice.tsx` — Simplest type first
7. `src/components/kps/KPSTrueFalse.tsx`
8. `src/app/(kps-ujian)/ujian-kps/page.tsx` — Landing page
9. `src/hooks/useKPSSession.ts` — Session state hook
10. `src/app/(kps-ujian)/ujian-kps/[sessionId]/page.tsx` — Exam session page
11. `src/app/api/kps/sessions/[id]/answer/route.ts` — Answer submission
12. `src/app/api/kps/sessions/[id]/stage/route.ts` — Stage submission + branching

### Phase 3: Remaining Question Types
13. `src/components/kps/KPSComplexMC.tsx`
14. `src/components/kps/KPSComplexTF.tsx`
15. `src/components/kps/KPSMatching.tsx`

### Phase 4: Completion + Results
16. `src/app/api/kps/sessions/[id]/complete/route.ts`
17. `src/app/api/kps/sessions/[id]/route.ts` — GET session
18. `src/app/(kps-ujian)/ujian-kps/[sessionId]/results/page.tsx`
19. `src/components/kps/KPSScoreCard.tsx`
20. `src/components/kps/KPSIndicatorRadar.tsx`

### Phase 5: History + Polish
21. `src/app/api/kps/history/route.ts`
22. `src/app/(kps-ujian)/ujian-kps/riwayat/page.tsx`
23. `src/components/kps/KPSSessionCard.tsx`
24. Anti-cheat integration in session page
25. Firestore rules update

### Phase 6: Data Seeding (admin tooling or manual)
26. Seed `kps_stimuli` — 7 levels × 3 stages = 21 stimulus documents (menengah for S1, tinggi/rendah for S2/S3)
27. Seed `kps_questions` — 7 questions per stimulus × 21 stimuli = 147 questions

---

## 9. Key Design Decisions

1. **Separate collections** (`kps_*`) — KPS data is fundamentally different from MSAT (different question types, different adaptive model). Mixing would create complexity.

2. **No teacher token** — KPS is student-initiated (placement test). No class enrollment check needed. Auth-only.

3. **Server-side scoring only** — Never trust client for correctness. All scoring happens in API routes using admin SDK.

4. **Partial credit** — Complex MC and Complex TF support partial scoring. This gives finer-grained indicator measurement.

5. **localStorage + server state** — Dual persistence: localStorage for instant resume, server as source of truth. On conflict, server wins.

6. **No external chart library** — Radar chart built with raw SVG. Keeps bundle small, avoids dependency.

7. **Separate route group** `(kps-ujian)` — Completely isolated from dashboard. No navbar, no sidebar. Clean exam-focused UX. Same `AuthGuard` for auth.

8. **Answer-per-question API** — Each answer submitted individually (not batch). This prevents data loss if connection drops, and enables server-side time tracking per question.

9. **Stage submit triggers branching** — The adaptive decision happens server-side when a stage is submitted. Client never decides the next path.

10. **Exam-focused UX** — Stimulus shown at top of each stage (not per question). All 7 questions for a stage reference the same stimulus. Questions navigable via dots within a stage.
