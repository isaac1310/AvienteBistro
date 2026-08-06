import Link from 'next/link';
import styles from './Nav.module.css';

/* Bottom bar on phone, sidebar from 1024px (§0). One component, two layouts —
 * duplicating it would guarantee the two drift apart. */

const LINKS = [
  { href: '/',        label: 'Home',    icon: '⌂' },
  { href: '/recipes', label: 'Recipes', icon: '☰' },
  { href: '/menus',   label: 'Menus',   icon: '❧' },
  { href: '/add',     label: 'Add',     icon: '＋' },
];

export default function Nav({ current }: { current?: string }) {
  return (
    <nav className={styles.nav} aria-label="Main">
      <ul className={styles.list}>
        {LINKS.map((l) => {
          const active = current === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`${styles.link} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">{l.icon}</span>
                <span className={styles.label}>{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
