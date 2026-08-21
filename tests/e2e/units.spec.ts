import { expect, test } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

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

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/unit-setup-mobile.png' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.screenshot({ path: 'test-results/unit-setup-desktop.png' })

    await page.getByRole('button', { name: 'Save and carry on' }).click()
    await expect(heading).toBeHidden()
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('offers metric units only, and restates cups in millilitres', async ({
    page,
  }) => {
    await page.goto('/recipes/new')

    const unit = page.getByLabel('Unit').first()
    // The form waits for the household, so the picker arrives after a skeleton.
    await expect(unit).toBeVisible()
    const options = await unit.locator('option').allTextContents()
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
    await page.getByLabel('Quantity').first().fill('2')
    await unit.selectOption('cup')
    await expect(page.getByText('That is ≈500mℓ.')).toBeVisible()

    await page.screenshot({
      path: 'test-results/recipe-form-equivalent.png',
      fullPage: true,
    })
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
    const unit = page.getByLabel('Unit').first()
    await expect(unit).toBeVisible()
    const options = await unit.locator('option').allTextContents()
    expect(options).toContain('oz')
    expect(options).toContain('fl oz')
    expect(options).not.toContain('g')
    expect(options).not.toContain('mℓ')
  })
})
