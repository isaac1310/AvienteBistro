'use client';

import { useLang, useT } from './LangProvider';
import styles from './Loading.module.css';

/**
 * Shown while a route segment is still on the server, and wherever else the app is
 * genuinely waiting.
 *
 * Every page here is server-rendered against Supabase, so a tap on a category can sit
 * for a few hundred milliseconds with nothing happening — and on kitchen wifi rather
 * longer. Without a boundary the app looks frozen and people tap again.
 *
 * The drawing is the delivered `Loader.dc.html`: a baguette on the diagonal, its
 * scores in the muted tone, steam fuming off the crust, over a dashed ground line.
 * Two loaders were rejected before it — a rotating gold diamond that belonged to the
 * retired palette, and a squat loaf I drew in the plate grammar. The plate grammar is
 * why that one failed: a 110×90 motif is furniture, sized to sit beside a line of
 * text, and the thing at the centre of an empty page has to be an ILLUSTRATION. So
 * this one is not a motif and does not come from the generator.
 *
 * Colour comes from CSS tokens rather than the artboard's literals, which matters:
 * the steam is `--primary`, so it is green in the default theme and burgundy in
 * Itzik's. The artboard's #A08A5F appears TWICE with different jobs — the scores are
 * decoration (`--muted`, 2.48:1) and the caption is text (`--muted-ink`, 5.11:1).
 * Using one value for both is the contrast trap this palette was split to close.
 *
 * `size="inline"` is for waits inside a control — a photo uploading, a PDF being
 * rendered. There the wordmark is dropped: a control is not a splash screen.
 */
export default function Loading({
  rows = 0, label, size = 'page', done = false,
}: {
  rows?: number;
  /** Only when the surrounding text does not already say what is being waited for. */
  label?: string;
  size?: 'page' | 'inline';
  /**
   * The finished beat: the steam stops and a tick draws in the same stroke.
   *
   * A loader that simply vanishes leaves nothing behind to say the thing worked —
   * which for an import or a restore is the only question the person had. Held for
   * about 700ms by the caller, not here: this component does not own the clock.
   */
  done?: boolean;
}) {
  const t = useT();
  const lang = useLang();
  /* A SPAN when inline, a DIV when it fills a page — and this is a correctness fix,
     not a preference. Inline loaders live inside <button> and <p>, both of which take
     phrasing content only, so a <div> there is invalid HTML: React reported "In HTML,
     <div> cannot be a descendant of <p>" and the page it happened on failed to
     hydrate — every control on it dead, with the layout looking perfectly fine. The
     span is display:grid, so nothing about the drawing changes.
     Page size keeps the div because it wraps the skeleton <ul>, which a span cannot
     legally contain either. */
  const Wrap = size === 'inline' ? 'span' : 'div';

  return (
    <Wrap className={`${styles.wrap} ${styles[size]}`} role="status" aria-live="polite"
          aria-label={label ?? t('loading')}>
      {/* overflow visible: the steam animates UPWARD out of the box, and the artboard
          draws the topmost curl already touching y=32. */}
      {/* CROPPED when small, and this is the same lesson the category thumbnails
          taught: the artboard puts generous air around the drawing, which is right at
          240px and wrong at 30px — the air ate most of the box, the loaf came out a
          third of its size, and the steam was sub-pixel and simply absent. Reported
          three times as "the loader is not clear enough" and "it has no fumes".
          The crop is to where the ink actually is (the steam starts at y=32 and the
          ground line at y=182 is dropped), so the bread and its steam fill the box. */}
      <svg className={`${styles.art} ${done ? styles.artDone : ''}`}
           viewBox={size === 'inline' ? '10 26 200 152' : '0 0 220 190'}
           fill="none" aria-hidden="true" focusable="false">
        {/* The tick, drawn in the crust's own weight and only when done — same hand as
            the bread, so it reads as the drawing finishing rather than an icon
            arriving from somewhere else. */}
        {done && (
          <path className={styles.tick} d="M92 96 L118 122 L170 66" />
        )}
        <g className={styles.fume}>
          {/* Three curls on one keyframe, staggered — one rising ribbon reads as a
              progress bar, three read as heat coming off bread. */}
          <path d="M78 92 C82 66 94 56 108 66" style={{ animationDelay: '0s' }} />
          <path d="M112 82 C118 52 106 44 114 32" style={{ animationDelay: '0.6s' }} />
          <path d="M146 74 C142 48 130 38 116 48" style={{ animationDelay: '1.2s' }} />
        </g>
        <g className={styles.crust}>
          <path d="M22 168 C14 162 15 152 28 143 L160 68 C172 61 184 60 192 65 C201 70 202 81 190 90 L58 166 C44 174 30 174 22 168 Z" />
          <path d="M22 168 C30 160 44 158 58 166" opacity="0.4" />
          <path d="M192 65 C186 74 184 84 190 90" opacity="0.4" />
        </g>
        <g className={styles.score}>
          <path d="M52 150 C58 142 64 136 72 132" />
          <path d="M86 131 C92 123 98 117 106 113" />
          <path d="M120 112 C126 104 132 98 140 94" />
          <path d="M154 93 C160 85 166 79 174 75" />
        </g>
        <path className={styles.ground} d="M26 182 H192" />
      </svg>

      {size === 'page' && (
        <div className={styles.mark}>
          {/* Latin, always — the wordmark is the one thing on a Hebrew screen that
              does not translate, the same rule the cover and the menu card follow. */}
          <span className={styles.word}>AVIENTE</span>
          {/* Tracking is Latin typography: 3.2px between Hebrew letters breaks the
              word apart, so the class carries it only in English. */}
          <span className={`${styles.caption} ${lang === 'he' ? '' : styles.tracked}`}>
            {t('loading.baking')}
          </span>
        </div>
      )}

      {rows > 0 && (
        <ul className={styles.skeletons} aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className={styles.row} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </ul>
      )}
    </Wrap>
  );
}
