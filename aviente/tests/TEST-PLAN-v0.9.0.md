# v0.9.0 — manual test plan

About eight minutes, **on the Ultra**, not a desktop browser. Everything a machine
can assert already runs at `?selftest=1`; this plan is only for judgement — does
it look right, does it feel right, would Moran know what to do.

**Before you start:** the footer of the homepage must read `Aviente v0.9.0`. If it
says anything else you are on a cached copy — reload with a junk parameter, e.g.
`?x=1`. Testing the wrong build produces confident wrong answers.

Mark each ✅ / ❌ and send me the ❌s with what you saw.

---

## 1 · Opening it cold ⚠️ first impression

Close the tab entirely, then open the app fresh.

1. **Expect:** the green cover fills the screen for about a second and a half —
   *La Famille · Aviente · Est. 2018 · Livre de Recettes de Famille* — then fades.
2. It should not feel like a delay. If you find yourself waiting, say so.
3. Tap the screen while it is up. **Expect:** it leaves immediately, and your tap
   does **not** land on whatever was underneath.

## 2 · The homepage ⚠️ new in this build

1. Behind the title panel there should be a faint field of **kitchen utensils in
   gold** — rolling pin, whisk, jar, teapot — fading out behind the wordmark.
2. **Expect:** texture you notice second, not decoration you notice first. If it
   competes with "Aviente", it is too strong; tell me.
3. Category counts should be real. Empty ones read *rien encore*, not `0`.
4. The Kids' Table card is the pink/blue odd one out. Tap it → **the planner**,
   not a list of recipes.

## 3 · A recipe, the way you would actually use one

Recipes → Boulangerie → **חלוז צ'רקסי עם גבינה**.

1. Timing strip reads `PRÉPARATION 40 min · CUISSON 25 min · 6 PERSONNES`.
2. Ingredients have dotted leaders, amounts on the right, and small italic notes
   underneath where they exist (`לפי הצורך`).
3. The frying oil, which has no quantity, shows **—** and not `0`.
4. Change **pour** from 6 to 12. **Expect:** every amount doubles, `500 g` becomes
   `1 kg`, and a note appears saying the written steps still quote the original
   quantities.
5. Now open **תמצית ג'ינג'ר** (Divers). **Expect:** no serving dropdown at all —
   it is measured by what it makes, not by portions.

## 4 · Building this Friday's menu ⚠️ the real test

Menus → ＋ New menu.

1. The date should already be **this Friday**, and a badge should say
   *🕯 Aviente Family Shabbat Dinner*.
2. Change the date to a Thursday. **Expect:** the badge disappears. Change it back.
3. Add a main and a dessert. Save.
4. **Expect:** the card — beige, double frame, corner fleurons, two candles beside
   the title, `PLAT PRINCIPAL` in burgundy small caps, Hebrew dish names
   **centred**, and `— de la cuisine de Savta —` under each.
5. Empty courses must not appear at all.
6. **This is the artifact the whole app exists for.** If anything about it looks
   wrong — proportions, weight of the frame, the candles — say so plainly.

## 5 · Sending it to someone

On that menu, tap **🔗 Share link**.

1. **Expect:** the phone's share sheet, or "Copied".
2. Open the link in a **private/incognito tab** — that is what a guest sees.
3. **Expect:** the card, a *Save as PDF* button, and nothing else. No nav, no way
   into the cookbook.
4. Back in the app, tap **⛔ Stop sharing**, then reload the guest tab.
   **Expect:** "This menu is not available".

## 6 · Printing

1. On the menu, **Export PDF**. **Expect:** a real file downloads, and the card in
   it looks like the card on screen — including the Hebrew.
2. On a recipe, **Export PDF**. ⚠️ new in this build — this route did not exist
   before v0.9.0, so it is the most likely thing to be wrong.

## 7 · The kids' week

Home → Kids' Table.

1. Garden background, white pill banner, five animal bubbles with hard shadows.
2. Tap an animal to switch its day off. **Expect:** dashed outline, and that day's
   meals disappear from the list below.
3. **Expect:** the pickers are empty — there are no kids' recipes yet. That is
   correct, not a bug, but tell me whether the empty state explains itself.

## 8 · Adding something

Add → **Type it out**.

1. Fill in a name and one ingredient, leave everything else, press **Save**.
2. **Expect:** a clear message about needing either servings or what it makes —
   not a database error.
3. Fix it, save, and check the recipe reads correctly.
4. Go back into it, change one word, and press **Cancel**. **Expect:** it asks
   before discarding.

## 9 · The things I could not test

Please try these once each and tell me what happens — I have never seen any of
them work:

1. **A magic link.** Sign out, request one, open the email on the phone.
2. **A photo.** Edit a recipe, take a photo with the camera button, save, reopen.
3. **Both of you at once.** You and Moran open the same recipe, both edit, both
   save. Expect the second save to win silently — I want to know how bad that
   feels in practice before deciding whether menus need revisions too.

---

## What I already know is missing

Do not report these; they are on `REMAINING.md`:

- no ⟲ earlier-versions button (revisions are being written, just not shown)
- no undo toast after deleting
- no theme switch — everyone gets green
- no "N selected → build menu" mode on category browse
