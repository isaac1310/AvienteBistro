import Cachet from '@/components/Cachet';
import Splash from '@/components/Splash';
import { BUILD_LABEL } from '@/lib/version';
import styles from './page.module.css';

/* Build step 1 placeholder. The real homepage (§3.1) is the category grid, search
 * and the upcoming menu card -- it needs the Supabase client, which needs the keys
 * in .env.local. What is here now is the identity, the tokens and the shell, so
 * the brand can be judged on a real device before any data exists. */

const CATEGORIES = [
  { key: 'breads',   fr: 'Boulangerie',    emoji: '🥖', count: 5 },
  { key: 'desserts', fr: 'Desserts',       emoji: '🍰', count: 5 },
  { key: 'mains',    fr: 'Plat Principal', emoji: '🍗', count: 1 },
  { key: 'soups',    fr: 'Soupes',         emoji: '🥣', count: 1 },
  { key: 'other',    fr: 'Divers',         emoji: '🫙', count: 1 },
];

export default function Home() {
  return (
    <Splash>
      <header className={styles.header}>
        <div className="shell">
          <Cachet variant="header" subtitle="Livre de Recettes de Famille" />
        </div>
      </header>

      <main className="shell">
        <p className={styles.status}>
          <span className="eyebrow">Build step 1</span>
          Schema, security and the identity are in place. The category counts below
          are the 13 real recipes already seeded — they are hard-coded until the
          Supabase keys land in <code>.env.local</code>.
        </p>

        <hr className="rule" />

        <ul className={styles.grid}>
          {CATEGORIES.map((c) => (
            <li key={c.key} className={`card ${styles.cat}`}>
              <span className={styles.emoji} aria-hidden="true">{c.emoji}</span>
              <h2 className={styles.catName}>{c.fr}</h2>
              <p className={styles.count}>
                {c.count} {c.count === 1 ? 'recette' : 'recettes'}
              </p>
            </li>
          ))}
        </ul>

        <hr className="rule" />

        {/* Proves the Hebrew stack resolves to Frank Ruhl Libre rather than a
            system fallback -- the failure this catches is invisible otherwise. */}
        <section className={styles.proof}>
          <p className="eyebrow">Hebrew type check</p>
          <p className={styles.he} lang="he">חלה לשבת קלועה</p>
          <p className={styles.heBody} lang="he">
            סלט ביצים רטוב · ½ כפית מלח · 400–500 גרם ג׳ינג׳ר טרי
          </p>
        </section>
      </main>

      <footer className={styles.footer}>{BUILD_LABEL}</footer>
    </Splash>
  );
}
