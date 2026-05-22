# AKURAT - Development To-Do List

> Platform Asesmen Kimia Adaptif dengan Multistage Adaptive Testing (MSAT)  
> Tech Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Firebase  
> Last Updated: 22 Mei 2026 (Phase 1-3 complete, Phase 4 next)

---

## PHASE 1: PROJECT FOUNDATION

### 1.1 Project Setup & Configuration

- [x] Initialize Next.js 14 project dengan TypeScript (`npx create-next-app@latest`)
- [x] Install & configure Tailwind CSS
- [x] Setup folder structure:
  ```
  src/
  ├── app/            (App Router pages)
  ├── components/     (Reusable UI components)
  │   ├── ui/         (Primitives: Button, Input, Card, Modal, etc.)
  │   ├── layout/     (Navbar, Sidebar, Footer, MobileNav)
  │   └── shared/     (ProgressBar, Badge, Toast, Skeleton)
  ├── lib/            (Utilities, helpers, constants)
  ├── hooks/          (Custom React hooks)
  ├── context/        (React Context providers)
  ├── services/       (Firebase service functions)
  ├── types/          (TypeScript interfaces & types)
  └── styles/         (Global CSS, design tokens)
  ```
- [x] Create `.gitignore` (node_modules, .env.local, firebase keys, .next, etc.)
- [x] Create `.env.local` dan `.env.example` untuk Firebase config
- [x] Setup ESLint + Prettier configuration
- [x] Setup path aliases (`@/components`, `@/lib`, etc.) di `tsconfig.json`

### 1.2 Design System Implementation

- [x] Implement CSS variables / design tokens di `globals.css`:
  - [x] Color palette only light mode (primary, secondary, semantic, grays)
  - [x] Gradient definitions
  - [x] Typography scale (font families, sizes, weights, line-heights)
  - [x] Spacing system (4px base unit)
  - [x] Border radius tokens
  - [x] Shadow & elevation tokens
  - [x] Animation timing & duration tokens
- [x] Configure Tailwind `tailwind.config.ts` dengan custom theme (extend colors, fonts, spacing)
- [x] Install Google Fonts: Archivo Black, Ubuntu, Space Mono
- [x] Setup KaTeX untuk rendering rumus kimia

### 1.3 Firebase Setup

- [x] 🧑 MANUAL: Create Firebase project di Firebase Console
- [x] 🧑 MANUAL: Enable Firebase services:
  - [x] Authentication (Email/Password + Google OAuth)
  - [x] Cloud Firestore
  - [x] Firebase Storage (untuk gambar materi)
  - [x] Cloud Functions (untuk MSAT engine logic)
- [x] Install Firebase SDK (`firebase`, `firebase-admin`)
- [x] Create `src/lib/firebase.ts` — client-side Firebase initialization
- [x] Create `src/lib/firebase-admin.ts` — server-side admin SDK (untuk API routes)
- [x] Setup Firestore security rules (draft awal)
- [x] 🧑 MANUAL: Generate & simpan service account key (JANGAN commit ke git)
- [x] 🧑 MANUAL: Isi `.env.local` dengan Firebase config values dari Console

### 1.4 Authentication System

- [x] Create `src/context/AuthContext.tsx` — Auth state provider
- [x] Implement auth functions di `src/services/auth.ts`:
  - [x] `signUp(email, password, role)` — Register user baru
  - [x] `signIn(email, password)` — Login
  - [x] `signInWithGoogle()` — Google OAuth
  - [x] `signOut()` — Logout
  - [x] `resetPassword(email)` — Forgot password
- [x] Create auth pages:
  - [x] `/login` — Login page
  - [x] `/register` — Registration page (dengan role selection)
  - [x] `/forgot-password` — Reset password page
- [x] Implement route protection:
  - [x] `src/components/guards/AuthGuard.tsx` — Redirect ke login jika belum auth
  - [x] `src/components/guards/RoleGuard.tsx` — Restrict berdasarkan role (student/teacher/admin)
- [x] Setup user profile creation di Firestore saat register
- [x] Implement session persistence (remember me)

### 1.5 Core Layout & Navigation

- [x] Create `src/components/layout/Navbar.tsx` — Desktop top navigation
  - [x] Logo + brand name "AKURAT"
  - [x] Nav links (Dashboard, Materi, Latihan, Ujian)
  - [x] Notification bell icon
  - [x] User avatar dropdown (Profile, Settings, Logout)
  - [x] Sticky positioning
