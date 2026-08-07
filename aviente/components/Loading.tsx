import styles from './Loading.module.css';

/**
 * Shown while a route segment is still on the server.
 *
 * Every page here is server-rendered against Supabase, so a tap on a category can
 * sit for a few hundred milliseconds with nothing happening — and on kitchen wifi
 * rather longer. Without a boundary the app looks frozen, and people tap again.
 *
 * Two deliberate choices:
 *  - it is the app's own gold diamond, not a generic spinner, so waiting still
 *    looks like this app rather than like a browser stall;
 *  - `rows` draws skeleton cards in the real card geometry, so the layout does not
 *    jump when the content lands.
 */
export default function Loading({ rows = 0, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-label={label}>
      <span className={styles.diamond} aria-hidden="true" />

      {rows > 0 && (
        <ul className={styles.skeletons} aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className={styles.row} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </ul>
      )}
    </div>
  );
}
