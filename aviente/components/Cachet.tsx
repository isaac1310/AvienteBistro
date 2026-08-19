import styles from './Cachet.module.css';

type Props = {
  /**
   * 'splash' — artboard 4A: the cover, at full size.
   * 'header' — artboard 4B: the in-app lockup, smaller and tighter.
   * 'est'    — artboard 5A: the same cover with every tier in the muted tone.
   */
  variant?: 'splash' | 'header' | 'est';
};

/**
 * The Aviente wordmark, from the delivered design (Aviente Cookbook Logo.dc.html).
 *
 * Three tiers: a rule-diamond-rule ornament, AVIENTE in letterspaced Cormorant, and
 * the tagline in Petit Formal Script under an underline that fades away to the left.
 * EST. 2018 sits below in Rubik small caps.
 *
 * **Latin in both languages, deliberately.** A wordmark is a name, and this one reads
 * the same on the splash, the header, the favicon and the printed menu card whichever
 * language the app is in — so it is exempt from the dictionary rather than missing
 * from it. The tagline's face has no Hebrew glyphs at all, which is the constraint
 * made visible in the --script token.
 *
 * Still live text rather than imported artwork: real Cormorant at the exact optical
 * size, scaling with the reader's font settings, selectable, and readable by a screen
 * reader. public/brand/*.svg exists for the contexts with no webfonts — favicons and
 * OG images — and those need a real vector.
 *
 * The old version added "La Famille" above and "Chez Nous" below. Both are gone from
 * the new design, which is a decision rather than an oversight: the French framing
 * belonged to an app whose chrome was English-with-French-accents, and the chrome is
 * Hebrew now.
 */
export default function Cachet({ variant = 'splash' }: Props) {
  return (
    <div className={`${styles.cachet} ${styles[variant]}`}>
      {/* Rule · diamond · rule. Decorative, so it takes --muted, which is 2.48:1 and
          may never carry text. */}
      <span className={styles.ornament} aria-hidden="true">
        <span className={styles.rule} />
        <span className={styles.diamond} />
        <span className={styles.rule} />
      </span>

      {/* LA FAMILLE, restored above the name. The delivered artboards drop it, but
          it is the tier that says whose book this is — and the lockup reads as a
          family cookbook rather than a brand with it there. */}
      <span className={styles.family}>La Famille</span>

      {/* The text-indent matches the letter-spacing: letterspacing adds a trailing
          gap after the final E, which pushes an otherwise centred word left by
          exactly one space. The design does the same thing. */}
      <span className={styles.word}>AVIENTE</span>

      <span className={styles.taglineWrap}>
        <span className={styles.tagline}>The Family Recipes Cookbook</span>
        {/* An underline that fades out leftwards, tilted a fraction of a degree — a
            pen stroke rather than a border. */}
        <span className={styles.underline} aria-hidden="true" />
      </span>

      <span className={styles.year}>EST. 2018</span>
    </div>
  );
}
