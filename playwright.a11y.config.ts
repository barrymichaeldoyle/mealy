import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'line',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
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
