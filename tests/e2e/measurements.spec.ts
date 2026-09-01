import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createTestUser, deleteTestUser } from './clerk-user'
import type { Page } from '@playwright/test'

test.skip(
  !process.env['CLERK_SECRET_KEY'],
  'Needs CLERK_SECRET_KEY so a test account can be made.',
)

test.describe.configure({ mode: 'serial' })

/** Take the metric default if the measurement question is still to be asked. */
async function answerSetupIfAsked(page: Page) {
  const setup = page.getByRole('button', { name: 'Save and carry on' })
  const app = page.getByRole('heading', { name: 'Recipes', exact: true })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/recipes')
    await expect(setup.or(app)).toBeVisible()
    if (await app.isVisible()) {
      return
    }
    await setup.click()
    await expect(setup.or(app)).toBeVisible()
  }
  await expect(app).toBeVisible()
}

function unit(page: Page, label: string) {
  return page.getByRole('checkbox', { name: label, exact: true })
}

async function saveMeasurements(page: Page) {
  await page.getByRole('button', { name: 'Save measurements' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved' }),
  ).toBeVisible()
}

test.describe('choosing units', () => {
  let identifier = ''
  let userId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    identifier = user.email
    userId = user.id
  })

  test.afterAll(async () => {
    if (userId) {
      await deleteTestUser(userId)
    }
  })

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      // This instance signs in by email code, not password.
      signInParams: { strategy: 'email_code', identifier },
    })
  })

  test('the household screen is reachable from the account menu', async ({
    page,
  }) => {
    await answerSetupIfAsked(page)

    // Desktop: the sidebar's account menu carried no link to it at all, so
    // measurements, invites and the export were URL-only.
    // Clerk labels its own trigger, so this is its name, not ours.
    await page.getByRole('button', { name: /user menu|account menu/i }).click()
    // Clerk renders its menu entries as buttons, not menuitems.
    await page.getByRole('button', { name: 'Household' }).click()
    await expect(
      page.getByRole('heading', { name: 'Measurements' }),
    ).toBeVisible()
  })

  test('a system is a preset, and single units toggle on top of it', async ({
    page,
  }) => {
    await page.goto('/household')

    // The metric preset ticks the metric units and nothing else.
    await page.getByRole('button', { name: 'Metric', exact: true }).click()
    await expect(unit(page, 'g')).toBeChecked()
    await expect(unit(page, 'lb')).not.toBeChecked()

    // Then the granular part: keep grams, add pints, drop cups.
    await unit(page, 'pint').check()
    await unit(page, 'cup').uncheck()
    await saveMeasurements(page)

    await page.reload()
    await expect(unit(page, 'g')).toBeChecked()
    await expect(unit(page, 'pint')).toBeChecked()
    await expect(unit(page, 'cup')).not.toBeChecked()
  })

  test('the picker offers what was kept, and only that', async ({ page }) => {
    await page.goto('/recipes/new')
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const sheet = page.getByRole('dialog')
    const options = await sheet
      .getByLabel('Unit')
      .locator('option')
      .allTextContents()

    expect(options).toContain('g')
    expect(options).toContain('pint')
    // Switched off by hand, even though the metric preset offers it.
    expect(options).not.toContain('cup')
    expect(options).not.toContain('oz')
    // Counts are never anybody's choice to make.
    expect(options).toContain('item(s)')
  })

  test('a unit switched off later is read back in the ones kept', async ({
    page,
  }) => {
    // Written while millilitres were still on the list.
    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Pancakes')
    await page.getByLabel('Serves').fill('4')

    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('Name').fill('milk')
    await sheet.getByLabel('Quantity').fill('500')
    await sheet.getByLabel('Unit').selectOption('ml')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Pancakes' })).toBeVisible()

    // Nothing to restate while millilitres are still theirs.
    await expect(page.getByText('500mℓ')).toBeVisible()
    await expect(page.getByText('≈1.1 pint')).toBeHidden()

    // The kitchen drops millilitres and keeps pints. Weight stays metric,
    // so the two families now disagree, which the old two-box answer could
    // not express at all.
    await page.goto('/household')
    await unit(page, 'mℓ').uncheck()
    await unit(page, 'ℓ').uncheck()
    await saveMeasurements(page)

    // The recipe still says what it was written in, with theirs beside it.
    await page.goto('/recipes')
    await page.getByRole('link', { name: /Pancakes/ }).click()
    await expect(page.getByText('500mℓ')).toBeVisible()
    await expect(page.getByText('≈1.1 pint')).toBeVisible()
  })
})