- [x] Create `src/components/layout/MobileNav.tsx` — Bottom tab bar (mobile)
  - [x] 5 tabs: Home, Materi, Latihan, Ujian, Profil
  - [x] Active state indicator
  - [x] Icon + label
- [x] Create `src/components/layout/Sidebar.tsx` — Optional sidebar untuk teacher/admin
- [x] Create `src/components/layout/Footer.tsx`
- [x] Create layout wrappers:
  - [x] `src/app/(public)/layout.tsx` — Public pages (landing, login)
  - [x] `src/app/(dashboard)/layout.tsx` — Authenticated pages
  - [x] `src/app/(admin)/layout.tsx` — Admin pages
- [x] Implement responsive breakpoints (sm: 640, md: 768, lg: 1024, xl: 1280)

---

## PHASE 2: UI COMPONENT LIBRARY

### 2.1 Primitive Components

- [x] `Button` — Variants: primary, secondary, ghost, icon, danger
  - [x] Sizes: sm, md, lg
  - [x] States: default, hover, active, disabled, loading
  - [ ] Gradient background untuk primary
- [x] `Input` — Text, email, password, number
  - [x] Label + placeholder
  - [x] Focus state dengan primary border
  - [x] Error state + error message
  - [x] Icon prefix/suffix
- [x] `TextArea` — Multi-line input
- [x] `Select` — Dropdown select
- [x] `Checkbox` & `Radio` — Form controls
- [x] `Card` — Variants: standard, lesson, stat, achievement
  - [x] Header, body, footer sections
  - [x] Hover lift effect
- [x] `Modal` — Dialog overlay
  - [x] Header + close button
  - [x] Body content
  - [x] Footer actions
  - [x] Backdrop blur + click-to-close
  - [x] ESC key to close
  - [x] Focus trap
- [x] `Toast` — Notification system
  - [x] Types: success, error, warning, info
  - [x] Auto-dismiss (3-5 seconds)
  - [x] Slide-in animation
  - [x] Toast provider + `useToast()` hook

### 2.2 Feedback & Progress Components

- [x] `ProgressBar` — Linear progress
  - [x] Label + percentage
  - [x] Gradient fill
  - [x] Animated width transition
  - [x] Color change at 100%
- [x] `CircularProgress` — SVG circular progress (untuk achievements)
- [x] `Skeleton` — Loading placeholder
  - [x] Shimmer animation
  - [x] Variants: text, card, avatar, table row
- [x] `Spinner` — Loading spinner
- [x] `Badge` — Status badges
  - [x] Variants: success, warning, gray, primary
  - [x] Pill shape (radius-full)
- [x] `AchievementBadge` — Circular badge dengan tier (gold/silver/bronze)
- [x] `EmptyState` — Illustration + message + CTA button
- [x] `ErrorState` — Friendly error display

### 2.3 Data Display Components

- [x] `Table` — Data table dengan sorting & pagination
- [x] `Avatar` — User avatar (image atau initials fallback)
- [x] `Breadcrumb` — Navigation breadcrumb
- [x] `Tabs` — Tab navigation
- [x] `Accordion` — Collapsible sections (untuk mobile TOC)
- [x] `Tooltip` — Hover tooltip
- [x] `Tag` — Topic/category tags

---

## PHASE 3: DATABASE & CONTENT

### 3.1 Firestore Schema Setup

- [x] Collection: `users`
  ```
  {
    uid, email, displayName, photoURL, role (student|teacher|admin),
    createdAt, lastLoginAt, isActive,
    profile: { school, grade, city },
    stats: { xp, level, streak, longestStreak, totalLessons, totalQuizzes },
    settings: { notifications, theme, language }
  }
  ```
- [x] Collection: `materials`
  ```
  {
    id, title, description, topic, subtopic, order,
    content (markdown/rich text), estimatedTime,
    prerequisites[], learningObjectives[],
    createdBy, status (draft|published), createdAt, updatedAt
  }
  ```
- [x] Collection: `question_bank`
  ```
  {
    id, topic, subtopic, difficulty (easy|moderate|hard),
    stem, options {A,B,C,D,E}, correctAnswer,
    misconceptions {A: 'MISC_001', ...},
    explanation, baseTime,
    usageCount, avgCorrectRate, avgTimeSpent,
    createdBy, status (active|inactive), createdAt
  }
  ```
