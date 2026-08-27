import { chromium } from 'playwright'
const BASE = 'http://localhost:5433'
const b = await chromium.launch()
// LOADING
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(BASE + '/admin/overview', { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('[data-slot="skeleton"], .animate-pulse', { timeout: 8000 }).catch(() => console.log('no skeleton found'))
  await p.waitForTimeout(120)
  await p.screenshot({ path: './scratch/shots/vqa-state-loading.png' })
  console.log('loading:', await p.evaluate(() => ({
    skeletons: document.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length,
    live: document.querySelector('main [aria-live]')?.getAttribute('aria-live') ?? null,
    label: document.querySelector('main [aria-live]')?.textContent ?? document.querySelector('main .sr-only')?.textContent ?? null,
  })))
  await p.close()
}
// ERROR
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(BASE + '/management/overview', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const ok = await p.evaluate(async () => {
    const m = await import('/src/data/clients/index.ts')
    const keys = Object.keys(m)
    if (!m.mockFailures) return { keys: keys.slice(0, 40) }
    m.mockFailures.always('metrics.board')
    return { armed: true }
  })
  console.log('arm:', JSON.stringify(ok))
  await p.getByRole('link', { name: /Risk/i }).first().click().catch(() => {})
  await p.waitForTimeout(1500)
  await p.screenshot({ path: './scratch/shots/vqa-state-error.png' })
  console.log('error:', await p.evaluate(() => (document.querySelector('main')?.textContent ?? '').slice(0, 200)))
  await p.close()
}
await b.close()
