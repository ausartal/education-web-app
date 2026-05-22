# AKURAT - Development To-Do List

> Platform Asesmen Kimia Adaptif dengan Multistage Adaptive Testing (MSAT)  
> Tech Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Firebase  
> Last Updated: 22 Mei 2026

---

## PHASE 1: PROJECT FOUNDATION

### 1.1 Project Setup & Configuration

- [ ] Initialize Next.js 14 project dengan TypeScript (`npx create-next-app@latest`)
- [ ] Install & configure Tailwind CSS
- [ ] Setup folder structure:
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
- [ ] Create `.gitignore` (node_modules, .env.local, firebase keys, .next, etc.)
- [ ] Create `.env.local` dan `.env.example` untuk Firebase config
- [ ] Setup ESLint + Prettier configuration
- [ ] Setup path aliases (`@/components`, `@/lib`, etc.) di `tsconfig.json`

### 1.2 Design System Implementation

- [ ] Implement CSS variables / design tokens di `globals.css`:
  - [ ] Color palette (primary, secondary, semantic, grays)
  - [ ] Gradient definitions
  - [ ] Typography scale (font families, sizes, weights, line-heights)
  - [ ] Spacing system (4px base unit)
  - [ ] Border radius tokens
  - [ ] Shadow & elevation tokens
  - [ ] Animation timing & duration tokens
- [ ] Configure Tailwind `tailwind.config.ts` dengan custom theme (extend colors, fonts, spacing)
- [ ] Install Google Fonts: Poppins, Inter, Fira Code
- [ ] Setup KaTeX untuk rendering rumus kimia

### 1.3 Firebase Setup

- [ ] Create Firebase project di Firebase Console
- [ ] Enable Firebase services:
  - [ ] Authentication (Email/Password + Google OAuth)
  - [ ] Cloud Firestore
  - [ ] Firebase Storage (untuk gambar materi)
  - [ ] Cloud Functions (untuk MSAT engine logic)
- [ ] Install Firebase SDK (`firebase`, `firebase-admin`)
- [ ] Create `src/lib/firebase.ts` — client-side Firebase initialization
- [ ] Create `src/lib/firebase-admin.ts` — server-side admin SDK (untuk API routes)
- [ ] Setup Firestore security rules (draft awal)
- [ ] Generate & simpan service account key (JANGAN commit ke git)

### 1.4 Authentication System

- [ ] Create `src/context/AuthContext.tsx` — Auth state provider
- [ ] Implement auth functions di `src/services/auth.ts`:
  - [ ] `signUp(email, password, role)` — Register user baru
  - [ ] `signIn(email, password)` — Login
  - [ ] `signInWithGoogle()` — Google OAuth
  - [ ] `signOut()` — Logout
  - [ ] `resetPassword(email)` — Forgot password
- [ ] Create auth pages:
  - [ ] `/login` — Login page
  - [ ] `/register` — Registration page (dengan role selection)
  - [ ] `/forgot-password` — Reset password page
- [ ] Implement route protection:
  - [ ] `src/components/guards/AuthGuard.tsx` — Redirect ke login jika belum auth
  - [ ] `src/components/guards/RoleGuard.tsx` — Restrict berdasarkan role (student/teacher/admin)
- [ ] Setup user profile creation di Firestore saat register
- [ ] Implement session persistence (remember me)

### 1.5 Core Layout & Navigation

- [ ] Create `src/components/layout/Navbar.tsx` — Desktop top navigation
  - [ ] Logo + brand name
  - [ ] Nav links (Dashboard, Materi, Latihan, Ujian)
  - [ ] Notification bell icon
  - [ ] User avatar dropdown (Profile, Settings, Logout)
  - [ ] Sticky positioning
- [ ] Create `src/components/layout/MobileNav.tsx` — Bottom tab bar (mobile)
  - [ ] 5 tabs: Home, Materi, Latihan, Ujian, Profil
  - [ ] Active state indicator
  - [ ] Icon + label
- [ ] Create `src/components/layout/Sidebar.tsx` — Optional sidebar untuk teacher/admin
- [ ] Create `src/components/layout/Footer.tsx`
- [ ] Create layout wrappers:
  - [ ] `src/app/(public)/layout.tsx` — Public pages (landing, login)
  - [ ] `src/app/(dashboard)/layout.tsx` — Authenticated pages
  - [ ] `src/app/(admin)/layout.tsx` — Admin pages
