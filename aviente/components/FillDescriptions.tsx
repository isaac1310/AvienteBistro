'use client';

import { useState } from 'react';
import { applySampleDescriptions } from '@/lib/mutations';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import styles from './FillDescriptions.module.css';

/* One-tap replacement for a SQL file that could not be pasted safely.
 * Reports exactly what it did rather than claiming success. */
export default function FillDescriptions() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      {/* `done` because this stays on the page and reports a count — the tick is
          what says the count is final rather than still arriving. */}
      <BusyButton
        busy={busy}
        done={!!result}
        className={styles.button}
        busyLabel={t('fill.filling')}
        doneLabel={t('fill.filled')}
        onClick={async () => {
          setBusy(true); setResult(null);
          try {
            const r = await applySampleDescriptions();
            setResult(
              `${r.filled} filled in` +
              (r.skipped ? ` · ${r.skipped} already had one` : '') +
              (r.missing.length ? ` · ${r.missing.length} not found in the book` : ''),
            );
            /* Deliberately NOT router.refresh(): it remounts this component and
               wipes the message that just explained what happened. Descriptions
               show on menu cards, not on this page, so there is nothing here to
               refresh anyway. */
          } catch (e) {
            setResult(e instanceof Error ? e.message : 'That did not work.');
          } finally { setBusy(false); }
        }}
      >
        {t('fill.action')}
      </BusyButton>
      {result && <p className={styles.result}>{result}</p>}
    </div>
  );
}
