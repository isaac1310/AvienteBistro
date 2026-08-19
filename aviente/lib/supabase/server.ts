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

  const { data, error } = await db
    .from('family_members')
    .select('id, name, display_name, theme, card_language, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (data) return data;

  /* card_language arrives in migration 0007. Until it is applied, asking for it
     makes Postgres reject the whole SELECT — and because this function only
     returned `data ?? null`, the result was indistinguishable from "not a family
     member": the greeting disappeared and every page treated the owner as a guest.
     A missing column is a deployment lag, not a failed login, so fall back to the
     columns that certainly exist and default the new one. */
  if (error?.code === '42703') {
    const { data: legacy } = await db
      .from('family_members')
      .select('id, name, display_name, theme')
      .eq('user_id', user.id)
      .maybeSingle();
    /* Missing columns default SAFE: everyone is a member until migration 0012 says
       otherwise. An admin who temporarily cannot restore beats a member who
       temporarily can. */
    return legacy ? { ...legacy, card_language: 'he', role: 'member' } : null;
  }

  return null;
}