- [ ] Implement responsive breakpoints (sm: 640, md: 768, lg: 1024, xl: 1280)

---

## PHASE 2: UI COMPONENT LIBRARY

### 2.1 Primitive Components

- [ ] `Button` — Variants: primary, secondary, ghost, icon, danger
  - [ ] Sizes: sm, md, lg
  - [ ] States: default, hover, active, disabled, loading
  - [ ] Gradient background untuk primary
- [ ] `Input` — Text, email, password, number
  - [ ] Label + placeholder
  - [ ] Focus state dengan primary border
  - [ ] Error state + error message
  - [ ] Icon prefix/suffix
- [ ] `TextArea` — Multi-line input
- [ ] `Select` — Dropdown select
- [ ] `Checkbox` & `Radio` — Form controls
- [ ] `Card` — Variants: standard, lesson, stat, achievement
  - [ ] Header, body, footer sections
  - [ ] Hover lift effect
- [ ] `Modal` — Dialog overlay
  - [ ] Header + close button
  - [ ] Body content
  - [ ] Footer actions
  - [ ] Backdrop blur + click-to-close
  - [ ] ESC key to close
  - [ ] Focus trap
- [ ] `Toast` — Notification system
  - [ ] Types: success, error, warning, info
  - [ ] Auto-dismiss (3-5 seconds)
  - [ ] Slide-in animation
  - [ ] Toast provider + `useToast()` hook

### 2.2 Feedback & Progress Components

- [ ] `ProgressBar` — Linear progress
  - [ ] Label + percentage
  - [ ] Gradient fill
  - [ ] Animated width transition
  - [ ] Color change at 100%
- [ ] `CircularProgress` — SVG circular progress (untuk achievements)
- [ ] `Skeleton` — Loading placeholder
  - [ ] Shimmer animation
  - [ ] Variants: text, card, avatar, table row
- [ ] `Spinner` — Loading spinner
- [ ] `Badge` — Status badges
  - [ ] Variants: success, warning, gray, primary
  - [ ] Pill shape (radius-full)
- [ ] `AchievementBadge` — Circular badge dengan tier (gold/silver/bronze)
- [ ] `EmptyState` — Illustration + message + CTA button
- [ ] `ErrorState` — Friendly error display

### 2.3 Data Display Components

- [ ] `Table` — Data table dengan sorting & pagination
- [ ] `Avatar` — User avatar (image atau initials fallback)
- [ ] `Breadcrumb` — Navigation breadcrumb
- [ ] `Tabs` — Tab navigation
- [ ] `Accordion` — Collapsible sections (untuk mobile TOC)
- [ ] `Tooltip` — Hover tooltip
- [ ] `Tag` — Topic/category tags

---

## PHASE 3: DATABASE & CONTENT

### 3.1 Firestore Schema Setup

- [ ] Collection: `users`
  ```
  {
    uid, email, displayName, photoURL, role (student|teacher|admin),
    createdAt, lastLoginAt, isActive,
    profile: { school, grade, city },
    stats: { xp, level, streak, longestStreak, totalLessons, totalQuizzes },
    settings: { notifications, theme, language }
  }
  ```
- [ ] Collection: `materials`
  ```
  {
    id, title, description, topic, subtopic, order,
    content (markdown/rich text), estimatedTime,
    prerequisites[], learningObjectives[],
    createdBy, status (draft|published), createdAt, updatedAt
  }
  ```
- [ ] Collection: `question_bank`
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
- [ ] Collection: `exam_sessions`
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
- [ ] Collection: `quiz_results`
  ```
  {
    id, userId, quizId, topic, score, totalQuestions,
    correctCount, timeSpent, responses[], completedAt
  }
  ```
- [ ] Collection: `user_progress`
  ```
  {
    userId, materialId, status (not_started|in_progress|completed),
    completedAt, timeSpent, lastAccessedAt
  }
  ```
- [ ] Collection: `achievements`
  ```
  {
    id, name, description, icon, category, tier,
    condition (JSON logic), xpReward
  }
  ```
- [ ] Collection: `user_achievements`
  ```
  {
    userId, achievementId, unlockedAt
  }
  ```
- [ ] Collection: `messages`
  ```
  {
    id, senderId, receiverId, content, readAt, createdAt
  }
  ```
