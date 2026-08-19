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
    .select('id, name, display_name, theme, language, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (data) return data;

  /* `language` is `card_language` renamed in migration 0014, and `role` arrives in
     0012. Until those run, asking for them makes Postgres reject the whole SELECT —
     and because this function once returned only `data ?? null`, the result was
     indistinguishable from "not a family member": the greeting vanished and every
     page treated the owner as a guest. A missing column is a deployment lag, not a
     failed login. */
  if (error?.code === '42703') {
    const { data: legacy } = await db
      .from('family_members')
      .select('id, name, display_name, theme')
      .eq('user_id', user.id)
      .maybeSingle();
    /* Missing columns default SAFE: everyone is a member until migration 0012 says
       otherwise. An admin who temporarily cannot restore beats a member who
       temporarily can. */
    /* Defaults chosen to be safe rather than convenient: Hebrew because it is the
       app's default language, and 'member' because an admin who temporarily cannot
       restore a backup beats a member who temporarily can. */
    return legacy ? { ...legacy, language: 'he', role: 'member' } : null;
  }

  return null;
}
