'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { SortKey } from '@/lib/queries';
import Loading from './Loading';
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
 * and reads as though the tap missed. The baguette appears beside the select while
 * the query runs: no wordmark and no caption, because this is a control and the page
 * it sits on has not gone anywhere.
 *
 * It is held on screen for a minimum of 500ms, and that is the fix for the loader
 * being invisible in practice. The transition on a warm connection finishes in well
 * under 100ms, so the drawing appeared and vanished inside a single frame or two —
 * present in the DOM, verifiable with a script, and not something a person could see.
 * A feedback element that flickers is worse than none: it reads as a glitch rather
 * than as an answer. On a slow query the floor changes nothing; the loader simply
 * stays until the data lands.
 */
export default function SortSelect({ value }: { value: SortKey }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  /* `pending` alone is too brief to see. This trails it: set on the way in, cleared
     no earlier than the floor. */
  const [holding, setHolding] = useState(false);
  const since = useRef(0);
  useEffect(() => {
    if (pending) { since.current = performance.now(); setHolding(true); return; }
    if (!holding) return;
    const left = 500 - (performance.now() - since.current);
    if (left <= 0) { setHolding(false); return; }
    const timer = setTimeout(() => setHolding(false), left);
    return () => clearTimeout(timer);
  }, [pending, holding]);

  const waiting = pending || holding;

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>{t('sort.label')}</span>
      <select
        className={styles.select}
        value={value}
        disabled={waiting}
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
      {/* Reserved space, not an appearing element: a loader that pops into the row
          shifts the count beside it every time the sort changes. */}
      <span className={styles.spinner} aria-hidden={!waiting}>
        {waiting && <Loading size="inline" label={t('sort.label')} />}
      </span>
    </label>
  );
}
