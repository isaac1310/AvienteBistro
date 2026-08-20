import { MOTIFS, type MotifName } from '@/lib/motifs.generated';
import styles from './Motif.module.css';

/**
 * A small drawing in the blueprint language, wherever an emoji used to stand in.
 *
 * Separate from `Icon` on purpose: those are 64×64 UI glyphs for the nav and the
 * homepage cards, these are 110×90 drawings from the plate grammar. Same reason the
 * generators are separate — one set is furniture, the other is illustration.
 *
 * Inline for the usual reason: `currentColor` does not resolve for an SVG loaded as an
 * image, and every one of these takes its colour from the text beside it.
 *
 * `inner` comes from files in this repo, never from a request or the database.
 */
export default function Motif({
  name, size = 22, strokeWidth, className, title,
}: {
  name: MotifName;
  size?: number;
  /** Thinner as it gets bigger; the default suits 18–28px beside a line of text. */
  strokeWidth?: number;
  className?: string;
  /** Only when the drawing carries meaning the surrounding text does not. */
  title?: string;
}) {
  const m = MOTIFS[name];
  return (
    <svg
      className={`${styles.motif} ${className ?? ''}`}
      width={size}
      height={size * 0.82}
      viewBox={m.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2.2}
      strokeLinecap="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: m.inner }}
    />
  );
}
