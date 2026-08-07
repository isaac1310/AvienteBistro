/**
 * Validate a post-login destination.
 *
 * `?next=` reaches router.replace and the auth callback's redirect. Unvalidated,
 * it turns a login link into a phishing hop: `?next=https://evil.example` sends
 * someone who just typed their email straight off the site, and
 * `?next=//evil.example` does the same while looking relative.
 *
 * The rule is deliberately narrow — exactly one leading slash, no scheme, no
 * backslash, nothing that decodes into either. Anything else becomes '/', because
 * a wrong-but-safe landing page beats a clever-but-open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/';

  let candidate = value.trim();

  /* Decode first, then check: `%2f%2fevil.example` and `%5c%5cevil` both pass a
     naive startsWith('/') test and then resolve off-site. A malformed escape is
     itself grounds for refusal. */
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return '/';
  }

  if (!candidate.startsWith('/')) return '/';   // no scheme, no bare host
  if (candidate.startsWith('//')) return '/';   // protocol-relative
  if (candidate.includes('\\')) return '/';     // backslash is a slash to some parsers
  if (/^\/+\s*[a-z][a-z0-9+.-]*:/i.test(candidate)) return '/';  // /https:/evil
  if (candidate.includes('\n') || candidate.includes('\r')) return '/';

  return candidate;
}
