'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setTheme, setLanguage, setDisplayName } from '@/lib/mutations';
import { useT } from './LangProvider';
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
  theme, language, displayName,
}: { theme: 'green' | 'burgundy'; language: 'en' | 'he'; displayName: string }) {
  const router = useRouter();
  const t = useT();
  const [colour, setColour] = useState(theme);
  const [lang, setLang] = useState(language);
  const [name, setName] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
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
      setError(t('settings.colourFailed'));
    } finally { setBusy(false); }
  }

  async function pickLang(next: 'en' | 'he') {
    if (next === lang || busy) return;
    const previous = lang;
    setLang(next);
    setBusy(true); setError(null);
    try {
      await setLanguage(next);
      router.refresh();
    } catch {
      setLang(previous);
      setError(t('settings.languageFailed'));
    } finally { setBusy(false); }
  }

  async function saveName() {
    const next = name.trim();
    if (!next || next === savedName) { setName(savedName); return; }
    setBusy(true); setError(null);
    try {
      await setDisplayName(next);
      setSavedName(next);
      router.refresh();
    } catch (e) {
      setName(savedName);
      setError(e instanceof Error ? e.message : t('settings.nameFailed'));
    } finally { setBusy(false); }
  }

  return (
    /* No heading of its own: the only page that renders this is /settings, whose
       own eyebrow already says "Settings" — two in a row read as a bug. */
    <section className={styles.wrap} aria-label={t('settings.prefs')}>
      <div className={`card ${styles.panel}`}>
        {/* Each person sets their own, so Moran is greeted as Mama without anyone
            editing a row in the Supabase dashboard. It changes the greeting only —
            recipe and menu attribution runs off `name`, which is why "Savta's
            recipe" cannot be broken from here. */}
        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.name}>{t('settings.displayName')}</span>
            <span className={styles.hint}>{t('settings.displayHint')}</span>
          </div>
          <input
            className={styles.field}
            value={name}
            disabled={busy}
            maxLength={40}
            aria-label={t('settings.displayName')}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </div>

        <hr className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.name}>{t('settings.colour')}</span>
            <span className={styles.hint}>{t('settings.colourHint')}</span>
          </div>
          <div className={styles.seg} role="group" aria-label={t('settings.colour')}>
            {/* The loop variable is `c`, not `t`: `t` is the dictionary now, and
                shadowing it here silently turned every label into a call on a
                string. */}
            {(['green', 'burgundy'] as const).map((c) => (
              <button key={c} type="button" disabled={busy}
                className={c === colour ? styles.on : styles.off}
                aria-pressed={c === colour} onClick={() => pickColour(c)}>
                <span className={`${styles.dot} ${styles[c]}`} aria-hidden="true" />
                {c === 'green' ? t('settings.green') : t('settings.burgundy')}
              </button>
            ))}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.name}>{t('settings.language')}</span>
            {/* The scope, said plainly. It used to read "the app itself is in
                English", which is no longer true — this now changes the whole
                interface, and the one exception is worth naming rather than
                discovering. */}
            <span className={styles.hint}>{t('settings.languageHint')}</span>
          </div>
          <div className={styles.seg} role="group" aria-label={t('settings.language')}>
            <button type="button" disabled={busy} lang="he"
              className={lang === 'he' ? styles.on : styles.off}
              aria-pressed={lang === 'he'} onClick={() => pickLang('he')}>עברית</button>
            <button type="button" disabled={busy}
              className={lang === 'en' ? styles.on : styles.off}
              aria-pressed={lang === 'en'} onClick={() => pickLang('en')}>
              {/* Each language labels itself, so this is English in both settings —
                  the same reason עברית is not "Hebrew". */}
              English
            </button>
          </div>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </section>
  );
}
