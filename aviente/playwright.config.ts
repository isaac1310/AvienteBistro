import { defineConfig, devices } from '@playwright/test';

/* See tests/REGRESSION.md for the protocol this serves.
 *
 * Two projects, matching the two machine layers: `sanity` runs on every PR,
 * `regression` before a release. Both drive the real dev server against the DEV
 * Supabase project -- never production.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Deliberately serial: several regression checks mutate shared rows (soft
  // delete, revisions, share revocation). Parallelism here buys seconds and
  // costs reproducibility.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,          // a flaky pass is worse than a fail; fix the test instead
  reporter: [['list'], ['json', { outputFile: 'tests/reports/last-run.json' }]],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'sanity',
      testMatch: /sanity\.spec\.ts/,
      // The Ultra is the primary device, so that is the default viewport. Several
      // checks (tap targets, no horizontal scroll) are meaningless at desktop
      // width and must skip loudly rather than pass quietly.
      use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 } },
    },
    {
      name: 'sanity-desktop',
      testMatch: /sanity\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'regression',
      testMatch: /regression\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 } },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