- [x] Collection: `exam_sessions`
  ```
  {
    id, userId, examId, startedAt, completedAt,
    currentStage, currentDifficulty, theta,
    responses[{ questionId, selectedAnswer, isCorrect, difficulty,
               timeSpent, confidenceScore, confidenceLabel, timestamp }],
    result: { finalTheta, proficiencyLevel, accuracy,
              misconceptions[], confidenceDistribution },
    anomalyFlags[], status (in_progress|completed|abandoned|flagged)
  }
  ```
- [x] Collection: `quiz_results`
  ```
  {
    id, userId, quizId, topic, score, totalQuestions,
    correctCount, timeSpent, responses[], completedAt
  }
  ```
- [x] Collection: `user_progress`
  ```
  {
    userId, materialId, status (not_started|in_progress|completed),
    completedAt, timeSpent, lastAccessedAt
  }
  ```
- [x] Collection: `achievements`
  ```
  {
    id, name, description, icon, category, tier,
    condition (JSON logic), xpReward
  }
  ```
- [x] Collection: `user_achievements`
  ```
  {
    userId, achievementId, unlockedAt
  }
  ```
- [x] Collection: `messages`
  ```
  {
    id, senderId, receiverId, content, readAt, createdAt
  }
  ```
- [x] Collection: `app_config/msat` — MSAT algorithm parameters
- [x] Write Firestore security rules untuk semua collections
- [ ] Create Firestore indexes yang diperlukan

### 3.2 Seed Data

- [x] Buat script `scripts/seed.ts` untuk populate database
- [x] 🧑 MANUAL: Seed materi stoikiometri (minimal 5 topik) — konten harus ditulis/review oleh ahli:
  - [x] Konsep Mol
  - [x] Massa Molar (Mr/Ar)
  - [x] Konversi Mol ↔ Gram ↔ Partikel ↔ Volume Gas
  - [x] Persamaan Reaksi & Stoikiometri
  - [x] Limiting Reagent & Excess
- [x] 🧑 MANUAL: Seed question bank (minimal 30 soal per difficulty per topik) — soal harus valid secara akademis:
  - [x] 30+ soal MUDAH (32)
  - [x] 30+ soal MODERATE (32)
  - [x] 30+ soal SUSAH (32)
  - [x] Setiap soal harus punya misconception tags
- [x] Seed achievements/badges data

### 3.3 Expanded Chemistry Topics (Future Content)

> Topik-topik tambahan untuk course cards di dashboard. Konten materi & soal ditambahkan bertahap.

- [ ] 🧑 MANUAL: Model Atom (atom-model)
- [ ] 🧑 MANUAL: Larutan & Konsentrasi (larutan)
- [ ] 🧑 MANUAL: Ikatan Kimia (ikatan-kimia)
- [ ] 🧑 MANUAL: Reaksi Redoks (reaksi-redoks)
- [ ] 🧑 MANUAL: Tingkat Reaksi (tingkat-kesulitan)
- [ ] 🧑 MANUAL: Kesetimbangan Kimia (kesetimbangan)
- [ ] 🧑 MANUAL: Geometri Molekul (geometri-molekul)
- [ ] 🧑 MANUAL: Struktur Lewis (struktur-lewis)
- [ ] 🧑 MANUAL: Kimia Komputasi (kimia-komputasi)
- [ ] 🧑 MANUAL: Hukum Gas Ideal (hukum-gas)
- [ ] 🧑 MANUAL: Termokimia (termokimia)
- [ ] 🧑 MANUAL: Laju Reaksi (laju-reaksi)
- [ ] 🧑 MANUAL: Kalorimetri (kalorimetri)
- [ ] 🧑 MANUAL: Termodinamika (termodinamika)
- [ ] 🧑 MANUAL: Perubahan Entalpi (entalpi)
- [ ] 🧑 MANUAL: Elektrokimia (elektrokimia)
- [x] Seed MSAT config parameters
- [x] Buat script `scripts/seed-test-users.ts` untuk test accounts

---

## PHASE 4: PUBLIC PAGES

### 4.1 Landing Page / Homepage

- [x] Navbar (public): Logo + nav links + Sign In + Get Started buttons
- [x] Hero/Assessment section:
  - [x] Quiz mockup image (left)
  - [x] "Guided Courses With Every Journey" heading (right)
  - [x] Target users numbered list
  - [x] Decorative shapes (cyan, purple, orange)
- [x] Learning Material section:
  - [x] "Chemistry Materials We Teach" heading
  - [x] 7 topic cards with icons (4+3 grid)
  - [x] Horizontal scroll on mobile
