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

  if (!code) {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link-expired`);
  }

  return response;
}
