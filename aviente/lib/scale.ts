import type { Ingredient, Unit } from './constants';

/* Serving scaling, per §5.2. Every rule here exists because the naive version is
 * wrong in a way that would mislead someone cooking. */

const UNIT_LABEL: Record<Unit, string> = {
  kg: 'kg', g: 'g', ml: 'ml', l: 'l',
  cup: 'cup', pcs: '', tbsp: 'tbsp', tsp: 'tsp',
  pinch: 'pinch', 'to taste': 'to taste',
};

/** Units that must never be multiplied: they are statements, not quantities. */
const UNSCALABLE: Unit[] = ['to taste', 'pinch'];

/** Whole-item units. Half an egg is not a thing you can put in a bowl. */
const COUNTABLE: Unit[] = ['pcs'];

export type ScaledAmount = {
  text: string;          // ready to render, e.g. "600–750 g" or "5 (≈)"
  approximate: boolean;  // true when rounding moved the number
};

/** Two significant decimals, and no trailing zeroes. */
function tidy(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

/** g→kg and ml→l above 1000, so a scaled-up recipe stays readable. */
function promote(amount: number, unit: Unit | null): { amount: number; unit: Unit | null } {
  if (unit === 'g' && amount >= 1000) return { amount: amount / 1000, unit: 'kg' };
  if (unit === 'ml' && amount >= 1000) return { amount: amount / 1000, unit: 'l' };
  return { amount, unit };
}

/**
 * Render one ingredient's amount at a given scale factor.
 *
 * Returns null when there is nothing to show — an ingredient with no quantity
 * ("בצל ירוק") is legitimate and must render as a bare name, not as "0".
 */
export function scaleAmount(ing: Ingredient, factor: number): ScaledAmount | null {
  const unit = ing.unit;

  // 'to taste' and 'pinch' pass through untouched at any scale.
  if (unit && UNSCALABLE.includes(unit)) {
    return { text: UNIT_LABEL[unit], approximate: false };
  }

  if (ing.amount == null) {
    // A unit with no number still means one of it ("כף שמיר" was normalised to 1,
    // but be defensive): show the unit alone rather than nothing.
    return unit ? { text: UNIT_LABEL[unit], approximate: false } : null;
  }

  const scaleOne = (value: number) => {
    const scaled = value * factor;
    if (unit && COUNTABLE.includes(unit)) {
      // Round UP: 3 eggs at ×1.5 is 5, not 4.5 and not 4.
      const whole = Math.ceil(scaled - 1e-9);
      return { value: whole, approximate: Math.abs(whole - scaled) > 1e-9 };
    }
    return { value: scaled, approximate: false };
  };

  const lo = scaleOne(ing.amount);
  const hi = ing.amount_max == null ? null : scaleOne(ing.amount_max);

  // Ranges scale at BOTH ends: 400–500 g at ×1.5 is 600–750 g. A single column
  // would have silently dropped the upper bound.
  if (hi) {
    const a = promote(lo.value, unit);
    const b = promote(hi.value, unit);
    const suffix = UNIT_LABEL[b.unit ?? 'g'] ?? '';
    return {
      text: `${tidy(a.amount)}–${tidy(b.amount)}${suffix ? ` ${suffix}` : ''}`.trim(),
      approximate: lo.approximate || hi.approximate,
    };
  }

  const { amount, unit: promoted } = promote(lo.value, unit);
  const suffix = promoted ? UNIT_LABEL[promoted] : '';
  return {
    text: `${tidy(amount)}${suffix ? ` ${suffix}` : ''}`.trim(),
    approximate: lo.approximate,
  };
}

/**
 * The serving options offered by the dropdown.
 *
 * Returns an empty list when `servings` is null — a recipe measured by output
 * (the ginger concentrate's "כ-1 ליטר") has no portion count to scale against, so
 * the control must not appear at all rather than appear and do nothing.
 */
export function servingOptions(servings: number | null): number[] {
  if (!servings || servings <= 0) return [];
  const set = new Set<number>([servings]);
  for (const n of [1, 2, 4, 6, 8, 10, 12, 16, 20]) {
    if (n >= 1 && n <= servings * 4) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export const scaleFactor = (target: number, base: number | null) =>
  !base || base <= 0 ? 1 : target / base;