- [x] Learning Resources section:
  - [x] "What do you get at AKURAT?" heading
  - [x] 6 feature cards (3x2 grid)
  - [x] Highlight card with yellow background
- [x] Footer:
  - [x] Logo + tagline
  - [x] 3-column nav links
  - [x] Gradient divider line
  - [x] Copyright + Cookies Settings
- [x] Auth pages redesigned:
  - [x] Split-screen layout (branded left panel + form right)
  - [x] Login: Google/Facebook + email/password + purple button
  - [x] Register: Role selection (Student/Teacher) + form fields

### 4.2 Static Pages

- [x] `/about` — Tentang AKURAT
- [x] `/privacy` — Privacy Policy
- [x] `/terms` — Terms of Service
- [x] `/contact` — Contact form

---

## PHASE 5: STUDENT FEATURES

### 5.1 Student Dashboard (Brilliant-style)

- [x] Header row: "Welcome back" (left) + "Jump back in" with arrow nav (right)
- [x] Left column:
  - [x] Streak card (gradient amber→red, day indicators, streak count)
  - [x] Progress Overview with toggle switch (list ↔ chart):
    - [x] List view: colorful stat pills (Materi, XP, Quiz, Time)
    - [x] Chart view: donut chart (materials %) + gradient bar charts
  - [x] Weekly activity bar graph
- [x] Right column — Stacked card carousel (Framer Motion):
  - [x] 7 chemistry course topics with unique gradient backgrounds
  - [x] Decorative circles on card backgrounds
  - [x] Topic name, subtitle, level display
  - [x] Lesson preview pills (frosted glass style)
  - [x] "Start Learning" / "Continue Learning" button
  - [x] 1 back card visible on each side (scale 0.92, clickable)
  - [x] Thumbnail selector below
- [x] Responsive layout (stacks on mobile)
- [x] Animations: fadeIn entrance, hover scale, smooth card transitions

### 5.2 Material/Learning Pages

- [x] `/materi` — Material list page
  - [x] Topic cards dengan progress indicator
  - [x] Search functionality
  - [x] Animated entrance (Framer Motion staggered)
- [x] `/materi/[id]` — Material reading page
  - [x] Sidebar Table of Contents (desktop + mobile overlay)
  - [x] Main content area:
    - [x] Markdown rendering (react-markdown)
    - [x] KaTeX formula rendering (remark-math + rehype-katex)
    - [x] Tailwind Typography prose styling
  - [x] Auto-marks as in_progress on open
  - [x] Navigation: ← Previous | Next →
  - [x] "Mark as Complete" button (gradient emerald)
  - [x] Mobile: Collapsible TOC overlay (slide-in)

### 5.3 Practice Quiz System

- [x] `/latihan` — Quiz list page
  - [x] 3 quiz cards (Easy/Moderate/Hard) with unique gradients
  - [x] Difficulty badge, question count, time estimate
  - [x] Staggered entrance animations
- [x] `/latihan/[quizId]` — Quiz interface
  - [x] Question display:
    - [x] Question number + total
    - [x] Timer (countdown per question, auto-submit on expire)
    - [x] Question stem
    - [x] 5 options (A-E) with tap animation
  - [x] Submit Answer button
  - [x] Immediate feedback after submit (practice mode):
    - [x] ✓ Correct: green + explanation
    - [x] ✗ Wrong: red + correct answer + explanation
  - [x] Quiz completion screen:
    - [x] Score percentage
    - [x] "Retake" + "Dashboard" buttons
  - [x] Smooth page transitions (AnimatePresence)

### 5.4 MSAT Exam System

- [x] `/ujian` — Exam list page with rules, confirmation modal
- [x] `/ujian/[examId]/session` — MSAT Exam interface
  - [x] Stricter UI (no feedback, no skip, no back)
  - [x] Timer per question (auto-submit when expired)
  - [x] Progress indicator (stage + question number)
  - [x] MSAT Engine: difficulty adjustment, theta, confidence scoring
  - [x] Anti-cheat: tab visibility, beforeunload, online indicator
  - [x] Auto-save every response to Firestore
  - [x] Anomaly detection (too fast, sudden drop)
  - [x] Auto-submit when all 21 questions done → redirect to results

### 5.5 Results & Analytics