- [ ] Collection: `app_config/msat` — MSAT algorithm parameters
- [ ] Write Firestore security rules untuk semua collections
- [ ] Create Firestore indexes yang diperlukan

### 3.2 Seed Data

- [ ] Buat script `scripts/seed.ts` untuk populate database
- [ ] Seed materi stoikiometri (minimal 5 topik):
  - [ ] Konsep Mol
  - [ ] Massa Molar (Mr/Ar)
  - [ ] Konversi Mol ↔ Gram ↔ Partikel ↔ Volume Gas
  - [ ] Persamaan Reaksi & Stoikiometri
  - [ ] Limiting Reagent & Excess
- [ ] Seed question bank (minimal 30 soal per difficulty per topik):
  - [ ] 30+ soal MUDAH
  - [ ] 30+ soal MODERATE
  - [ ] 30+ soal SUSAH
  - [ ] Setiap soal harus punya misconception tags
- [ ] Seed achievements/badges data
- [ ] Seed MSAT config parameters
- [ ] Buat script `scripts/seed-test-users.ts` untuk test accounts

---

## PHASE 4: PUBLIC PAGES

### 4.1 Landing Page / Homepage

- [ ] Hero section:
  - [ ] Full-width gradient background (gradient-hero)
  - [ ] Headline + subtitle (motivational copy)
  - [ ] CTA buttons: "Mulai Belajar" + "Pelajari Lebih Lanjut"
  - [ ] Hero illustration (chemistry themed)
- [ ] Features section (3-column grid):
  - [ ] Adaptive Learning — icon + title + description
  - [ ] Misconception Analysis — icon + title + description
  - [ ] Progress Tracking — icon + title + description
- [ ] How It Works section:
  - [ ] Step-by-step visual timeline (4 steps)
  - [ ] Connecting lines antar steps
- [ ] Testimonials section:
  - [ ] Student success stories (carousel/grid)
  - [ ] Avatar + name + quote
- [ ] Final CTA section:
  - [ ] "Siap Mulai?" + signup button
- [ ] Footer:
  - [ ] Links: About, Contact, Privacy, Terms
  - [ ] Social media icons
  - [ ] Copyright

### 4.2 Static Pages

- [ ] `/about` — Tentang AKURAT
- [ ] `/privacy` — Privacy Policy
- [ ] `/terms` — Terms of Service
- [ ] `/contact` — Contact form

---

## PHASE 5: STUDENT FEATURES

### 5.1 Student Dashboard

- [ ] Welcome hero section:
  - [ ] Greeting dengan user name + emoji
  - [ ] Current streak display (🔥 + counter)
  - [ ] Today's goal progress
  - [ ] Quick start button ("Lanjut Belajar")
- [ ] Stats grid (4 cards):
  - [ ] Total XP earned
  - [ ] Materials completed (x/y)
  - [ ] Average quiz score
  - [ ] Achievements unlocked
- [ ] Quick actions (4 buttons):
  - [ ] Continue learning
  - [ ] Practice quiz
  - [ ] Take exam
  - [ ] Ask teacher
- [ ] Learning path section:
  - [ ] Current lesson highlight
  - [ ] Next 3 recommended lessons
  - [ ] Progress per lesson card
  - [ ] Visual status: completed → in progress → locked
- [ ] Recent activity feed (timeline format)
- [ ] Leaderboard widget (top 5 + user position)

### 5.2 Material/Learning Pages

- [ ] `/materi` — Material list page
  - [ ] Topic cards dengan progress indicator
  - [ ] Filter by topic/status
  - [ ] Search functionality
- [ ] `/materi/[topicId]/[lessonId]` — Material reading page
  - [ ] Sidebar Table of Contents (auto-highlight active section)
  - [ ] Main content area:
    - [ ] Markdown rendering
    - [ ] KaTeX formula rendering (chemical equations)
    - [ ] Embedded images/diagrams
    - [ ] Interactive examples
  - [ ] Progress tracking (scroll-based)
  - [ ] Navigation: ← Previous | Next →
  - [ ] "Mark as Complete" button
  - [ ] Mobile: Collapsible accordion TOC

### 5.3 Practice Quiz System

- [ ] `/latihan` — Quiz list page
  - [ ] Available quizzes per topic
  - [ ] Difficulty indicator
  - [ ] Previous scores shown
