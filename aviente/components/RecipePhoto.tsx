'use client';

import { useState } from 'react';
import CategoryPlate from './CategoryPlate';
import type { CategoryKey } from '@/lib/constants';

/**
 * A recipe's photograph, with the category plate behind it.
 *
 * This exists because of a real broken image on /recipes/mains: one recipe carries a
 * `photo_path` whose object is not in Storage, so the signed URL 404s and the card
 * showed the browser's broken-image icon. Signing cannot detect that — a signature
 * over a path that holds nothing is a perfectly valid signature, and the only place
 * the truth arrives is the img's error event.
 *
 * So the fallback is the same drawing the recipe would have had with no photograph at
 * all. A dangling path now looks like a recipe waiting for its picture, which is what
 * it is, rather than like a broken app.
 */
export default function RecipePhoto({
  src, category, className, heroPlate = false,
}: {
  src: string;
  category: string;
  className?: string;
  /** The recipe page's wide slot, where the plate has room for its caption. */
  heroPlate?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return <CategoryPlate category={category as CategoryKey}
      size={heroPlate ? 'hero' : undefined} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs
    <img src={src} alt="" className={className} loading="lazy"
      onError={() => setBroken(true)} />
  );
}
