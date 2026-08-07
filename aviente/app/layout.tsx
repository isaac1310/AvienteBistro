import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost, Baloo_2, Frank_Ruhl_Libre, Heebo } from 'next/font/google';
import SelfTest from '@/components/SelfTest';
import { APP_VERSION } from '@/lib/version';
import { currentMember } from '@/lib/supabase/server';
import './globals.css';

/* Five faces, each with a job (§1):
 *   Cormorant Garamond — titles, dish names, the menu card
 *   Jost              — UI labels, letterspaced small caps
 *   Baloo 2           — the kids' section, and nowhere else
 *   Frank Ruhl Libre  — the Hebrew serif. NOT optional: Cormorant has no Hebrew
 *                       glyphs at all, so without this every Hebrew dish name on
 *                       the printed card falls back to a system font.
 *   Heebo             — the Hebrew sans, same argument for Jost.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap',
});
const jost = Jost({
  subsets: ['latin'], weight: ['300', '400', '500', '600'],
  variable: '--font-jost', display: 'swap',
});
const baloo = Baloo_2({
  subsets: ['latin'], weight: ['400', '600', '700'],
  variable: '--font-baloo', display: 'swap',
});
const frank = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '700'],
  variable: '--font-frank', display: 'swap',
});
const heebo = Heebo({
  subsets: ['hebrew', 'latin'], weight: ['300', '400', '500'],
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
    apple: '/brand/icon.svg',
  },
  // A private family cookbook has no reason to be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Matches the splash and header ground, so the phone's status bar sits on green
  // at launch rather than flashing cream.
  themeColor: '#1e3a2f',
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom -- some of the people using this cookbook need to enlarge it.
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* The signed-in member's colour, read here so a reload keeps it. Signed-out
     pages fall back to green rather than failing — /login has no member yet. */
  const member = await currentMember().catch(() => null);
  const fonts = [cormorant, jost, baloo, frank, heebo].map((f) => f.variable).join(' ');
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
    <html lang="en" dir="ltr" data-theme={member?.theme ?? 'green'} className={fonts}>
      {/* data-version lets the selftest report which build it ran against, so a
          result can never be misattributed to a cached page. */}
      <body data-version={APP_VERSION}>
        {children}
        <SelfTest />
      </body>
    </html>
  );
}
