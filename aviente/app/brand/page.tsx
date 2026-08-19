import BackLink from '@/components/BackLink';
import CategoryPlate from '@/components/CategoryPlate';
import Nav from '@/components/Nav';
import { serverT } from '@/lib/lang';
import { CATEGORIES, type CategoryKey } from '@/lib/constants';
import styles from './brand.module.css';

export const metadata = { title: 'Aviente — Plate blueprints' };

/**
 * Every no-photo plate on one page, at both sizes, against the card geometry they
 * actually sit in.
 *
 * This is a working sheet, not a feature: it exists so the nine motifs can be judged
 * as a SET. Reviewing them one at a time inside a category listing is how you end up
 * with nine drawings at nine different weights that happen to be adjacent — the
 * whole point of stroke-only line art at one width is that the field reads as one
 * texture. Seeing them together is the only way to tell whether it does.
 *
 * Not linked from the nav on purpose. Reachable at /brand, behind the same session
 * as everything else.
 */
export default async function BrandSheet() {
  const t = await serverT();
  return (
    <>
      <Nav current="/" />
      <div className={styles.frame}>
        <main className={`shell ${styles.main}`}>
          <BackLink href="/settings" label={t('settings.eyebrow')} />
          <p className="eyebrow">{t('brand.eyebrow')}</p>
          <h1 className={styles.h1}>{t('brand.title')}</h1>
          <p className={styles.intro}>
            Nine plates on a 110×90 grid, stroked with <code>currentColor</code> so
            they take the theme&rsquo;s ink — the kids&rsquo; plate is exempt and stays
            pink. Every recipe without a photograph shows one, which in this book is
            most of them, so this is the app&rsquo;s ordinary look rather than a
            fallback. The drawings are the files in{' '}
            <code>design/blueprints/</code>; run <code>npm run blueprints</code> after
            changing one.
          </p>

          <section className={styles.block}>
            <h2 className={styles.h2}>In the list, at 92px</h2>
            <p className={styles.note}>
              The size that matters: this is what a category page is made of.
            </p>
            <ul className={styles.rows}>
              {CATEGORIES.map((c) => (
                <li key={c.key} className={`card ${styles.row}`}>
                  <CategoryPlate category={c.key as CategoryKey} />
                  <span className={styles.rowBody}>
                    <span className={styles.rowName}>{c.en}</span>
                    <span className={styles.rowMeta}>{c.key} · {c.he}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.block}>
            <h2 className={styles.h2}>Enlarged, for the drawing itself</h2>
            <p className={styles.note}>
              The same drawings at 130px with their captions, as they appear on a
              recipe. Weight and balance are easier to judge here; whether a line
              survives the 92px thumbnail is only answerable above.
            </p>
            <ul className={styles.heroes}>
              {CATEGORIES.map((c) => (
                <li key={c.key} className={styles.hero}>
                  <CategoryPlate category={c.key as CategoryKey} size="hero" caption={c.en} />
                  <span className={styles.heroName}>{c.en}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}
