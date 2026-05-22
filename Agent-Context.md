# AKURAT — AI Agent Context & Handoff Document

> Last Updated: 23 Mei 2026
> This document is for AI agents working on this project. It captures the current state, preferences, and conventions.

---

## 1. PROJECT OVERVIEW

**AKURAT** (Asesmen Kimia Ukur Adaptif Terpadu) — Platform edukasi kimia berbasis AI dengan Multistage Adaptive Testing (MSAT).

**Status**: Phase 1-13 complete. Phase 14 (CI/CD & Deploy) remaining.
**Live test**: `npm run dev` → `http://localhost:3000`
**Test account**: `student@akurat.test` / `akurat123`

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
| Deployment | Vercel (production) + Firebase Hosting (staging) |
| Testing | Vitest (18 unit tests passing) |
| Linting | ESLint + Prettier (singleQuote, semi, es5 trailing comma) |

---

## 3. PROJECT STRUCTURE

```
src/
├── app/
│   ├── (auth)/          → Login, Register, Forgot Password (split-screen layout)
│   ├── (dashboard)/     → All authenticated pages (AuthGuard)
│   │   ├── dashboard/   → Brilliant-style homepage (stacked card carousel)
│   │   ├── materi/      → Material list + reading page (markdown + KaTeX)
│   │   ├── latihan/     → Practice quiz (3 difficulties)
│   │   ├── ujian/       → MSAT exam (adaptive, 21 questions)
│   │   ├── profile/     → User profile + achievements
│   │   ├── settings/    → Edit profile, language, notifications
│   │   ├── onboarding/  → 3-step welcome flow
│   │   └── teacher/     → Teacher dashboard, materials, questions, students, messages
│   ├── (admin)/         → Admin dashboard, users, content, config (RoleGuard)
│   ├── (public)/        → About, Privacy, Terms, Contact
│   └── page.tsx         → Landing page
├── components/
│   ├── ui/              → Primitives (Button, Input, Modal, Card, Table, etc.)
│   ├── layout/          → Navbar, MobileNav, Sidebar, Footer, NotificationDropdown
│   ├── shared/          → ProgressBar, Badge, Skeleton, XPAnimation, OfflineIndicator
│   ├── landing/         → LandingNavbar, HeroSection, LandingFooter, etc.
│   ├── guards/          → AuthGuard, RoleGuard
│   └── tools/           → ScientificCalculator, PeriodicTableRef
├── services/            → Firebase CRUD (auth, materials, questions, progress, exam, etc.)
├── lib/                 → firebase.ts, firebase-admin.ts, msat-engine.ts, auth-errors.ts
├── types/               → firestore.ts (all TypeScript interfaces)
├── context/             → AuthContext
├── hooks/               → useToast
└── i18n.ts              → next-intl config
```

---

## 4. DESIGN PREFERENCES (Owner's Style)

The owner prefers:
- **Fluid, no hard borders** — use soft shadows, rounded-3xl, no border-1px boxes
- **Colorful gradients** — each section/card has unique gradient (not monotone)
- **Animations** — Framer Motion for page transitions, hover effects, entrance animations
- **Cheerful & modern** — inspired by Brilliant.org + Duolingo, not corporate/boring
- **Font: Nunito** — rounded, friendly, not template-looking
- **No dummy data** — everything fetches from real Firestore
- **Simple for end users** — target audience includes parents who don't like complexity
- **Brilliant-style dashboard** — stacked card carousel for course topics
- **User-friendly errors** — no raw Firebase errors shown to users
- **Facebook login** — grayed out with "coming soon" toast (not implemented)

**Design references**: `docs/design/my-design/` (mockups) and `docs/design/my-preference/` (ClassDojo, Brilliant inspiration)

---

## 5. KEY FEATURES IMPLEMENTED

### Student
- Dashboard: streak card + progress overview (list/chart toggle) + stacked course carousel
- Materials: list with search + reading page (markdown + KaTeX + TOC)
- Quiz: 3 difficulties, timer, immediate feedback (bounceIn/shake animations)
- MSAT Exam: 21 adaptive questions, theta scoring, confidence analysis, anti-cheat
- Results: difficulty path chart, confidence distribution, per-question breakdown
- Profile: stats grid + achievement gallery
- Tools: floating scientific calculator + periodic table reference

### Teacher
- Dashboard: student stats table
- Content management: create/publish/unpublish materials, create/delete/bulk-import questions
- Student monitoring: detail view with theta chart + teacher notes
- Messaging: chat interface per student

### Admin
- Dashboard: KPIs + charts
- User management: search, filter, change role, activate/deactivate, delete
- Content moderation: approve/reject materials
- Platform config: edit MSAT + gamification parameters

---

## 6. DATABASE (Firestore)

Collections: `users`, `materials`, `question_bank`, `exam_sessions`, `quiz_results`, `user_progress`, `achievements`, `user_achievements`, `messages`, `notifications`, `app_config`, `analytics_events`

**Real data seeded**: 96 questions (32 per difficulty), 5 materials, 13 achievements, MSAT config, gamification config, 1 test user.

---

## 7. CONVENTIONS

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `chore:`)
- **Components**: FC type, named exports, interface Props
- **Naming**: PascalCase components, camelCase functions, kebab-case files
- **Imports**: `@/` path alias
- **No `any`** — proper TypeScript typing
- **Git**: commit + push after every feature, update To-Do List
- **Validation**: always run `lint → typecheck → test` before commit

---

## 8. WHAT'S LEFT (Phase 14)

- CI/CD pipeline (GitHub Actions)
- Vercel deployment
- Firebase Hosting staging
- Security rules audit
- Production launch

---

## 9. HOW TO CONTINUE

1. Read `To-Do List.md` for detailed task status
2. Run `npm run dev` to see current state
3. Follow the style: fluid, gradient, animated, Nunito font
4. Always commit + push after each feature
5. Update To-Do List after completing tasks
6. Test with `npm run test` (Vitest)
7. Lint with `npm run lint`
