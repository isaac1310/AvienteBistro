import { MOTIFS } from '@/lib/motifs.generated';
import styles from './Loading.module.css';

/**
 * Shown while a route segment is still on the server, and wherever else the app is
 * genuinely waiting.
 *
 * Every page here is server-rendered against Supabase, so a tap on a category can sit
 * for a few hundred milliseconds with nothing happening — and on kitchen wifi rather
 * longer. Without a boundary the app looks frozen and people tap again.
 *
 * The motif is a loaf with steam rising, drawn in the same 110×90 stroke language as
 * the category plates. It replaced a rotating gold diamond: the diamond belonged to
 * the retired palette, sat small at the top of the page, and read as a generic
 * spinner wearing the app's colour. Bread proving is the right metaphor for a wait in
 * a cookbook — something is happening and it takes the time it takes.
 *
 * The steam is the only animated part, and it drifts by dash-offset rather than
 * moving anything: the loaf stays still, so nothing jitters at the centre of a page
 * that is about to be replaced.
 *
 * `size="inline"` is for waits inside a control — a photo uploading, a PDF being
 * rendered — where a page-sized motif would be absurd.
 */
export default function Loading({
  rows = 0, label = 'Loading', size = 'page',
}: {
  rows?: number;
  label?: string;
  size?: 'page' | 'inline';
}) {
  const motif = MOTIFS.loader_loaf;
  return (
    <div className={`${styles.wrap} ${styles[size]}`} role="status" aria-live="polite"
         aria-label={label}>
      <svg
        className={styles.motif}
        viewBox={motif.viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
        /* Generated from a file in this repo, never from a request — see
           lib/motifs.generated.ts. */
        dangerouslySetInnerHTML={{ __html: motif.inner }}
      />

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
