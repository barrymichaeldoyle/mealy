import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createTestUser, deleteTestUser } from './clerk-user'
import type { Page } from '@playwright/test'

test.skip(!process.env['CLERK_SECRET_KEY'], 'needs a Clerk secret key')

/*
 * Its own account, not the run's shared one. This walk answers the
 * measurement question on the way past, and units.spec.ts asserts that a new
 * household is asked it. Sharing one household makes whichever file runs
 * second fail on the other's leftovers.
 */
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

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe.configure({ mode: 'serial' })
// One test walks every screen, so it needs more than the per-test default.
test.setTimeout(180_000)

async function signIn(page: Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await clerk.loaded({ page })
  await clerk.signIn({
    page,
    signInParams: { strategy: 'email_code', identifier },
  })
}

async function scan(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze()
  for (const v of results.violations) {
    console.log(
      `AXE ${name} [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`,
    )
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`   -> ${node.target.join(' ')}`)
      console.log(`      ${node.failureSummary?.replace(/\n/g, ' | ')}`)
    }
  }
  console.log(`AXE-COUNT ${name} ${results.violations.length}`)
  return results.violations
}

test('audit every signed-in screen', async ({ page }) => {
  await signIn(page)

  // The setup screen only exists before the household answers.
  await page.goto('/recipes')
  const setup = page.getByRole('button', { name: 'Save and carry on' })
  await expect(setup).toBeVisible()
  await scan(page, 'unit-setup')
  await setup.click()
  await expect(setup).toBeHidden()

  await page.goto('/recipes')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await scan(page, 'recipes-empty')

  // Build a recipe so the populated screens have something to show.
  await page.goto('/recipes/new')
  await page.getByLabel('Recipe name').fill('Bobotie')
  await page.getByLabel('Serves').fill('4')
  await scan(page, 'recipe-form')

  await page.getByRole('button', { name: 'Add ingredient' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Name').fill('mince')
  await sheet.getByLabel('Quantity').fill('500')
  await scan(page, 'ingredient-sheet')
  await sheet.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Save recipe' }).click()
  await expect(page.getByRole('heading', { name: 'Bobotie' })).toBeVisible()
  await scan(page, 'recipe-detail')

  await page.goto('/recipes')
  await scan(page, 'recipes-list')

  await page.goto('/plan')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await scan(page, 'plan')

  await page.goto('/lists')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await scan(page, 'lists')

  await page.goto('/household')
  await expect(page.getByLabel('Household name')).toBeVisible()
  await scan(page, 'household')
})
