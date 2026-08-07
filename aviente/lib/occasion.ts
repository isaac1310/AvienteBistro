import { HebrewCalendar, HDate } from '@hebcal/core';

/* §6 — occasion rules. Data, not code: the rows live in `occasion_rules` and this
 * module only resolves them against a date.
 *
 * Three things here are easy to get wrong, and rev 1 of the spec got all three:
 *
 *  1. Holidays are matched on a hebcal KEY, never a stored date. Hebrew dates move
 *     against the Gregorian calendar every year, so stored dates go stale within
 *     twelve months.
 *  2. A Jewish day begins at sundown. The evening of Friday belongs to Shabbat;
 *     Friday *lunch* does not. Getting this wrong titles a lunch menu
 *     "Shabbat Dinner", which is the sort of error a family notices immediately.
 *  3. Yom Kippur break-fast is the evening at the END of the fast, not the
 *     evening that begins it — hence `offset_days` on that rule.
 */

export type OccasionRule = {
  id: string;
  match: { weekday?: number; hebcal?: string; from?: 'evening' | 'day'; offset_days?: number };
  title: string;
  subtitle: string | null;
  ornament: string | null;
  priority: number;
};

export type Occasion = {
  title: string;
  subtitle: string | null;
  ornament: string | null;
};

/** Is this menu an evening meal? A menu with a main course is dinner. */
export type MealTime = 'evening' | 'day';

/** Hebcal descriptions for a given Gregorian date, e.g. ["Erev Rosh Hashana"]. */
function eventsOn(date: Date): string[] {
  const hd = new HDate(date);
  const events = HebrewCalendar.calendar({
    start: hd, end: hd,
    il: true,          // Israeli observance: one day of yom tov, not two
    noMinorFast: false,
    noSpecialShabbat: true,
    noModern: true,
  });
  return events.map((e) => e.getDesc());
}

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Resolve the best-matching rule for a menu date.
 *
 * `date` is the calendar date of the meal; `mealTime` says whether it is eaten
 * after sundown. An evening meal is looked up against the NEXT Gregorian day,
 * because that is the Hebrew day which began at sundown.
 */
export function resolveOccasion(
  date: Date,
  mealTime: MealTime,
  rules: OccasionRule[],
): Occasion | null {
  const matches: OccasionRule[] = [];

  for (const rule of rules) {
    const wants = rule.match.from ?? 'evening';
    // A rule that only applies in the evening must not fire at lunch.
    if (wants === 'evening' && mealTime !== 'evening') continue;

    if (rule.match.weekday != null) {
      // getDay(): 0 = Sunday, 5 = Friday. Friday evening is Shabbat.
      if (date.getDay() === rule.match.weekday) matches.push(rule);
      continue;
    }

    if (rule.match.hebcal) {
      const offset = rule.match.offset_days ?? 0;
      // Evening meals belong to the following Hebrew day, unless a rule says
      // otherwise (break-fast looks at the day the fast ends, not begins).
      const lookAt = addDays(date, mealTime === 'evening' && !offset ? 1 : offset);
      const descs = eventsOn(lookAt);
      if (descs.some((d) => d.toLowerCase().includes(rule.match.hebcal!.toLowerCase()))) {
        matches.push(rule);
      }
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => b.priority - a.priority);
  const best = matches[0];
  return { title: best.title, subtitle: best.subtitle, ornament: best.ornament };
}

/** Upcoming occasions in the next `days`, for the "plan ahead" rows on §3.7. */
export function upcomingOccasions(rules: OccasionRule[], days = 60, from = new Date()) {
  const out: { date: Date; occasion: Occasion }[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(from, i);
    // Only holidays are worth suggesting; every Friday is not news.
    const holidayRules = rules.filter((r) => r.match.hebcal);
    const occasion = resolveOccasion(date, 'evening', holidayRules);
    if (occasion) out.push({ date, occasion });
  }
  // One row per occasion, the first evening it applies.
  const seen = new Set<string>();
  return out.filter((o) => {
    if (seen.has(o.occasion.title)) return false;
    seen.add(o.occasion.title);
    return true;
  });
}

/** "VENDREDI · 08.08.2026" for the top of the menu card. */
const DAYS_FR = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

export function cardDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${DAYS_FR[date.getDay()]} · ${dd}.${mm}.${date.getFullYear()}`;
}
