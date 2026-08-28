'use client';

import { Fragment, useState } from 'react';
import type { Ingredient } from '@/lib/constants';
import { scaleAmount, scaleFactor, servingOptions } from '@/lib/scale';
import { useT } from './LangProvider';
import styles from './Ingredients.module.css';

/* The ingredient list with its scale control (§3.3, §5.2).
 *
 * Client-side because scaling is instant and local — a round trip to re-render a
 * list of eight rows would be absurd. */
export default function Ingredients({
  ingredients, servings, yieldText,
}: {
  ingredients: Ingredient[];
  servings: number | null;
  yieldText: string | null;
}) {
  const t = useT();
  const options = servingOptions(servings);
  const [target, setTarget] = useState(servings ?? 0);
  const factor = scaleFactor(target, servings);
  const scaled = factor !== 1;

  return (
    <section className={styles.wrap}>
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
          <span className={styles.yield} lang="he">{yieldText}</span>
        ) : null}
      </div>

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
                    <th scope="colgroup" colSpan={2} className={styles.groupHead} lang="he">
                      {ing.group_label}
                    </th>
                  </tr>
                )}
                <tr className={styles.row}>
                  {/* Amounts are usually Latin — digits then a unit like "cup" — and
                      in an RTL page bidi reordered that run into "cup 0.5". This was a
                      hardcoded dir="ltr", which fixed the Latin case and broke the
                      Hebrew one; "auto" lets each amount answer for itself. The cell
                      still sits on the leading edge: dir governs the text inside it,
                      not where the column goes. */}
                  <td className={styles.amount} dir="auto">
                    {amount ? amount.text : '—'}
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
