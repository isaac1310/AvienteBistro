'use client';

import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import styles from './Confirm.module.css';

/**
 * "Are you sure?", in the page.
 *
 * Every destructive action here used `window.confirm`, and it has two faults that
 * only showed up under use:
 *
 *  1. **It is suppressed outright in embedded browsers** — it returns false without
 *     asking anyone. The People page's delete looked like a dead button because of
 *     exactly this, and the same trap sat under menu cancel, hiding a course with
 *     dishes in it, taking a kids' day out, clearing a week, and restoring a
 *     revision. A guard that silently answers "no" is not a guard; it is a wall.
 *  2. **It cannot be driven by the regression agent**, so the most dangerous flows
 *     in the app were the only untestable ones.
 *
 * It is also the wrong shape for a phone: a native sheet arrives detached from the
 * thing it is about, in the browser's language, with the browser's two buttons.
 * This panel sits under the control that opened it and says what will happen.
 *
 * `danger` is the default because everything asking this question destroys
 * something; pass `danger={false}` where it merely discards a draft.
 */
export default function Confirm({
  message, confirmLabel, onConfirm, onCancel, busy = false, danger = true,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  const t = useT();
  return (
    /* role="alert" so a screen reader is told without having to find it — this
       appears in response to a tap, and the tap was the question. */
    <div className={`${styles.panel} ${danger ? styles.danger : ''}`} role="alert">
      <p className={styles.message}>{message}</p>
      <div className={styles.row}>
        <BusyButton
          className={danger ? styles.confirmDanger : 'btn'}
          busy={busy} type="button" onClick={onConfirm}
        >
          {confirmLabel}
        </BusyButton>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
