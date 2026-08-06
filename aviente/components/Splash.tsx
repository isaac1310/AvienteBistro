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
 */

const MIN_MS = 1700;   // TravelHub's SPLASH_MIN_MS -- long enough to read the name
const FADE_MS = 450;

export default function Splash({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'showing' | 'hiding' | 'gone'>('showing');

  useEffect(() => {
    // ?splash=hold pins it open. §9 needs this: 1.7s is shorter than a screenshot
    // round-trip, so without a hold the splash cannot be visually asserted by the
    // test agent -- or looked at properly on a real phone.
    if (new URLSearchParams(location.search).get('splash') === 'hold') return;

    const start = Date.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const floor = reduced ? 600 : MIN_MS;

    let fadeTimer: ReturnType<typeof setTimeout>;
    const dismiss = () => {
      const wait = Math.max(0, floor - (Date.now() - start));
      setTimeout(() => {
        setPhase('hiding');
        fadeTimer = setTimeout(() => setPhase('gone'), FADE_MS);
      }, wait);
    };

    // Fonts are the slow part of the first paint here, and a wordmark that swaps
    // face mid-fade looks broken -- so wait for them, with readyState as the floor.
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(dismiss, dismiss);

    // Any deliberate input means "I know what this is, let me in."
    const skip = () => { setPhase('hiding'); fadeTimer = setTimeout(() => setPhase('gone'), FADE_MS); };
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
          <Cachet variant="plaque" subtitle="Livre de Recettes de Famille" />
          <p className={styles.foot}>Chez Nous</p>
        </div>
      )}
      {children}
    </>
  );
}
