# Aviente — Complete UX and UI Review

**Review date:** 1 September 2026  
**Scope:** Complete signed-out and authenticated user journey; phone and desktop UI; usability; visual consistency; accessibility; empty, loading, error, destructive, and recovery states.  
**Primary target:** Samsung Galaxy S26 Ultra at 412 × 915 CSS px  
**Additional target widths:** 360 × 800, 384 × 854, 480 × 1000, 1024 × 800, and 1280 × 800  
**Verdict:** **Fail — significant issues should be resolved before the UI is considered complete.**

The product has a strong foundation: it is task-oriented, visually distinctive, Hebrew-aware, careful around destructive actions, and unusually thoughtful about cooking, menu archives, guest privacy, and backup recovery. The most important gaps are journey-level rather than feature absence: fragile sign-in, inconsistent return paths, inaccessible picker dialogs, incomplete deletion recovery, mixed-language states, stale menu previews, and visual hierarchy that can silently fall back because typography tokens are missing.

No P0 data-loss or access-control defect was found during this review. The P1 findings are significant enough to interrupt or confuse real family use.

---

## 1. Review method and evidence

This review combined:

- A route-by-route inspection of every page and primary component.
- A transition review covering entry points, success destinations, cancellation, Back behavior, and destructive recovery.
- Review of the build specification, regression protocol, manual test plan, and known remaining work.
- A signed-out browser check of the running application and login redirect behavior.
- Static verification of responsive rules, design tokens, focus styling, modal semantics, localized strings, and state handling.
- TypeScript and lint checks.

### Verification limitations

- A signed-in browser session was not available to the in-app browser, so authenticated screens were reviewed from their implementation and existing test evidence rather than through a new visual click-through.
- The database schema check could not reach Supabase and reported itself as skipped.
- The production build could not fetch six Google Fonts in the restricted environment and failed at that dependency.
- Physical A4 output and touch dragging on the target Samsung device remain device checks.

Findings below are labelled as:

- **Confirmed:** directly evident in the implementation or running signed-out UI.
- **Validation required:** needs a signed-in visual, physical-device, or printed-output pass.

---

## 2. Product and journey overview

| Stage | Primary journey | Current assessment |
|---|---|---|
| Access | Open app → request link → authenticate → return to intended route | Fragile |
| Orientation | Home → search or choose a primary task | Clear |
| Discovery | Recipes → category/search → recipe | Good |
| Creation | Add → type or import → preview → save | Good, with friction |
| Cooking | Recipe → scale → tick ingredients → follow method → print | Strong |
| Maintenance | Edit → move category/photo → delete → recover | Recovery gap |
| Menu planning | Start from Home, Menus, category selection, or recipe → build → card | Context gaps |
| Menu sharing | Create link → guest reads → print → revoke | Strong |
| Kids planning | Choose week → pick dishes → place/move → assign chef → print | Capable but dense |
| Administration | Preferences → people → backup → restore | Strong but secondary |

### What already works well

- The homepage prioritizes real tasks rather than presenting a dense content directory.
- Search is available on the first screen and searches titles and ingredients.
- Recipe cards avoid destructive controls, while editing and deletion live in explicit contexts.
- Recipe forms validate, scroll to, focus, and mark the field that blocked saving.
- Ingredient scaling, cook-mode ticks, two-column desktop reading, and Keep Awake support the actual cooking moment.
- Cross-category recipe selection survives navigation into menu building.
- Menu snapshots protect historical cards from later recipe edits or deletion.
- Menu sharing is secret-gated, strips the secret from the visible URL, and can be revoked.
- Destructive menu and kids actions use in-product confirmations rather than unreliable native dialogs.
- Backup, photo backup, restore, and import share compatible data boundaries.
- Empty category and menu states have purposeful illustrations and next actions.
- Mobile touch-target requirements are explicitly designed and regression-tested.

---

## 3. Prioritized findings

### P1 — Significant

