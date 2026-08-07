'use client';

import { useState } from 'react';
import { applySampleDescriptions } from '@/lib/mutations';
import styles from './FillDescriptions.module.css';

/* One-tap replacement for a SQL file that could not be pasted safely.
 * Reports exactly what it did rather than claiming success. */
export default function FillDescriptions() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        disabled={busy}
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
        {busy ? 'Filling…' : '✎ Fill in missing menu descriptions'}
      </button>
      {result && <p className={styles.result}>{result}</p>}
    </div>
  );
}
