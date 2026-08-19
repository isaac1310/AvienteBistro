import Link from 'next/link';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import { serverT } from '@/lib/lang';
import { occasionRules, savedMenus } from '@/lib/menus';
import { cardDate, upcomingOccasions } from '@/lib/occasion';
import styles from './menus.module.css';

export const metadata = { title: 'Aviente — Menus' };

/* §3.7 — the keepers list, not a chronological log. Starred menus plus anything
 * upcoming; everything else is behind "show all". */
export default async function MenusPage({
  searchParams,
}: { searchParams: Promise<{ all?: string }> }) {
  const t = await serverT();
  const { all } = await searchParams;
  const showAll = all === '1';

  const [menus, rules] = await Promise.all([savedMenus(showAll), occasionRules()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = menus.filter((m) => m.date >= today);
  const past = menus.filter((m) => m.date < today);
  const suggestions = upcomingOccasions(rules, 75).slice(0, 4);

  return (
    <>
      <Nav current="/menus" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <BackLink href="/" label={t('nav.home')} />
            <p className="eyebrow">Menus</p>
            <h1 className={styles.h1}>Menu history</h1>
            <Link href="/menus/new" className="btn">＋ New menu</Link>
          </div>
        </header>

        <main className="shell">
          {menus.length === 0 && (
            <div className={`card ${styles.empty}`}>
              <p className={styles.emptyTitle}>No menus yet</p>
              <p className={styles.emptyBody}>
                Build one for this Friday and it will keep — starred menus stay here
                so you can copy them onto a new date later.
              </p>
            </div>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className={styles.h2}>Coming up</h2>
              <ul className={styles.list}>
                {upcoming.map((m) => (
                  <li key={m.id}>
                    <Link href={`/menus/${m.id}`} className={`card ${styles.row} ${styles.next}`}>
                      <span className={styles.when}>
                        🕯 {cardDate(new Date(`${m.date}T12:00:00`))}
                      </span>
                      <span className={styles.name}>{m.title ?? 'Menu'}</span>
                      <span className={styles.meta}>
                        {m.items.length} {m.items.length === 1 ? 'dish' : 'dishes'}
                        {m.share_id && ' · shared'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className={styles.h2}>{showAll ? 'All menus' : '★ Kept'}</h2>
              <ul className={styles.list}>
                {past.map((m) => (
                  <li key={m.id}>
                    <Link href={`/menus/${m.id}`} className={`card ${styles.row}`}>
                      <span className={styles.when}>
                        {m.saved ? '★ ' : ''}{cardDate(new Date(`${m.date}T12:00:00`))}
                      </span>
                      <span className={styles.name}>{m.title ?? 'Menu'}</span>
                      <span className={styles.meta}>
                        {m.items.length} {m.items.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className={styles.toggle}>
            <Link href={showAll ? '/menus' : '/menus?all=1'}>
              {showAll ? 'show only the ones we kept' : 'show all menus'}
            </Link>
          </p>

          {suggestions.length > 0 && (
            <section>
              <h2 className={styles.h2}>Worth planning</h2>
              <ul className={styles.list}>
                {suggestions.map((s) => (
                  <li key={s.occasion.title}>
                    <Link
                      href={`/menus/new?date=${s.date.toISOString().slice(0, 10)}`}
                      className={`card ${styles.row} ${styles.suggestion}`}
                    >
                      <span className={styles.when}>
                        {s.occasion.ornament === 'apple' ? '🍎'
                          : s.occasion.ornament === 'candles' ? '🕯' : '✡'}{' '}
                        {cardDate(s.date)}
                      </span>
                      <span className={styles.name}>{s.occasion.title}</span>
                      <span className={styles.meta}>plan ahead</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
