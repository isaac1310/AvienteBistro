import { KIDS_ART, type KidsArtName } from '@/lib/kidsArt.generated';

/**
 * A drawn animal or decoration for the kids' section.
 *
 * Replaces the emoji these used to be. On a Samsung Ultra the butterflies did not
 * render at all, and rather than chase which platform ships which codepoint the
 * drawings are ours — same rule as the nav icons and the blueprint plates.
 *
 * Inline for the usual reason: `currentColor` does not resolve for an SVG loaded as
 * an image, and every one of these takes its colour from the day it belongs to.
 */
export default function KidsArt({
  name, size = 28, strokeWidth = 2.4, className, title,
}: {
  name: KidsArtName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Give it a title only when the drawing carries meaning of its own. */
  title?: string;
}) {
  const art = KIDS_ART[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={art.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: art.inner }}
    />
  );
}
