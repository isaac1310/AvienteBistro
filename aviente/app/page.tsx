import Link from 'next/link';
import Cachet from '@/components/Cachet';
import Icon from '@/components/Icon';
import type { IconName } from '@/lib/icons.generated';
import type { Key } from '@/lib/i18n';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import Splash from '@/components/Splash';
import RecentList from '@/components/RecentList';
import { categoryCounts, recentRecipes } from '@/lib/queries';
import { serverT } from '@/lib/lang';
import { currentMember } from '@/lib/supabase/server';
import { BUILD_LABEL } from '@/lib/version';
import styles from './page.module.css';

/* The homepage (§3.1).
 *
 * Four cards, and nothing else. It used to also carry the whole category grid,
 * which made the first screen a nine-tile contents page you had to read past — and
 * the categories are one tap away in the nav bar regardless, so the grid was a
 * second route to somewhere already reachable. What is left is the four things
 * someone opens the app to DO.
 *
 * Server-rendered, so the count in the greeting is the real one and there is no
 * loading flash on the first thing anyone sees.
 */

/* Drawn in the same grammar as the blueprint plates. These were emoji, which were
   the only off-brand thing on the screen — and the gear and the nib did not even
   match each other in weight. The bear stays the one cheerful motif, matching the
   planner it leads to. */
const ACTIONS: { href: string; icon: IconName; name: Key; hint: Key; kid?: boolean }[] = [
  /* Adding a recipe first. It is the thing this app is for, and it was third —
     behind the kids planner, which is the feature you open once a week. */
  { href: '/add',       icon: 'add_recipe',  name: 'home.add',      hint: 'home.add.hint' },
  { href: '/kids',      icon: 'kids_bear',   name: 'home.kids',     hint: 'home.kids.hint', kid: true },
  { href: '/menus/new', icon: 'menu_candle', name: 'home.menu',     hint: 'home.menu.hint' },
  { href: '/settings',  icon: 'settings',    name: 'home.settings', hint: 'home.settings.hint' },
];

export default async function Home() {
  const [counts, member, t, recent] = await Promise.all([
    categoryCounts(), currentMember(), serverT(), recentRecipes(3),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Splash>
      <Nav current="/" />
      <div className={styles.frame}>
        {/* The cover, and the only page that gets the deep field. */}
        <PageHeader size="cover">
          <Cachet variant="header" />
        </PageHeader>

        <main className={`shell ${styles.main}`}>
          {member && (
            <p className={styles.greeting}>
              <span className="eyebrow">
                {t('home.greeting', { name: member.display_name ?? member.name })}
              </span>
              {total === 1 ? t('home.count.one') : t('home.count.many', { n: total })}
            </p>
          )}

          {/* Search, on the first screen.
              Finding a dish is the commonest job a cookbook has, and it was two hops
              away — nav, then Recipes, then the field. A sentence pointing at the nav
              bar used to sit further down doing this job badly: copy that explains
              the navigation is an admission the navigation is not enough. A real
              input is shorter than the apology was. */}
          <form action="/recipes/search" className={styles.search} role="search">
            <input
              type="search" name="q" className={styles.searchField}
              placeholder={t('home.search')}
              aria-label={t('home.search.label')}
            />
          </form>

          {/* What arrived lately, right under the search — the two "find something"
              tools together, above the four actions. Three rows and a link to the
              rest (Itzik's edit after seeing five: too tall for the fold). */}
          <RecentList recipes={recent} t={t} />

          <hr className="rule" />

          <ul className={styles.actions}>
            {ACTIONS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`card ${styles.action} ${a.kid ? styles.kidAction : ''}`}
                >
                  {/* Larger and lighter, to match the plates: 28px at 2.2 read as a
                      bold pictogram beside serif text set twice its size. */}
                  <Icon name={a.icon} size={34} strokeWidth={1.7}
                    className={styles.actionIcon} />
                  <span className={styles.actionName}>{t(a.name)}</span>
                  <span className={styles.actionHint}>{t(a.hint)}</span>
                </Link>
              </li>
            ))}
          </ul>

        </main>

        <footer className={styles.footer}>
          <p className={styles.build}>{BUILD_LABEL}</p>
        </footer>
      </div>
    </Splash>
  );
}
