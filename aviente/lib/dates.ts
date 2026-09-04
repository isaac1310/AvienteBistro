import type { T } from './i18n';

/**
 * Dates as this app says them. Two helpers that had each been copied twice.
 *
 * `shortDate` — dd/mm/yy, the format Itzik asked for and the unambiguous one here.
 * NOT toLocaleDateString: that follows the SERVER's locale, which on Vercel is en-US,
 * so a recipe added on the fourth of August printed 8/4 and read as the eighth of
 * April. Built by hand from the parts so the order cannot drift with a deploy region.
 *
 * `timeAgo` — "8 days ago" in the reader's language. Takes `t` because callers are
 * server components (no hook) and it reads the clock.
 */
export function shortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${p(d.getFullYear() % 100)}`;
}

export function timeAgo(iso: string, t: T): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minsAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? t('time.hourAgo') : t('time.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 31) return days === 1 ? t('time.dayAgo') : t('time.daysAgo', { n: days });
  const months = Math.round(days / 30);
  return months === 1 ? t('time.monthAgo') : t('time.monthsAgo', { n: months });
}
