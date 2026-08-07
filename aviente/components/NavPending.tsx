'use client';

import { useLinkStatus } from 'next/link';
import styles from './Nav.module.css';

/**
 * The tapped nav item, acknowledging the tap.
 *
 * `loading.tsx` covers the wait once the new segment is being rendered, but the gap
 * between the tap and that swap is silent: on a slow connection the bar just sits
 * there and people tap a second time. `useLinkStatus` reports the pending state of
 * the enclosing Link, so this must be rendered as a CHILD of that Link — outside
 * one it always reads "not pending".
 */
export default function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className={styles.pending} aria-hidden="true" />;
}
