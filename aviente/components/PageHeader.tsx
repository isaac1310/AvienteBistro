import styles from './PageHeader.module.css';

/**
 * The cover band, on every page.
 *
 * The homepage had it and the rest of the app had a plain heading — so the printed
 * cookbook conceit lived on one screen and every other screen was a different
 * product. This is the same construct everywhere: a field of kitchen implements
 * quoting the cover, a wash clearing the middle of it, and a framed cream panel
 * floating on top with whatever the page calls itself inside.
 *
 * `size` is the only difference between pages. The homepage is the cover, so its
 * field is deep; a subpage is a page IN the book, so the band is a header rather
 * than a cover and the content below it has to stay reachable without scrolling.
 */
export default function PageHeader({
  size = 'page', children,
}: { size?: 'cover' | 'page'; children: React.ReactNode }) {
  return (
    <header className={`${styles.header} ${styles[size]}`}>
      <div className="shell">
        <div className={styles.plate}>{children}</div>
      </div>
    </header>
  );
}
