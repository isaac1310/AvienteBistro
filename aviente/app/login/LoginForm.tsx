'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safeNext';
import { useT } from '@/components/LangProvider';
import styles from './login.module.css';

/* Magic link, and nothing else.
 *
 * There was a six-digit code beside it, for the case a magic link cannot handle:
 * the link is completed by the browser that ASKED for it, so requesting on a laptop
 * and opening on a phone fails, and fails looking like an expired link. That path is
 * cancelled — the email carries a link only — so the screen states the constraint
 * instead of offering a way round it.
 *
 * Since migration 0019 the access gate is the before-user-created hook, not the
 * signup toggle: signup is ON, and every new account must carry an email that is on
 * the People list. So shouldCreateUser is true — a person the admin has added signs
 * THEMSELVES in with their first magic link, no dashboard invite — and a stranger's
 * signup is refused by the hook with a message this form shows verbatim. SETUP
 * ORDER MATTERS: until the hook is attached in the dashboard, signup must stay off,
 * or this flag holds the door open (docs/ADDING-A-PERSON.md, step 0).
 */
export default function LoginForm({ e2eAvailable }: { e2eAvailable: boolean }) {
  const t = useT();
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
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Deliberate: window.location can only be read AFTER mount, or the E2E
       field would be absent from the server HTML and then appear. The rule flags the cascading render; here it is one
       extra paint on mount, which is the price of not mismatching the
       server HTML. Restructure this and the reason above goes with it. */
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
        shouldCreateUser: true,    // the hook is the gate now — see the header comment
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) { setError(readable(error.message, t)); return; }
    setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const db = supabaseBrowser();
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError(readable(error.message, t)); return; }
    router.replace(next);
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <div className={styles.sent}>
          <p><strong>{t('login.checkEmail')}</strong> {t('login.tapLink')}</p>
          {/* Said explicitly, because the failure is silent and looks like a broken
              app: a magic link is completed by the browser that ASKED for it, so a
              link requested here and opened in another BROWSER fails, even on the
              same phone — a PWA or an email app can open its own browser context.
              "This device" was therefore a lie; the honest unit is this browser.
              This used to have an answer on the screen — a six-digit code from the
              same email, which works anywhere. That was cancelled: the email now
              carries a link and nothing else, so the only remaining answer is to
              open it here. */}
          <p>{t('login.sameBrowser')}</p>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.linkish}
          onClick={() => { setSent(false); setError(null); }}>
          {t('login.differentEmail')}
        </button>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={sendLink}>
        <label className={styles.label} htmlFor="email">{t('login.email')}</label>
        <input
          id="email" className={styles.field} type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email" autoFocus required placeholder="you@example.com"
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn" type="submit" disabled={busy || !email.includes('@')}>
          {busy ? t('login.sending') : t('login.sendLink')}
        </button>
        <p className={styles.hint}>{t('login.hint')}</p>

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
function readable(message: string, t: ReturnType<typeof useT>): string {
  const m = message.toLowerCase();
  /* The doorman's own words pass through untouched — the hook message was written
     for this screen ("Ask Itzik to add you"), and rewriting it here would give the
     two gates two different voices. */
  if (m.includes('family list')) return message;
  if (m.includes('signups not allowed') || m.includes('not found') || m.includes('invalid login'))
    return t('login.notOnList');
  if (m.includes('token has expired') || m.includes('invalid'))
    return t('login.expired');
  if (m.includes('rate limit') || m.includes('too many'))
    return t('login.rateLimit');
  return message;
}
