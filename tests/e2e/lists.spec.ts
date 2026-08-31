import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createTestUser, deleteTestUser } from './clerk-user'
import type { Page } from '@playwright/test'

test.skip(
  !process.env['CLERK_SECRET_KEY'],
  'Needs CLERK_SECRET_KEY so a test account can be made.',
)

/*
 * Serial, and in this order: the first test makes the list the rest shop
 * from. They share one account, so the measurement question is asked once.
 */
test.describe.configure({ mode: 'serial' })

const LIST = 'Woolworths'

/** Take the metric default if the measurement question is still to be asked. */
async function answerSetupIfAsked(page: Page) {
  const setup = page.getByRole('button', { name: 'Save and carry on' })
  const app = page.getByRole('heading', { name: 'Lists', exact: true })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/lists')
    await expect(setup.or(app)).toBeVisible()
    if (await app.isVisible()) {
      return
    }
    await setup.click()
    await expect(setup.or(app)).toBeVisible()
  }
  await expect(app).toBeVisible()
}

async function addItem(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Add an item' })
  await sheet.getByLabel('Item').fill(name)
  await sheet.getByRole('button', { name: 'Add to list' }).click()
  await expect(sheet).toBeHidden()
}

test.describe('a list for the shop you are about to do', () => {
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

  test('is named after the shop, and needs no recipes', async ({ page }) => {
    await answerSetupIfAsked(page)

    // Two buttons say "New list" while the screen is empty: the header
    // action and the empty state. Either opens the same sheet.
    await page
      .getByRole('button', { name: 'New list', exact: true })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'New list' })
    await sheet.getByLabel('Name').fill(LIST)
    await sheet.getByRole('button', { name: 'Create list' }).click()

    await expect(page.getByRole('heading', { name: LIST })).toBeVisible()
    await expect(page).toHaveURL(/\/lists\/[a-z0-9]+$/)
  })

  test('keeps what is in the basket visible under Done', async ({ page }) => {
    await page.goto('/lists')
    await page.getByRole('link', { name: LIST }).click()
    await expect(page.getByRole('heading', { name: LIST })).toBeVisible()

    await addItem(page, 'Dish soap')
    await addItem(page, 'Nappies')

    // No amount, and hand-added, so the row says nothing rather than
    // offering dish soap "to taste".
    await expect(page.getByText('to taste')).toHaveCount(0)

    await page.getByRole('checkbox', { name: 'Dish soap' }).check()

    // Out of the way of the next tap, but not gone: the drawer counts it,
    // and opening it shows the row still ticked.
    const done = page.getByText('Done (1)')
    await expect(done).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Nappies' })).toBeVisible()

    await done.click()
    await expect(
      page.getByRole('checkbox', { name: 'Dish soap' }),
    ).toBeChecked()
  })

  test('can be renamed once you know where you are going', async ({ page }) => {
    await page.goto('/lists')
    await page.getByRole('link', { name: LIST }).click()

    await page.getByRole('button', { name: `Rename ${LIST}` }).click()
    const sheet = page.getByRole('dialog', { name: 'Rename list' })
    await sheet.getByLabel('Name').fill('Woolworths Bondi')
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(sheet).toBeHidden()

    await expect(
      page.getByRole('heading', { name: 'Woolworths Bondi' }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Woolworths Bondi' }),
    ).toBeVisible()
  })
})