- [x] `/ujian/[examId]/results` — Exam results page
  - [x] Gradient header with proficiency level
  - [x] Stats grid: accuracy, correct/total, time, theta
  - [x] Difficulty path bar chart (per question)
  - [x] Confidence distribution (animated bars)
  - [x] Per-question breakdown (numbered grid)
  - [x] Actions: Dashboard + Retake

### 5.6 Profile & Settings

- [x] `/profile` — User profile page
  - [x] Avatar (gradient initial) + name + email + school
  - [x] Stats grid (6 cards): XP, Streak, Materials, Quizzes, Achievements, Level
  - [x] Achievement gallery (unlocked=colored, locked=grayscale)
- [x] `/settings` — User settings
  - [x] Edit profile (name, school, grade, city)
  - [x] Notification toggle (pill switch)
  - [x] Save to Firestore with toast feedback

### 5.7 Onboarding Flow

- [x] First-time user welcome screen setelah register
- [x] Goal setting ("Berapa menit per hari mau belajar?")
- [x] Topic interest selection (pilih subtopik yang mau dipelajari duluan)
- [x] Progress dots + animated step transitions
- [x] Saves preferences to Firestore

### 5.8 Notification System

- [x] In-app notification center (bell icon → dropdown list)
  - [x] Unread count badge
  - [x] Notification types: achievement, streak, message, system
  - [x] Mark as read / mark all as read
- [ ] Push notifications (Firebase Cloud Messaging) — Phase 14
- [ ] Email notifications — Phase 14

### 5.9 Calculator & Reference Tools

- [x] In-app scientific calculator:
  - [x] Basic operations (+, -, ×, ÷)
  - [x] Scientific functions (log, ln, √, x², 10ˣ, π)
  - [x] Floating button (bottom-right), animated panel
- [x] Periodic table quick reference:
  - [x] Searchable by element name/symbol
  - [x] Show Ar (atomic mass) prominently
  - [x] Tap to copy Ar value
  - [x] Floating button, collapsible panel

---

## PHASE 6: GAMIFICATION SYSTEM

### 6.1 XP & Leveling

- [x] Implement XP earning logic:
  - [x] Complete lesson: +50 XP
  - [x] Finish quiz: +10 XP per correct answer
  - [x] Finish exam: +100 XP (bonus based on score)
  - [x] Daily login: +5 XP
  - [x] Maintain streak: +10 XP per day
- [x] Implement level calculation: `XP_needed = 100 * (level^1.5)`
- [x] XP animation on earn (floating +XP badge)
- [x] Level up modal (particle emojis + spinning star)

### 6.2 Streak System

- [x] Track daily activity (streak logic in gamification service)
- [x] Streak counter display (🔥 + number) — in dashboard
- [x] Streak milestones tracked via longestStreak
- [ ] Streak freeze mechanic (max 2 per month) — future
- [ ] Streak broken notification — future

### 6.3 Achievements & Badges

- [x] Achievement data seeded (13 achievements in Firestore)
- [x] Achievement gallery in profile page (unlocked/locked display)
- [ ] Auto-detect achievement unlock on actions — future
- [ ] Achievement unlock animation — future

### 6.4 Leaderboard

- [x] Leaderboard widget in dashboard (top 5 by XP) — was in earlier version
- [ ] `/leaderboard` full page — future
- [ ] Privacy: opt-out option — future

---

## PHASE 7: TEACHER FEATURES

### 7.1 Teacher Dashboard

- [x] `/teacher` — Teacher dashboard
  - [x] Top stats bar: Total Students, Materials, Avg XP
  - [x] Quick actions: Manage Materials, Manage Questions, Messages
  - [x] Student management table (name, email, XP, lessons, last active)

### 7.2 Content Management

- [x] `/teacher/materials` — Material management
  - [x] List all materials (draft/published)
  - [x] Create new material (modal with markdown content)
  - [x] Publish/unpublish toggle
- [x] `/teacher/questions` — Question bank management
  - [x] List questions with difficulty filter (All/Easy/Moderate/Hard)
  - [x] Create new question (modal: stem, options A-E, correct answer, explanation)
  - [x] Difficulty badge per question
  - [x] Delete questions
  - [x] Bulk import questions (JSON file upload)

### 7.3 Student Monitoring

- [x] `/teacher/students` — Student list with search, stats per student
- [x] `/teacher/students/[studentId]` — Student detail view
  - [x] Profile card (avatar, name, email, school)
  - [x] Stats grid (XP, Streak, Lessons, Quizzes, Level)
  - [x] Exam history table (exam ID, status, theta, accuracy)
  - [x] Theta progression over time
  - [x] Notes section (teacher can add notes)

