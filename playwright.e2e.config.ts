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
  forbidOnly: Boolean(process.env['CI']),
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  // One project, because the run shares one household and the setup screen
  // is answered once. Phone width is checked inside the spec instead.
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev:web --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env['CI'],
  },
})
