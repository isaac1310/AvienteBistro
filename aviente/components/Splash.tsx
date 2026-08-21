'use client';

import { useEffect, useState } from 'react';
import Cachet from './Cachet';
import styles from './Splash.module.css';

/**
 * The opening screen: the closed cover of the book.
 *
 * The timing model is lifted from TravelHub's boot splash (index.html ~6490),
 * which works well in practice. Three things it gets right and a naive fixed
 * timer does not:
 *
 *  1. A MINIMUM duration, not a fixed one. It leaves when the app is ready but
 *     never before 1700ms, so a warm cache doesn't reduce the splash to a flicker
 *     and a cold one doesn't dump you on a half-built page.
 *  2. It stops existing when it's done. TravelHub's comment is exact -- "so it can
 *     never eat a tap". During a fade an opaque overlay is still hit-testable, so
 *     this one drops pointer-events the instant it starts hiding and unmounts
 *     entirely once the fade ends.
 *  3. Reduced motion shortens the wait rather than removing the animation. Killing
 *     the fade alone would leave the cover sitting there at full opacity.
 *  4. It runs ONCE per tab. This component only wraps the homepage, so tapping Home
 *     from anywhere remounted it and played the whole cover again — a 1.7s cover is
 *     an arrival, and the fourth time in a minute it is an obstacle. sessionStorage,
 *     not localStorage: opening the app tomorrow should feel like opening a book.
 */

const MIN_MS = 1700;   // TravelHub's SPLASH_MIN_MS -- long enough to read the name
const FADE_MS = 450;
const SEEN = 'aviente.splash.seen';

export default function Splash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'showing' | 'hiding' | 'gone'>('showing');

  /* Checked after mount, never during render: sessionStorage does not exist on the
     server, so deciding the first paint from it makes server and client disagree and
     React throws away the server HTML to recover. Starting shown and hiding
     immediately costs one frame; a hydration mismatch costs the whole page. */
  useEffect(() => {
    /* ?splash=hold wins over the seen-flag. The hold exists so the cover can be
       screenshotted and looked at on a real phone, and once the once-per-tab flag
       was added it silently stopped working — the flag was checked first, so the one
       affordance for INSPECTING the splash was defeated by the optimisation that
       stops it being a nuisance. */
    if (new URLSearchParams(location.search).get('splash') === 'hold') return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Deliberate: sessionStorage is browser-only, so the once-per-tab flag can only
       be read after mount. Seeding state from it would mismatch the server HTML. */
    if (sessionStorage.getItem(SEEN)) setPhase('gone');
  }, []);

  useEffect(() => {
    // ?splash=hold pins it open. §9 needs this: 1.7s is shorter than a screenshot
    // round-trip, so without a hold the splash cannot be visually asserted by the
    // test agent -- or looked at properly on a real phone.
    if (new URLSearchParams(location.search).get('splash') === 'hold') return;
    if (sessionStorage.getItem(SEEN)) return;

    const start = Date.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const floor = reduced ? 600 : MIN_MS;

    let fadeTimer: ReturnType<typeof setTimeout>;
    const dismiss = () => {
      const wait = Math.max(0, floor - (Date.now() - start));
      setTimeout(() => {
        try { sessionStorage.setItem(SEEN, '1'); } catch { /* see skip() */ }
        setPhase('hiding');
        fadeTimer = setTimeout(() => setPhase('gone'), FADE_MS);
      }, wait);
    };

    // Fonts are the slow part of the first paint here, and a wordmark that swaps
    // face mid-fade looks broken -- so wait for them, with readyState as the floor.
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(dismiss, dismiss);

    // Any deliberate input means "I know what this is, let me in."
    const skip = () => {
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode: it just plays again */ }
      setPhase('hiding');
      fadeTimer = setTimeout(() => setPhase('gone'), FADE_MS);
    };
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(fadeTimer);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, []);

  return (
    <>
      {phase !== 'gone' && (
        <div
          className={`${styles.splash} ${phase === 'hiding' ? styles.hiding : ''}`}
          role="status"
          aria-label="Aviente"
        >
          {/* No "Chez Nous". The new design's lockup is AVIENTE / the tagline /
              EST. 2018 and nothing else — the French framing belonged to an app whose
              chrome was English with French accents, and the chrome is Hebrew now. */}
          {/* 5A — every tier in the muted stone. Chosen over 4A for the cover: softer, and
              closer to a printed endpaper. The HEADER stays 4A (ink name, green
              tagline), where the extra contrast is worth having because it sits above
              real content rather than on a blank field. */}
          <Cachet variant="est" />
        </div>
      )}
      {children}
    </>
  );
}
