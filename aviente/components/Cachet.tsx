import styles from './Cachet.module.css';

type Props = {
  /** 'plaque' = the full framed cartouche (splash, login). 'header' = the
   *  in-app lockup: same three tiers, no frame, so it sits on the page. */
  variant?: 'plaque' | 'header';
  subtitle?: string;
};

/**
 * Le Cachet — the Aviente mark. Three tiers, the way an enamel bistro plaque is
 * set: eyebrow, name, established year.
 *
 * Rendered as text rather than an imported SVG on purpose: this way the wordmark
 * is real Cormorant Garamond at the exact optical size, it scales with the user's
 * font settings, and it is selectable and readable by a screen reader. The SVG in
 * public/brand is for contexts with no fonts (favicons, OG images).
 */
export default function Cachet({ variant = 'plaque', subtitle }: Props) {
  return (
    <div className={`${styles.cachet} ${styles[variant]}`}>
      {variant === 'plaque' && (
        <>
          <span className={styles.frameOuter} aria-hidden="true" />
          <span className={styles.frameInner} aria-hidden="true" />
        </>
      )}
      <div className={styles.inner}>
        <span className={styles.diamond} aria-hidden="true" />
        <p className={styles.family}>La Famille</p>
        <h1 className={styles.word}>Aviente</h1>
        <span className={styles.hr} aria-hidden="true" />
        <p className={styles.est}>Est. 2018</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}
