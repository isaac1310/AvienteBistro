'use client';

import Link from 'next/link';
import Arrow from './Arrow';
import styles from './BackLink.module.css';

/**
 * "← where you came from", at the top of every page except the homepage.
 *
 * Deliberately a Link with an explicit destination rather than a router.back()
 * button. history.back() sends you wherever you happened to be, which after a save
 * is the form you just left, and after arriving from a share link is outside the
 * app entirely. A named parent is always right and reads as a place, not a gesture.
 *
 * The bottom nav is not a substitute: it goes to the four section roots, so from a
 * recipe inside a category there is no way up one level.
 */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.back}>
      <Arrow /> {label}
    </Link>
  );
}
