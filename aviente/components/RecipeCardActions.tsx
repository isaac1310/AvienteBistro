'use client';

import Link from 'next/link';
import Icon from './Icon';
import { useT } from './LangProvider';
import styles from './RecipeCardActions.module.css';

/**
 * Edit, on the card itself.
 *
 * DELETE USED TO LIVE HERE, and it was one tap with no dialog. The reasoning was
 * that the delete is soft, the redirect carries `?undo=<id>`, and the ten-second
 * UndoToast puts the recipe back — so a confirm on top of a working undo would only
 * train people to dismiss confirms.
 *
 * That argument holds everywhere except the place it was used. The ✕ sat inside the
 * card's own tap surface, on a list you scroll through with a thumb, at phone width,
 * in a kitchen — and the undo is only a net if you happen to be looking at the
 * screen when the toast appears. The recipe's own edit form already has a delete,
 * now behind a written confirm, and reaching it takes one extra tap on the pencil
 * that is still right here.
 *
 * So: one delete, in one place, guarded. The edit form's own delete does the same
 * two things this did — soft-delete, then land on the category page with `?undo=`
 * so the toast still appears — which left `deleteAndGoBack` in lib/mutations.ts
 * with no caller, and it is gone rather than kept "in case".
 *
 * The button is a sibling of the card's link, not a child of it — see RecipeCard —
 * and still stops propagation, because the card may later gain a click handler and
 * that is the sort of failure found by a lost recipe rather than by a test.
 */
export default function RecipeCardActions({
  id, category, title,
}: {
  id: string; category: string; title: string;
}) {
  const t = useT();

  return (
    <div className={styles.actions}>
      <Link
        href={`/recipes/${category}/${id}/edit`}
        className={styles.action}
        aria-label={t('card.edit', { title })}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="add_recipe" size={18} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
