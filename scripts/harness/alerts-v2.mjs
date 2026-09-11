/**
 * The alert composer's preview chart (AC-1226) and the Rules table's own
 * sparkline (AC-1233) — jsdom lays out no SVG, so this is the drawn proof.
 * Captures the threshold line and the would-fire marks, light and dark,
 * English and Arabic. `node scripts/harness/alerts-v2.mjs` against
 * `npx vite --port 4327`, or set `HARNESS_BASE` against a preview build.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

async function shoot(name, { arabic = false, dark = false }) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + '/management/reports?view=alerts', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  if (arabic) {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(600)
  }

  /* AC-1233 — the rules table sparkline (threshold line, `Gross revenue
     below SAR 400 a day`'s row) draws before the composer opens. RPT-5
     (`Cancellation rate over 6%`'s report) is `private` to a different
     seeded user than the default session, so its own series never resolves
     interactively — RPT-3 (`team` visibility) is the one every session can
     open. */
  await page.waitForSelector('table')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${name}-rules-table.png`, fullPage: false })

  const sparklineFacts = await page.evaluate(() => {
    const charts = [...document.querySelectorAll('[data-chart]')]
    const strokes = charts.flatMap((c) =>
      [...c.querySelectorAll('[stroke]')].map((n) => n.getAttribute('stroke')),
    )
    return { chartCount: charts.length, strokes: [...new Set(strokes)] }
  })

  /* The row click opens the composer in place (`rowClick: true` on `Open` —
     AC-1225, no dialog). Row text is the rule name, which does not translate
     (`§9.2` — user content), so this works in both languages. The dev mock
     client's simulated latency (never disabled outside a test) means the
     report → series → preview chain resolves over several round trips. */
  await page.getByText('Gross revenue below SAR 400 a day', { exact: true }).click()
  await page.waitForLoadState('networkidle')
  /* The shared dev server (several agents at once) makes the first render of
     a route intermittently slow — poll rather than trust one wait. */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const marks = await page.locator('circle[fill="var(--color-warning-graphic)"]').count()
    if (marks > 0) break
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: `${OUT}/${name}-composer-preview.png`, fullPage: true })

  const previewFacts = await page.evaluate(() => {
    const charts = [...document.querySelectorAll('[data-chart]')]
    /* The preview is the LAST chart on the page — the sparkline column
       renders first, above the fold, before the row click. */
    const preview = charts[charts.length - 1] ?? null
    const marks = preview ? [...preview.querySelectorAll('circle')] : []
    const fills = marks.map((m) => m.getAttribute('fill'))
    const referenceLine = preview ? preview.querySelector('[stroke-dasharray]') : null
    return {
      chartCount: charts.length,
      markCount: marks.length,
      markFills: [...new Set(fills)],
      hasReferenceLine: referenceLine !== null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

  console.log(name, JSON.stringify({ sparklineFacts, previewFacts }))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}

await shoot('alerts-v2-light-en', {})
await shoot('alerts-v2-dark-en', { dark: true })
await shoot('alerts-v2-light-ar', { arabic: true })
await shoot('alerts-v2-dark-ar', { arabic: true, dark: true })
await browser.close()