- [ ] `/latihan/[quizId]` — Quiz interface
  - [ ] Question display:
    - [ ] Question number + total (e.g., "5/15")
    - [ ] Timer (countdown per question)
    - [ ] Question stem (dengan KaTeX support)
    - [ ] 5 options (A-E) radio buttons
  - [ ] Navigation: Skip + Submit Answer
  - [ ] Inline calculator tool
  - [ ] Keyboard shortcuts (A-E keys, Enter to submit)
  - [ ] Immediate feedback after submit (practice mode):
    - [ ] ✓ Correct: green + explanation + XP animation
    - [ ] ✗ Wrong: red + correct answer + explanation
  - [ ] Quiz completion screen:
    - [ ] Score summary
    - [ ] XP earned
    - [ ] Per-question breakdown
    - [ ] "Retake" + "Back to Dashboard" buttons

### 5.4 MSAT Exam System

- [ ] `/ujian` — Exam list page
  - [ ] Available exams
  - [ ] Exam rules & instructions
  - [ ] Previous exam history
- [ ] `/ujian/[examId]` — Pre-exam screen
  - [ ] Instructions & rules display
  - [ ] Estimated duration
  - [ ] "Mulai Ujian" button (confirmation modal)
- [ ] `/ujian/[examId]/session` — MSAT Exam interface
  - [ ] **Stricter UI** (no feedback, no skip):
    - [ ] Question display (same as quiz but no feedback)
    - [ ] Timer per question (auto-submit when expired)
    - [ ] Progress indicator (stage + question number)
    - [ ] No back button (cannot revisit)
  - [ ] **MSAT Engine integration**:
    - [ ] Start at MODERATE difficulty
    - [ ] Adjust difficulty after each answer (naik/turun)
    - [ ] Track time spent per question (implicit confidence)
    - [ ] Calculate confidence score per response
    - [ ] Update theta after each question
    - [ ] Stage transitions (Stage 1 → 2 → 3)
  - [ ] **Anti-cheat measures**:
    - [ ] Warning before exit (beforeunload event)
    - [ ] Auto-save every response to Firestore
    - [ ] Disconnect recovery (resume from last saved)
    - [ ] Tab visibility detection (flag if user leaves tab)
    - [ ] Pattern detection (anomaly flags)
  - [ ] **Completion**:
    - [ ] Auto-submit when all 20 questions done
    - [ ] Generate final report
    - [ ] Redirect to results page

### 5.5 Results & Analytics

- [ ] `/ujian/[examId]/results` — Exam results page
  - [ ] Summary card:
    - [ ] Score percentage + correct/total
    - [ ] Time spent
    - [ ] XP earned
    - [ ] Proficiency level label
  - [ ] Detailed analysis:
    - [ ] Per-question breakdown (✓/✗ + difficulty level)
    - [ ] Difficulty path visualization (line chart showing level changes)
    - [ ] Confidence distribution (pie/bar chart):
      - Mahir, Paham Lambat, Tebak, Tidak Paham
    - [ ] Topic mastery radar chart
  - [ ] Misconception profile:
    - [ ] Detected misconceptions (ranked by frequency)
    - [ ] Specific wrong patterns identified
    - [ ] Recommended review topics
  - [ ] Comparison dengan previous attempts (if any)
  - [ ] Actions: "Retake Exam" + "Review Materi" + "Back to Dashboard"

### 5.6 Profile & Settings

- [ ] `/profile` — User profile page
  - [ ] Avatar + name + school info
  - [ ] Stats overview (XP, level, streak, badges)
  - [ ] Achievement showcase
  - [ ] Learning history timeline
- [ ] `/settings` — User settings
  - [ ] Edit profile (name, school, avatar)
  - [ ] Notification preferences
  - [ ] Privacy settings (leaderboard visibility)
  - [ ] Change password

---

## PHASE 6: GAMIFICATION SYSTEM

### 6.1 XP & Leveling

- [ ] Implement XP earning logic:
  - [ ] Complete lesson: +50 XP
  - [ ] Finish quiz: +10 XP per correct answer
  - [ ] Finish exam: +100 XP (bonus based on score)
  - [ ] Daily login: +5 XP
  - [ ] Maintain streak: +10 XP per day
