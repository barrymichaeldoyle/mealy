import { expect, test } from '@playwright/test'

/*
 * No sign-in here on purpose. The offline page has to work when the tab has
 * died and there is no session to load, so the test seeds localStorage the
 * way a previous visit would have and asks for the page cold.
 */
const LIST_KEY = 'mealy:offline-lists:v1:user_test:list:list_1'

const CACHED = {
  _id: 'list_1',
  _creationTime: 1,
  householdId: 'household_1',
  name: 'Weekly shop',
  createdAt: 1,
  cachedAt: 2,
  items: [
    {
      _id: 'item_1',
      _creationTime: 1,
      householdId: 'household_1',
      listId: 'list_1',
      name: 'mince',
      unit: 'g',
      quantity: 500,
      checked: false,
      manuallyAdded: false,
      approximate: false,
      sourceRecipeIds: [],
    },
    {
      _id: 'item_2',
      _creationTime: 2,
      householdId: 'household_1',
      listId: 'list_1',
      name: 'milk',
      unit: 'ml',
      quantity: 1000,
      checked: true,
      manuallyAdded: false,
      approximate: false,
      sourceRecipeIds: [],
    },
  ],
}

test('the offline page carries the last shopping list', async ({ page }) => {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [LIST_KEY, JSON.stringify(CACHED)],
  )
  await page.goto('/offline')

  await expect(page.getByRole('heading', { name: 'Weekly shop' })).toBeVisible()
  await expect(page.getByText('1 of 2 ticked · saved copy')).toBeVisible()
  await expect(page.getByText('mince')).toBeVisible()
  await expect(page.getByText('500g')).toBeVisible()
  // The cursive ell, same as everywhere else in the app.
  await expect(page.getByText('1ℓ')).toBeVisible()

  // Ticking writes through to the cache and queues the change for later.
  await page.getByRole('checkbox').first().check()
  const queued = await page.evaluate(() =>
    window.localStorage.getItem('mealy:offline-lists:v1:user_test:toggles'),
  )
  expect(queued).toContain('item_1')
  expect(queued).toContain('true')
  await expect(page.getByText('2 of 2 ticked · saved copy')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('checkbox').first().uncheck()
  await page.screenshot({ path: 'test-results/offline-list.png' })
})

test('it still stands alone when nothing is cached', async ({ page }) => {
  await page.goto('/offline')
  await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible()
  await expect(page.getByText(/needs a connection/)).toBeVisible()
})

const BOOK_KEY = 'mealy:offline-recipes:v1:user_test:book'

const RECIPES = {
  cachedAt: 3,
  recipes: [
    {
      _id: 'recipe_1',
      _creationTime: 1,
      householdId: 'household_1',
      title: 'Bobotie',
      servings: 4,
      tags: ['mince'],
      ingredients: [
        { name: 'mince', quantity: 500, unit: 'g' },
        { name: 'milk', quantity: 250, unit: 'ml', note: 'full cream' },
      ],
      steps: ['Brown the mince.', 'Bake for 45 minutes.'],
    },
    {
      _id: 'recipe_2',
      _creationTime: 2,
      householdId: 'household_1',
      title: 'Bunny chow',
      servings: 2,
      tags: [],
      ingredients: [],
      steps: [],
    },
  ],
}

test('the recipe book renders when there is no cached list', async ({
  page,
}) => {
  // No list on this device, so the book is what the page falls back to.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [BOOK_KEY, JSON.stringify(RECIPES)],
  )
  await page.goto('/offline')

  await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible()
  await expect(page.getByText('2 saved on this phone')).toBeVisible()
  await expect(page.getByRole('link', { name: /Bobotie/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Bunny chow/ })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/offline-book.png' })
})
