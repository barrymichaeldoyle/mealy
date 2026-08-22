import { defineConfig, devices } from '@playwright/test'

/**
 * Signed-in screens, which the a11y suite deliberately leaves alone: it runs
 * without secrets in CI, and these need a Clerk session.
 *
 * `globalSetup` fetches the Clerk testing token that gets automation past bot
 * protection on a development instance, then creates the throwaway account
 * the run signs in as. Local only: it needs `CLERK_SECRET_KEY`, and skips
 * itself without one.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  /*
   * Generous, because every test here pays for a cold Vite SSR render plus a
   * Clerk sign-in round trip before it asserts anything. The default 30s was
   * enough right up until it was not, and a timeout reads like a broken
   * feature rather than a slow dev server.
   */
  timeout: 90_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env['CI']),
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  // One project, because the run shares one household and the setup screen
  // is answered once. Phone width is checked inside the spec instead.
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  /*
   * Its own port, and strict about it. Port 3000 is a popular default, and a
   * dev server for another project answering on it means the suite quietly
   * scans the wrong app: every locator misses and the failures blame this
   * code. --strictPort turns that into a refusal to start.
   */
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env['CI'],
  },
})
