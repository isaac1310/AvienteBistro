'use client';

import { useEffect, useRef, useState } from 'react';
import Loading from './Loading';
import styles from './BusyButton.module.css';

/**
 * A button that shows the baguette while it works, and a tick when it is finished.
 *
 * Written because the sweep found the same omission in nine places. Most actions in
 * this app swapped their label ("Importing…") or, worse, only went `disabled` — the
 * kids planner disabled ten controls and said nothing at all, so a slow week looked
 * like an app that had stopped responding. Three call sites out of twelve had a
 * loader; the rest had good intentions.
 *
 * Two behaviours are worth knowing:
 *
 *  - The loader keeps a MINIMUM on screen (`FLOOR`). Without it a fast action shows
 *    the drawing for one frame, which reads as a glitch rather than an answer — the
 *    lesson from the sort control, where a correct loader was invisible in practice.
 *  - `done` is shown only when the caller asks for it, because it is wrong wherever
 *    the page navigates away on success: a tick, then a new page, is one beat too
 *    many. Save buttons pass nothing; import and restore pass `done`.
 *
 * The label does not change while busy unless `busyLabel` is given: a button that
 * swaps its text AND grows a drawing moves everything under it twice.
 */
export default function BusyButton({
  busy, done = false, onClick, children, busyLabel, className = 'btn',
  disabled = false, type = 'button', doneLabel,
}: {
  busy: boolean;
  /** Show the finished beat after the wait. Omit where success navigates away. */
  done?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  busyLabel?: React.ReactNode;
  doneLabel?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  /** True from the moment work starts until the floor has elapsed. */
  const [holding, setHolding] = useState(false);
  const since = useRef(0);
  const FLOOR = 500;

  useEffect(() => {
    if (busy) {
      since.current = performance.now();
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         Deliberate: `holding` TRAILS `busy` — it exists precisely to outlive it, so
         it can only be derived by watching busy change. The cascading render is one
         extra paint at the start of a wait that is about to last half a second. */
      setHolding(true);
      return;
    }
    if (!holding) return;
    const left = FLOOR - (performance.now() - since.current);
    if (left <= 0) { setHolding(false); return; }
    const timer = setTimeout(() => setHolding(false), left);
    return () => clearTimeout(timer);
  }, [busy, holding]);

  const waiting = busy || holding;

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || waiting}
      aria-busy={waiting}
    >
      <span className={styles.inner}>
        {(waiting || done) && (
          /* aria-hidden on the loader: the button's own text says what is happening,
             and `aria-busy` above is what a screen reader acts on. Two announcements
             of the same wait is noise. */
          <span className={styles.mark} aria-hidden="true">
            <Loading size="inline" done={!waiting && done} />
          </span>
        )}
        {waiting ? (busyLabel ?? children) : (done ? (doneLabel ?? children) : children)}
      </span>
    </button>
  );
}
