'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAfterNotes } from '@/lib/menuMutations';
import { appendToStory } from '@/lib/mutations';
import { shortDate } from '@/lib/dates';
import { useT } from './LangProvider';
import BusyButton from './BusyButton';
import styles from './AfterNotes.module.css';

/**
 * "How did it go?" — the note written AFTER the meal.
 *
 * The other note, chef_notes, is written before and prints on the card for guests.
 * This one is the family's own memory of the evening: "the kids wanted more sauce",
 * "eight was too many for this table". It never reaches the card, the print route,
 * the shared link or a duplicate of the menu.
 *
 * Explicit Save, not autosave (the playbook's rule: autosave on a phone races with
 * itself and produces a "saved" that can lie). Below it, "promote": copy one line
 * into a recipe's own notes, dated, so a lesson about the dish outlives the evening.
 */
export default function AfterNotes({
  menuId, menuDate, initial, dishes,
}: {
  menuId: string;
  /** ISO date of the menu — the provenance stamp on a promoted line. */
  menuDate: string;
  initial: string | null;
  /** The menu's dishes that still point at a live recipe. */
  dishes: { recipeId: string; title: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState(initial ?? '');
  const [savedText, setSavedText] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoting, setPromoting] = useState(false);
  const [target, setTarget] = useState(dishes[0]?.recipeId ?? '');
  const [line, setLine] = useState('');
  const [promoted, setPromoted] = useState<string | null>(null);

  const dirty = text !== savedText;

  async function onSave() {
    setBusy(true); setError(null);
    try {
      await saveAfterNotes(menuId, text);
      setSavedText(text);
      router.refresh();
    } catch {
      setError(t('menu.afterFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onPromote() {
    const dish = dishes.find((d) => d.recipeId === target);
    if (!dish || !line.trim()) return;
    setBusy(true); setError(null); setPromoted(null);
    try {
      await appendToStory(dish.recipeId, line, shortDate(`${menuDate}T12:00:00`));
      setPromoted(t('menu.promoted', { title: dish.title }));
      setLine('');
      setPromoting(false);
    } catch {
      setError(t('menu.promoteFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`card ${styles.wrap}`} aria-labelledby="after-notes-title">
      <h2 id="after-notes-title" className={styles.h2}>{t('menu.afterTitle')}</h2>
      <p className={styles.hint}>{t('menu.afterHint')}</p>

      <textarea
        className={styles.area} rows={3} value={text} lang="he" dir="auto"
        onChange={(e) => setText(e.target.value)}
        aria-label={t('menu.afterTitle')}
      />
      <div className={styles.row}>
        <BusyButton busy={busy} busyLabel={t('form.saving')} onClick={onSave}
          className={dirty ? 'btn' : 'btn btn--ghost'}>
          {t('form.save')}
        </BusyButton>
        {!dirty && savedText && <span className={styles.saved} role="status">{t('menu.afterSaved')}</span>}
      </div>

      {dishes.length > 0 && (
        <div className={styles.promote}>
          {!promoting ? (
            <button type="button" className={styles.linkish}
              onClick={() => { setPromoting(true); setLine(savedText.split('\n')[0] ?? ''); }}>
              {t('menu.promote')}
            </button>
          ) : (
            <div className={styles.promoteForm}>
              <label className={styles.label}>
                <span>{t('menu.promoteWhich')}</span>
                <select className={styles.select} value={target}
                  onChange={(e) => setTarget(e.target.value)}>
                  {dishes.map((d) => (
                    <option key={d.recipeId} value={d.recipeId}>{d.title}</option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                <span>{t('menu.promoteLine')}</span>
                <input className={styles.input} value={line} lang="he" dir="auto"
                  onChange={(e) => setLine(e.target.value)} />
              </label>
              <div className={styles.row}>
                <BusyButton busy={busy} busyLabel={t('menu.working')} onClick={onPromote}>
                  {t('menu.promoteGo')}
                </BusyButton>
                <button type="button" className="btn btn--ghost" disabled={busy}
                  onClick={() => setPromoting(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          {promoted && <p className={styles.saved} role="status">{promoted}</p>}
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