| ID | Area | Finding | Evidence | Recommended change |
|---|---|---|---|---|
| P1-01 | Authentication | Magic-link sign-in depends on the requesting browser context, while the UI says only “this device.” A PWA or email client may open another browser context on the same phone. | Confirmed | Add a six-digit OTP fallback. Until then, say “open the link in this same browser.” |
| P1-02 | Localization | Login, import results, menu metadata, and several fallback errors remain hardcoded English in Hebrew mode. | Confirmed | Move all user-facing strings into the translation dictionary and add a hardcoded-copy check. |
| P1-03 | Recovery | Recipe deletion is recoverable only through a ten-second toast; the existing restore capability has no durable Trash UI. | Confirmed | Add Recipes → Trash, with restore and permanent-delete controls restricted appropriately. |
| P1-05 | Return context | Starting “Add to menu” from a recipe and cancelling takes the user to Menus instead of the originating recipe. | Confirmed | Pass a validated `returnTo` route and use it for Cancel and post-save secondary navigation. |
| P1-07 | Typography | `--t-h1`, `--t-h2`, and `--t-h3` are referenced but not defined, causing headings and the menu preview to fall back to browser defaults. | Confirmed | Define the missing tokens in the design system and add a CSS custom-property audit. |
| P1-09 | Dialogs | Menu, kids, history, and photo pickers use `role="dialog"` without consistent initial focus, focus containment, Escape handling, or trigger restoration. | Confirmed | Create one shared Dialog/Sheet primitive with focus management and mobile/desktop layouts. |
| P1-10 | Save integrity | Recipe, menu, and replacement imports perform multi-step database writes without a transaction. A partial failure can leave a damaged display state. | Confirmed | Move each save boundary into one transactional database function. |
| P1-11 | Draft resilience | The recipe dirty guard protects deliberate navigation but cannot recover a closed tab, browser crash, or expired session. | Confirmed | Persist a local draft and offer Restore/Discard on the next visit. |
| P1-12 | Build resilience | The production build downloads six Google Fonts and fails when the font service is unavailable. | Confirmed | Self-host the exact font files with `next/font/local`. |

### P2 — Minor or polish

| ID | Area | Finding | Evidence | Recommended change |
|---|---|---|---|---|
| P2-01 | Home | The action grid remains one column at 412px even though comments and product intent call for two-up phone actions above the fold. | Confirmed | Move the two-column breakpoint to the tested phone width or use a fluid `minmax` grid. |
| P2-02 | Search | Search fields rely on Enter/Search with no visible submit affordance. | Confirmed | Add a labelled search icon/button inside or beside each field. |
| P2-03 | Search recovery | An empty query opens a prompt-only results screen without an in-place search field. | Confirmed | Keep the search input on the results page for query editing and retry. |
| P2-04 | Menu lifecycle | A menu deletion mutation exists but no UI exposes deletion or archival. | Confirmed | Add Delete/Archive under a secondary actions disclosure with Undo. |
| P2-05 | Menu actions | Finished-menu actions have similar visual weight despite serving different goals. | Confirmed | Group Edit/Duplicate, Print/Export, and Share/Revoke into labelled clusters. |
| P2-06 | Menu language | Menu list metadata uses hardcoded “Menu,” “dish/dishes,” and “shared.” | Confirmed | Localize labels and pluralization through the shared count helper. |
| P2-07 | “Keep” model | “Keep this menu,” upcoming menus, Show all, and automatic cleanup require users to infer the archive model. | Confirmed | Explain Keep on first use and indicate which menus will be tidied automatically. |
| P2-08 | Import complexity | Duplicate handling, attribution, previews, and commit choices create a dense screen. | Confirmed | Reveal advanced choices progressively after valid recipes are parsed. |
| P2-09 | Import completion | Result badges such as added/replaced/skipped/failed are partly hardcoded and batch Undo has nuanced limits. | Confirmed | Localize all statuses and state precisely what Undo will and will not restore. |
| P2-10 | Settings feedback | Theme and language feel immediate, but display-name saving relies on blur and provides limited success feedback. | Confirmed | Add explicit Save or a short saved status associated with the field. |
| P2-11 | Kids navigation | Browsing several weeks away offers no one-tap return to the current week. | Confirmed | Add a Current week button whenever the viewed week differs from today’s week. |
| P2-12 | Kids learnability | Tray selection, day activation, per-slot picking, and Fill Week form a multi-stage model with little first-use guidance. | Confirmed | Add a concise three-step first-use hint that disappears after initial success. |
| P2-13 | Small text | Several status and metadata labels render around 10–12px. Contrast may pass while real kitchen-distance readability remains weak. | Confirmed | Raise essential UI metadata to at least 12–14px and reserve 10px for decorative print details. |
| P2-14 | Live announcements | Import parsing, picker filtering, tray changes, and preference saves are not consistently announced. | Confirmed | Add targeted polite live regions without duplicating visible labels. |
| P2-15 | Clipboard failures | Copy/share actions generally assume Clipboard or Web Share succeeds. | Confirmed | Show a selectable field and actionable fallback when an API is missing or denied. |
| P2-16 | Error recovery | Some server-rendered query failures do not present an in-page Retry path. | Confirmed | Standardize list error cards with Retry and a safe Back/Home action. |
| P2-17 | Long content | Navigation labels, menu titles, dish notes, and translated strings need explicit stress coverage. | Validation required | Test long Hebrew/English strings at every target width and 200% zoom. |
| P2-18 | Printed kids plan | The fixed kids grid has not been verified on physical A4 paper with dense cells. | Validation required | Print the maximum-content fixture and confirm legibility and clipping. |
| P2-19 | Menu builder | Occasion suggestions update when meal time changes, but the server-resolved occasion remains frozen when only the date changes. | Confirmed | Re-resolve the occasion when the date changes; retain the existing client-side meal-time toggle behavior. |
| P2-20 | Keyboard focus | Fields that remove the default outline substitute a visible border or background change, but those cues are primarily color-only. | Confirmed | Strengthen the replacement with a shared non-color focus cue such as a thicker border, outline, or shadow. |

