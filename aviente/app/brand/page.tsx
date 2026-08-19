import BackLink from '@/components/BackLink';
import Cachet from '@/components/Cachet';
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
          <p className={styles.intro} dir="ltr">
            Nine plates on a 110×90 grid, stroked with <code>currentColor</code> so
            they take the theme&rsquo;s ink — the kids&rsquo; plate is exempt and stays
            pink. Every recipe without a photograph shows one, which in this book is
            most of them, so this is the app&rsquo;s ordinary look rather than a
            fallback. The drawings are the files in{' '}
            <code>design/blueprints/</code>; run <code>npm run blueprints</code> after
            changing one.
          </p>

          {/* The two splash variants side by side, which is the only way to choose
              between them: 4A has hierarchy, 5A is one uniform tone. Both are the
              same component at different --scale and ink. */}
          <section className={styles.block}>
            <h2 className={styles.h2}>The wordmark</h2>
            <p className={styles.note} dir="ltr">
              <strong>4A</strong> puts the name in ink and the tagline in green;
              <strong> 5A</strong> sets every tier in the muted stone. 5A is softer
              and closer to a printed endpaper — but the design&rsquo;s own
              <code> #A79A85</code> is 2.48:1 on this ground, so the word and tagline
              here take <code>--muted-ink</code> instead. The ornament keeps the
              lighter tone, because it is decoration and carries no text.
            </p>
            <ul className={styles.heroes}>
              <li className={styles.hero}>
                <span className={styles.card}><Cachet variant="splash" /></span>
                <span className={styles.heroName}>4A · splash</span>
              </li>
              <li className={styles.hero}>
                <span className={styles.card}><Cachet variant="est" /></span>
                <span className={styles.heroName}>5A · all in est. tone</span>
              </li>
              <li className={styles.hero}>
                <span className={styles.card}><Cachet variant="header" /></span>
                <span className={styles.heroName}>4B · header</span>
              </li>
            </ul>
          </section>

          <section className={styles.block}>
            <h2 className={styles.h2}>In the list, at 92px</h2>
            <p className={styles.note} dir="ltr">
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
            <p className={styles.note} dir="ltr">
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
