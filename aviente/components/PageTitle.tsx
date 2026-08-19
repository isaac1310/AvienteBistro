import styles from './PageTitle.module.css';

/**
 * One heading treatment for every page below the homepage.
 *
 * /recipes, /menus, /add, /settings and the rest each had their own `.h1` rule —
 * same size by coincidence, different margins, and nothing tying them to the
 * wordmark. So the app had one voice on the cover and four variations of it
 * underneath.
 *
 * This is the lockup's vocabulary at page scale: letterspaced Cormorant in the muted
 * stone, a small-caps eyebrow above, and the same signature stroke that finishes the
 * tagline on the cover — fading leftwards out of the last letter. Not a copy of the
 * wordmark, which would compete with it; the same hand writing a smaller line.
 */
export default function PageTitle({
  eyebrow, children,
}: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={styles.title}>
        <span className={styles.titleText}>{children}</span>
        {/* Sized to the text rather than the column, so the stroke ends where the
            word does — a rule spanning the container would read as a divider. */}
        <span className={styles.stroke} aria-hidden="true" />
      </h1>
    </div>
  );
}
