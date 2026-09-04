---
name: regression
description: Run the Aviente pre-PR regression — start the app, read the in-app selftest at both widths, click through the flow catalogue in aviente/tests/REGRESSION.md, and write a dated report. Use before opening a PR (sanity) or cutting a release (full regression).
---

# Aviente regression

The flow catalogue lives in **`aviente/tests/REGRESSION.md`** and is the single source
of truth: Layer ① Sanity for every PR, Layer ② Regression before a release, and the
click-level Appendix A that says which control to touch for each interactive check.
This file is only the orchestration — how to launch it and what to do with the result.

Do not restate the catalogue here. Two lists drift; one does not.

## Decide which layer

- `/regression` or `/regression sanity` → **Layer ①** only (~5 min).
- `/regression release` → **Layer ① + ②** (~20 min), plus `npm run db-check`.

## Run it

1. **Confirm the build is the one being tested.** `grep APP_VERSION aviente/lib/version.ts`,
   and later check the footer matches. A pass against a cached build is worse than no
   pass — it produces a confident wrong answer.
2. **Start the app.** `preview_start` with `{name: "aviente"}` (:3000, what Itzik uses).
   For a **release** run use `{name: "aviente-selftest"}` (:3001) as well — that one is
   a production build on its own origin, and a production build is what ships.
3. **Read the suite** at **412×915 and 1280×800** (`resize_window`, then
   `/?selftest=1`, then `window.__selftest` via `javascript_tool`). Both widths, every
   time: several checks skip themselves outside phone width and must be *seen* to skip.
4. **Spawn a Sonnet subagent** for the clicking (`Agent` tool, `model: "sonnet"`),
   handing it: the layer, the catalogue path, and Appendix A. It drives the Browser
   pane and reports per check. Give it the whole layer at once — one agent holding the
   session, not one per check, because signing in is the expensive part.
5. **Write `aviente/tests/reports/<branch>-<n>.md`** in the format at the foot of
   REGRESSION.md: counts per layer, every failure with its detail, **every skip with
   its reason**.
6. **`cd aviente && npm run test:clean`** — always, including after a failure. A
   crashed run leaves `__test__` fixtures in the family's only database.

## The session, and why there are no credentials here

The agent uses the browser session **Itzik is already signed into**. There is no
password in this repo, no test account, and nothing to leak: magic links cannot be
automated (there is no inbox to poll), and typing a password into a login form is
not something Claude does. **Since 11.5.0 a signed-out suite run is red by construction** (four DOM groups fail with "signed out"), so the Claude Browser pane — which holds no session — can only ever prove the logic groups; the green DOM run and the click layer happen in Itzik's Chrome via the extension. If the pane is signed out, say so and stop — do not try to
sign in.

Consequence, stated because it will come up: **anything needing a *second* identity
cannot run this way.** The non-admin checks (a member must not reach `/settings/people`
or the backup section) need a second signed-in profile. Skip them with that reason.
Never mark them green.

## Writes

Only `__test__`-prefixed recipes and menus, exactly as REGRESSION.md rule 4 requires.
The selftest itself stays read-only by construction. There is **one** database and it
holds the family's only copy of these recipes, so: never truncate, never touch a row
that is not tagged, and clean up in the same run.

## What ends the run

- Any **red** check → report and stop. No PR.
- An **unexplained skip** counts as red.
- Never say "all passed" when anything skipped; say "69 passed, 1 skipped (no Latin
  runs on this page)".

## Two things the first rehearsal learned

Both are written up in Appendix A, and both produce a **false red** if you do not know
them:

- A coordinate click can time out with "pane hidden" *after the click has already
  landed*. Check the DOM before believing the error; prefer `element.click()` through
  `javascript_tool` for anything load-bearing.
- The refused-save check needs a short wait before reading `document.activeElement` —
  the scroll-and-focus happens in an effect after the error renders.

## When the schema is behind

`prepr` failing with "the DATABASE IS BEHIND" is not a regression failure — it means a
migration in the branch has not been applied yet. Report it as a **blocker for the
merge**, run the rest, and expect the schema banner to appear on every screen (it is
rendered above every page, so it will show up in screenshots).
