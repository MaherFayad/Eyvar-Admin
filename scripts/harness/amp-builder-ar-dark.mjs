/**
 * The compound chart in the two skins nobody has rendered it in yet: dark, and
 * Arabic. `--chart-s2…s6` are new tokens with a dark half nothing has drawn,
 * and §9.2 pins the plot LTR while the chrome around it mirrors.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function shoot(name, { url, arabic = false, dark = false }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  if (arabic) {
    /* The account menu carries the language radio group. */
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  }
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const strokes = [...document.querySelectorAll('.recharts-curve')]
      .map((n) => getComputedStyle(n).stroke)
      .filter((v) => v && v !== 'none')
    /* §2.2 (WP-2.1…2.5) moved the compound plot from `role="img"` to
       `role="group"` (keyboard-navigable buckets); skip the chart controls
       row's own `group` to find the plot's. */
    const plot = [...document.querySelectorAll('[role="group"]')].find(
      (el) => el.getAttribute('aria-label') !== 'Chart controls',
    )
    /* Every headline dot, so a hue that failed to resolve shows as a blank. */
    const dots = [...document.querySelectorAll('[data-slot="metric-value"]')]
      .map((n) => n.parentElement?.parentElement?.querySelector('span[aria-hidden]'))
      .map((n) => (n ? getComputedStyle(n).backgroundColor : null))
    return {
      dir: document.documentElement.dir,
      plotDir: plot?.getAttribute('dir') ?? null,
      strokes: [...new Set(strokes)],
      /* Nothing on this page may scroll sideways. */
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardBg: getComputedStyle(document.querySelector('[data-slot="card"]') ?? document.body)
        .backgroundColor,
      dots,
    }
  })
  console.log(name, JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

await shoot('rpt1-dark', { url: '/management/reports/RPT-1', dark: true })
await shoot('rpt1-ar', { url: '/management/reports/RPT-1', arabic: true })
await shoot('rpt1-ar-dark', { url: '/management/reports/RPT-1', arabic: true, dark: true })
await browser.close()
