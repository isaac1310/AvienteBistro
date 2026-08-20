'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { SortKey } from '@/lib/queries';
import { useT } from './LangProvider';
import styles from './SortSelect.module.css';

/**
 * How this category is ordered. The order lives in the URL, not in state, for two
 * reasons: the sort happens in Postgres (a list of 41 is small today and the query
 * is the right place regardless), and a chosen order survives a reload and can be
 * bookmarked.
 *
 * `useTransition` keeps the select responsive while the server re-renders the list —
 * without it the control freezes on the old value for the length of the round trip
 * and reads as though the tap missed.
 */
export default function SortSelect({ value }: { value: SortKey }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>{t('sort.label')}</span>
      <select
        className={styles.select}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          /* The default is not written to the URL. A bare category URL and one
             carrying ?sort=title are the same page, and only one of them should be
             the address it gets shared as. */
          if (e.target.value === 'title') next.delete('sort');
          else next.set('sort', e.target.value);
          const query = next.toString();
          start(() => router.push(query ? `?${query}` : '?', { scroll: false }));
        }}
      >
        <option value="title">{t('sort.title')}</option>
        <option value="updated">{t('sort.updated')}</option>
        <option value="created">{t('sort.created')}</option>
      </select>
    </label>
  );
}
