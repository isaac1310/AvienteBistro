'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setTheme } from '@/lib/mutations';
import styles from './ThemeSwitch.module.css';

/* Green or burgundy, per person (§1).
 *
 * Applied to <html> immediately and persisted afterwards, so the change is
 * instant rather than waiting on a round trip — and if the write fails the UI
 * goes back, rather than showing a colour the database does not agree with.
 *
 * The menu card is deliberately unaffected: it is a printed object with its own
 * palette and looks identical either way.
 */
export default function ThemeSwitch({ current }: { current: 'green' | 'burgundy' }) {
  const router = useRouter();
  const [theme, setLocal] = useState(current);
  const [busy, setBusy] = useState(false);

  async function pick(next: 'green' | 'burgundy') {
    if (next === theme) return;
    const previous = theme;
    setLocal(next);
    document.documentElement.setAttribute('data-theme', next);
    setBusy(true);
    try {
      await setTheme(next);
      router.refresh();
    } catch {
      setLocal(previous);
      document.documentElement.setAttribute('data-theme', previous);
    } finally { setBusy(false); }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Colour</span>
      <div className={styles.seg} role="group" aria-label="Colour theme">
        {(['green', 'burgundy'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={t === theme ? styles.on : styles.off}
            aria-pressed={t === theme}
            disabled={busy}
            onClick={() => pick(t)}
          >
            <span className={`${styles.dot} ${styles[t]}`} aria-hidden="true" />
            {t === 'green' ? 'Green' : 'Burgundy'}
          </button>
        ))}
      </div>
    </div>
  );
}
