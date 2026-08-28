'use client';

import { useEffect, useState } from 'react';
import { useT } from './LangProvider';
import styles from './KeepAwake.module.css';

/**
 * Stop the screen sleeping while you cook.
 *
 * The one thing a recipe screen does that a document does not: it is read over
 * twenty minutes with both hands busy, and a phone locks itself after thirty
 * seconds. Every wake in between costs a wet thumbprint and finding your place.
 *
 * Opt-in, never automatic. Holding a wake lock drains a battery, and a recipe page
 * left open on a laptop overnight should not be the reason for it — so this is a
 * button someone presses when they start cooking, and it lets go on unmount.
 *
 * `navigator.wakeLock` is Chromium and recent Safari; on anything else the button is
 * absent rather than present-and-inert. The browser also revokes the lock whenever
 * the tab is hidden — switching apps, locking manually — so the release listener
 * puts the button back rather than lying about a lock that is gone.
 */

/* Not in TS's DOM lib in this version. Declared narrowly rather than casting to any,
   so the two calls actually used are still typed. */
type WakeLockSentinel = { released: boolean; release: () => Promise<void>; addEventListener: (t: 'release', f: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } };

export default function KeepAwake() {
  const t = useT();
  const [supported, setSupported] = useState(false);
  const [lock, setLock] = useState<WakeLockSentinel | null>(null);

  /* After mount: reading `navigator` during render makes the server and client
     disagree about whether this button exists, which is a hydration mismatch. */
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Deliberate, and the same trade LoginForm documents: `navigator` can only be
       read AFTER mount, or the button would be absent from the server HTML and then
       appear, which React recovers from by throwing away the server render. The rule
       is flagging the cascading render; the cost here is one extra paint on mount. */
    setSupported(Boolean((navigator as WakeLockNavigator).wakeLock));
  }, []);

  /* Release on unmount — navigating away from the recipe means the cooking is over,
     and a lock that outlives its page is a battery bug nobody can find. */
  useEffect(() => () => { void lock?.release().catch(() => {}); }, [lock]);

  if (!supported) return null;

  async function toggle() {
    if (lock) {
      await lock.release().catch(() => {});
      setLock(null);
      return;
    }
    try {
      const sentinel = await (navigator as WakeLockNavigator).wakeLock!.request('screen');
      /* The browser drops the lock when the tab is hidden and does NOT ask again.
         Without this the button would keep claiming the screen was staying awake. */
      sentinel.addEventListener('release', () => setLock(null));
      setLock(sentinel);
    } catch {
      /* Refused — low battery, or a policy. Silent: the screen simply behaves as it
         did before, and an error strip about a convenience is noise mid-cook. */
      setLock(null);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${lock ? styles.on : ''}`}
      aria-pressed={Boolean(lock)}
      onClick={toggle}
    >
      {lock ? t('recipe.keepAwakeOn') : t('recipe.keepAwake')}
    </button>
  );
}
