import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { LangProvider } from '@/components/LangProvider';
import SchemaBanner from '@/components/SchemaBanner';
import SelfTest from '@/components/SelfTest';
import { currentLang } from '@/lib/lang';
import { APP_VERSION } from '@/lib/version';
import { currentMember } from '@/lib/supabase/server';
import './globals.css';

/* Six faces, each with a job (§1, revised by the delivered design):
 *   Cormorant Garamond  — titles, dish names, the menu card, the AVIENTE wordmark
 *   Rubik               — UI labels and small caps. REPLACES Jost, and the reason is
 *                         not taste: Jost contains no Hebrew glyphs, so with a Hebrew
 *                         interface every label fell through to Heebo and the chrome
 *                         was set in two unrelated faces. Rubik covers both scripts,
 *                         which is what makes the Hebrew UI possible at all.
 *   Petit Formal Script — the wordmark's tagline only. LATIN-ONLY, so it must never
 *                         be reachable by a Hebrew string; --script exists so that
 *                         constraint is visible in the token name.
 *   Baloo 2             — the kids' section, and nowhere else.
 *   Frank Ruhl Libre    — the Hebrew serif. NOT optional: Cormorant has no Hebrew, so
 *                         without this every Hebrew dish name on the printed card
 *                         falls back to a system font.
 *   Heebo               — the Hebrew sans, kept behind Rubik as a second line.
 */
/* Self-hosted (next/font/local), not next/font/google: the production build used
   to FETCH all six families at build time, so a Google Fonts outage — or any
   network-restricted build machine — failed the build of an app whose fonts had
   not changed. The exact woff2 files live in app/fonts; same faces, same weights,
   zero build-time network. */
const cormorant = localFont({
  src: [
    { path: './fonts/cormorant-garamond-v21-latin-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/cormorant-garamond-v21-latin-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-v21-latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-v21-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/cormorant-garamond-v21-latin-300italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/cormorant-garamond-v21-latin-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/cormorant-garamond-v21-latin-500italic.woff2', weight: '500', style: 'italic' },
    { path: './fonts/cormorant-garamond-v21-latin-600italic.woff2', weight: '600', style: 'italic' },
  ],
  variable: '--font-cormorant', display: 'swap',
});
const rubik = localFont({
  // Hebrew AND Latin in every file: the whole point of choosing it over Jost.
  src: [
    { path: './fonts/rubik-v31-hebrew_latin-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/rubik-v31-hebrew_latin-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/rubik-v31-hebrew_latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/rubik-v31-hebrew_latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-rubik', display: 'swap',
});
const script = localFont({
  // One weight exists, and Latin is all it has — see --script in globals.css.
  src: [{ path: './fonts/petit-formal-script-v19-latin-regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-script', display: 'swap',
});
const baloo = localFont({
  src: [
    { path: './fonts/baloo-2-v23-latin-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/baloo-2-v23-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/baloo-2-v23-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-baloo', display: 'swap',
});
const frank = localFont({
  src: [
    { path: './fonts/frank-ruhl-libre-v23-hebrew_latin-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/frank-ruhl-libre-v23-hebrew_latin-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/frank-ruhl-libre-v23-hebrew_latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/frank-ruhl-libre-v23-hebrew_latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-frank', display: 'swap',
});
const heebo = localFont({
  src: [
    { path: './fonts/heebo-v28-hebrew_latin-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/heebo-v28-hebrew_latin-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/heebo-v28-hebrew_latin-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-heebo', display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aviente — The Family Recipe Book',
  description: 'The Aviente family cookbook: recipes, menu cards and the kids’ week.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/icon-small.svg', sizes: '16x16 32x32' },
      { url: '/brand/icon.svg', sizes: 'any' },
    ],
    /* A real PNG. iOS ignores SVG for the home screen entirely, so an SVG-only
       brand folder meant the Aviente icon simply never appeared there. */
    apple: '/brand/apple-touch-icon.png',
  },
  // A private family cookbook has no reason to be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  /* Matches the splash ground. The cover is cream now, not green, so a green status
     bar would frame the launch in a colour the app no longer opens on. */
  themeColor: '#f7f2e9',
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom -- some of the people using this cookbook need to enlarge it.
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* The signed-in member's colour, read here so a reload keeps it. Signed-out
     pages fall back to green rather than failing — /login has no member yet. */
  const member = await currentMember().catch(() => null);
  const lang = await currentLang();
  const fonts = [cormorant, rubik, script, baloo, frank, heebo].map((f) => f.variable).join(' ');
  return (
    // The chrome is English (French-accented) per §5, so that is what the document
    // declares. Hebrew recipe content marks itself with lang="he" per element,
    // which is what triggers RTL and the Hebrew font stack.
    // The font classes MUST be on <html>, not <body>. They define --font-cormorant
    // and friends, and globals.css builds --ser/--san from them at :root. A custom
    // property is substituted using the value visible where it is DECLARED, so with
    // the classes on <body> the tokens were undefined at :root, --ser collapsed, and
    // every heading silently rendered in Times -- including the Hebrew, which was
    // the one thing the font stack existed to fix.
    /* lang and dir follow the reader. They were hardcoded en/ltr, with Hebrew
       flipped per element by a `[lang='he']` rule — so the words ran right-to-left
       while the page did not, and headings sat hard against the left margin above
       text that started on the right. A Hebrew interface is a right-to-left
       document. */
    <html lang={lang} dir={lang === 'he' ? 'rtl' : 'ltr'}
          data-theme={member?.theme ?? 'green'} className={fonts}>
      {/* data-version lets the selftest report which build it ran against, so a
          result can never be misattributed to a cached page. */}
      <body data-version={APP_VERSION}>
        {/* Above everything, on every page. A migration nobody ran is the most
            likely reason this app breaks, because running it is a manual step. */}
        <SchemaBanner />
        <LangProvider lang={lang}>{children}</LangProvider>
        <SelfTest />
      </body>
    </html>
  );
}
