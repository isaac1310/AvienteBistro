'use client';

import { useLang } from './LangProvider';
import styles from './Arrow.module.css';

/**
 * A directional arrow that knows which way "back" is.
 *
 * In an RTL interface, back points RIGHT. Every arrow in this app pointed left,
 * because they were written in English and half of them were baked into Hebrew
 * translation strings ('← לספר'), where a designer cannot reach them and each new
 * language repeats the mistake. A Hebrew reader was being told to go back by an arrow
 * pointing forwards.
 *
 * Two things have to be right, and only one of them is the glyph:
 *   - the GLYPH: back is ← in English, → in Hebrew. Forward is the mirror.
 *   - the POSITION: the arrow leads the label, so it belongs on the start edge —
 *     left in English, right in Hebrew. That is layout, not text, so it is done with
 *     flex order in the stylesheet rather than by placing the character inside the
 *     sentence. Putting '→' inside an RTL string does not put it where you expect:
 *     bidi reorders neutral characters by their surroundings, which is exactly how
 *     '← לספר' ended up looking correct in one place and wrong in another.
 *
 * `aria-hidden` throughout: the link's own text says where it goes, and a screen
 * reader announcing "left arrow" adds nothing but noise.
 */
export default function Arrow({ dir = 'back' }: { dir?: 'back' | 'forward' }) {
  const lang = useLang();
  const rtl = lang === 'he';
  const points = dir === 'back' ? (rtl ? '→' : '←') : (rtl ? '←' : '→');
  return <span className={styles.arrow} aria-hidden="true">{points}</span>;
}