### Accepted product decisions and taste calls

| Area | Current behavior | Assessment | Optional compromise |
|---|---|---|---|
| Recipe reclassification | After changing a recipe’s category, Save returns to the category where the editing session began. | **Accepted by design.** This supports batch category tidying, and opening the moved recipe automatically was previously tried and rejected. It is not treated as a defect. | If later user evidence shows disorientation, open the saved recipe and provide an explicit “Back to previous category” link. Do not change this behavior on review taste alone. |

---

## 4. Journey-by-journey review

## 4.1 Sign-in and session recovery

### Intended journey

Open app → enter allow-listed email → receive link → open callback → return to the originally requested route.

### Findings

- [ ] **[P1] Add** a code-based fallback so authentication is not tied to one browser context.
- [ ] **[P1] Clarify** that the link must open in the same browser that requested it, not merely the same device.
- [ ] **[P1] Replace** hardcoded English sending, success, retry, and error copy with translated strings.
- [ ] **[P2] Add** a visible resend countdown and explain rate-limit recovery before another attempt is allowed.
- [ ] **[P2] Preserve** the intended destination including safe query parameters where the target flow depends on them.
- [ ] **[P2] Add** an explicit expired-session message when a protected action redirects to login mid-task.

### UI states to verify

- Empty and valid email.
- Disabled and sending button.
- Unknown family email.
- Rate limit.
- Link sent.
- Expired or wrong-browser link.
- Signed-in user visiting `/login`.
- Return to a protected deep link.

---

## 4.2 Home and global navigation

### Intended journey

Home → search for a recipe or choose Add Recipe, Kids Planner, New Menu, or Settings. Persistent navigation provides Home, Recipes, Menus, Kids, and Add.

### Findings

- [ ] **[P2] Move** the two-column action-card layout down to the actual 412px phone target.
- [ ] **[P2] Add** a visible search action so the field does not depend on keyboard knowledge.
- [ ] **[P2] Verify** translated nav labels at 360px and 200% zoom without overlap or truncation.
- [ ] **[P2] Clarify** active navigation using shape/weight as well as color at both mobile and desktop sizes.
- [ ] **[P2] Verify** bottom-nav safe-area padding on installed Android and iOS-style browser environments.

