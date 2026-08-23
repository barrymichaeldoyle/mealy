import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createTestUser, deleteTestUser } from './clerk-user'
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

/**
 * The "Saved" confirmation, and only it. Matching the bare word also caught
 * the card's own "Recipes you have already saved…" hint, which is always on
 * screen, so waiting on it proved nothing and let the test race the write.
 */
function savedNotice(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Saved' })
}

/**
 * Take the metric default if the measurement question is still to be asked.
 * Tests inside one describe share an account, so only the first meets it.
 * The gate resolves before the app paints, so this cannot race.
 */
async function answerSetupIfAsked(page: Page) {
  const setup = page.getByRole('button', { name: 'Save and carry on' })
  // Exact: "Recipes" alone also matches the "No recipes yet" empty state.
  const app = page.getByRole('heading', { name: 'Recipes', exact: true })

  /*
   * Up to three goes. The gate renders nothing while it does not yet know
   * whether to ask, so the question disappearing is not proof it was
   * answered: the app arriving is. A brand new account creates its
   * household on first sign-in, and the gate can come back once while that
   * settles.
   */
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
    await page.getByRole('button', { name: 'Save measurements' }).click()
    // "Saved" is the signal the write landed. The button's disabled state is
    // not: it is also disabled while the write is still going.
    await expect(savedNotice(page)).toBeVisible()

    // Prove it persisted before asking what the picker offers, so a failure
    // below is the picker's fault and not the save's.
    await page.reload()
    await expect(
      page.getByRole('checkbox', { name: /Imperial and US/ }),
    ).toBeChecked()
    await expect(
      page.getByRole('checkbox', { name: /Metric/ }),
    ).not.toBeChecked()

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

/*
 * Its own account, so these start on a household that has answered nothing
 * and can answer metric through the setup screen. Reaching back through the
 * household screen to undo what the test above did made these depend on the
 * order they ran in.
 */
test.describe('editing ingredients', () => {
  let ownIdentifier = ''
  let ownUserId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    ownIdentifier = user.email
    ownUserId = user.id
  })

  test.afterAll(async () => {
    if (ownUserId) {
      await deleteTestUser(ownUserId)
    }
  })

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier: ownIdentifier },
    })
    // Metric is the preselected answer, so one tap gets these tests to it.
    await answerSetupIfAsked(page)
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

test.describe('cooking for a different number', () => {
  let ownIdentifier = ''
  let ownUserId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    ownIdentifier = user.email
    ownUserId = user.id
  })

  test.afterAll(async () => {
    if (ownUserId) {
      await deleteTestUser(ownUserId)
    }
  })

  test('the recipe scales, and the plan hands over its servings', async ({
    page,
  }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier: ownIdentifier },
    })
    await answerSetupIfAsked(page)

    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Bobotie')
    await page.getByLabel('Serves').fill('4')
    await addIngredient(page, { name: 'mince', quantity: '500', unit: 'g' })
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Bobotie' })).toBeVisible()

    // Written for four, so four is what it opens on.
    await expect(page.getByText('500g')).toBeVisible()
    await page.getByRole('button', { name: 'Cook for more' }).click()
    await page.getByRole('button', { name: 'Cook for more' }).click()
    await expect(page.getByText('750g')).toBeVisible()
    await expect(page.getByText('Scaled from 4.')).toBeVisible()

    // The plan carries its own servings through the link.
    await page.goto('/plan')
    await page.getByRole('button', { name: /add/i }).first().click()
    await page.getByRole('dialog').getByText('Bobotie').first().click()
    await expect(
      page.getByRole('button', { name: /Remove Bobotie/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: /More servings/ }).click()
    await page.getByRole('button', { name: /More servings/ }).click()

    await page.getByRole('link', { name: 'Bobotie' }).click()
    await expect(page.getByRole('heading', { name: 'Bobotie' })).toBeVisible()
    await expect(page.getByText('750g')).toBeVisible()

    // Deleting it would take that planned meal with it, and says so.
    await page.getByRole('button', { name: 'Delete recipe' }).click()
    await expect(
      page.getByText(/It is planned for \w+, and that meal goes with it\./),
    ).toBeVisible()
    await page.screenshot({ path: 'test-results/delete-planned.png' })
  })
})

test.describe('changing the answer both ways', () => {
  let ownIdentifier = ''
  let ownUserId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    ownIdentifier = user.email
    ownUserId = user.id
  })

  test.afterAll(async () => {
    if (ownUserId) {
      await deleteTestUser(ownUserId)
    }
  })

  test('metric to imperial and back again both stick', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier: ownIdentifier },
    })
    await answerSetupIfAsked(page)

    const metric = page.getByRole('checkbox', { name: /Metric/ })
    const imperial = page.getByRole('checkbox', { name: /Imperial and US/ })
    const save = page.getByRole('button', { name: 'Save measurements' })

    // Metric to imperial.
    await page.goto('/household')
    await expect(metric).toBeChecked()
    await imperial.check()
    await metric.uncheck()
    await save.click()
    await expect(savedNotice(page)).toBeVisible()
    await page.reload()
    await expect(imperial).toBeChecked()
    await expect(metric).not.toBeChecked()

    // And back. This direction was never confirmed until now.
    await metric.check()
    await imperial.uncheck()
    await save.click()
    await expect(savedNotice(page)).toBeVisible()
    await page.reload()
    await expect(metric).toBeChecked()
    await expect(imperial).not.toBeChecked()

    // The picker follows, which is the whole point of the setting.
    await page.goto('/recipes/new')
    await page.getByRole('button', { name: 'Add ingredient' }).click()
    const options = await page
      .getByRole('dialog')
      .getByLabel('Unit')
      .locator('option')
      .allTextContents()
    expect(options).toContain('g')
    expect(options).not.toContain('oz')
  })
})

