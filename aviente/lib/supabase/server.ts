import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/* The server client, for Server Components and route handlers.
 *
 * `cookies()` is async in this Next version, hence the await. Server Components
 * cannot write cookies, so `setAll` swallows its error by design -- the middleware
 * is what actually refreshes the session cookie on each request. Without that
 * try/catch every page render throws once the token needs refreshing. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component; the middleware handles refresh.
          }
        },
      },
    },
  );
}

/** The signed-in family member, or null. Null means "not one of us" — which is
 *  also what a stranger with a valid Supabase account would get, because the row
 *  is what confers membership, not the account. */
export async function currentMember() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from('family_members')
    .select('id, name, display_name, theme')
    .eq('user_id', user.id)
    .maybeSingle();

  return data ?? null;
}
