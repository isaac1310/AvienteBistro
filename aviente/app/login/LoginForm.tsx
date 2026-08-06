'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './login.module.css';

/* Magic link, with a 6-digit code beside it.
 *
 * The code path is not a nicety. A magic link issues its session to whichever
 * browser opens it, so requesting on a laptop and opening on a phone fails — and
 * fails looking like an expired link, which reads as a broken app. The same email
 * carries a code that works anywhere, so that case has an answer.
 *
 * Public signup is off in the dashboard, so signInWithOtp cannot create an account:
 * an unknown address is simply refused. That toggle is the access gate, not this
 * form.
 */
export default function LoginForm({ e2eAvailable }: { e2eAvailable: boolean }) {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const db = supabaseBrowser();
    const { error } = await db.auth.verifyOtp({
      email: email.trim(), token: code.trim(), type: 'email',
    });
    setBusy(false);
    if (error) { setError(readable(error.message)); return; }
    router.replace(next);
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
      <form className={styles.form} onSubmit={verifyCode}>
        <div className={styles.sent}>
          <p><strong>Check your email.</strong> There is a link in it — tap that on
            this device and you are in.</p>
          <p>Opening it somewhere else? Use the six-digit code from the same email
            instead. A link only works in the browser that asked for it.</p>
        </div>

        <label className={styles.label} htmlFor="code">Six-digit code</label>
        <input
          id="code" className={`${styles.field} ${styles.code}`}
          value={code} onChange={(e) => setCode(e.target.value)}
          inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} placeholder="······" required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn" type="submit" disabled={busy || code.length < 6}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
        <button type="button" className={styles.linkish}
          onClick={() => { setSent(false); setCode(''); setError(null); }}>
          Use a different email
        </button>
      </form>
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
    return 'That code has expired or does not match. Ask for a new email.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts just now. Wait a minute and try again.';
  return message;
}