### Strengths

- Task-first information architecture.
- Search on the first screen.
- Kids is directly reachable from every screen.
- Settings stays out of the frequent-use navigation.
- Mobile navigation targets meet the intended 44px minimum by design.

---

## 4.3 Browse and search recipes

### Intended journey

Recipes → category → sort/filter/select → recipe, or search → result → recipe.

### Findings

- [ ] **[P2] Keep** a search field on the results screen so users can revise a failed or empty query.
- [ ] **[P2] Add** visible retry controls for query failures.
- [ ] **[P2] Explain** cross-category selection the first time Select mode is opened.
- [ ] **[P2] Announce** selected count and sorting completion to assistive technology.
- [ ] **[P2] Stress-test** empty categories, 100+ recipes, long Hebrew titles, missing transliterations, and missing photos.
- [ ] **[P2] Preserve** sort and selection state when navigating into a recipe and returning.

### Strengths

- Honest zero counts rather than ambiguous dashes.
- Purposeful empty-category call to action.
- Category chips preserve quick movement between categories.
- Search includes ingredient names and Hebrew titles.
- Cards separate navigation from edit actions without invalid nested controls.

---

## 4.4 Recipe viewing and cooking

### Intended journey

Recipe → read story/timing → scale portions → tick ingredients → follow method → add to menu or print.

### Findings

- [ ] **[P2] Increase** small metadata used during cooking so it remains readable at arm’s length.
- [ ] **[P2] Preserve** ingredient ticks by recipe and portion selection without confusing old completion state for a new cooking session.
- [ ] **[P2] Add** a clear “Start cooking” or “Clear checked ingredients” entry when stored ticks already exist.
- [ ] **[P2] Verify** mixed Hebrew/Latin lines, long ingredient notes, and large scaling values without table collision.
- [ ] **[P2] Verify** that the two-column desktop layout retains a sensible reading order for keyboard and screen-reader users.
- [ ] **[P2] Distinguish** Print from Download PDF with labels that describe the actual result.

### Strengths

- Yield-only recipes correctly avoid portion scaling.
- Range scaling and whole-piece rounding are purpose-built.
- Checkable ingredients support real cooking.
- Keep Awake is absent when unsupported rather than presenting a dead control.
- Print has an escape route for installed-app contexts.

---

## 4.5 Manual recipe creation and editing

### Intended journey

Add → Type it → complete metadata, ingredients, steps, descriptions, and photo → Save → recipe.

### Findings

- [ ] **[P1] Persist** an unsaved local draft so crashes and session expiry are recoverable.
- [ ] **[P2] Strengthen** field focus treatments with a non-color cue; current border/background changes remain visible but rely primarily on color.
- [ ] **[Accepted] Preserve** the return-to-origin-category behavior after reclassification because it supports batch tidying. Revisit only with user evidence; the compromise is to open the recipe with a “Back to previous category” link.
- [ ] **[P1] Make** recipe saves transactional.
- [ ] **[P2] Add** explicit post-save alternatives such as Create another and Back to category.
- [ ] **[P2] Verify** sticky actions remain visible above mobile keyboards and browser toolbars.
- [ ] **[P2] Verify** touch reordering on the physical target device; keep the arrow controls as the guaranteed method.
- [ ] **[P2] Make** generic save/delete fallback errors translatable.

### Strengths

- Explicit Save rather than surprising autosave.
- Dirty-state warning and discard confirmation.
- Validation takes users directly to the blocking field.
- Photo uploading blocks Save and communicates progress.
- Ingredient sections and keyboard reordering are supported.
- Destructive deletion is confirmed and initially undoable.

---

## 4.6 Recipe deletion and history

### Intended journey

Edit recipe → Delete → confirm → category with Undo; earlier versions can be inspected and restored.

### Findings

- [ ] **[P1] Add** a durable Trash list because ten seconds is insufficient as the only recovery window.
- [ ] **[P1] Include** deleted recipes in an admin/member recovery model without returning them to ordinary search.
- [ ] **[P2] Clarify** the difference between restoring a revision and restoring a deleted recipe.
- [ ] **[P2] Add** focus management and Escape behavior to the history sheet.
- [ ] **[P2] Show** who edited a revision and what changed before asking for restoration.

