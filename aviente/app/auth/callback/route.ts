import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/safeNext';
import { createServerClient } from '@supabase/ssr';

/* Where the magic link lands. Exchanges the one-time code for a session cookie,
 * then forwards to wherever the user was originally headed.
 *
 * Note the response is built FIRST and cookies are written onto it, rather than
 * relying on next/headers — a route handler redirect drops cookies set any other
 * way, and the symptom is a login that appears to work and then bounces straight
 * back to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  /* One shared validator for the client and the callback, so the two cannot
     drift apart. The earlier inline check here missed encoded and backslash
     forms. */
  const target = safeNext(next);

  /* Two arrival shapes, checked in order:
     - `?code=` — the PKCE flow every magic link this app requests uses.
     - `?token_hash=&type=` — what a link minted OUTSIDE the app's own request can
       carry: a dashboard invite, a dashboard magic link, a changed email template.
       Before this branch existed those landed on `missing-code` and read as a
       broken invite. Checked second, so the everyday path stays exactly what it was. */
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const response = NextResponse.redirect(`${origin}${target}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
      token_hash: tokenHash!,
      type: (type ?? 'magiclink') as 'magiclink' | 'invite' | 'email',
    });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link-expired`);
  }

  return response;
}
