'use client';

import { Fragment, useEffect, useState } from 'react';
import type { Ingredient } from '@/lib/constants';
import { scaleAmount, scaleFactor, servingOptions } from '@/lib/scale';
import { useT } from './LangProvider';
import styles from './Ingredients.module.css';

/* The ingredient list with its scale control (§3.3, §5.2).
 *
 * Client-side because scaling is instant and local — a round trip to re-render a
 * list of eight rows would be absurd. */
/** Forget the ticks for one recipe — cooking mode calls this on exit. */
export function clearTicks(recipeId: string) {
  try { localStorage.removeItem(`aviente.checked.${recipeId}`); } catch { /* private window */ }
}

export default function Ingredients({
  ingredients, servings, yieldText, className, recipeId, ticks = false,
}: {
  ingredients: Ingredient[];
  servings: number | null;
  yieldText: string | null;
  /** Namespaces the check-off memory. Omit it and ticking works but is not kept. */
  recipeId?: string;
  /* The check-off column. OFF on the reading page and ON in cooking mode — the
     list used to carry ticks everywhere, which made the recipe page look like a
     form and left half-ticked lists lying around between cooks. */
  ticks?: boolean;
  /* The recipe page's grid column. CSS Modules scope class names per file, so the
     page cannot target this component's own root class — it has to hand one in. */
  className?: string;
}) {
  const t = useT();
  const options = servingOptions(servings);
  const [target, setTarget] = useState(servings ?? 0);

  /**
   * Which ingredients have been used, by ingredient id.
   *
   * Cooking is the one thing this screen is for, and following a list of fourteen
   * ingredients with wet hands means keeping your place in it. Kept per recipe in
   * localStorage because a phone locks its own screen mid-cook and a list that
   * forgets everything on reload is worse than no list; wrapped in try/catch because
   * a private window throws on the accessor itself.
   */
  const [done, setDone] = useState<Set<string>>(new Set());
  const storeKey = `aviente.checked.${recipeId ?? ''}`;

  useEffect(() => {
    if (!recipeId || !ticks) return;
    try {
      const raw = localStorage.getItem(storeKey);
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         localStorage cannot be read during render (it does not exist on the server,
         and reading it would make the server and client disagree about which rows are
         ticked — a hydration mismatch). Reading it in an effect and setting state is
         the supported shape for restoring per-device state; the rule's concern is the
         extra render, which here is one paint on mount. */
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch { /* private window, or storage disabled — the list just starts clean */ }
  }, [storeKey, recipeId, ticks]);

  const toggle = (id: string) => {
    if (!ticks) return;
    const next = new Set(done);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDone(next);
    if (!recipeId) return;
    try { localStorage.setItem(storeKey, JSON.stringify([...next])); } catch { /* as above */ }
  };

  const clearDone = () => {
    setDone(new Set());
    if (!recipeId) return;
    try { localStorage.removeItem(storeKey); } catch { /* as above */ }
  };
  const factor = scaleFactor(target, servings);
  const scaled = factor !== 1;

  return (
    <section className={className ? `${styles.wrap} ${className}` : styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.h2}>{t('recipe.ingredients')}</h2>

        {/* No portion count means nothing to scale against, so the control is
            absent rather than present-and-inert. */}
        {options.length > 1 ? (
          <label className={styles.scale}>
            <span className={styles.scaleLabel}>{t('recipe.for')}</span>
            <select
              className={styles.select}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label={t('recipe.scaleLabel')}
            >
              {options.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : yieldText ? (
          <span className={styles.yield} lang="he" dir="auto">{yieldText}</span>
        ) : null}
      </div>

      {/* Only once something is ticked: an always-present "clear" on a list nobody
          has touched is a control that explains a feature instead of doing a job. */}
      {ticks && done.size > 0 && (
        <button type="button" className={styles.clearTicks} onClick={clearDone}>
          {t('recipe.clearUsed', { n: done.size })}
        </button>
      )}

      {/* A table, not a list of dotted leaders.
          The source book writes ingredients as a three-column table — quantity,
          ingredient, note — and that is the right shape: the eye reads down the
          quantity column while cooking. The leader-dot list put the amount at the far
          right of a line whose length depended on the name, so nothing lined up, and a
          long note pushed the amount onto its own row.
          <table> rather than a grid of divs because it IS tabular data: a screen
          reader announces "500 g, flour" as one row, and column headers exist. */}
      <table className={styles.table}>
        <caption className="visually-hidden">{t('recipe.ingredients')}</caption>
        <thead>
          <tr>
            {ticks && (
              <th scope="col" className={styles.thTick}><span className="visually-hidden">{t('recipe.usedCol')}</span></th>
            )}
            <th scope="col" className={styles.thAmount}>{t('recipe.amount')}</th>
            <th scope="col" className={styles.thName}>{t('recipe.ingredient')}</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, i) => {
            const amount = scaleAmount(ing, factor);
            /* A heading appears when the group CHANGES, so consecutive rows sharing
               a label sit under one heading rather than repeating it per row. */
            const newGroup = ing.group_label
              && ing.group_label !== ingredients[i - 1]?.group_label;
            return (
              <Fragment key={ing.id}>
                {newGroup && (
                  <tr className={styles.groupRow}>
                    {/* Spans both columns: a group name is a heading over the table,
                        not a value in either column. */}
                    <th scope="colgroup" colSpan={ticks ? 3 : 2} className={styles.groupHead} lang="he" dir="auto">
                      {ing.group_label}
                    </th>
                  </tr>
                )}
                <tr
                  className={`${styles.row} ${ticks ? styles.rowTickable : ''} ${done.has(ing.id) ? styles.rowDone : ''}`}
                  /* The ROW is the target, not just the box: a 20px checkbox is not
                     something to hit with wet hands, and this list is read at arm's
                     length. aria-hidden is deliberately absent — the checkbox below
                     carries the state for a screen reader. */
                  onClick={ticks ? () => toggle(ing.id) : undefined}
                >
                  {ticks && (
                    <td className={styles.tickCell}>
                      <input
                        type="checkbox" className={styles.tick}
                        checked={done.has(ing.id)}
                        onChange={() => toggle(ing.id)}
                        /* The click already bubbles from the row; without this the two
                           handlers would fire in sequence and cancel each other out. */
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t('recipe.used', { name: ing.name })}
                      />
                    </td>
                  )}
                  {/* Amounts are usually Latin — digits then a unit like "cup" — and
                      in an RTL page bidi reordered that run into "cup 0.5". This was a
                      hardcoded dir="ltr", which fixed the Latin case and broke the
                      Hebrew one; "auto" lets each amount answer for itself. The cell
                      still sits on the leading edge: dir governs the text inside it,
                      not where the column goes. */}
                  <td className={styles.amount} dir="auto">
                    {/* Nothing, not an em dash. A dash in an amount column is a
                        visual snag carrying no information — "some" is what an
                        ingredient with no quantity means, and the blank says it. */}
                    {amount ? amount.text : ''}
                    {amount?.approximate && (
                      <span className={styles.approx} title="rounded up">≈</span>
                    )}
                  </td>
                  {/* dir="auto" on both: lang="he" chooses the font and does nothing
                      for bidi, so an ingredient starting with a number or a Latin word
                      resolved against the wrong base direction — the same defect that
                      stranded full stops in the method, and it printed that way too. */}
                  <td className={styles.name} lang="he" dir="auto">
                    {ing.name}
                    {ing.note && <em className={styles.note} lang="he" dir="auto">{ing.note}</em>}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Step text is literal and does not scale, so say so rather than let
          someone follow "add the 200g of flour" at double quantity. */}
      {scaled && (
        <p className={styles.warn}>
          {t('recipe.scaled', { n: target })}
        </p>
      )}
    </section>
  );
}
