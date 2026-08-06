<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aviente — before you open a PR

Read `tests/REGRESSION.md` first; this is the short version.

```bash
npm run prepr        # typecheck + build + sanity suite
```

**Rules, in order of how much trouble ignoring them causes:**

1. **Red means no PR.** Report the failures and stop. Never open a PR "with a note
   about" a failing check.
2. **An unexplained skip is a failure.** A check that cannot run must say why —
   `test.skip(cond, 'reason')`. Never let a check pass by exercising nothing.
3. **Never call a run green when checks skipped.** Say "10 passed, 4 skipped
   (auth not wired)". Not "all passed".
4. **Tests point at the DEV Supabase project, never production.** That project is
   the family archive; `npm run test:reset` deletes rows and guards on the project
   ref for exactly this reason.
5. **Assert the app, not the harness.** The first run of the tap-target check
   failed on the Next.js dev-overlay button. Scope selectors to
   `header, main, footer`.
6. Write the run to `tests/reports/<branch>-<n>.md` and paste the summary table
   into the PR description.

**Release candidates** additionally run `npm run test:regression`, then Itzik does
the manual pass from `tests/TEST-PLAN-v<version>.md` on the Ultra. Bump
`APP_VERSION` in `lib/version.ts` first — the footer is what proves the manual
pass was not performed against a cached build.
