import Link from 'next/link';
import Icon from './Icon';
import NavPending from './NavPending';
import { serverT } from '@/lib/lang';
import styles from './Nav.module.css';

/* Bottom bar on phone, sidebar from 1024px (§0). One component, two layouts —
 * duplicating it would guarantee the two drift apart. */

/* Drawn, not typographic. ⌂ ☰ ❧ ＋ came from four different type traditions and
   rendered at four different weights depending on the platform's fallback. */
/* Labels come from the dictionary by key, not as English text with a translation
   beside it — the key is the identity of the destination. */
const LINKS = [
  { href: '/',        key: 'nav.home',    icon: 'home' },
  { href: '/recipes', key: 'nav.recipes', icon: 'recipes' },
  { href: '/menus',   key: 'nav.menus',   icon: 'menus' },
  { href: '/add',     key: 'nav.add',     icon: 'add' },
] as const;

export default async function Nav({ current }: { current?: string }) {
  const t = await serverT();
  return (
    <nav className={styles.nav} aria-label={t('nav.main')}>
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
                <span className={styles.label}>{t(l.key)}</span>
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
