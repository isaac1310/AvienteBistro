# Manual pass — v11.1.0

Five minutes on the Ultra. **Check the footer says `v11.1.0 · schema 19` before you
start** — a pass performed against a cached build is worse than no pass, because it
produces a confident wrong answer.

Scoped to judgement only: does it *look* and *feel* right. Anything a machine can
assert is already asserted in `public/selftest.js` or `tools/db-check.mjs`.

⚠️ marks what is new or was previously broken.

---

## 1 · Ingredient parts ⚠️ — the two items I could not verify myself

The reorder logic is proven by an extracted test (nine cases, including a negative
control showing the old behaviour splitting a heading). What is NOT machine-verified is
the interface around it: the Chrome tab available during the build would not hydrate,
and the in-app browser has no session. These two steps are the gap.

Open any recipe → **Edit**.

1. Press **＋ מתן שם לקבוצה** (name this part).
   **Expect:** a heading field appears, **empty**, with the cursor already in it and
   the placeholder "לדוגמה: לרוטב" showing. ⚠️ It used to write the word **לקציצות**
   into the recipe the moment you pressed the button.
   ☐ pass ☐ fail

2. Type nothing and tap elsewhere.
   **Expect:** the field disappears and the offer button comes back. Nothing was saved.
   ☐ pass ☐ fail

3. Type a part name, then press **↓** on an ingredient in the part ABOVE it until it
   crosses into your new part.
   **Expect:** the ingredient joins that part. ⚠️ It used to keep its old label, which
   both failed to join AND split the heading in two with a foreign row wedged between.
   ☐ pass ☐ fail

4. ⚠️ **Drag** an ingredient by its ↑↓ handle onto a row in another part.
   **Expect:** it lands there and belongs to that part. Native drag does not fire on
   touch — if nothing lifts on the phone, that is the known limit, not a bug: the ↑↓
   buttons are the guaranteed path. **Say which happened.**
   ☐ works on touch ☐ mouse only ☐ fail

5. ⚠️ Drag an ingredient onto a part's **heading**.
   **Expect:** it goes to the end of that part.
   ☐ pass ☐ fail

## 2 · Photographs ⚠️

6. Edit a recipe that has a photo, attach a different one, then press **Cancel**.
   **Expect:** the recipe still shows its ORIGINAL photo. ⚠️ The old photo used to be
   deleted the moment the new one uploaded, so cancelling left the recipe pointing at
   a file that no longer existed.
   ☐ pass ☐ fail

7. Open a recipe with no photograph.
   **Expect:** the drawing and the category name — and **no** "PL. IV — PLATS · NO
   PHOTO YET" line. ⚠️
   ☐ pass ☐ fail

## 3 · Getting around ⚠️

8. Open a category. **Expect:** a row of category chips you can scroll sideways, the
   current one marked, reading right-to-left. Tap one — you arrive, and any sort you
   had chosen is still chosen.
   ☐ pass ☐ fail

9. Edit a recipe, change its **category**, save.
   **Expect:** you land back in the category you STARTED in, not the new one. ⚠️
   ☐ pass ☐ fail

## 4 · Waiting ⚠️

10. Upload a photo. **Expect:** the small baguette appears over the preview, then a
    brief ✓. ⚠️ Read the wording: it must say the PHOTOGRAPH uploaded, not that the
    recipe saved — the recipe is not saved until you press Save.
    ☐ pass ☐ fail

11. Open the kids planner and add a dish. **Expect:** a loader while it works. ⚠️ The
    planner used to go silently inert.
    ☐ pass ☐ fail

## 5 · Sharing a recipe ⚠️

12. Open a recipe → **share** → copy the link. Open it in a **private window** (no
    login).
    **Expect:** the whole recipe — ingredients, steps, notes, photograph. No edit
    buttons, no way into the rest of the book.
    ☐ pass ☐ fail

13. Back in the app, **revoke** the link, then reload the private window.
    **Expect:** the recipe is gone, politely.
    ☐ pass ☐ fail

## 6 · Print

14. Open a recipe's print sheet from the installed app (home-screen icon, no browser
    chrome). **Expect:** a way back. ⚠️ It used to be a dead end with no browser Back.
    ☐ pass ☐ fail

15. Print the kids fridge sheet **on paper**, with a week that has two dishes in one
    meal. **Expect:** both dishes fit the cell. ⚠️ Still never done — the cell caps at
    four and prints "+2", and whether that survives A4 is unverified.
    ☐ pass ☐ fail

---

**Found something?** Note the step number and what you saw instead. A failure here is
worth more than a green run — every ⚠️ above is something that shipped broken once.
