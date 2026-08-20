'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { deleteAndGoBack } from '@/lib/mutations';
import Icon from './Icon';
import { useT } from './LangProvider';
import styles from './RecipeCardActions.module.css';

/**
 * Edit and delete, on the card itself.
 *
 * Deleting is one tap with no dialog, and that is deliberate rather than careless:
 * the delete is soft, `deleteAndGoBack` redirects with `?undo=<id>`, and the ten-
 * second UndoToast on the category page puts the recipe back. Revisions mean nothing
 * here is truly lost either way. A confirm dialog on top of a working undo trains
 * people to dismiss dialogs.
 *
 * The buttons are siblings of the card's link, not children of it — see RecipeCard.
 * They still stop propagation, because the card may later gain a click handler and
 * this is the failure that would be found by a deleted recipe rather than by a test.
 */
export default function RecipeCardActions({
  id, category, title,
}: {
  id: string; category: string; title: string;
}) {
  const t = useT();
  const sort = useSearchParams().get('sort') ?? undefined;
  const [busy, setBusy] = useState(false);

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

      <button
        type="button"
        className={styles.action}
        disabled={busy}
        aria-label={t('card.delete', { title })}
        onClick={(e) => {
          e.stopPropagation();
          setBusy(true);
          /* No await and no catch: the action ends in a redirect(), which Next
             signals by THROWING. Awaiting it here would turn a successful delete
             into a caught error and an error strip on a card that is already gone. */
          void deleteAndGoBack(id, category, sort);
        }}
      >
        ✕
      </button>
    </div>
  );
}
