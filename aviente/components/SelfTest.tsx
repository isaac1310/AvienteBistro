'use client';

import { useEffect } from 'react';

/**
 * Loads public/selftest.js when the URL carries ?selftest=1, the way TravelHub
 * does it (index.html ~6495). Nothing ships to a normal page load: no script tag,
 * no bundle weight, and the pure functions below are only attached on demand.
 *
 * TravelHub exposes `mergeStates` on window for the same reason — the suite has to
 * exercise real logic, not a copy of it.
 */
export default function SelfTest() {
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('selftest')) return;

    let cancelled = false;
    (async () => {
      // Dynamic imports so neither module is pulled into the normal client bundle.
      const [parse, scale, occasion, kids] = await Promise.all([
        import('@/lib/recipeParse.mjs'),
        import('@/lib/scale'),
        import('@/lib/occasion'),
        import('@/lib/constants'),
      ]);
      if (cancelled) return;
      (window as unknown as { Aviente: unknown }).Aviente = {
        resolveOccasion: occasion.resolveOccasion,
        cardDate: occasion.cardDate,
        mondayOf: kids.mondayOf,
        addWeeks: kids.addWeeks,
        weekLabel: kids.weekLabel,
        scaleAmount: scale.scaleAmount,
        servingOptions: scale.servingOptions,
        scaleFactor: scale.scaleFactor,
        parseIngredientLine: parse.parseIngredientLine,
        normalizeIngredient: parse.normalizeIngredient,
        normalizeStep: parse.normalizeStep,
        normalizeRecipe: parse.normalizeRecipe,
        normalizeDocument: parse.normalizeDocument,
        parsePastedJson: parse.parsePastedJson,
        splitTitle: parse.splitTitle,
        mapCategory: parse.mapCategory,
        parseAmount: parse.parseAmount,
        parseNumber: parse.parseNumber,
      };

      const s = document.createElement('script');
      s.src = '/selftest.js';
      s.defer = true;
      document.body.appendChild(s);
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
