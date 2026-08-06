<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aviente — before you open a PR

Full detail in `tests/REGRESSION.md`. This is the short version.

```bash
npm run prepr                                  # typecheck + build
npm run dev && open 'http://localhost:3000/?selftest=1'   # then read window.__selftest
```

**There is no test runner, on purpose.** The suite is `public/selftest.js`, running
inside the app in a real browser — TravelHub's model. Playwright was tried and
removed: it downloaded a 95MB browser and created a second place for assertions to
live, and you already drive a real browser.

**Rules, in order of how much trouble ignoring them causes:**

1. **Red means no PR.** Report the failures and stop. Never open a PR "with a note
   about" a failing check.
2. **An unexplained skip is a failure.** A check that cannot run must say why —
   `return skip('reason')`, never `return true`. Never let a check pass by
   exercising nothing.
3. **Never call a run green when checks skipped.** Say "24 passed, 1 skipped (no
   controls on the page yet)". Not "all passed".
4. **There is only ONE database, and it holds the family's only copy of these
   recipes.** The selftest is read-only by construction — never add a check that
   writes. Anything needing writes goes in `tools/db-check.mjs`, tags its fixtures
   with `__test__`, and cleans up via `npm run test:clean`. Never truncate.
5. **Assert the app, not the harness.** An early tap-target check failed on the
   Next.js dev-overlay button. Scope selectors to `header, main, footer`.
6. **Run it at 412px and 1280px.** Several checks skip themselves outside phone
   width; they must be seen to skip, not assumed to pass.

**Release candidates:** also run `node tools/db-check.mjs`, then Itzik does the
manual pass from `tests/TEST-PLAN-v<version>.md` on the Ultra. Bump `APP_VERSION`
in `lib/version.ts` first — `window.__selftest.version` and the footer are what
prove the pass was not performed against a cached build.
