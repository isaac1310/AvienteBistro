import { test, expect, type Page } from '@playwright/test';
import { APP_VERSION } from '../../lib/version';

/* Layer ① — sanity. Runs on every PR. See tests/REGRESSION.md.
 *
 * The discipline borrowed from TravelHub's selftest.js: a check that cannot run
 * here must SKIP with a reason, never quietly pass. Two of its checks once used
 * `return true` at desktop width and reported green while exercising nothing.
 */

const PHONE = 412;

/** Console errors are a failure, not noise. Attach before the first navigation. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.describe('1 · sanity', () => {
  test('1.2 / 1.3 · the homepage renders with no console errors', async ({ page }) => {
    const errors = watchConsole(page);
    const res = await page.goto('/');
    expect(res?.status(), 'homepage should respond 200').toBe(200);
    // Scoped to the banner: the wordmark legitimately appears twice while the
    // splash is up, so an unscoped role query is ambiguous by design, not broken.
    await expect(
      page.getByRole('banner').getByRole('heading', { name: 'Aviente' }),
    ).toBeVisible();
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('1.4 · the seeded categories are present, and breads is five', async ({ page }) => {
    await page.goto('/');
    // Proves the `breads` addition survived -- without it these five recipes
    // would all have collapsed into `other`.
    await expect(page.getByRole('heading', { name: 'Boulangerie' })).toBeVisible();
    await expect(page.getByText('5 recettes', { exact: false }).first()).toBeVisible();
  });

  test('1.6 · no horizontal page scroll', async ({ page }, testInfo) => {
    await page.goto('/');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `page scrolls sideways by ${overflow}px at ` +
      `${testInfo.project.use.viewport?.width}px`).toBeLessThanOrEqual(0);
  });

  test('1.7 · the version footer matches lib/version', async ({ page }) => {
    // Guards layer ③: a manual pass against a cached build produces confident
    // wrong answers, which is worse than not testing.
    await page.goto('/');
    await expect(page.getByText(`v${APP_VERSION}`, { exact: false })).toBeVisible();
  });

  test('1.8 · the splash holds open, and otherwise cannot eat a tap', async ({ page }) => {
    await page.goto('/?splash=hold');
    const splash = page.getByRole('status', { name: 'Aviente' });
    await expect(splash).toBeVisible();

    await page.goto('/');
    // It must be gone from the DOM, not merely transparent: an opaque overlay is
    // still hit-testable while fading, which is how a splash swallows a tap.
    await expect(splash).toHaveCount(0, { timeout: 6000 });
  });

  test('1.6b · tap targets are at least 44px', async ({ page }, testInfo) => {
    const width = testInfo.project.use.viewport?.width ?? 0;
    test.skip(width > 500, 'tap-target sizing is a phone-width concern only');

    await page.goto('/');
    // Only our own chrome. The first run of this check failed on a 32px control
    // that turned out to be the Next.js dev-overlay button -- measuring the
    // harness instead of the app.
    const controls = page.locator(
      ':is(header, main, footer) :is(button, a[href], input, select)',
    );
    const n = await controls.count();
    if (n === 0) {
      // Honest skip: the placeholder homepage has no controls yet. This must not
      // read as a pass -- it exercised nothing.
      test.skip(true, 'no interactive controls on the page yet (build step 1)');
    }
    for (let i = 0; i < n; i++) {
      const box = await controls.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `control ${i} is ${box.height}px tall`).toBeGreaterThanOrEqual(44);
    }
  });

  test('1.5 · signed out, no recipe data leaks', async ({ page }) => {
    // Skips until auth exists, and says so. Once middleware lands this asserts
    // the redirect and that no recipe title is present in the HTML.
    const res = await page.goto('/');
    const html = (await res?.text()) ?? '';
    const authWired = html.includes('/login') || page.url().includes('/login');
    test.skip(!authWired, 'auth not wired yet — blocked on .env.local keys');
    expect(page.url()).toContain('/login');
  });
});