---

## 4.7 Import and batch creation

### Intended journey

Add → Paste/import → copy prompt to an AI tool or select JSON → paste/inspect → choose duplicate behavior and attribution → Import → inspect results or Undo.

### Findings

- [ ] **[P2] Reveal** duplicate and attribution controls only after valid recipes are available.
- [ ] **[P2] Localize** every result count and status badge.
- [ ] **[P2] Clarify** batch Undo when replacements and additions occur together.
- [ ] **[P2] Add** clipboard failure feedback and keep the prompt easily selectable as a fallback.
- [ ] **[P2] Preserve** the parsed draft when navigating away to correct source material.
- [ ] **[P2] Summarize** validation problems by recipe while keeping valid rows importable.
- [ ] **[P2] Add** a final Go to Recipes action for multi-recipe imports.

### Strengths

- Nothing writes before explicit Import.
- The input is tolerant while unknown schema versions are refused.
- Duplicate behavior defaults to the safest option.
- Titles and categories can be corrected before commit.
- Individual failures do not discard the rest of the batch.
- A single imported recipe has a direct completion action.

---

## 4.8 Menu discovery and planning

### Intended journey

Menus/Home/category/recipe → New menu → choose date and meal time → add and arrange dishes → preview → Save → finished card.

### Findings

- [ ] **[P2] Re-resolve** the occasion when the date changes; meal-time toggles already recalculate correctly from the resolved day/evening pair.
- [ ] **[P1] Preserve** origin context when menu building starts from a recipe or selection basket.
- [ ] **[P1] Define** the missing preview heading typography token.
- [ ] **[P1] Make** menu saves transactional.
- [ ] **[P1] Replace** picker sheets with an accessible shared dialog/sheet primitive.
- [ ] **[P2] Explain** the Keep model and automatic cleanup behavior.
- [ ] **[P2] Group** completed-menu actions by intent.
- [ ] **[P2] Add** menu archival or deletion with Undo.
- [ ] **[P2] Localize** list metadata and default title fallbacks.
- [ ] **[P2] Add** clear success feedback when Keep state changes.
- [ ] **[P2] Test** empty titles, one dish, many dishes, hidden courses with held dishes, long notes, and mixed-language fallbacks.

### Strengths

- Multiple useful entry points feed one builder.
- Live preview exposes automatic naming rather than hiding it until Save.
- Empty courses do not print.
- Removing dishes and hiding populated courses are guarded.
- Per-dish notes survive editing.
- Menu snapshots preserve archival fidelity.

---

## 4.9 Menu sharing and guest experience

### Intended journey

Finished menu → Share link → system share/clipboard → guest opens read-only card → guest prints; owner can revoke.

### Findings

- [ ] **[P2] Add** an accessible label to the shared-link field.
- [ ] **[P2] Add** a clear copy fallback when Clipboard and Web Share are unavailable or denied.
- [ ] **[P2] State** visibly that the guest view is read-only and limited to this menu.
- [ ] **[P2] Provide** a polite, branded expired/revoked-link state with no path into private content.
- [ ] **[P2] Verify** guest printing at phone width and from an installed app.

### Strengths

- The URL secret is removed from the visible address after use.
- Guests receive a constrained menu snapshot rather than recipe internals.
- Revocation is confirmed and immediate.
- Print routes are available without exposing authenticated cookbook routes.

---

## 4.10 Kids weekly planner

### Intended journey

Kids → choose week/days → pick recipes into tray → place dishes or fill week → assign chefs → move/swap/remove → print fridge sheet.

### Findings

- [ ] **[P2] Add** a Current week shortcut.
- [ ] **[P2] Add** concise first-use guidance for tray, active days, and Fill Week.
- [ ] **[P1] Apply** shared dialog focus management to every dish, move, and tray sheet.
- [ ] **[P2] Announce** tray additions, removals, and completed mutations.
- [ ] **[P2] Verify** every control remains at least 44 × 44px with long translations.
- [ ] **[P2] Verify** dense meal slots, multiple dishes, free text, long chef names, and error strips while scrolled near the end of the week.
- [ ] **[P2] Print** the maximum-content sheet on physical A4 paper.