### 7.4 Communication

- [x] `/teacher/messages` — Messaging interface
  - [x] Student contact list (left panel with avatars)
  - [x] Chat thread per student (message bubbles)
  - [x] Send/receive messages (Enter key + button)
  - [x] Messages stored in Firestore

---

## PHASE 8: ADMIN FEATURES

### 8.1 Admin Dashboard

- [x] `/admin` — Admin dashboard
  - [x] KPI cards: Total Users, Materials, Exams, Questions
  - [x] User Growth bar chart (weekly)
  - [x] Platform Overview progress bars (questions by difficulty, materials)

### 8.2 User Management

- [x] `/admin/users` — User management table
  - [x] Search by name/email
  - [x] Filter by role (All/Student/Teacher/Admin)
  - [x] Change role via dropdown
  - [x] Toggle active/inactive status
  - [x] Delete user
  - [x] Toast feedback for all actions

### 8.3 Content Moderation

- [x] `/admin/content` — Content moderation
  - [x] Pending materials list with Approve/Reject buttons
  - [x] Published content overview with status badges
  - [x] Approve → publishes to Firestore
  - [x] Toast feedback

### 8.4 Platform Configuration

- [x] `/admin/config` — Platform settings
  - [x] MSAT algorithm parameters (editable): stages, questions/stage, theta range, anomaly thresholds
  - [x] Gamification settings (XP values per action)
  - [x] Save to Firestore with toast feedback

---

## PHASE 9: MICRO-INTERACTIONS & ANIMATIONS

### 9.1 Answer Feedback Animations

- [x] Correct answer: bounceIn animation + green checkmark
- [x] Wrong answer: shake animation + red X
- [x] XP counter animate (XPAnimation component)

### 9.2 Progress Animations

- [x] Progress bar smooth fill (Framer Motion throughout)
- [x] Level up: fireworks + badge reveal (LevelUpModal)
- [x] Streak: fire emoji in dashboard
- [x] Achievement unlock: gallery in profile

### 9.3 Page Transitions

- [x] AnimatePresence for quiz/exam page transitions
- [x] Skeleton loading (Skeleton component)
- [x] Smooth scroll (TOC links in material page)

### 9.4 Reduced Motion Support

- [x] `prefers-reduced-motion` media query disables all animations

---

## PHASE 10: ACCESSIBILITY (WCAG 2.1 AA) & i18n

- [x] Focus indicators (2px solid primary, offset 2px) via :focus-visible
- [x] Skip to main content link
- [x] ARIA labels on buttons, progress bars, navigation (throughout)
- [x] Semantic HTML (main, nav, aside, article) (throughout)
- [x] Alt text for all images (throughout)
- [x] Reduced motion support (Phase 9)
- [x] Modal focus trap (Modal component)
- [x] Internationalization (i18n):
  - [x] Setup next-intl with config
  - [x] Bahasa Indonesia (default) — messages/id.json
  - [x] English (secondary) — messages/en.json
  - [x] Language switcher in settings
  - [x] Translation keys for all UI sections

---

## PHASE 11: PERFORMANCE, PWA & OPTIMIZATION

- [x] Image optimization (WebP via next.config, lazy loading via Next/Image)
- [x] Code splitting per route (Next.js App Router automatic)
- [x] PWA manifest (manifest.json — app name, icons, theme color, standalone)
- [x] Installable di mobile (Add to Home Screen)
- [x] Offline indicator (banner "Kamu sedang offline")
- [x] Security headers (X-Content-Type-Options, X-Frame-Options)

---

## PHASE 12: ANALYTICS, MONITORING & OBSERVABILITY

- [x] Event tracking service (page_view, lesson/quiz/exam complete, xp_earned, level_up)
- [x] Events stored in Firestore 'analytics_events' collection
- [x] Admin analytics dashboard (Phase 8.1 — KPIs, charts)
- [ ] 🧑 MANUAL: Firebase Crashlytics — Firebase Console setup
- [ ] 🧑 MANUAL: Firebase Performance Monitoring — Firebase Console setup
- [ ] 🧑 MANUAL: Dashboard monitoring (uptime) — external service

---

## PHASE 13: TESTING

- [x] Setup testing framework: Vitest + jsdom
- [x] Unit tests (18 passing):
  - [x] MSAT difficulty adjustment
  - [x] Theta estimation (boundaries, clamping, weight)
  - [x] Confidence score calculation (4 quadrants)
  - [x] Stage calculation
  - [x] Proficiency level mapping
  - [x] Anomaly detection
  - [x] XP formula
