'use client';

import { Fragment, useState } from 'react';
import type { Ingredient } from '@/lib/constants';
import { scaleAmount, scaleFactor, servingOptions } from '@/lib/scale';
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
  const options = servingOptions(servings);
  const [target, setTarget] = useState(servings ?? 0);
  const factor = scaleFactor(target, servings);
  const scaled = factor !== 1;

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.h2}>Ingredients</h2>

        {/* No portion count means nothing to scale against, so the control is
            absent rather than present-and-inert. */}
        {options.length > 1 ? (
          <label className={styles.scale}>
            <span className={styles.scaleLabel}>pour</span>
            <select
              className={styles.select}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Scale for how many people"
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
        <caption className="visually-hidden">Ingredients</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.thAmount}>Amount</th>
            <th scope="col" className={styles.thName}>Ingredient</th>
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
                  {/* dir="ltr" on the amount only.
                      Amounts are Latin: digits, then a unit like "cup" or "tbsp". In
                      an RTL page the bidi algorithm reorders that run and "0.5 cup"
                      came out as "cup 0.5". The cell still sits on the leading edge —
                      dir here governs the text inside it, not where the column goes. */}
                  <td className={styles.amount} dir="ltr">
                    {amount ? amount.text : '—'}
                    {amount?.approximate && (
                      <span className={styles.approx} title="rounded up">≈</span>
                    )}
                  </td>
                  <td className={styles.name} lang="he">
                    {ing.name}
                    {ing.note && <em className={styles.note} lang="he">{ing.note}</em>}
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
          Amounts scaled for {target}. The written steps still quote the original
          quantities.
        </p>
      )}
    </section>
  );
}