- [ ] Implement level calculation: `XP_needed = 100 * (level^1.5)`
- [ ] XP animation on earn (counter increment)
- [ ] Level up modal (fireworks + new level badge)

### 6.2 Streak System

- [ ] Track daily activity (complete 1 lesson OR 1 quiz = streak maintained)
- [ ] Streak counter display (🔥 + number)
- [ ] Streak milestones: 3, 7, 14, 30, 60, 90, 180, 365 days
- [ ] Streak freeze mechanic (max 2 per month)
- [ ] Streak broken notification
- [ ] Reminder notifications ("Jangan putus streak!")

### 6.3 Achievements & Badges

- [ ] Implement achievement unlock detection:
  - [ ] Learning milestones (first lesson, 10 lessons, all lessons)
  - [ ] Performance (perfect quiz, speed demon, streaks)
  - [ ] Exploration (calculator usage, messages sent)
  - [ ] Special (night owl, early bird, birthday)
- [ ] Achievement unlock animation (modal + badge reveal)
- [ ] Achievement gallery page (`/achievements`)
- [ ] Badge display on profile

### 6.4 Leaderboard

- [ ] `/leaderboard` — Leaderboard page
  - [ ] Tabs: Global, Class, Friends
  - [ ] Time frames: Daily, Weekly, Monthly, All-time
  - [ ] Top 10 display + user position highlighted
  - [ ] Rank change indicator (↑↓)
- [ ] Leaderboard widget for dashboard
- [ ] Privacy: opt-out option, nickname support

---

## PHASE 7: TEACHER FEATURES

### 7.1 Teacher Dashboard

- [ ] `/teacher` — Teacher dashboard
  - [ ] Top stats bar: Total Students, Active Materials, Avg Score
  - [ ] Quick actions: + Create Material, + Create Quiz, + Message
  - [ ] Student management table (name, progress, last active, actions)
  - [ ] Recent activity feed (submissions, completions)

### 7.2 Content Management

- [ ] `/teacher/materials` — Material management
  - [ ] List all materials (draft/published)
  - [ ] Create new material (rich text editor / markdown)
  - [ ] Edit existing material
  - [ ] Preview material
  - [ ] Publish/unpublish toggle
- [ ] `/teacher/questions` — Question bank management
  - [ ] List questions (filter by topic, difficulty)
  - [ ] Create new question:
    - [ ] Stem input (dengan KaTeX preview)
    - [ ] 5 options (A-E)
    - [ ] Correct answer selection
    - [ ] Misconception tagging per wrong option
    - [ ] Difficulty level assignment
    - [ ] Base time setting
    - [ ] Explanation input
  - [ ] Edit/delete questions
  - [ ] Bulk import questions (CSV/JSON)

### 7.3 Student Monitoring

- [ ] `/teacher/students` — Student list
- [ ] `/teacher/students/[studentId]` — Student detail view
  - [ ] Profile card
  - [ ] Progress timeline
  - [ ] Quiz/exam history table
  - [ ] Misconception profile chart
  - [ ] Theta progression over time
  - [ ] Notes section (teacher can add notes)

### 7.4 Communication

- [ ] `/teacher/messages` — Messaging interface
  - [ ] Student list (with unread indicators)
  - [ ] Chat thread per student
  - [ ] Send/receive messages
  - [ ] Notification on new message

---

## PHASE 8: ADMIN FEATURES

### 8.1 Admin Dashboard

- [ ] `/admin` — Admin dashboard
  - [ ] KPI cards: Total Users, Materials, Exams, Daily Usage
  - [ ] Charts:
    - [ ] User growth (line chart)
    - [ ] Engagement metrics (bar chart)
    - [ ] Popular topics (pie chart)
  - [ ] System health indicators

### 8.2 User Management

- [ ] `/admin/users` — User management table
  - [ ] Filters: Role, Status, Date registered
  - [ ] Actions: Activate, Deactivate, Change role, Delete
  - [ ] Bulk actions
  - [ ] User detail view

### 8.3 Content Moderation

- [ ] `/admin/content` — Content moderation queue
  - [ ] Pending materials for approval
  - [ ] Approve/reject with feedback
  - [ ] Published content overview

### 8.4 Platform Configuration