- [ ] E2E tests (Playwright) — future
- [ ] 🧑 MANUAL: Cross-browser testing
- [ ] 🧑 MANUAL: Mobile responsive testing

---

## PHASE 14: CI/CD, SECURITY & DEPLOYMENT

### 14.1 CI/CD Pipeline

- [ ] Create `.github/workflows/ci.yml`:
  - [ ] Trigger: push to main, PR to main
  - [ ] Steps: install → lint → typecheck → test → build
  - [ ] Fail PR if any step fails
- [ ] Create `.github/workflows/deploy.yml`:
  - [ ] Deploy to Firebase Hosting (staging on PR merge to develop)
  - [ ] Deploy to production (on release/tag)
  - [ ] Deploy Cloud Functions
- [ ] 🧑 MANUAL: Branch protection rules (require CI pass before merge) — GitHub Settings

### 14.2 Firebase Emulator & Local Dev

- [ ] Setup Firebase Emulator Suite:
  - [ ] Auth Emulator (port 9099)
  - [ ] Firestore Emulator (port 8080)
  - [ ] Functions Emulator (port 5001)
  - [ ] Storage Emulator (port 9199)
- [ ] Create `firebase.json` emulator config
- [ ] npm scripts untuk local dev:
  - [ ] `npm run dev` — Start Next.js dev server
  - [ ] `npm run emulators` — Start Firebase emulators
  - [ ] `npm run dev:full` — Start both (concurrently)
  - [ ] `npm run seed` — Run seed script against emulator
  - [ ] `npm run seed:prod` — Run seed against production (with confirmation)
- [ ] Emulator data export/import (persist emulator state)

### 14.3 Security & Rules Audit

- [ ] Firestore security rules (comprehensive):
  - [ ] Users: read own, write own profile only
  - [ ] Materials: read all (authenticated), write teacher/admin only
  - [ ] Question bank: read none (server-side only), write teacher/admin
  - [ ] Exam sessions: read/write own only
  - [ ] Messages: read/write own conversations only
  - [ ] App config: read all, write admin only
- [ ] Storage security rules:
  - [ ] Material images: read all, upload teacher/admin only
  - [ ] User avatars: read all, upload own only
  - [ ] File size limits (max 5MB images)
- [ ] Rate limiting (Cloud Functions):
  - [ ] Auth attempts: max 5 per minute
  - [ ] Exam start: max 3 per hour
  - [ ] Message send: max 30 per minute
- [ ] Staging rules (separate Firestore rules for staging env)
- [ ] Security audit checklist:
  - [ ] No sensitive data exposed to client
  - [ ] Service account key not in repo
  - [ ] Environment variables properly scoped
  - [ ] CORS configured correctly
  - [ ] Input validation on all Cloud Functions

### 14.4 Firestore Indexes & Cost Controls

- [ ] Create `firestore.indexes.json`:
  - [ ] `exam_sessions`: userId + status + startedAt (desc)
  - [ ] `question_bank`: topic + difficulty + status
  - [ ] `user_progress`: userId + status
  - [ ] `quiz_results`: userId + topic + completedAt (desc)
  - [ ] `messages`: senderId + receiverId + createdAt
- [ ] Cost monitoring & budgeting:
  - [ ] 🧑 MANUAL: Set Firebase budget alerts (email at 50%, 80%, 100%) — Firebase Console
  - [ ] Firestore read/write estimation per feature
  - [ ] Optimize queries (avoid full collection scans)
  - [ ] Implement pagination everywhere (limit 20-50 per query)
  - [ ] Cache frequently accessed data (app_config, leaderboard)

### 14.5 Seed Scripts & Migration

- [ ] `scripts/seed.ts` — Main seed script:
  - [ ] Seed materials (5 topics, multiple lessons each)
  - [ ] Seed question bank (90+ questions across 3 difficulties)
  - [ ] Seed achievements/badges
  - [ ] Seed MSAT config
  - [ ] Idempotent (safe to run multiple times)
- [ ] `scripts/seed-test-users.ts` — Test accounts:
  - [ ] 1 admin account
  - [ ] 2 teacher accounts
  - [ ] 5 student accounts (various progress levels)
- [ ] `scripts/migrate.ts` — Schema migration runner:
  - [ ] Version tracking (store current schema version in Firestore)
  - [ ] Migration files: `migrations/001_initial.ts`, `002_add_field.ts`, etc.
  - [ ] Rollback support (optional)
