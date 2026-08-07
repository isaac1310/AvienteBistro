import Link from 'next/link';
import Cachet from '@/components/Cachet';
import Nav from '@/components/Nav';
import Splash from '@/components/Splash';
import { CATEGORIES, categoryCounts } from '@/lib/queries';
import { currentMember } from '@/lib/supabase/server';
import { BUILD_LABEL } from '@/lib/version';
import styles from './page.module.css';

/* The homepage (§3.1). Server-rendered, so the counts are the real ones and there
 * is no loading flash on the first thing anyone sees. */
export default async function Home() {
  const [counts, member] = await Promise.all([categoryCounts(), currentMember()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Splash>
      <Nav current="/" />
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className="shell">
            <Cachet variant="header" subtitle="Livre de Recettes de Famille" />
          </div>
        </header>

        <main className={`shell ${styles.main}`}>
          {member && (
            <p className={styles.greeting}>
              <span className="eyebrow">Bonsoir, {member.display_name ?? member.name}</span>
              {total} {total === 1 ? 'recette' : 'recettes'} dans le livre
            </p>
          )}

          <hr className="rule" />

          <ul className={styles.grid}>
            {CATEGORIES.map((c) => {
              const n = counts[c.key] ?? 0;
              return (
                <li key={c.key}>
                  <Link
                    /* The Kids' Table leads to the planner, not to a list of
                       recipes — the planner is what that section IS. */
                    href={c.key === 'kids' ? '/kids' : `/recipes/${c.key}`}
                    className={`card ${styles.cat} ${c.key === 'kids' ? styles.kids : ''}`}
                  >
                    <span className={styles.emoji} aria-hidden="true">{c.emoji}</span>
                    <span className={styles.catName}>{c.fr}</span>
                    {/* An empty category still shows, and says so plainly rather
                        than showing "0" — four of nine are empty at launch. */}
                    <span className={styles.count}>
                      {n === 0 ? 'rien encore' : `${n} ${n === 1 ? 'recette' : 'recettes'}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </main>

        <footer className={styles.footer}>{BUILD_LABEL}</footer>
      </div>
    </Splash>
  );
}
