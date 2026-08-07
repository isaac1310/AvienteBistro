import type { CategoryKey } from '@/lib/constants';
import styles from './CategoryPlate.module.css';

/**
 * The stand-in for a recipe with no photograph: an engraved plate for its category.
 *
 * Replaces a striped ground with the category emoji. An emoji is somebody else's
 * artwork rendered in somebody else's font, so a wall of them looked like a
 * placeholder in a way that read as unfinished — and most of this book has no
 * photograph, so the fallback IS the look of the app, not an edge case.
 *
 * Drawn INLINE rather than loaded as an image file so `currentColor` resolves
 * against the host and the plate follows the theme's gold. The same trick used as a
 * background-image silently renders black — see app/page.module.css.
 *
 * Stroke-only at one weight, on the cover's engraving vocabulary: nine motifs that
 * sit together as a set rather than nine illustrations that happen to be adjacent.
 */

const MOTIFS: Record<CategoryKey, React.ReactNode> = {
  /* An olive sprig — the thing that arrives before the meal. */
  entrees: (
    <>
      <path d="M14 46 C24 30 38 22 52 20" />
      <path d="M26 36 c-4-6-2-12 4-14 3 5 2 11-4 14z" />
      <path d="M36 28 c-3-6 0-12 6-13 2 6 0 11-6 13z" />
      <path d="M20 42 c-5-4-5-11 0-14 4 4 4 11 0 14z" />
    </>
  ),
  /* A bowl with steam. */
  soups: (
    <>
      <path d="M10 30 h44 a22 22 0 0 1-44 0z" />
      <path d="M6 30 h52" />
      <path d="M26 16 c-4-4 4-6 0-10" />
      <path d="M38 16 c-4-4 4-6 0-10" />
    </>
  ),
  /* A leaf, veined. */
  salads: (
    <>
      <path d="M32 8 C50 18 50 40 32 54 C14 40 14 18 32 8z" />
      <path d="M32 12 v40" />
      <path d="M32 24 l10-6M32 24 l-10-6M32 36 l10-6M32 36 l-10-6" />
    </>
  ),
  /* A cloche — the main event, under a dome. */
  mains: (
    <>
      <path d="M8 44 h48" />
      <path d="M12 44 a20 20 0 0 1 40 0" />
      <path d="M32 24 v-6" />
      <circle cx="32" cy="14" r="3" />
    </>
  ),
  /* A small pan, seen from the side. */
  sides: (
    <>
      <path d="M10 26 h30 v12 a10 10 0 0 1-10 10 h-10 a10 10 0 0 1-10-10z" />
      <path d="M40 30 h14" />
      <path d="M10 26 h30" />
    </>
  ),
  /* A loaf, scored. */
  breads: (
    <>
      <path d="M10 40 c0-14 10-22 22-22 s22 8 22 22z" />
      <path d="M8 40 h48 v6 H8z" />
      <path d="M22 26 l-4 10M32 24 l-4 12M42 26 l-4 10" />
    </>
  ),
  /* A slice of cake with a candle. */
  desserts: (
    <>
      <path d="M14 48 h36 l-6-20 H20z" />
      <path d="M20 28 h24" />
      <path d="M32 28 v-8" />
      <path d="M32 20 c-3-3 3-5 0-7" />
    </>
  ),
  /* A star — the kids' shelf, and the only motif allowed to be cheerful. */
  kids: (
    <>
      <path d="M32 10 l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" />
    </>
  ),
  /* A jar with a label: what goes in the pantry and defies categories. */
  other: (
    <>
      <path d="M20 16 h24 v6 a8 8 0 0 1 4 7 v19 a4 4 0 0 1-4 4 H20 a4 4 0 0 1-4-4 V29 a8 8 0 0 1 4-7z" />
      <path d="M16 32 h32" />
      <path d="M16 42 h32" />
    </>
  ),
};

export default function CategoryPlate({
  category, size = 'thumb',
}: { category: CategoryKey; size?: 'thumb' | 'hero' }) {
  return (
    <span className={`${styles.plate} ${styles[size]}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" className={styles.art} role="presentation">
        <g fill="none" stroke="currentColor" strokeWidth="2.4"
           strokeLinecap="round" strokeLinejoin="round">
          {MOTIFS[category] ?? MOTIFS.other}
        </g>
      </svg>
    </span>
  );
}
