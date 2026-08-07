import { NextResponse, type NextRequest } from 'next/server';

/* PDF export (§4).
 *
 * Renders one of the /print/* routes in headless Chromium and returns the file.
 * Deliberately NOT @react-pdf: it supports neither gradients nor box-shadow, so
 * the candle flames, the double frame and the fleurons would all have to be
 * re-approximated, and the card would stop matching the design. Printing the real
 * CSS in a real browser also gets RTL Hebrew right for free.
 *
 * Locally this uses whatever Chrome is installed; on Vercel it pulls a Chromium
 * build at runtime so the deployment stays inside the Hobby size budget.
 */

export const maxDuration = 60;
// Chromium cannot run on the edge runtime.
export const runtime = 'nodejs';

const REMOTE_CHROMIUM =
  'https://github.com/Sparticuz/chromium/releases/download/v140.0.0/chromium-v140.0.0-pack.x64.tar';

/** Chrome's own path on a Mac, for local development. */
const LOCAL_CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

async function launch() {
  const puppeteer = await import('puppeteer-core');

  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium-min')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(REMOTE_CHROMIUM),
      headless: true,
    });
  }

  const { existsSync } = await import('node:fs');
  const executablePath = LOCAL_CHROME.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error(
      'No local Chrome found. Use the Print button instead, which needs no browser download.',
    );
  }
  return puppeteer.launch({ executablePath, headless: true });
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  const name = request.nextUrl.searchParams.get('name') ?? 'aviente';

  // Only our own print routes, and only relative ones: rendering an arbitrary URL
  // server-side would be a request-forgery hole.
  if (!path || !path.startsWith('/print/')) {
    return NextResponse.json({ error: 'path must be one of /print/*' }, { status: 400 });
  }

  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();

    // Carry the caller's session so a family member's own menus render. Guests
    // pass ?k= inside `path` instead and need no cookie at all.
    const cookie = request.headers.get('cookie');
    if (cookie) {
      await page.setExtraHTTPHeaders({ cookie });
    }

    await page.goto(`${request.nextUrl.origin}${path}`, { waitUntil: 'networkidle0' });
    // Fonts must be in before the snapshot or the card prints in a fallback face —
    // and that is exactly the bug that would not show up until someone has paper.
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,   // without this the beige card comes out blank
      margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    });

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${name}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF failed' },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