### Strengths

- Move is a two-tap picker rather than unreliable phone dragging.
- Multiple dishes and free-text meals support real household planning.
- Busy feedback stays fixed near the visible phone navigation.
- Destructive removals and Clear Week are guarded.
- Week calculations use the family timezone rather than the server clock.

---

## 4.11 Settings, people, backup, and restore

### Intended journey

Home → Settings → update preferences; admins manage family access, download backups, and restore a cookbook.

### Findings

- [ ] **[P2] Add** explicit saved feedback for display-name edits.
- [ ] **[P2] Clarify** which preferences are personal and which affect the family.
- [ ] **[P2] Keep** backup age status visually prominent without competing with daily tasks.
- [ ] **[P2] Add** last-success details after JSON and photo downloads.
- [ ] **[P2] Explain** restore scope before file selection and repeat the overwrite count at confirmation.
- [ ] **[P1] Make** replacement restore transactional.
- [ ] **[P2] Add** accessible focus management to people-management disclosures and destructive confirmations.

### Strengths

- Administrative functions are kept away from frequent-use navigation.
- Backup status communicates stale or never-created backups.
- Restore is separated from ordinary additive import.
- Non-admin access is refused server-side rather than merely hidden.
- People with no login can still receive recipe credit.

---

## 5. Complete UI review checklist

## 5.1 Design system

- [ ] Define and document every typography token.
- [ ] Verify Hebrew and Latin font fallback in screen and print routes.
- [ ] Verify both green and burgundy themes.
- [ ] Verify foreground/background contrast for text, controls, focus, errors, and disabled states.
- [ ] Standardize field, button, card, sheet, toast, error, empty, and skeleton patterns.
- [ ] Remove isolated hardcoded sizes and colors where a design token exists.
- [ ] Reserve decorative muted colors for decoration rather than small text.
- [ ] Verify icons have consistent optical size and stroke weight.

## 5.2 Responsive layouts

- [ ] 360 × 800 phone.
- [ ] 384 × 854 large-font phone case.
- [ ] 412 × 915 primary phone.
- [ ] 480 × 1000 large phone.
- [ ] 768px tablet transition.
- [ ] 1024 × 800 sidebar transition.
- [ ] 1280 × 800 desktop.
- [ ] 1440px wide desktop.
- [ ] No page-level horizontal scrolling.
- [ ] Fixed navigation never covers the final action or error.
- [ ] Sticky headers do not collide with mobile browser chrome or keyboards.
- [ ] Fixed-width print artifacts remain usable on narrow screens.

## 5.3 Interaction states

Every control type should be checked in:

- [ ] Default.
- [ ] Hover where hover is supported.
- [ ] Keyboard focus.
- [ ] Pressed/active.
- [ ] Selected/current.
- [ ] Disabled.
- [ ] Loading/busy.
- [ ] Success/done.
- [ ] Error/refused.
- [ ] Reduced-motion mode.

## 5.4 Content stress cases

- [ ] Empty data.
- [ ] One item.
- [ ] Large lists.
- [ ] Long Hebrew titles.
- [ ] Long English titles.
- [ ] Mixed Hebrew, numbers, and Latin words.
- [ ] Missing optional translations.
- [ ] Missing photos.
- [ ] Long family names and aliases.
- [ ] Long ingredient notes and step headings.
- [ ] Long menu titles and per-dish notes.
- [ ] Multiple kids dishes in every slot.
- [ ] Large import batches with mixed outcomes.

---

## 6. Accessibility review

### Keyboard and focus

- [ ] Strengthen field focus across all modules with a non-color cue in addition to the existing border/background changes.
- [ ] Ensure every interactive element is reachable in logical order.
- [ ] Ensure dialog focus moves inside, remains inside, and returns to its trigger.
- [ ] Ensure Escape closes only the topmost sheet or confirmation.
- [ ] Ensure course, ingredient, and step ordering works without a pointer.
- [ ] Ensure sticky and fixed elements do not obscure focused controls.

