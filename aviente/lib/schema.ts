import 'server-only';
import { cache } from 'react';
import { supabaseServer } from './supabase/server';
import { DB_SCHEMA_VERSION } from './version';

/**
 * Does the database have the migrations this build needs?
 *
 * Written after 0008 was merged and never run. The app asked for
 * `menus.meal_time`, Postgres said no, and /menus returned a 500 in production —
 * with nothing anywhere to distinguish "the database is a version behind" from
 * "the code is broken". The version constant existed and was compared to nothing.
 *
 * Deliberately NOT a hard block. A missing migration breaks the pages that touch
 * the new column and leaves the rest of the cookbook perfectly usable, so refusing
 * to render anything would take away more than the bug does. It states the problem
 * and names the file to run.
 */

export type SchemaState =
  | { ok: true; have: number; need: number }
  /* 'untracked' is NOT 'behind at version 0'. The tracking table arrives in 0009,
     so every database that predates it reports nothing while having migrations 1-8
     perfectly well applied. Conflating the two told me to re-run 0001 on a database
     that was one file short — advice that would have been alarming to follow. */
  | { ok: false; have: number; need: number; reason: 'behind' | 'untracked' | 'unknown' };

/** Cached per request: the layout asks, and so may a page. */
export const schemaState = cache(async (): Promise<SchemaState> => {
  const need = DB_SCHEMA_VERSION;
  try {
    const db = await supabaseServer();
    const { data, error } = await db
      .from('schema_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    /* A missing table is the state every database is in until 0009 runs, and it is
       "behind", not "broken".
       PostgREST reports it as PGRST205 ("could not find the table in the schema
       cache"), NOT Postgres's own 42P01 — it never gets as far as the database. I
       branched on 42P01 first and the banner stayed silent on exactly the condition
       it exists to announce, which is the same shape of bug as the one it is here to
       catch. Both are accepted; anything else — no session, RLS, network — is not
       evidence about the schema and must not be reported as a missing migration. */
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { ok: false, have: 0, need, reason: 'untracked' };
      }
      return { ok: false, have: -1, need, reason: 'unknown' };
    }

    const have = data?.version ?? 0;
    return have >= need ? { ok: true, have, need } : { ok: false, have, need, reason: 'behind' };
  } catch {
    return { ok: false, have: -1, need, reason: 'unknown' };
  }
});
