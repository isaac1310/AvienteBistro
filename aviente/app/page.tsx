import Link from 'next/link';
import Cachet from '@/components/Cachet';
import Icon from '@/components/Icon';
import type { IconName } from '@/lib/icons.generated';
import Nav from '@/components/Nav';
import Splash from '@/components/Splash';
import { categoryCounts } from '@/lib/queries';
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
const ACTIONS: { href: string; icon: IconName; name: string; hint: string; kid?: boolean }[] = [
  { href: '/kids',      icon: 'kids_bear',   name: 'Kids’ table',   hint: 'Plan the week', kid: true },
  { href: '/menus/new', icon: 'menu_candle', name: 'Create a menu', hint: 'For a meal or a holiday' },
  { href: '/add',       icon: 'add_recipe',  name: 'Add a recipe',  hint: 'Write one in, or paste it' },
  { href: '/settings',  icon: 'settings',    name: 'Settings',      hint: 'Colour, language, backup' },
];

export default async function Home() {
  const [counts, member] = await Promise.all([categoryCounts(), currentMember()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Splash>
      <Nav current="/" />
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className="shell">
            <div className={styles.plate}>
              <Cachet variant="header" subtitle="The Family Recipe Book" />
            </div>
          </div>
        </header>

        <main className={`shell ${styles.main}`}>
          {member && (
            <p className={styles.greeting}>
              <span className="eyebrow">Hello, {member.display_name ?? member.name}</span>
              {total} {total === 1 ? 'recipe' : 'recipes'} in the book
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
              placeholder="Search a dish or an ingredient…"
              aria-label="Search recipes"
            />
          </form>

          <hr className="rule" />

          <ul className={styles.actions}>
            {ACTIONS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`card ${styles.action} ${a.kid ? styles.kidAction : ''}`}
                >
                  <Icon name={a.icon} size={28} strokeWidth={2.2}
                    className={styles.actionIcon} />
                  <span className={styles.actionName}>{a.name}</span>
                  <span className={styles.actionHint}>{a.hint}</span>
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
