'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safeNext';
import styles from './login.module.css';

/* Magic link, and nothing else.
 *
 * There was a six-digit code beside it, for the case a magic link cannot handle:
 * the link is completed by the browser that ASKED for it, so requesting on a laptop
 * and opening on a phone fails, and fails looking like an expired link. That path is
 * cancelled — the email carries a link only — so the screen states the constraint
 * instead of offering a way round it.
 *
 * Public signup is off in the dashboard, so signInWithOtp cannot create an account:
 * an unknown address is simply refused. That toggle is the access gate, not this
 * form.
 */
export default function LoginForm({ e2eAvailable }: { e2eAvailable: boolean }) {
  const router = useRouter();
  /* Validated, not trusted — see lib/safeNext.ts. */
  const next = safeNext(useSearchParams().get('next'));

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The password form is localhost-only: the flag alone is not enough, so setting
  // NEXT_PUBLIC_E2E in Vercel by mistake cannot expose it on the real site.
  //
  // The hostname check MUST happen after mount, not inline. Reading `window`
  // during render makes the server and client disagree about whether this block
  // exists, which is a hydration mismatch -- and React's recovery is to discard
  // the server HTML and re-render, so the whole form flickers. Start false
  // everywhere, then reveal.
  const [showE2E, setShowE2E] = useState(false);
  const [password, setPassword] = useState('');
  const [localOnly, setLocalOnly] = useState(false);

  useEffect(() => {
    setLocalOnly(e2eAvailable
      && ['localhost', '127.0.0.1'].includes(window.location.hostname));
  }, [e2eAvailable]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const db = supabaseBrowser();
    const { error } = await db.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,   // belt and braces alongside the dashboard toggle
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) { setError(readable(error.message)); return; }
    setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const db = supabaseBrowser();
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError(readable(error.message)); return; }
    router.replace(next);
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <div className={styles.sent}>
          <p><strong>Check your email.</strong> Tap the link in it and you are in.</p>
          {/* Said explicitly, because the failure is silent and looks like a broken
              app: a magic link is completed by the browser that ASKED for it, so a
              link requested here and opened on another device fails, and fails
              looking like an expired link.
              This used to have an answer on the screen — a six-digit code from the
              same email, which works anywhere. That was cancelled: the email now
              carries a link and nothing else, so the only remaining answer is to
              open it here. */}
          <p>Open it on this device — a link only signs in the browser that asked
            for it.</p>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.linkish}
          onClick={() => { setSent(false); setError(null); }}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={sendLink}>
        <label className={styles.label} htmlFor="email">Your email</label>
        <input
          id="email" className={styles.field} type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" autoFocus required placeholder="you@example.com"
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn" type="submit" disabled={busy || !email.includes('@')}>
          {busy ? 'Sending…' : 'Send me a link'}
        </button>
        <p className={styles.hint}>No password to remember — we email you a link.</p>

        {localOnly && (
          <details className={styles.e2e} open={showE2E}
            onToggle={(e) => setShowE2E((e.target as HTMLDetailsElement).open)}>
            <summary>Password sign-in · local only</summary>
            <div className={styles.e2eBody}>
              <input
                className={styles.field} type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder="password"
              />
              <button className="btn btn--ghost" type="button"
                onClick={signInWithPassword} disabled={busy || !password}>
                Sign in
              </button>
            </div>
          </details>
        )}
      </form>
    </>
  );
}

/** Supabase's messages are accurate and unhelpful. Say what to do instead. */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('not found') || m.includes('invalid login'))
    return 'That email is not on the family list. Only two accounts exist — check for a typo.';
  if (m.includes('token has expired') || m.includes('invalid'))
    return 'That link has expired, or it was opened on a different device. Ask for a new one and open it here.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts just now. Wait a minute and try again.';
  return message;
}
