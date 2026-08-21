import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import type { Page } from '@playwright/test'

const identifier = process.env['E2E_CLERK_USER'] ?? ''

test.skip(
  !identifier,
  'Needs CLERK_SECRET_KEY so global setup can make a test account.',
)

/*
 * Serial, and in this order: the household starts having answered nothing,
 * the first test answers it, and the rest read the units that answer offers.
 */
test.describe.configure({ mode: 'serial' })

/** Fill the ingredient sheet and close it. */
async function addIngredient(
  page: Page,
  fields: { name: string; quantity?: string; unit?: string; note?: string },
) {
  await page.getByRole('button', { name: 'Add ingredient' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Name').fill(fields.name)
  if (fields.unit) {
    await sheet.getByLabel('Unit').selectOption(fields.unit)
  }
  if (fields.quantity) {
    await sheet.getByLabel('Quantity').fill(fields.quantity)
  }
  if (fields.note) {
    await sheet.getByLabel('Note').fill(fields.note)
  }
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()
}

test.describe('measurements', () => {
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

  test('asks a new household which measurements it uses', async ({ page }) => {
    await page.goto('/recipes')

    const heading = page.getByRole('heading', { name: 'How do you measure?' })
    await expect(heading).toBeVisible()
    // It stands in for the app, so there is nothing behind it to reach.
    await expect(page.getByRole('navigation')).toBeHidden()

    await expect(page.getByRole('checkbox', { name: /Metric/ })).toBeChecked()
    await expect(
      page.getByRole('checkbox', { name: /Imperial and US/ }),
    ).not.toBeChecked()

    await page.getByRole('button', { name: 'Save and carry on' }).click()
    await expect(heading).toBeHidden()
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('offers metric units only, and restates cups in millilitres', async ({
    page,
  }) => {
    await page.goto('/recipes/new')
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const sheet = page.getByRole('dialog')

    const options = await sheet
      .getByLabel('Unit')
      .locator('option')
      .allTextContents()
    expect(options).toEqual([
      'g',
      'kg',
      'mℓ',
      'ℓ',
      'tsp',
      'tbsp',
      'cup',
      'item(s)',
      'tin(s)',
      'pack(s)',
      'to taste',
    ])

    // Cups say nothing about how much to buy, so the metric amount follows.
    await sheet.getByLabel('Quantity').fill('2')
    await sheet.getByLabel('Unit').selectOption('cup')
    await expect(sheet.getByText('That is ≈500mℓ.')).toBeVisible()
  })

  test('changing the answer changes what the picker offers', async ({
    page,
  }) => {
    await page.goto('/household')
    await page.getByRole('checkbox', { name: /Imperial and US/ }).check()
    await page.getByRole('checkbox', { name: /Metric/ }).uncheck()
    const save = page.getByRole('button', { name: 'Save measurements' })
    await save.click()
    // It goes disabled again once the saved answer matches the tick-boxes,
    // which is the signal the mutation landed. Navigating sooner drops it.
    await expect(save).toBeDisabled()

    await page.goto('/recipes/new')
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const options = await page
      .getByRole('dialog')
      .getByLabel('Unit')
      .locator('option')
      .allTextContents()
    expect(options).toContain('oz')
    expect(options).toContain('fl oz')
    expect(options).not.toContain('g')
    expect(options).not.toContain('mℓ')
  })
})

/**
 * The run shares one household, and the test above leaves it on imperial.
 * Setting the answer here rather than inheriting it keeps these tests
 * readable in grams and independent of what ran before.
 */
async function useMetric(page: Page) {
  await page.goto('/household')
  const metric = page.getByRole('checkbox', { name: /Metric/ })
  const imperial = page.getByRole('checkbox', { name: /Imperial and US/ })
  await expect(metric).toBeVisible()
  if ((await metric.isChecked()) && !(await imperial.isChecked())) {
    return
  }
  await metric.check()
  await imperial.uncheck()
  const save = page.getByRole('button', { name: 'Save measurements' })
  await save.click()
  await expect(save).toBeDisabled()
}

test.describe('editing ingredients', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier },
    })
    await useMetric(page)
    await page.goto('/recipes/new')
  })

  test('one sheet at a time, and the row shows the result', async ({
    page,
  }) => {
    // A blank recipe starts with no ingredient rows at all.
    await expect(page.getByText('No ingredients yet.')).toBeVisible()

    await addIngredient(page, {
      name: 'mince',
      quantity: '500',
      unit: 'g',
      note: 'lean',
    })
    await addIngredient(page, { name: 'salt', unit: 'none' })

    const row = page.getByRole('button', { name: /mince/ })
    await expect(row).toContainText('lean')
    await expect(row).toContainText('500g')
    await expect(page.getByRole('button', { name: /salt/ })).toContainText(
      'to taste',
    )

    // Tapping the row opens that ingredient, and only that one.
    await row.click()
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('Name')).toHaveValue('mince')
    await expect(sheet.getByLabel('Quantity')).toHaveValue('500')

    await sheet.getByLabel('Quantity').fill('750')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByRole('button', { name: /mince/ })).toContainText(
      '750g',
    )
  })

  test('an ingredient needs a name, and can be removed', async ({ page }) => {
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet.getByText('Give the ingredient a name')).toBeVisible()
    // A nameless ingredient never reaches the recipe.
    await expect(sheet).toBeVisible()

    await sheet.getByLabel('Name').fill('bay leaf')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('button', { name: /bay leaf/ })).toBeVisible()

    await page.getByRole('button', { name: /bay leaf/ }).click()
    // Scoped: the Method section has "Remove step 1" buttons too.
    await sheet.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('No ingredients yet.')).toBeVisible()
  })

  test('a saved recipe reopens as rows, not a wall of fields', async ({
    page,
  }) => {
    await page.getByLabel('Recipe name').fill('Bobotie')
    await page.getByLabel('Serves').fill('4')
    await addIngredient(page, { name: 'mince', quantity: '500', unit: 'g' })
    await addIngredient(page, {
      name: 'milk',
      quantity: '250',
      unit: 'ml',
      note: 'full cream',
    })
    await page.getByRole('button', { name: 'Save recipe' }).click()

    // Landed on the recipe, which reads back what the sheet captured.
    await expect(page.getByRole('heading', { name: 'Bobotie' })).toBeVisible()
    await expect(page.getByText('250mℓ')).toBeVisible()

    await page.getByRole('link', { name: /edit/i }).click()
    await expect(page.getByLabel('Recipe name')).toHaveValue('Bobotie')

    const row = page.getByRole('button', { name: /milk/ })
    await expect(row).toContainText('full cream')
    await expect(row).toContainText('250mℓ')
    // Every ingredient is one row, so the form stays short.
    await expect(page.getByText('No ingredients yet.')).toBeHidden()

    await row.click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByLabel('Name')).toHaveValue('milk')
    await expect(sheet.getByLabel('Note')).toHaveValue('full cream')
  })

  test('the sticky bar never covers the button you tab to', async ({
    page,
  }) => {
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      await addIngredient(page, { name, quantity: '1', unit: 'g' })
    }
    // Playwright refuses a click the action bar would intercept, so this
    // passing is the assertion: scroll-margin keeps the button clear of it.
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
