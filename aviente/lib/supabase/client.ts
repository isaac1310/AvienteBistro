import { createBrowserClient } from '@supabase/ssr';

/* The browser client. Safe to ship: the publishable key grants nothing on its own.
 * `anon` is revoked from every table (0002_policies.sql), so an unauthenticated
 * caller gets a privilege error rather than an empty list -- verified against the
 * live project. Access comes from a session, and what a session can see comes from
 * is_family(). */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
