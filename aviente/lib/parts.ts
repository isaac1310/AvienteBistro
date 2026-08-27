/**
 * Ingredient PARTS — the pure logic behind the recipe form's sections.
 *
 * These lived inside `components/RecipeForm.tsx`, where nothing could reach them:
 * the suite is read-only and runs in the browser against `window.Aviente`, so logic
 * trapped in a client component could only ever be tested by clicking. Two bugs have
 * shipped from this file's rules — an edit form that threw on a recipe with no
 * ingredients, and an "add part" button that silently added nothing — so the rules
 * now live somewhere they can be asserted. No React, no state, no I/O.
 *
 * The stored shape is a flat ingredient list with `group_label` on each row, and the
 * recipe page renders a heading whenever the label CHANGES. So a part is, in the
 * database and on the page alike, a CONTIGUOUS RUN. Everything here preserves that.
 */

export type Row = {
  key: string;
  name: string;
  amount: string;
  amountMax: string;
  unit: string;
  note: string;
  group: string;
  /**
   * Editor-only: this row starts a part that is still being created.
   *
   * Never saved, and never sent anywhere — `onSave` maps named fields explicitly.
   * It exists because `group_label = ''` cannot express "separate but not yet named",
   * which is precisely the state a part is in between pressing "add part" and typing
   * its name.
   */
  draft?: boolean;
};

export type Run = { group: string | null; rows: Row[] };

/**
 * Contiguous runs of ingredients that share a part name.
 *
 * `null` means the unnamed run: the ingredients that belong to no part.
 */
export function groupRuns(rows: Row[]): Run[] {
  const runs: Run[] = [];
  for (const r of rows) {
    const g = r.group.trim() === '' ? null : r.group;
    const last = runs[runs.length - 1];
    /* `r.draft` FORCES a run break. Without it "add part" was a no-op you could not
       see: the new row carries group '', blank coerces to null, so it merged straight
       into the trailing unnamed run — one section on screen, not two. Naming that run
       then renamed every row in it, swallowing the ingredient you had already typed
       into the part you thought you were creating. Nothing persists: `draft` is
       dropped the moment the heading is left, so what the editor shows and what the
       recipe page renders cannot drift. */
    if (last && last.group === g && !r.draft) last.rows.push(r);
    else runs.push({ group: g, rows: [r] });
  }
  /* An empty recipe still needs one run to render into, or the form shows no
     ingredient fields at all. A recipe with no ingredients is exactly the state you
     are in when you want to ADD some — the edit form threw here once, because the
     JSX reads `run.rows[0].key` and this fallback run has no rows. `.length` is the
     check, not nullishness. */
  return runs.length ? runs : [{ group: null, rows: [] }];
}

/**
 * Rename every row in a run. Blank clears the heading.
 *
 * `draft` is deliberately left alone: the section must survive being typed empty and
 * retyped, or deleting the last character collapses it out from under the caret. It
 * is released on blur instead.
 */
export function renameRun(rows: Row[], run: { rows: Row[] }, name: string): Row[] {
  const keys = new Set(run.rows.map((r) => r.key));
  return rows.map((r) => (keys.has(r.key) ? { ...r, group: name } : r));
}

/**
 * Release the draft break on a run — it has stopped being CREATED.
 *
 * Called on blur, not on change. Kept forever instead, two parts typed with the same
 * name would stay two boxes in the editor while the recipe page rendered them as one
 * heading.
 */
export function undraftRun(rows: Row[], run: { rows: Row[] }): Row[] {
  const keys = new Set(run.rows.map((r) => r.key));
  return rows.map((r) => (keys.has(r.key) ? { ...r, draft: false } : r));
}

/** A blank row, optionally starting its own draft part. */
export function blankRow(key: string, group = '', draft = false): Row {
  const row: Row = { key, name: '', amount: '', amountMax: '', unit: '', note: '', group };
  return draft ? { ...row, draft: true } : row;
}

/** Append a blank ingredient to the END of a run, inheriting its part name. */
export function addToRun(rows: Row[], run: Run, key: string): Row[] {
  const blank = blankRow(key, run.group ?? '');
  const lastKey = run.rows[run.rows.length - 1]?.key;
  if (!lastKey) return [...rows, blank];
  const at = rows.findIndex((r) => r.key === lastKey);
  /* Inserted after the run's last row rather than at the end of the list, so parts
     stay contiguous — which is the only thing that makes them parts. */
  return [...rows.slice(0, at + 1), blank, ...rows.slice(at + 1)];
}

/** Reorder a list. Out-of-range targets are a no-op, so the ends need no guard. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Move an ingredient, and let it JOIN the part it lands in.
 *
 * Plain `move` splices positions and never touches `group`, and sections are DERIVED
 * from contiguous equal labels — so a row crossing a boundary kept its old label,
 * which did two wrong things at once: it did not join the destination, and it split
 * the destination's heading in two with a foreign row wedged between.
 *
 * The rule: a moved row adopts the label of whichever row it now sits beside.
 * Preferring the row it displaced (`to`) makes dragging INTO a section mean what it
 * looks like. Both the ↑↓ buttons and the drag handle come through here, so the two
 * mechanisms cannot drift apart — one invariant, two ways to reach it.
 */
export function moveIngredient(list: Row[], from: number, to: number): Row[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const reordered = move(list, from, to);
  /* The neighbour that decides the part. Moving DOWN, the row now sits after the one
     it passed, so that one's label is the section it entered; moving UP, the row
     below it. Falling back to the other side covers the ends of the list. */
  const behind = reordered[to - 1]?.group;
  const ahead = reordered[to + 1]?.group;
  const adopt = (to > from ? behind : ahead) ?? behind ?? ahead;
  if (adopt === undefined) return reordered;
  /* A row that JOINS a part cannot also be starting one. */
  return reordered.map((r, i) => (i === to ? { ...r, group: adopt, draft: false } : r));
}

/** Send a row to the END of a named run — what dropping onto a heading means. */
export function moveIngredientToRun(list: Row[], key: string, group: string | null): Row[] {
  const from = list.findIndex((r) => r.key === key);
  if (from < 0) return list;
  const target = list.map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.group.trim() === '' ? null : r.group) === group && r.key !== key);
  if (!target.length) return list;
  const lastOfRun = target[target.length - 1].i;
  const to = from < lastOfRun ? lastOfRun : lastOfRun + 1;
  const reordered = move(list, from, to);
  const landed = reordered.findIndex((r) => r.key === key);
  return reordered.map((r, i) => (i === landed ? { ...r, group: group ?? '', draft: false } : r));
}

/** The run key the editor uses for React keys and for the "being named" set. */
export function runKeyOf(run: Run): string {
  return run.rows[0]?.key ?? 'unnamed';
}
