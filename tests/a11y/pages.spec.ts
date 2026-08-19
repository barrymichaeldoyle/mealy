import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * `ready` is the last thing to appear on each page. Clerk navigates to its own
 * URL once it mounts, which destroys the execution context axe runs in, so
 * every page has to settle before the scan starts.
 */
const publicPages = [
  {
    name: 'home',
    path: '/',
    ready: (page: Page) =>
      page.getByRole('heading', { name: 'Dinner, sorted for the week.' }),
  },
  {
    name: 'sign in',
    path: '/sign-in',
    ready: (page: Page) => page.getByRole('textbox').first(),
  },
  {
    name: 'sign up',
    path: '/sign-up',
    ready: (page: Page) => page.getByRole('textbox').first(),
  },
  {
    name: 'privacy policy',
    path: '/privacy',
    ready: (page: Page) =>
      page.getByRole('heading', { name: 'Privacy policy' }),
  },
  {
    name: 'terms of service',
    path: '/terms',
    ready: (page: Page) =>
      page.getByRole('heading', { name: 'Terms of service' }),
  },
  {
    name: 'offline',
    path: '/offline',
    ready: (page: Page) =>
      page.getByRole('heading', { name: 'You’re offline' }),
  },
]

for (const publicPage of publicPages) {
  test(`${publicPage.name} meets automated WCAG A and AA checks`, async ({
    page,
  }, testInfo) => {
    await page.goto(publicPage.path)
    await publicPage.ready(page).waitFor()
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(wcagTags)
      // Clerk's "Secured by" branding fails colour contrast and is not ours to
      // restyle. Everything we control, the form included, is still scanned.
      .exclude('.cl-footer')
      .analyze()

    await testInfo.attach('axe-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    })

    expect(results.violations).toEqual([])
  })
}
