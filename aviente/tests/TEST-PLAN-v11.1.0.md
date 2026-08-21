# Manual pass — v11.1.0

Five minutes on the Ultra. **Check the footer says `v11.1.0 · schema 19` before you
start** — a pass performed against a cached build is worse than no pass, because it
produces a confident wrong answer.

Scoped to judgement only: does it *look* and *feel* right. Anything a machine can
assert is already asserted in `public/selftest.js` or `tools/db-check.mjs`.

⚠️ marks what is new or was previously broken.

---

## 1 · Ingredient parts ⚠️

Machine-verified since this file was first written: the drafting field appears empty
and focused, blur-empty returns to the offer, and a real HTML drag moved a row across a
part boundary (11+1 → 10+2 rows) and onto a heading (10+2 → 9+3) with the part count
staying at two — i.e. no split heading. Left unsaved; the recipe was read back from the
database unchanged. What remains here is TOUCH, which no desktop browser can answer.

Open any recipe → **Edit**.

1. Press **＋ מתן שם לקבוצה** (name this part), type a name, then press **↓** on an
   ingredient in the part above until it crosses in.
   **Expect:** the field arrived empty with the cursor in it — ⚠️ it used to write the
   word **לקציצות** into the recipe on the button press — and the ingredient JOINS the
   part it lands in. ⚠️ It used to keep its old label, which both failed to join and
   split the heading in two.
   ☐ pass ☐ fail

2. ⚠️ **THE ONE THING NO DESKTOP CAN ANSWER.** Press and hold an ingredient's ↑↓ handle
   and try to drag the row into another part.
   **Expect:** honestly, unknown. Native HTML drag does not fire on touch, so this may
   simply not lift — that is a known limit, not a bug, and the ↑↓ buttons do the same
   job. **Please say which happened**, because it decides whether v11.2 needs
   pointer-event emulation.
   ☐ lifts and drops ☐ nothing happens ☐ lifts but drops in the wrong place

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
