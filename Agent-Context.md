# AKURAT — AI Agent Context & Handoff Document

> Last Updated: 20 Juni 2026 (Phase 1-14 sebagian complete, live di Firebase Hosting)
> This document is for AI agents working on this project.

---

## 1. PROJECT OVERVIEW

**AKURAT** (Asesmen Kimia Ukur Adaptif Terpadu) — Platform edukasi kimia berbasis AI dengan Multistage Adaptive Testing (MSAT).

**Status**: Phase 1-13 complete + fitur kelas, chat realtime, perbaikan bug, optimasi performa. Live di Firebase Hosting.
**Live URL**: https://akurat-76834.web.app
**Local dev**: `npm run dev` → `http://localhost:3000`
**Test account**: `student@akurat.test` / `akurat123`
**Repository**: https://github.com/ausartal/education-web-app.git

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS Variables (design tokens) |
| Fonts | Nunito (display) + Ubuntu (body) + Space Mono (mono) |
| Animation | Framer Motion |
| Icons | Lucide React + custom SVGs in `/public/icons/` |
| Backend | Firebase (Firestore, Auth, Storage) |
| Deployment | Firebase Hosting (production, webframeworks preview) |
| Testing | Vitest (18 unit tests passing) |
| Linting | ESLint + Prettier (singleQuote, semi, es5 trailing comma) |
| Markdown | react-markdown + remark-math + rehype-katex + remark-gfm |
| Typography | @tailwindcss/typography (prose classes) |

---

## 3. OWNER'S DESIGN PREFERENCES (CRITICAL)

The owner has very specific style preferences. Follow these strictly:

### Visual Style
- **NO hard borders** — use soft shadows (shadow-sm, shadow-md) and rounded corners (rounded-2xl, rounded-3xl)
- **NO dark mode** for quiz/exam — always light mode (bg-[#F8F9FB])
- **Fluid and spacious** — generous padding, breathing room between elements
- **Colorful gradients** — each section/card has unique gradient (not monotone)
- **No emoji in UI buttons** — use plain text labels (e.g., "Calculator" not "🧮 Calculator")
- **Seamless** — remove unnecessary card wrappers/backgrounds behind content

### Typography
- **Font: Nunito** for headings (rounded, friendly, NOT template-looking)
- **Font: Ubuntu** for body text
- **Font weights**: extrabold for headings, medium/semibold for labels

### Colors
- Primary: #1A73E8 (blue)
- Primary Cyan: #00C2FF
- Primary Orange: #FF9500
- Violet/Purple: for exam/quiz elements
- Emerald/Teal: for success/completion
- Amber/Orange: for warnings/streaks

### Layout Patterns
- **2-column layout** for quiz/exam: question+options (left), stats+tools (right)
- **Options in 2x2 grid** (not vertical list)
- **Stacked card carousel** (Framer Motion) for dashboard course topics
- **Progressive disclosure** — tools (calculator, periodic table) as collapsible panels
- **Centered CTAs** — buttons centered below content, not crammed to the side

### Animations
- Framer Motion for page transitions, hover effects, entrance animations
- `prefers-reduced-motion` respected
- Bounce on correct answer, shake on wrong answer
- Staggered entrance for lists

### What the owner DOESN'T like
- Boxy/rigid layouts with hard borders
- Dark mode for learning content
- Emoji in functional buttons
- Too much information crammed in one view
- Floating/hovering tools on all pages (only in quiz/exam)
- Raw Firebase error messages shown to users

---

## 4. PROJECT STRUCTURE

```
src/
├── app/
│   ├── (auth)/          → Login, Register, Forgot Password (split-screen layout)
│   ├── (dashboard)/     → All authenticated pages (AuthGuard)
│   │   ├── dashboard/   → Brilliant-style homepage (stacked card carousel)
│   │   ├── materi/      → Material list (Duolingo-style) + reading page (markdown + KaTeX)
│   │   ├── latihan/     → Practice quiz list + quiz interface (2-col, light mode)
│   │   ├── ujian/       → MSAT exam page + session (2-col, no difficulty shown)
│   │   ├── kelas/       → Student class list + detail (tabs: Materi, Ujian, Tugas, Chat)
│   │   ├── profile/     → User profile + achievements
│   │   ├── settings/    → Profile, notifications, language, privacy, logout + admin link
│   │   ├── onboarding/  → 3-step welcome flow (progress bar)
│   │   └── teacher/     → Teacher dashboard, materials, questions, students, messages
│   │       └── kelas/   → Teacher class detail (tabs: Siswa, Materi, Ujian, Tugas, Chat)
│   ├── (admin)/         → Admin dashboard, users, content, config (RoleGuard + Sidebar)
│   ├── (public)/        → About, Privacy, Terms, Contact (with LandingNavbar + Footer)
│   └── page.tsx         → Landing page (redirects to /dashboard if logged in)
├── components/
│   ├── ui/              → Button, Input, Modal, Card, Table, Tabs, etc.
│   ├── layout/          → Navbar, MobileNav, Sidebar, Footer, NotificationDropdown
│   ├── shared/          → ProgressBar, Badge, Skeleton, XPAnimation, OfflineIndicator
│   ├── landing/         → LandingNavbar, HeroSection, LandingFooter, etc.
│   ├── guards/          → AuthGuard, RoleGuard
│   ├── teacher/         → RichEditor (Markdown+KaTeX), MarkdownPreview (lazy-loaded, dynamic import)
│   └── tools/           → ScientificCalculator, PeriodicTableRef (inline, not floating)
├── services/            → auth, materials, questions, progress, exam, achievements, gamification, notifications, analytics, config
├── lib/                 → firebase.ts, firebase-admin.ts, msat-engine.ts, auth-errors.ts
├── types/               → firestore.ts (all TypeScript interfaces)
├── context/             → AuthContext
├── hooks/               → useToast
├── i18n.ts              → next-intl config
└── __tests__/           → msat-engine.test.ts (18 tests)
```

---

## 5. KEY BEHAVIORS & ROUTING

- `/` → Landing page (redirects to `/dashboard` if logged in)
- After login → `/dashboard`
- After register → `/onboarding` → `/dashboard`
- Navbar "Home" → `/dashboard` (not `/`)
- Logo click → `/dashboard`
- Latihan: Easy → Moderate → Hard (progressive unlock)
- Quiz completion saves: `lastQuiz_[difficulty]`, `easyQuizCompleted`, `moderateQuizCompleted`, `stats.totalQuizzes`
- Exam: difficulty hidden from user (runs in background)
- Calculator/Periodic Table: only in quiz and exam pages (inline collapsible, not floating)
- Facebook login: grayed out, shows "coming soon" toast
- Firebase errors: mapped to user-friendly messages (auth-errors.ts)

---

## 6. DATABASE (Firestore)

Collections: `users`, `materials`, `question_bank`, `exam_sessions`, `quiz_results`, `user_progress`, `achievements`, `user_achievements`, `messages`, `notifications`, `app_config`, `analytics_events`, `classes`, `class_chats/{classId}/messages`, `exam_schedules`, `assignments`

**Seeded data**: 96 questions (32/difficulty), 5 materials, 13 achievements, MSAT config, gamification config, 1 test user.

**Class system**: Kelas memiliki `teacherId`, `studentIds[]`, `materialIds[]`. Chat disimpan di subcollection `class_chats/{classId}/messages`. Siswa bergabung via kode kelas (classCode). Enrollment check dilakukan server-side (API route) dengan direct doc fetch — bukan compound query — untuk menghindari kebutuhan Firestore composite index.

**User document extra fields**: `latihanIntroSeen`, `easyQuizCompleted`, `moderateQuizCompleted`, `lastQuiz_easy`, `lastQuiz_moderate`, `lastQuiz_hard`, `teacherNotes`, `settings.dailyGoal`, `settings.selectedTopics`, `settings.onboardingComplete`

---

## 7. CONVENTIONS

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `chore:`)
- **After every feature**: commit + push + update To-Do List
- **Components**: FC type, named exports, interface Props
- **Naming**: PascalCase components, camelCase functions, kebab-case files
- **Imports**: `@/` path alias
- **No `any`** — proper TypeScript typing
- **Validation**: `prettier → lint → typecheck` before commit
- **Tests**: `npm run test` (Vitest)

---

## 8. RECENTLY COMPLETED (Juni 2026)

- **Fitur Kelas Siswa** — Tab Materi, Ujian, Tugas, Chat realtime di `/kelas/[classId]`
- **Fitur Kelas Guru** — Tab Siswa, Materi, Ujian, Tugas, Chat di `/teacher/kelas/[id]`
- **Bug fix enrollment** — `GET /api/student/classes/[classId]` direfaktor ulang menggunakan direct doc fetch + JS `.includes()` (menghindari Firestore composite index error)
- **Bug fix assignments** — Hapus `orderBy` dari Firestore query, sort di JS setelah fetch
- **Lazy-load MarkdownPreview** — `next/dynamic` untuk react-markdown + rehype-katex (~80kB hemat)
- **Performance** — `compress: true`, AVIF format, 30-day cache TTL, immutable headers untuk static assets
- **Logo AKURAT** — SVG baru di `/public/icons/`
- **Admin access** — Link "Masuk ke Admin Dashboard" di Settings (hanya tampil untuk role admin)
- **Firebase Hosting deploy** — Live di https://akurat-76834.web.app

## 9. WHAT'S LEFT

### Phase 14 (CI/CD)
- GitHub Actions CI/CD pipeline (belum dibuat)
- Firestore security rules audit yang komprehensif
- Firestore indexes file (`firestore.indexes.json`) untuk query yang butuh composite index

### UI Polish (ongoing)
- Profile page visual improvement
- Exam results page visual improvement
- Teacher/Admin pages visual consistency
- Mobile responsive check (semua halaman)
- Cross-browser testing

---

## 10. HOW TO CONTINUE

1. Read this file + `To-Do List.md` for context
2. Run `npm run dev` to see current state
3. **Follow the style guide in Section 3** — this is critical
4. Always commit + push after each feature
5. Update To-Do List after completing tasks
6. Test with `npm run test`
7. Lint with `npm run lint`
8. Design references in `docs/design/my-design/` and `docs/design/my-preference/`
