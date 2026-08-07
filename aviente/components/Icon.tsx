import { ICONS, type IconName } from '@/lib/icons.generated';

/**
 * One drawn icon, in the same grammar as the blueprint plates.
 *
 * These replaced emoji — 🧸 🕯️ ✒️ ⚙ on the homepage and the typographic marks in the
 * nav. Emoji are somebody else's artwork in somebody else's font: platform-dependent,
 * full-colour, and beside the engraved plates they read as a different app. The gear
 * and the nib did not even match each other in weight.
 *
 * Inline, not an <img> or a background-image: they are stroked with `currentColor`,
 * which does not resolve against the host in either of those. The source files are
 * generated into lib/icons.generated.ts by `npm run icons`.
 *
 * `inner` comes from files in this repo, never from a request or the database, so
 * dangerouslySetInnerHTML here is not an injection surface.
 */
export default function Icon({
  name, size = 20, strokeWidth = 2.4, className,
}: {
  name: IconName;
  size?: number;
  /** Lighter at small sizes: 2.4 on a 64 grid is heavy once drawn at 20px. */
  strokeWidth?: number;
  className?: string;
}) {
  const icon = ICONS[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: icon.inner }}
    />
  );
}
