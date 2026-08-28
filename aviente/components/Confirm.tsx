'use client';

import { useEffect, useRef } from 'react';
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
 * What a native dialog DID give away for free, and this has to earn back — the
 * first version of this component shipped without any of it, which made a keyboard
 * user's delete worse than the confirm it replaced:
 *
 *  - **Focus moves here on open**, to CANCEL rather than to the destructive button.
 *    Without it the caret stayed on `<body>` and reaching either answer meant
 *    tabbing through the whole navigation.
 *  - **Escape cancels**, captured before it reaches anything else — an Escape that
 *    collapsed the surrounding editor would discard the edits underneath.
 *  - **Focus returns to whatever opened it**, when that control still exists. After
 *    a confirmed delete it usually does not, so the check is `document.contains`
 *    rather than a stored assumption.
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
  const cancelRef = useRef<HTMLButtonElement>(null);
  /* Captured in a ref during the mount effect, not during render: reading
     document.activeElement while rendering is an impure read of live DOM state. */
  const openedBy = useRef<HTMLElement | null>(null);
  /* The pending focus-restore, so a REMOUNT can cancel it. Without this the panel
     opened with the caret still on the trigger in some flows, which is what the
     v11.3.0 release run caught: React runs an effect setup, then its cleanup, then
     the setup again (StrictMode in development does it deliberately; a parent
     re-render can do it any time). The cleanup schedules "put the focus back on the
     trigger" one frame later — and that frame lands AFTER the second setup has
     focused Cancel, so the restore undoes the thing it is supposed to follow. */
  const pendingRestore = useRef<number | null>(null);

  useEffect(() => {
    if (pendingRestore.current !== null) {
      cancelAnimationFrame(pendingRestore.current);
      pendingRestore.current = null;
    }
    /* `??=`, so a re-setup does not re-capture — by then the active element is
       Cancel, and the panel would "restore" focus to itself on close. */
    openedBy.current ??= document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      const el = openedBy.current as (HTMLElement & { disabled?: boolean }) | null;
      /* NEXT FRAME, not immediately. The trigger is disabled while its own panel is
         open — that is what stops a second tap re-opening it — and a disabled
         element cannot take focus. Cleanup runs before React has re-enabled it, so
         focusing here did nothing and the caret stayed in the navigation. One frame
         later the commit is done.
         Both guards matter: the trigger is frequently GONE by now (the row it lived
         in was just deleted), and focusing a detached node sends focus to the body —
         the very thing this exists to prevent. */
      pendingRestore.current = requestAnimationFrame(() => {
        pendingRestore.current = null;
        if (el && document.contains(el) && !el.disabled) el.focus();
      });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      /* Capture phase and stopPropagation, so an Escape meant for this panel cannot
         also reach the editor around it and close that too. */
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel, busy]);

  return (
    /* role="alertdialog" rather than "alert": this asks a question and owns focus
       until it is answered, which is what distinguishes the two roles. */
    <div
      className={`${styles.panel} ${danger ? styles.danger : ''}`}
      role="alertdialog" aria-modal="false" aria-label={message}
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.row}>
        {/* Cancel comes FIRST, in reading order and in the tab order, and carries the
            solid button. The destructive answer is the plain one beside it: the panel
            should not make "yes, destroy it" the easiest thing to hit. */}
        <button
          ref={cancelRef} type="button" className="btn" onClick={onCancel} disabled={busy}
        >
          {t('common.cancel')}
        </button>
        <BusyButton
          className={danger ? styles.confirmDanger : 'btn btn--ghost'}
          busy={busy} type="button" onClick={onConfirm}
        >
          {confirmLabel}
        </BusyButton>
      </div>
    </div>
  );
}
