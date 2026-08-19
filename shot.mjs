import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'before'
const browser = await chromium.launch()
const viewports = [
  ['mobile', 390, 844],
  ['desktop', 1280, 800],
]

await Promise.all(
  viewports.map(async ([name, width, height]) => {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto('http://localhost:3000/privacy', {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    await page.screenshot({ path: `/tmp/${out}-${name}.png` })
    await page.close()
  }),
)
await browser.close()
