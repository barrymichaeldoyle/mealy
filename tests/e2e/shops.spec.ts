import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createTestUser, deleteTestUser } from './clerk-user'
import type { Page } from '@playwright/test'

test.skip(
  !process.env['CLERK_SECRET_KEY'],
  'Needs CLERK_SECRET_KEY so a test account can be made.',
)

/* Serial: the shops named in the first test are what the rest shop from. */
test.describe.configure({ mode: 'serial' })

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

async function openList(page: Page, name: string) {
  await page.goto('/lists')
  await page.getByRole('link', { name }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

async function addItem(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Add an item' })
  await sheet.getByLabel('Item').fill(name)
  await sheet.getByRole('button', { name: 'Add to list' }).click()
  await expect(sheet).toBeHidden()
}

test.describe('shopping two shops and the aisles inside them', () => {
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
      signInParams: { strategy: 'email_code', identifier },
    })
  })

  test('a household names the shops it goes to', async ({ page }) => {
    await answerSetupIfAsked(page)
    await page.goto('/household')

    // The aisles are already there, so the first list groups itself.
    await expect(
      page.getByRole('textbox', { name: 'Rename Dairy' }),
    ).toHaveValue('Dairy')

    for (const shop of ['Woolworths', 'Checkers', 'Clicks']) {
      await page.getByLabel('New shop').fill(shop)
      await page.getByRole('button', { name: 'Add shop' }).click()
      await expect(
        page.getByRole('textbox', { name: `Rename ${shop}` }),
      ).toHaveValue(shop)
    }

    await page.reload()
    await expect(
      page.getByRole('textbox', { name: 'Rename Checkers' }),
    ).toHaveValue('Checkers')
  })

  test('an item says where else it can be got', async ({ page }) => {
    await page.goto('/lists')
    await page
      .getByRole('button', { name: 'New list', exact: true })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'New list' })
    await sheet.getByLabel('Name').fill('Midweek')
    await sheet.getByLabel('Shop').selectOption({ label: 'Woolworths' })
    await sheet.getByRole('button', { name: 'Create list' }).click()

    await expect(page.getByRole('heading', { name: 'Midweek' })).toBeVisible()
    await addItem(page, 'Milk')

    await page.getByRole('button', { name: 'Edit Milk' }).click()
    const edit = page.getByRole('dialog', { name: 'Edit item' })
    await edit.getByLabel('Aisle').selectOption({ label: 'Dairy' })
    await edit.getByText('Checkers').click()
    await edit.getByRole('button', { name: 'Save' }).click()
    await expect(edit).toBeHidden()

    // Filed, so the list now sorts itself into the aisle it is in, and the
    // row says where else to look.
    await expect(page.getByRole('heading', { name: 'Dairy' })).toBeVisible()
    await expect(page.getByText('Also at Checkers')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Also at Checkers')).toBeVisible()
  })

  test('writing shampoo on the Clicks list is how it learns', async ({
    page,
  }) => {
    await page.goto('/lists')
    await page
      .getByRole('button', { name: 'New list', exact: true })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'New list' })
    await sheet.getByLabel('Shop').selectOption({ label: 'Clicks' })
    await sheet.getByRole('button', { name: 'Create list' }).click()

    await expect(page.getByRole('heading', { name: 'Clicks' })).toBeVisible()
    await addItem(page, 'Shampoo')

    /*
     * The catalogue card is the only place the name and the shop sit on one
     * row, and "Shampoo" alone also matches the confirm dialog's copy, so
     * the row is pinned by its list item.
     */
    await page.goto('/household')
    const filed = page
      .getByRole('listitem')
      .filter({ hasText: /^Shampoo/ })
      .first()
    await expect(filed).toContainText('Clicks')
  })

  test('a shop that closes leaves its list behind', async ({ page }) => {
    await page.goto('/household')
    await page.getByRole('button', { name: 'Delete Clicks' }).click()
    const confirm = page.getByRole('dialog')
    await confirm.getByRole('button', { name: 'Delete' }).click()

    await expect(
      page.getByRole('textbox', { name: 'Rename Clicks' }),
    ).toHaveCount(0)

    await openList(page, 'Clicks')
    await expect(page.getByRole('checkbox', { name: 'Shampoo' })).toBeVisible()
  })
})
