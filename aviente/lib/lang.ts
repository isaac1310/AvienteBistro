import 'server-only';
import { cache } from 'react';
import { currentMember } from './supabase/server';
import { dictionary, DEFAULT_LANG, type Lang, type T } from './i18n';

/**
 * The signed-in person's language, and a bound `t` for server components.
 *
 * Cached per request: the layout needs it for `<html lang dir>`, and so does every
 * page underneath. Without the cache each one would ask the database again for a
 * value that cannot change mid-render.
 *
 * A guest gets the default. /login and a shared menu card have no member, and
 * Hebrew is the right guess for this family rather than a fallback to English.
 */
export const currentLang = cache(async (): Promise<Lang> => {
  const member = await currentMember().catch(() => null);
  const value = (member as { language?: string } | null)?.language;
  return value === 'en' || value === 'he' ? value : DEFAULT_LANG;
});

export const serverT = cache(async (): Promise<T> => dictionary(await currentLang()));
