'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from './LangProvider';
import Confirm from './Confirm';
import { clearTicks } from './Ingredients';
import styles from './CookMode.module.css';

/**
 * Cooking mode: one screen for the twenty minutes both hands are busy.
 *
 * It replaced two separate controls — a "keep the screen awake" button and an
 * always-on ingredient checklist — that sat inside the ordinary recipe page with
 * the hero photo, the action row and the navigation bar still around them. Cooking
 * is a different activity from reading, so it gets a different page: the sheet
 * laid out like the printed one (ingredients beside method), ticks on, the screen
 * held awake, and nothing else.
 *
 * It is an OVERLAY on the same URL rather than a route. Leaving must be guarded,
 * and a guard is only honest if it catches every exit: the Exit button, the browser
 * Back gesture, and closing the tab. Back is caught by pushing a history entry on
 * enter and listening for popstate; cancelling the confirm pushes it again so the
 * gesture cannot slip past on the second try. Closing the tab gets the plain
 * beforeunload prompt — the only guard a browser allows there.
 *
 * Exiting clears the ticks (Itzik's call): a checklist is for THIS cook, and a
 * half-ticked list surfacing next week reads as "did I add the salt already?".
 */

/* Not in TS's DOM lib in this version. Declared narrowly rather than casting to any. */
type WakeLockSentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: 'release', f: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } };

/**
 * Hold the screen awake while `active`. Silent on refusal (low battery, policy):
 * the screen simply behaves as before, and an error strip mid-cook is noise. The
 * browser drops the lock whenever the tab is hidden and does not re-request it, so
 * it is asked for again when the tab comes back.
 */
function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!active) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let alive = true;
    const request = async () => {
      if (!alive || document.visibilityState !== 'visible' || lock.current) return;
      try {
        const s = await nav.wakeLock!.request('screen');
        s.addEventListener('release', () => { if (lock.current === s) lock.current = null; });
        lock.current = s;
      } catch { /* refused — see above */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void request(); };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [active]);
}

export default function CookMode({
  recipeId, title, ingredients, method,
}: {
  recipeId: string;
  title: string;
  /** The Ingredients component, rendered by the server with ticks ON. */
  ingredients: ReactNode;
  /** The method list, rendered by the server. */
  method: ReactNode;
}) {
  const t = useT();
  const [cooking, setCooking] = useState(false);
  const [asking, setAsking] = useState(false);
  /* True while WE are the ones calling history.back() to unwind the entry pushed on
     enter — that popstate must not be mistaken for a Back gesture and re-ask. */
  const unwinding = useRef(false);
  const opener = useRef<HTMLButtonElement>(null);

  useWakeLock(cooking);

  const finish = useCallback(() => {
    clearTicks(recipeId);
    setAsking(false);
    setCooking(false);
    try { document.body.style.overflow = ''; } catch { /* no DOM */ }
    /* Focus back on the control that started it, once the overlay is gone. */
    requestAnimationFrame(() => opener.current?.focus());
  }, [recipeId]);

  function enter() {
    setCooking(true);
    try {
      history.pushState({ aviente: 'cooking' }, '');
      document.body.style.overflow = 'hidden';
    } catch { /* history unavailable — Back simply leaves, which is the browser's call */ }
  }

  /* The Exit button: ask; on yes, unwind our history entry, which fires popstate,
     which `finish`es below. */
  function onExit() { setAsking(true); }
  function confirmExit() {
    unwinding.current = true;
    history.back();
  }

  /* Back gesture / button. */
  useEffect(() => {
    if (!cooking) return;
    const onPop = () => {
      if (unwinding.current) { unwinding.current = false; finish(); return; }
      /* A real Back: put the entry straight back so the page does not change under
         the question, then ask. Confirming unwinds it properly. */
      history.pushState({ aviente: 'cooking' }, '');
      setAsking(true);
    };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [cooking, finish]);

  return (
    <>
      <button ref={opener} type="button" className="btn btn--ghost" onClick={enter}>
        {t('recipe.cookMode')}
      </button>

      {/* Portalled to <body>: as a child of the action row it inherited that row's
          per-button layout rules, and a fixed overlay inside a flex row is one
          transform away from being clipped. */}
      {cooking && createPortal(
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('recipe.cooking')}>
          <header className={styles.bar}>
            <span className={styles.eyebrow}>{t('recipe.cooking')}</span>
            <h1 className={styles.title} lang="he" dir="auto">{title}</h1>
            <button type="button" className={`btn btn--ghost ${styles.exit}`} onClick={onExit}>
              {t('recipe.exitCook')}
            </button>
          </header>

          {asking && (
            <div className={styles.confirm}>
              <Confirm
                message={t('recipe.exitCookConfirm')}
                confirmLabel={t('recipe.exitCook')}
                danger={false}
                onConfirm={confirmExit}
                onCancel={() => setAsking(false)}
              />
            </div>
          )}

          <div className={styles.sheet}>
            <div className={styles.ingredients}>{ingredients}</div>
            <div className={styles.method}>{method}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
