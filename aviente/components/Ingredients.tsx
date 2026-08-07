'use client';

import { useState } from 'react';
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
        <h2 className={styles.h2}>Ingrédients</h2>

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

      <ul className={styles.list}>
        {ingredients.map((ing, i) => {
          const amount = scaleAmount(ing, factor);
          /* A heading appears when the group CHANGES, so consecutive rows sharing
             a label sit under one heading rather than repeating it per row. */
          const newGroup = ing.group_label && ing.group_label !== ingredients[i - 1]?.group_label;
          return (
            <li key={ing.id} className={styles.row}
                data-group={newGroup ? ing.group_label : undefined}>
              {newGroup && (
                <span className={styles.groupHead} lang="he">{ing.group_label}</span>
              )}
              <span className={styles.name} lang="he">
                {ing.name}
                {ing.note && <em className={styles.note} lang="he">{ing.note}</em>}
              </span>
              <span className={styles.dots} aria-hidden="true" />
              <span className={styles.amount}>
                {amount ? amount.text : '—'}
                {amount?.approximate && <span className={styles.approx} title="rounded up">≈</span>}
              </span>
            </li>
          );
        })}
      </ul>

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
