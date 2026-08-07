'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setTheme, setCardLanguage } from '@/lib/mutations';
import styles from './Settings.module.css';

/**
 * The two things anyone actually changes, on the homepage where they can be found.
 *
 * They used to live at the bottom of /recipes, which is a list of categories — a
 * colour picker filed under "Recipes" is a thing you find once by accident. Both
 * are per-person: Moran's choices do not follow Itzik around.
 *
 * Each control applies at once and persists afterwards, and rolls back visibly if
 * the write fails, so the screen never shows a setting the database disagrees with.
 */
export default function Settings({
  theme, cardLanguage,
}: { theme: 'green' | 'burgundy'; cardLanguage: 'en' | 'he' }) {
  const router = useRouter();
  const [colour, setColour] = useState(theme);
  const [lang, setLang] = useState(cardLanguage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickColour(next: 'green' | 'burgundy') {
    if (next === colour || busy) return;
    const previous = colour;
    setColour(next);
    document.documentElement.setAttribute('data-theme', next);
    setBusy(true); setError(null);
    try {
      await setTheme(next);
      router.refresh();
    } catch {
      setColour(previous);
      document.documentElement.setAttribute('data-theme', previous);
      setError('Could not save the colour. It is back to what it was.');
    } finally { setBusy(false); }
  }

  async function pickLang(next: 'en' | 'he') {
    if (next === lang || busy) return;
    const previous = lang;
    setLang(next);
    setBusy(true); setError(null);
    try {
      await setCardLanguage(next);
      router.refresh();
    } catch {
      setLang(previous);
      setError('Could not save the language. It is back to what it was.');
    } finally { setBusy(false); }
  }

  return (
    /* No heading of its own: the only page that renders this is /settings, whose
       own eyebrow already says "Settings" — two in a row read as a bug. */
    <section className={styles.wrap} aria-label="Preferences">
      <div className={`card ${styles.panel}`}>
        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.name}>Colour</span>
            <span className={styles.hint}>Yours only — it does not change Moran&rsquo;s.</span>
          </div>
          <div className={styles.seg} role="group" aria-label="Colour theme">
            {(['green', 'burgundy'] as const).map((t) => (
              <button key={t} type="button" disabled={busy}
                className={t === colour ? styles.on : styles.off}
                aria-pressed={t === colour} onClick={() => pickColour(t)}>
                <span className={`${styles.dot} ${styles[t]}`} aria-hidden="true" />
                {t === 'green' ? 'Green' : 'Burgundy'}
              </button>
            ))}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.name}>Menu card language</span>
            {/* Said plainly, because the honest scope is narrower than the words
                "language setting" suggest and a vague label would mislead. */}
            <span className={styles.hint}>
              Which language a new card&rsquo;s dish descriptions start in. Course
              names stay French, and the app itself is in English.
            </span>
          </div>
          <div className={styles.seg} role="group" aria-label="Menu card language">
            <button type="button" disabled={busy} lang="he"
              className={lang === 'he' ? styles.on : styles.off}
              aria-pressed={lang === 'he'} onClick={() => pickLang('he')}>עברית</button>
            <button type="button" disabled={busy}
              className={lang === 'en' ? styles.on : styles.off}
              aria-pressed={lang === 'en'} onClick={() => pickLang('en')}>English</button>
          </div>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </section>
  );
}
