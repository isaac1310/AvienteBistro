/**
 * "Today", where the family lives.
 *
 * `new Date()` is the server's clock, and on Vercel that is UTC. Between midnight
 * and 03:00 Jerusalem the server still thinks it is yesterday — verified, not
 * assumed: 00:30 on the 8th in Jerusalem is 21:30 on the 7th in UTC. In that window
 * the kids planner opened on last week and "upcoming occasions" started a day late.
 *
 * `family_settings.timezone` has held 'Asia/Jerusalem' since migration 0001 and was
 * read by nothing. This is the read.
 *
 * NOT a fix for the occasion anchors. Those build a Date from local Y/M/D parts
 * (`${date}T18:00:00`), which round-trips correctly in any server zone — a real
 * property of that construction, and worth stating so nobody "fixes" it later.
 */

/** The default until family_settings is plumbed through; it is also its stored value. */
export const FAMILY_TZ = 'Asia/Jerusalem';

/**
 * Today's calendar date in `tz`, as YYYY-MM-DD.
 *
 * en-CA formats as ISO, which is the one locale trick here worth knowing — it avoids
 * hand-assembling parts and getting month padding wrong.
 */
export function todayIn(tz: string = FAMILY_TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/**
 * A Date anchored at noon on today-in-`tz`.
 *
 * Noon so that nothing downstream — getDay(), getDate(), hebcal's HDate — can be
 * pushed across a day boundary by a few hours of offset in either direction.
 */
export function todayAnchor(tz: string = FAMILY_TZ, now: Date = new Date()): Date {
  return new Date(`${todayIn(tz, now)}T12:00:00`);
}