test.describe('cooking with the wifi gone', () => {
  let ownIdentifier = ''
  let ownUserId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    ownIdentifier = user.email
    ownUserId = user.id
  })

  test.afterAll(async () => {
    if (ownUserId) {
      await deleteTestUser(ownUserId)
    }
  })

  test('a recipe stays readable when the connection drops', async ({
    page,
    context,
  }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier: ownIdentifier },
    })
    await answerSetupIfAsked(page)

    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Bobotie')
    await page.getByLabel('Serves').fill('4')
    await addIngredient(page, { name: 'mince', quantity: '500', unit: 'g' })
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Bobotie' })).toBeVisible()

    /*
     * Everything from here is client-side navigation. A full page load
     * discards the route chunks already fetched, and re-fetching one with no
     * connection is the service worker's job, not the router's. The warm tab
     * is the case this covers: the app is open and the wifi goes.
     */
    await page.getByRole('link', { name: 'Recipes' }).first().click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Recipes' }),
    ).toBeVisible()
    await page.getByRole('link', { name: /Bobotie/ }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bobotie' }),
    ).toBeVisible()

    await context.setOffline(true)

    await page.getByRole('link', { name: 'Recipes' }).first().click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Recipes' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Bobotie/ })).toBeVisible()
    await expect(
      page.getByText(/Offline\. This is your saved copy/),
    ).toBeVisible()
    // Writing needs the server, so it is not offered.
    await expect(page.getByRole('link', { name: 'Add a recipe' })).toBeHidden()

    await page.getByRole('link', { name: /Bobotie/ }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bobotie' }),
    ).toBeVisible()
    await expect(page.getByText('500g')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeHidden()

    await context.setOffline(false)
  })
})

test.describe('finishing the shop and finding things', () => {
  let ownIdentifier = ''
  let ownUserId = ''

  test.beforeAll(async () => {
    const user = await createTestUser()
    ownIdentifier = user.email
    ownUserId = user.id
  })

  test.afterAll(async () => {
    if (ownUserId) {
      await deleteTestUser(ownUserId)
    }
  })

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await clerk.loaded({ page })
    await clerk.signIn({
      page,
      signInParams: { strategy: 'email_code', identifier: ownIdentifier },
    })
    await answerSetupIfAsked(page)
  })

  test('search finds a recipe by an ingredient, and says why', async ({
    page,
  }) => {
    await page.goto('/recipes/new')
    await page.getByLabel('Recipe name').fill('Thursday bake')
    await page.getByLabel('Serves').fill('4')
    await addIngredient(page, {
      name: 'free-range chicken thighs, skin on',
      quantity: '600',
      unit: 'g',
    })
    await page.getByRole('button', { name: 'Save recipe' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Thursday bake' }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Recipes' }).first().click()
    await page
      .getByPlaceholder('Search by name, ingredient or tag')
      .fill('chicken')
    // The title has no "chicken" in it, so this only passes on ingredients.
    await expect(
      page.getByRole('link', { name: /Thursday bake/ }),
    ).toBeVisible()
    await expect(
      page.getByText('has free-range chicken thighs, skin on'),
    ).toBeVisible()

    // And the long name is readable rather than cut off.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/search-ingredient.png' })
  })

  test('ticking the last item ends the shop', async ({ page }) => {
    // A list is generated from recipes, so it inherits the one above.
    await page.goto('/lists')
    await page.getByRole('button', { name: 'New list' }).click()
    const picker = page.getByRole('dialog')
    await picker.getByText('Thursday bake').first().click()
    // The preview says what the list will hold, before it is built.
    await expect(picker.getByText('1 item on the list')).toBeVisible()
    await expect(
      picker.getByText('free-range chicken thighs, skin on'),
    ).toBeVisible()
    await expect(picker.getByText('600g')).toBeVisible()
    await picker.getByRole('button', { name: /Generate list/ }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: /list/i }),
    ).toBeVisible()
    await expect(page.getByText('0 of 1 ticked')).toBeVisible()
    await expect(page.getByText('That is everything')).toBeHidden()
    // An unticked item must not look ticked.
    await expect(page.getByRole('checkbox')).not.toBeChecked()

    // Tapping the row, which is the whole 52px target and what a thumb hits.
    await page.getByText('free-range chicken thighs, skin on').first().click()
    await expect(page.getByText('1 of 1 ticked')).toBeVisible()

    await expect(page.getByText('That is everything')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back to lists' }),
    ).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/shop-done.png' })
  })
})
