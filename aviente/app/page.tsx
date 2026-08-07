import Link from 'next/link';
import Cachet from '@/components/Cachet';
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

const ACTIONS = [
  { href: '/kids',      icon: '🧸',  name: 'Kids’ table',   hint: 'Plan the week', kid: true },
  { href: '/menus/new', icon: '🕯️', name: 'Create a menu', hint: 'For a meal or a holiday' },
  { href: '/add',       icon: '✒️',  name: 'Add a recipe',  hint: 'Write one in, or paste it' },
  { href: '/settings',  icon: '⚙',   name: 'Settings',      hint: 'Colour, language, backup' },
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

          <hr className="rule" />

          <ul className={styles.actions}>
            {ACTIONS.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`card ${styles.action} ${a.kid ? styles.kidAction : ''}`}
                >
                  <span className={styles.actionIcon} aria-hidden="true">{a.icon}</span>
                  <span className={styles.actionName}>{a.name}</span>
                  <span className={styles.actionHint}>{a.hint}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Deliberately NOT a link. It was one, and the selftest caught it: an
              inline anchor inside a sentence is a 16px tap target, which fails the
              44px rule. The thing it pointed at is the nav bar two inches below, so
              the sentence names it and the bar stays the target. */}
          <p className={styles.aside}>
            Looking for a dish? The book is under “Recipes” in the bar below.
          </p>
        </main>

        <footer className={styles.footer}>
          <p className={styles.build}>{BUILD_LABEL}</p>
        </footer>
      </div>
    </Splash>
  );
}
