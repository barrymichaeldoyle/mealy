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

async function addIngredient(page: Page, name: string, quantity: string) {
  await page.getByRole('button', { name: 'Add ingredient' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Name').fill(name)
  await sheet.getByLabel('Quantity').fill(quantity)
  await sheet.getByLabel('Unit').selectOption('g')
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()
}

test.describe('one ingredient, two spellings', () => {
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

  test('offers the spelling already in use while typing the other', async ({
    page,
  }) => {
    await answerSetupIfAsked(page)

    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Tray bake')
    await page.getByLabel('Serves').fill('4')
    await addIngredient(page, 'Roast Veg Pack', '400')
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Tray bake' })).toBeVisible()

    // The second recipe, where the second spelling would be born.
    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Sunday roast')
    await page.getByLabel('Serves').fill('4')
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('Name').fill('Roasted Veg Pack')

    // A prefix search would never surface this: "Roasted" does not start
    // "Roast Veg Pack" and the field is already past the shared letters.
    const suggestion = sheet.getByRole('button', { name: 'Roast Veg Pack' })
    await expect(suggestion).toBeVisible()
    await suggestion.click()
    await expect(sheet.getByLabel('Name')).toHaveValue('Roast Veg Pack')

    await sheet.getByLabel('Quantity').fill('200')
    await sheet.getByLabel('Unit').selectOption('g')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(
      page.getByRole('heading', { name: 'Sunday roast' }),
    ).toBeVisible()
  })

  test('offers to merge the two spellings on a list', async ({ page }) => {
    // A list with both spellings on it, which is the state the household is
    // already in before any of this existed.
    await page.goto('/lists')
    await page.getByRole('button', { name: 'New list' }).first().click()
    const sheet = page.getByRole('dialog', { name: 'New list' })
    await sheet.getByLabel('Name').fill('Woolworths')
    await sheet.getByRole('button', { name: 'Create list' }).click()
    await expect(
      page.getByRole('heading', { name: 'Woolworths' }),
    ).toBeVisible()

    for (const name of ['Roast Veg Pack', 'Roasted Veg Pack']) {
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      const add = page.getByRole('dialog', { name: 'Add an item' })
      await add.getByLabel('Item').fill(name)
      await add.getByLabel('Amount').fill('1')
      await add.getByLabel('Unit').selectOption('pack')
      await add.getByRole('button', { name: 'Add to list' }).click()
      await expect(add).toBeHidden()
    }

    await expect(page.getByText('look like the same thing')).toBeVisible()
    await page.getByRole('button', { name: 'Merge them' }).click()

    // One line, both packs, under the spelling that was there first.
    await expect(page.getByText('0 of 1 ticked')).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: /Roast Veg Pack/ }),
    ).toBeVisible()
    await expect(page.getByText('x2')).toBeVisible()
    await expect(page.getByText('look like the same thing')).toBeHidden()

    // And it is undoable, because a merge is a judgement call.
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('0 of 2 ticked')).toBeVisible()
  })

  test('stops asking once you say keep separate', async ({ page }) => {
    await page.goto('/lists')
    await page.getByRole('link', { name: 'Woolworths' }).click()
    await expect(page.getByText('look like the same thing')).toBeVisible()

    await page.getByRole('button', { name: 'Keep separate' }).click()
    await expect(page.getByText('look like the same thing')).toBeHidden()

    await page.reload()
    await expect(
      page.getByRole('checkbox', { name: /Roasted Veg Pack/ }),
    ).toBeVisible()
    await expect(page.getByText('look like the same thing')).toBeHidden()
  })
})
