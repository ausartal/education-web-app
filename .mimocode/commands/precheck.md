---
description: "Run TypeScript type-check and build to validate before deploying"
---

# Pre-deploy Check

Validate the AKURAT codebase before deploying.

## Steps

1. **TypeScript type check**
   ```bash
   npx tsc --noEmit
   ```
   If there are type errors, stop and report them.

2. **Build check**
   ```bash
   npm run build
   ```
   If build fails, stop and report errors.

3. **Report** — Summarize:
   - TypeScript: pass/fail + error count
   - Build: pass/fail
   - Whether the codebase is safe to deploy

## Notes
- This project uses Next.js 14 (App Router) with TypeScript strict mode.
- The user often sees "244 problems" in VS Code that are IntelliSense noise (Prettier was removed from ESLint). Focus on actual `tsc --noEmit` output.
- If all checks pass, say "Ready to deploy" and suggest running `/deploy`.
- If `$ARGUMENTS` includes `--fix`, run `npx next lint --fix` before reporting.
