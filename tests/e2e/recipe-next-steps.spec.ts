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

/** The shortest recipe the form will accept. */
async function saveRecipe(page: Page, title: string) {
  await page.goto('/recipes/new')
  await page.getByLabel('Recipe name').fill(title)
  await page.getByLabel('Serves').fill('4')
  await page.getByRole('button', { name: 'Save recipe' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

test.describe('after saving a recipe', () => {
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

  test('offers somewhere to go next, not just Delete', async ({ page }) => {
    await answerSetupIfAsked(page)
    await saveRecipe(page, 'Lamb ragu')

    const saved = page.getByText('Saved to your recipes')
    await expect(saved).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/saved-next-steps.png' })
    await page.setViewportSize({ width: 1280, height: 720 })

    // Straight back into an empty form, with the recipe kept.
    await page.getByRole('link', { name: 'Add another' }).click()
    await expect(page).toHaveURL(/\/recipes\/new$/)
    await expect(page.getByLabel('Recipe name')).toHaveValue('')

    await page.goto('/recipes')
    await expect(page.getByRole('link', { name: 'Lamb ragu' })).toBeVisible()
  })

  test('carries the recipe to the plan and places it on a day', async ({
    page,
  }) => {
    await saveRecipe(page, 'Pea soup')
    await page.getByRole('link', { name: 'Add to the plan' }).first().click()

    await expect(page.getByText('Pick a day for')).toBeVisible()

    // The day rows take the tap directly, with no second pass through the
    // picker to find the recipe you just came from, and each says what it
    // is about to add.
    await page
      .getByRole('button', { name: /^Add Pea soup for/ })
      .first()
      .click()

    await expect(page.getByText('Pick a day for')).toBeHidden()
    await expect(
      page.getByRole('link', { name: 'Pea soup' }).first(),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/plan$/)
  })

  test('says nothing extra when the recipe is opened later', async ({
    page,
  }) => {
    await page.goto('/recipes')
    await page.getByRole('link', { name: 'Lamb ragu' }).click()
    await expect(page.getByRole('heading', { name: 'Lamb ragu' })).toBeVisible()
    await expect(page.getByText('Saved to your recipes')).toBeHidden()
    // The forward action stays, so Delete is never the only thing to do.
    await expect(
      page.getByRole('link', { name: 'Add to the plan' }),
    ).toBeVisible()
  })
})
