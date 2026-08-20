import Link from 'next/link';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import { todayIn } from '@/lib/today';
import PageTitle from '@/components/PageTitle';
import { serverT } from '@/lib/lang';
import { occasionRules, savedMenus } from '@/lib/menus';
import { cardDate, upcomingOccasions } from '@/lib/occasion';
import Motif from '@/components/Motif';
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
  // Today in Jerusalem: a UTC server files tonight's menu under yesterday.
  const today = todayIn();
  const upcoming = menus.filter((m) => m.date >= today);
  const past = menus.filter((m) => m.date < today);
  const suggestions = upcomingOccasions(rules, 75).slice(0, 4);

  return (
    <>
      <Nav current="/menus" />
      <div className={styles.frame}>
        {/* Back link above the band; the panel holds the title alone. */}
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/" label={t('nav.home')} />
        </div>

        <PageHeader>
          {/* The drawing above the name, the way a category page carries its plate —
              it is part of what the page is called, not decoration beside it. */}
          <span className={styles.headMotif}>
            <Motif name="menu_card" size={64} strokeWidth={1.5} />
          </span>
          <PageTitle eyebrow={t('menus.title')}>{t('menus.history')}</PageTitle>
        </PageHeader>

        <main className="shell">
          {/* The primary action under the band, where the page's actions live. */}
          <p className={styles.newRow}>
            <Link href="/menus/new" className="btn">{t('menus.new')}</Link>
          </p>
          {menus.length === 0 && (
            <div className={`card ${styles.empty}`}>
              {/* Four of nine category pages ship empty and this one does too until
                  the first Friday is planned, so it is a screen people actually see —
                  drawn rather than two lines of apology. */}
              <Motif name="menu_card" size={92} strokeWidth={1.3}
                className={styles.emptyMotif} />
              <p className={styles.emptyTitle}>{t('menus.none')}</p>
              <p className={styles.emptyBody}>{t('menus.noneBody')}</p>
            </div>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className={styles.h2}>{t('menus.comingUp')}</h2>
              <ul className={styles.list}>
                {upcoming.map((m) => (
                  <li key={m.id}>
                    <Link href={`/menus/${m.id}`} className={`card ${styles.row} ${styles.next}`}>
                      <span className={styles.when}>
                        {/* Sized in CSS: `candle` is the one PORTRAIT motif, and
                            Motif's height = size * 0.82 assumes a landscape drawing —
                            so `size={16}` letterboxed a 40x90 frame into a 16x13 box
                            and the candle came out six pixels wide. */}
                        <Motif name="candle" size={16} strokeWidth={2.2}
                          className={styles.rowCandle} />{' '}
                        {cardDate(new Date(`${m.date}T12:00:00`))}
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
              <h2 className={styles.h2}>{showAll ? t('menus.all') : t('menus.kept')}</h2>
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
              {showAll ? t('menus.showKept') : t('menus.showAll')}
            </Link>
          </p>

          {suggestions.length > 0 && (
            <section>
              <h2 className={styles.h2}>{t('menus.worth')}</h2>
              <ul className={styles.list}>
                {suggestions.map((s) => (
                  <li key={s.occasion.title}>
                    <Link
                      href={`/menus/new?date=${s.date.toISOString().slice(0, 10)}`}
                      className={`card ${styles.row} ${styles.suggestion}`}
                    >
                      <span className={styles.when}>
                        <Motif
                          name={s.occasion.ornament === 'apple' ? 'apple' : 'candle'}
                          size={16} strokeWidth={2.4} />{' '}
                        {cardDate(s.date)}
                      </span>
                      <span className={styles.name}>{s.occasion.title}</span>
                      <span className={styles.meta}>{t('menus.planAhead')}</span>
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