- [ ] `/admin/config` — Platform settings
  - [ ] MSAT algorithm parameters (editable):
    - [ ] Stage question counts
    - [ ] Time thresholds per difficulty
    - [ ] Theta adjustment factor
    - [ ] Anomaly detection thresholds
  - [ ] Gamification settings (XP values, streak rules)
  - [ ] Feature flags (enable/disable features)

---

## PHASE 9: MICRO-INTERACTIONS & ANIMATIONS

### 9.1 Answer Feedback Animations

- [ ] Correct answer: scale 1.1x + green checkmark bounce + confetti (optional)
- [ ] Wrong answer: horizontal shake + red X
- [ ] XP counter animate (+10, +50, etc.)

### 9.2 Progress Animations

- [ ] Progress bar smooth fill (1s ease-out)
- [ ] Level up: fireworks background + badge reveal
- [ ] Streak: fire emoji pulse animation at milestones
- [ ] Achievement unlock: modal + scale-in animation

### 9.3 Page Transitions

- [ ] Fade + slide transitions between pages
- [ ] Skeleton loading screens (shimmer effect)
- [ ] Smooth scroll to sections (material reading)

### 9.4 Reduced Motion Support

- [ ] Implement `prefers-reduced-motion` media query
- [ ] Disable all animations when user prefers reduced motion

---

## PHASE 10: ACCESSIBILITY (WCAG 2.1 AA)

- [ ] Color contrast verification (4.5:1 normal text, 3:1 large text)
- [ ] Keyboard navigation for all interactive elements
- [ ] Focus indicators (2px solid primary, offset 2px)
- [ ] Skip to main content link
- [ ] ARIA labels for all buttons, progress bars, navigation
- [ ] Semantic HTML (`<main>`, `<nav>`, `<aside>`, `<article>`)
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Screen reader testing
- [ ] Quiz keyboard shortcuts (1-5 or A-E, Enter, Space, Esc)
- [ ] Allow zoom up to 200% without breaking layout
- [ ] Alt text for all images

---

## PHASE 11: PERFORMANCE & OPTIMIZATION

- [ ] Image optimization (WebP + PNG fallback, lazy loading)
- [ ] Code splitting per route (dynamic imports)
- [ ] Service Worker setup (cache-first static, network-first API)
- [ ] Lighthouse audit target: 90+ all categories
- [ ] Bundle size analysis & optimization
- [ ] Firestore query optimization (indexes, pagination)
- [ ] FCP < 2s, TTI < 3s target on 3G

---

## PHASE 12: ANALYTICS & MONITORING

- [ ] Setup event tracking (page_view, session, learning events, gamification events)
- [ ] Implement admin analytics dashboard (DAU, WAU, MAU, retention)
- [ ] Learning metrics tracking (completion rate, avg score, misconceptions)
- [ ] Setup error monitoring (Sentry)
- [ ] Setup performance monitoring

---

## PHASE 13: TESTING

- [ ] Unit tests — Jest + React Testing Library (80%+ coverage)
  - [ ] MSAT algorithm functions
  - [ ] Confidence score calculation
  - [ ] Theta estimation
  - [ ] XP & level calculation
  - [ ] Auth service functions
- [ ] Component tests — All UI components
- [ ] Integration tests — Critical user flows:
  - [ ] Register → Login → Dashboard
  - [ ] Start material → Complete → XP earned
  - [ ] Start quiz → Answer → Results
  - [ ] Start exam → MSAT flow → Report generated
- [ ] E2E tests — Playwright
  - [ ] Full student journey
  - [ ] Teacher content creation flow
  - [ ] Admin user management
- [ ] Accessibility tests (axe-core automated)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS Safari, Android Chrome)

---

## PHASE 14: DEPLOYMENT & LAUNCH

### 14.1 Pre-Launch

- [ ] Setup Vercel project (connect Git repo)
- [ ] Configure environment variables di Vercel
- [ ] Setup custom domain
- [ ] SSL certificate verification
- [ ] SEO optimization (meta tags, sitemap, robots.txt)
- [ ] Open Graph tags untuk social sharing

### 14.2 Beta Launch

- [ ] Deploy ke staging environment
- [ ] Beta testing dengan pilot group (10-20 users)
- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Performance optimization based on real usage

### 14.3 Production Launch

- [ ] Production deployment
- [ ] Post-launch monitoring (24-48 jam)
- [ ] Hotfix process ready
- [ ] User feedback collection mechanism
- [ ] Iterate based on feedback

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
