import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/* Refreshes the Supabase session on every request and keeps signed-out visitors
 * out of the cookbook.
 *
 * This is Next 16's `proxy.ts` convention. The old `middleware.ts` filename is
 * deprecated and warns on every boot -- same semantics, different filename and
 * exported function name.
 *
 * Two things here are easy to get subtly wrong:
 *
 *  1. The response object must be rebuilt after Supabase sets cookies, and the
 *     request's own cookies updated too, or a refreshed token is dropped and the
 *     user is silently logged out on the next navigation.
 *  2. `getUser()` must be called — not `getSession()`. getSession trusts the
 *     cookie without verifying it against the auth server, which is exactly the
 *     wrong thing to base an access decision on.
 */

/** Reachable without a session. Everything else requires one. */
const PUBLIC = [
  '/login',
  '/auth',      // the magic-link callback
  '/m',         // guest menu share pages — secret-gated, no account by design
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Remember where they were headed so the magic link returns them there.
    if (path !== '/') url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Signed in and sitting on the login screen: send them home.
  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, the icons, and the selftest script --
    // which must stay reachable so the suite can run without a session.
    '/((?!_next/static|_next/image|favicon.ico|brand/|selftest\\.js|manifest\\.webmanifest).*)',
  ],
};