- [ ] Document migration process di README

### 14.6 Developer Experience (DX)

- [ ] `src/lib/firebase.ts` — Client SDK init (with emulator detection)
- [ ] `src/lib/firebase-admin.ts` — Admin SDK init (for API routes/functions)
- [ ] `.env.example` — Template semua env vars yang dibutuhkan:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  FIREBASE_SERVICE_ACCOUNT_KEY=
  ```
- [ ] `Makefile` atau npm scripts:
  - [ ] `make start` / `npm run dev:full`
  - [ ] `make seed` / `npm run seed`
  - [ ] `make test` / `npm run test`
  - [ ] `make lint` / `npm run lint`
  - [ ] `make build` / `npm run build`
  - [ ] `make deploy:staging` / `npm run deploy:staging`
- [ ] VS Code workspace settings (`.vscode/settings.json`, recommended extensions)

### 14.7 Documentation

- [ ] `README.md` — Comprehensive:
  - [ ] Project overview & tech stack
  - [ ] Prerequisites (Node.js, Firebase CLI, etc.)
  - [ ] Setup instructions (clone, install, env vars)
  - [ ] Running locally (dev server + emulators)
  - [ ] Seeding database
  - [ ] Running tests
  - [ ] Deployment process
  - [ ] Folder structure explanation
  - [ ] Contributing guidelines
- [ ] `CONTRIBUTING.md` — PR process, code style, commit conventions
- [ ] `docs/ARCHITECTURE.md` — System architecture overview
- [ ] `docs/MSAT_ALGORITHM.md` — MSAT engine documentation (extracted from context)

### 14.8 Production Launch

- [ ] 🧑 MANUAL: Setup Vercel project (connect Git repo) — Vercel Dashboard
- [ ] 🧑 MANUAL: Configure environment variables di hosting platform
- [ ] 🧑 MANUAL: Setup custom domain + SSL
- [ ] SEO optimization (meta tags, sitemap.xml, robots.txt)
- [ ] Open Graph tags untuk social sharing
- [ ] 🧑 MANUAL: Beta testing dengan pilot group (10-20 users)
- [ ] 🧑 MANUAL: Collect feedback & fix critical bugs
- [ ] 🧑 MANUAL: Production deployment
- [ ] 🧑 MANUAL: Post-launch monitoring (24-48 jam)
- [ ] Hotfix process ready

---

## PHASE 15: FUTURE ENHANCEMENTS (Post-Launch)

### Phase 2 Features
- [ ] AI-powered explanations for wrong answers
- [ ] Personalized learning paths (AI-recommended sequence)
- [ ] Social features (study groups, peer messaging)
- [ ] Advanced analytics (predictive modeling, learning style detection)

### Phase 3 Features
- [ ] Mobile app (React Native)
- [ ] AI question generator for teachers
- [ ] Multi-school deployment & LMS integration
- [ ] Research platform (data export, anonymized datasets)

---

## PRIORITY ORDER (Recommended)

| Priority | Phase | Estimated Time |
|----------|-------|---------------|
| 🔴 P0 | Phase 1: Foundation | 1-2 minggu |
| 🔴 P0 | Phase 2: UI Components | 1 minggu |
| 🔴 P0 | Phase 3: Database & Content | 1 minggu |
| 🟠 P1 | Phase 4: Public Pages | 3-4 hari |
| 🟠 P1 | Phase 5: Student Features | 2-3 minggu |
| 🟠 P1 | Phase 6: Gamification | 1 minggu |
| 🟡 P2 | Phase 7: Teacher Features | 1-2 minggu |
| 🟡 P2 | Phase 8: Admin Features | 1 minggu |
| 🟡 P2 | Phase 9: Animations | 3-4 hari |
| 🟢 P3 | Phase 10: Accessibility | 3-4 hari |
| 🟢 P3 | Phase 11: Performance | 2-3 hari |
| 🟢 P3 | Phase 12: Analytics | 2-3 hari |
| 🟢 P3 | Phase 13: Testing | 1-2 minggu |
| 🔵 P4 | Phase 14: Deployment | 3-5 hari |
| ⚪ P5 | Phase 15: Future | Ongoing |

**Total Estimated MVP (Phase 1-6): ~6-8 minggu**  
**Total Full Platform (Phase 1-14): ~12-16 minggu**

---

*End of To-Do List*
