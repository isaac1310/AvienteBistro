'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES, type CategoryKey } from '@/lib/constants';
import { MAX_MINUTES } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import CategoryPlate from './CategoryPlate';
import { useLang, useT } from './LangProvider';
import chips from './CategoryChips.module.css';
import styles from './SearchFilters.module.css';

/**
 * Narrow a search: category chips, whose recipe, how long it takes.
 *
 * Everything lives in the URL (?q=&cat=&chef=&max=) so a filtered search can be
 * shared, bookmarked, or re-submitted with the query changed and the filters kept.
 * The category row reuses the chip styling from the category pages; "All" is the
 * chip that clears it. Selects push a new URL, the way SortSelect does.
 */
export default function SearchFilters({
  members, category, chef, max,
}: {
  members: { id: string; name: string }[];
  category: string | null;
  chef: string | null;
  max: number | null;
}) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const params = useSearchParams();

  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    const s = next.toString();
    return `/recipes/search${s ? `?${s}` : ''}`;
  };

  return (
    <div className={styles.wrap}>
      <nav aria-label={t('book.categories')}>
        <ul className={chips.row}>
          <li>
            {!category
              ? <span className={`${chips.chip} ${chips.on}`} aria-current="true">{t('search.all')}</span>
              : <Link href={hrefWith({ cat: null })} className={chips.chip}>{t('search.all')}</Link>}
          </li>
          {CATEGORIES.map((c) => {
            const on = c.key === category;
            const inner = (
              <>
                <CategoryPlate category={c.key as CategoryKey} size="chip" />
                <span className={chips.name}>{categoryName(c, lang)}</span>
              </>
            );
            return (
              <li key={c.key}>
                {on
                  ? <span className={`${chips.chip} ${chips.on}`} aria-current="true">{inner}</span>
                  : <Link href={hrefWith({ cat: c.key })} className={chips.chip}>{inner}</Link>}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.selects}>
        <label className={styles.label}>
          <span>{t('search.chef')}</span>
          <select className={styles.select} value={chef ?? ''}
            onChange={(e) => router.push(hrefWith({ chef: e.target.value || null }), { scroll: false })}>
            <option value="">{t('search.anyChef')}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className={styles.label}>
          <span>{t('search.maxTime')}</span>
          <select className={styles.select} value={max ?? ''}
            onChange={(e) => router.push(hrefWith({ max: e.target.value || null }), { scroll: false })}>
            <option value="">{t('search.anyTime')}</option>
            {MAX_MINUTES.map((n) => <option key={n} value={n}>{t('search.upTo', { n })}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
