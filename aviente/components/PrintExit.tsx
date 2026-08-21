'use client';

import Link from 'next/link';
import Arrow from './Arrow';
import { useT } from './LangProvider';
import styles from './PrintExit.module.css';

/**
 * A way out of a print page.
 *
 * The print routes are full-bleed documents with no nav — deliberately, because the
 * nav must not appear on paper. But that left them with no exit at all: opening the
 * fridge sheet replaced the app, and the only route back was the browser's own back
 * button, which is not visible in a standalone PWA window.
 *
 * Hidden by `@media print`, so it costs the paper nothing.
 */
export default function PrintExit({ href, label }: { href: string; label: string }) {
  const t = useT();
  return (
    <div className={styles.bar}>
      <Link href={href} className={styles.back}>
        <Arrow /> {label}
      </Link>
      <button type="button" className={styles.print} onClick={() => window.print()}>
        {t('print.print')}
      </button>
    </div>
  );
}