### Semantics and announcements

- [ ] Preserve one logical page heading per route.
- [ ] Label every navigation region, field, shared URL, and icon-only control.
- [ ] Use `aria-current` for current routes and categories.
- [ ] Announce asynchronous errors, completion, filtered counts, and selection changes.
- [ ] Keep decorative art out of the accessibility tree.
- [ ] Verify tables retain correct captions and header associations.

### Visual accessibility

- [ ] Verify WCAG AA contrast in both themes and kids colors.
- [ ] Verify the UI at 200% browser zoom.
- [ ] Verify large system text at 384 × 854.
- [ ] Verify all phone controls are at least 44 × 44px.
- [ ] Verify information is not conveyed by color alone.
- [ ] Verify reduced motion still dismisses the splash and communicates loading.

---

## 7. Recommended remediation roadmap

### Phase 1 — Journey blockers

1. Add OTP-code sign-in and correct authentication instructions.
2. Complete localization for login, import results, menu lists, and fallback errors.
3. Add Recipe Trash and durable restoration.
4. Preserve return context when menu building starts from a recipe, selection, or import. Keep the deliberate return-to-origin-category behavior for recipe reclassification.

### Phase 2 — Accessibility and design integrity

1. Define missing typography tokens.
2. Introduce one shared Dialog/Sheet component.
3. Strengthen the existing color-only focus replacements with a consistent non-color `:focus-visible` cue.
4. Increase essential small text.
5. Add live announcements for dynamic interactions.

### Phase 3 — Resilience

1. Make recipe, menu, and restore saves transactional.
2. Add recoverable local recipe drafts.
3. Self-host fonts.
4. Standardize retryable server-error states.
5. Add Clipboard/Web Share fallbacks.

### Phase 4 — Workflow polish

1. Refine homepage responsive cards and search affordances.
2. Re-resolve menu occasions when the selected date changes.
3. Clarify the menu Keep/archive model and add menu deletion.
4. Simplify Import through progressive disclosure.
5. Add kids first-use guidance and Current week.
6. Improve settings save feedback.

### Phase 5 — Visual and device verification

1. Capture every major screen at 412px and 1280px.
2. Run long-content, RTL, 200% zoom, and large-text cases.
3. Test touch reordering on the target Samsung device.
4. Print recipe, menu, and maximum-density kids sheets on physical A4.
5. Record screenshots and final pass/fail evidence beside each resolved finding.

---

## 8. Definition of done

The UX and UI review can be marked complete when:

- [ ] Every P1 finding is resolved or explicitly accepted with a documented reason.
- [ ] Every supported journey has a clear entry, progress state, completion state, cancellation path, and recovery path.
- [ ] Hebrew mode contains no unintended English interface strings.
- [ ] All modal sheets pass keyboard, Escape, focus-return, and screen-reader checks.
- [ ] All target widths pass without horizontal page scrolling or covered controls.
- [ ] Every list has purposeful loading, empty, error, and populated states.
- [ ] Recipe deletion is recoverable beyond the toast window.
- [ ] Menu previews always match the selected date and meal time before save.
- [ ] Builds do not depend on live font-service availability.
- [ ] Recipe, menu, and restore saves are atomic.
- [ ] Phone, desktop, 200% zoom, reduced motion, physical touch, and printed-output evidence is recorded.

---

## 9. Final assessment

Aviente already behaves more like a carefully made family tool than a generic recipe database. Its strongest qualities are the task-first home screen, cooking-specific recipe behavior, archival menu snapshots, guarded destructive actions, guest privacy, and deliberate backup/restore path.

The next quality step is cohesion. Users should be able to enter from any route, complete or abandon a task, and always understand where they are, what changed, and how to recover. Fixing authentication reliability, return context, durable deletion recovery, modal accessibility, localization, typography tokens, and menu-preview freshness will make the existing feature set feel complete rather than merely extensive.
