---
name: security-audit
description: "Security audit for AKURAT education web app — check for data leaks, API auth gaps, Firestore rule issues, and client-side exposure of sensitive data (exam answers, user data)"
---

# Security Audit — AKURAT Education Web App

Run a focused security review of the AKURAT Next.js + Firebase education platform.

## Context

- **Stack**: Next.js (App Router), Firebase Auth, Firestore, Firebase Hosting
- **Project**: `akurat-76834` — hosted at `https://akurat-76834.web.app/`
- **Roles**: admin, teacher (guru), student (siswa)
- **Sensitive flows**: exam sessions (ujian), answer checking, grading, class management
- **Known past issue**: exam answers were visible via browser inspect tool (client-side leak)

## Audit Checklist

### 1. Client-Side Data Leaks
- Search all `page.tsx` and component files for Firestore reads that expose correct answers or scoring logic to the client.
- Verify that exam questions fetched for students do **not** include the `correctAnswer` field.
- Check API routes under `src/app/api/` — ensure responses to student-role requests strip sensitive fields.

### 2. API Authentication & Authorization
- For every API route in `src/app/api/`, verify:
  - The request includes a valid Firebase ID token.
  - The user's role is checked before returning data.
  - Student endpoints don't return teacher/admin-only data.
- Check for routes that accept unauthenticated requests.

### 3. Firestore Security Rules
- Read `firestore.rules` and verify:
  - Students can only read/write their own data.
  - Exam answer documents are not readable by students.
  - Teacher-only collections are gated by role.
  - Admin-only collections are gated by role.

### 4. Server-Side Validation
- Check that exam submission routes validate answers **server-side** (not just client-side).
- Verify that score calculation happens on the server, not in the client.
- Ensure that exam session state (started, in-progress, completed) is enforced server-side.

### 5. Sensitive Data in Client Bundles
- Search for hardcoded API keys, service account credentials, or admin tokens in `src/`.
- Check `.env.local` and `.env.example` — ensure no secrets are committed.
- Verify Firebase config only uses public client-side keys (apiKey, authDomain, etc.), not admin credentials.

## Auth Pattern Reference (from AKURAT_AI_Handoff.md)

```typescript
// Server-side (API routes)
import { verifyTeacher } from '@/lib/server-auth';
const decoded = await verifyTeacher(req); // throws 401/403 if invalid

// Client-side fetching (SWR)
const { data, isLoading, mutate } = useAuthSWR<{ items: T[] }>('/api/endpoint');

// Manual fetch
const t = await user.getIdToken();
const res = await fetch('/api/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
  body: JSON.stringify(payload),
});
```

Key files for auth:
- `src/lib/firebase-admin.ts` — server-side Firebase Admin SDK
- `src/lib/auth-helpers.ts` — auth helper functions
- `src/lib/auth-errors.ts` — error handling
- `src/middleware.ts` — Next.js middleware

## How to Run

1. **Explore the codebase structure** — Use Glob to map `src/app/api/` routes and `src/app/(dashboard)/` pages.
2. **Read each API route** — Check auth/role guards and response filtering.
3. **Read Firestore rules** — Check for overly permissive rules.
4. **Grep for leaks** — Search for `correctAnswer`, `answer`, `score`, `grade` in client-facing code.
5. **Report findings** — List each vulnerability with file path, severity (critical/high/medium/low), and recommended fix.

## Output Format

```
## Security Audit Results

### Critical
- [file:line] Description of critical issue

### High
- [file:line] Description of high issue

### Medium
- [file:line] Description of medium issue

### Low
- [file:line] Description of low issue

### Summary
- Total issues: N
- Safe to deploy: Yes/No
```

## Notes
- The user's primary concern is that exam answers must NOT be visible via browser inspect or network tab.
- Indonesian language context: "ujian" = exam, "soal" = questions, "jawaban" = answers, "nilai" = score, "guru" = teacher, "siswa" = student.
- If the user provides `$ARGUMENTS` (e.g. a specific page or API route), focus the audit on that scope.
