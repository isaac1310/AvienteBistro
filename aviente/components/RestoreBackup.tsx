'use client';

import { useRef, useState } from 'react';
import { restoreBackup, undoImport, type ImportResult } from '@/lib/importMutations';
import { normalizeDocument } from '@/lib/recipeParse.mjs';
import { toRecipeInput, type ParsedRecipe } from '@/lib/toRecipeInput';
import { count } from '@/lib/i18n';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import Motif from './Motif';
import styles from './RestoreBackup.module.css';

/* Restore, as its own flow rather than a mode of /import.
 *
 * The shape is: choose the file → be told exactly what will happen → confirm in
 * those terms → see what happened. No paste box (a backup is a file, not a paste),
 * no Skip/Replace choice (a restore that skips is not a restore), and the confirm
 * button carries the number it is about to overwrite, because "Restore" is a softer
 * word than what this does.
 */

type Parsed = {
  recipes: ReturnType<typeof normalizeDocument>['recipes'];
  exportedAt: string | null;
  exportedBy: string | null;
  errors: string[];
};

export default function RestoreBackup() {
  const t = useT();
  const file = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [undone, setUndone] = useState(false);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null); setResult(null); setParsed(null); setFileName(f.name);
    try {
      const doc = JSON.parse(await f.text());
      const out = normalizeDocument(doc);
      setParsed({
        recipes: out.recipes,
        exportedAt: typeof doc.exportedAt === 'string' ? doc.exportedAt : null,
        exportedBy: typeof doc.exportedBy === 'string' ? doc.exportedBy : null,
        errors: out.errors,
      });
    } catch {
      setError(t('restore.notBackup'));
    }
  }

  async function onRestore() {
    if (!parsed) return;
    setBusy(true); setError(null);
    try {
      /* Mapped through the shared boundary rather than re-typed here: the import
         screen and this door must send identical shapes, or a restore quietly loses
         whatever only one of them names. */
      setResult(await restoreBackup(
        (parsed.recipes as ParsedRecipe[]).map((r) => toRecipeInput(r)),
      ));
      setParsed(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('restore.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className={styles.wrap}>
        <div className={`card ${styles.panel}`}>
          <p className={styles.head}>{t('restore.done')}</p>
          <p className={styles.body}>
            {t('restore.tally', { replaced: result.replaced.length, added: result.imported.length })}
            {result.failed.length > 0 && ` · ${t('restore.tallyFailed', { n: result.failed.length })}`}
          </p>
          {result.failed.map((f) => (
            <p key={f.title} className={styles.fail}>✕ {f.title} — {f.why}</p>
          ))}
          <p className={styles.hint}>{t('restore.keptVersions')}</p>
          {result.imported.length > 0 && !undone && (
            <BusyButton busy={busy} className="btn btn--ghost"
              busyLabel={t('import.undoing')}
              onClick={async () => {
                setBusy(true);
                await undoImport(result.imported.map((r) => r.id));
                setUndone(true); setBusy(false);
              }}>
              {t('import.undoAdded', { n: result.imported.length })}
            </BusyButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.body}>{t('restore.intro')}</p>

      <button type="button" className="btn btn--ghost" onClick={() => file.current?.click()}>
        <><Motif name="folder" size={18} /> {t('restore.chooseFile')}</>{fileName ? ` · ${fileName}` : ''}
      </button>
      <input
        ref={file} type="file" accept=".json,application/json" hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {error && <p className={styles.fail} role="alert">{error}</p>}

      {parsed && parsed.errors.length > 0 && (
        <div className={`card ${styles.panel}`}>
          {parsed.errors.map((e) => <p key={e} className={styles.fail}>✕ {e}</p>)}
        </div>
      )}

      {parsed && parsed.errors.length === 0 && (
        <div className={`card ${styles.panel}`}>
          <p className={styles.head}>
            {count(t, parsed.recipes.length, 'book.count.one', 'book.count.many')}
          </p>
          <p className={styles.body}>
            {parsed.exportedBy
              ? t('restore.exportedBy', { name: parsed.exportedBy })
              : t('restore.exporterUnknown')}
            {parsed.exportedAt && ` · ${parsed.exportedAt.slice(0, 10)}`}
          </p>
          {/* The button says the number. A restore is an overwrite wearing a
              friendly name, and the moment of clicking is when that must be plain. */}
          {/* `done` here, and not on a Save button: a restore leaves you on this
              page, so the tick is the only confirmation there is. */}
          <BusyButton busy={busy} done={!!result} onClick={onRestore}
            busyLabel={t('restore.restoring')} doneLabel={t('restore.restored')}>
            {t('restore.overwrite', { n: parsed.recipes.length })}
          </BusyButton>
        </div>
      )}
    </div>
  );
}
