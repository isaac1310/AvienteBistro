import Link from 'next/link';
import Icon from './Icon';
import NavPending from './NavPending';
import styles from './Nav.module.css';

/* Bottom bar on phone, sidebar from 1024px (§0). One component, two layouts —
 * duplicating it would guarantee the two drift apart. */

/* Drawn, not typographic. ⌂ ☰ ❧ ＋ came from four different type traditions and
   rendered at four different weights depending on the platform's fallback. */
const LINKS = [
  { href: '/',        label: 'Home',    icon: 'home' },
  { href: '/recipes', label: 'Recipes', icon: 'recipes' },
  { href: '/menus',   label: 'Menus',   icon: 'menus' },
  { href: '/add',     label: 'Add',     icon: 'add' },
] as const;

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
                <Icon name={l.icon} size={20} strokeWidth={2.2} className={styles.icon} />
                <span className={styles.label}>{l.label}</span>
                {/* Must be inside the Link — useLinkStatus reads the enclosing one. */}
                <NavPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
