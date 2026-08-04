---
description: "Deploy AKURAT to Firebase (tsc → build → git commit → push → firebase deploy --only hosting)"
---

# Deploy AKURAT

Run the deploy pipeline for the AKURAT education web app.

## Steps

1. **TypeScript check**
   ```bash
   npx tsc --noEmit
   ```
   If there are type errors, stop and report them. Do NOT deploy with type errors.

2. **Build**
   ```bash
   npm run build
   ```
   If build fails, stop and fix errors before continuing.

3. **Git status check**
   ```bash
   git status --short
   ```
   Review changes. If there are uncommitted changes, stage and commit them.

4. **Git commit** — Stage **specific files** (not `git add -A`). Use a concise conventional-commit message. **Do NOT include AI attribution** (no "Co-authored-by"). Commit as **Ausartal** only.
   ```bash
   git add src/app/teacher/page.tsx src/components/...
   git commit -m "feat: description of change"
   ```

5. **Git push**
   ```bash
   git push origin main
   ```

6. **Firebase deploy**
   ```bash
   firebase deploy --only hosting
   ```
   Run in background with a 300s timeout.

7. **Verify** — After deploy completes, confirm success. Hosting URL: `https://akurat-76834.web.app/`

## Rules (from AKURAT_AI_Handoff.md)
- Always `npm run build` before deploy — Firebase rebuilds Next.js via Cloud Functions automatically.
- Always `firebase deploy --only hosting` — not full deploy.
- Use **Bash** for all git commands, never PowerShell (here-string with `>` causes errors).
- Stage specific files, never `git add -A`.
- No AI attribution in commit messages.
- Commit message format: `feat:`, `fix:`, `chore:` prefix.

## Notes
- Firebase project: `akurat-76834` (in `.firebaserc`).
- Hosting: Next.js framework backend on `asia-southeast1`.
- Firestore rules: `firestore.rules`.
- If working tree is clean, skip step 4.
- If `$ARGUMENTS` is provided, use as commit message description.
