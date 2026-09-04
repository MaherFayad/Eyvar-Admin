/**
 * N-4 — is an illegal question gated on BOTH entry points?
 *
 * Under `DATA_SOURCE === 'mock'` nothing crosses the network, so counting HTTP
 * requests proves nothing. `?mockFail=reports.run` is the decisive instrument
 * instead: it makes the operation THROW, and only a run that actually executes
 * can throw. So, with the failure armed:
 *
 *   run executed  → the canvas error state, *"The report didn't run."*
 *   run refused   → the refusal, *"This report can't run yet."* + the reason
 *
 * Both entry points are exercised against the same armed failure, and a legal
 * question is the control that proves the instrument works.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5411'
const OUT = './scratch/shots-n4'
mkdirSync(OUT, { recursive: true })

/* `serialiseReportQuery`'s wire shape — `src/data/reporting/serialise.ts:91`. */
const encode = (q) =>
  Buffer.from(JSON.stringify(q))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const base = {
  m: ['captains.registered'],
  g: null,
  f: [],
  w: { kind: 'preset', preset: 'last-30d' },
  gr: 'day',
  c: 'none',
  ct: 'line',
}
const INVERTED = encode({ ...base, w: { kind: 'absolute', from: '2026-06-25', to: '2026-06-01' } })
const LEGAL = encode(base)

const browser = await chromium.launch()

async function visit(path, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6500)
  const read = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === 'Result',
    )
    const text = canvas ? canvas.innerText.trim() : ''
    return {
      canvas: text.split('\n').filter(Boolean).slice(0, 5),
      ran: /Computed/.test(text),
      errored: /didn’t run|didn't run/.test(text),
      refused: /can’t run yet|can't run yet/.test(text),
      address: location.search.replace(/q=[^&]+/, 'q=…'),
    }
  })
  console.log(`--- ${label} ---`)
  console.log('  ran (freshness)  :', read.ran)
  console.log('  error state      :', read.errored)
  console.log('  refusal state    :', read.refused)
  console.log('  address          :', read.address)
  console.log('  canvas           :', JSON.stringify(read.canvas))
  await page.screenshot({ path: `${OUT}/${label}.png` })
  await page.close()
}

/* 1 — an illegal question arriving BY URL, with the run armed to throw. */
await visit(`/management/reports?q=${INVERTED}&mockFail=reports.run`, 'url-illegal-armed')
/* 2 — the control: the same armed failure, a LEGAL question. */
await visit(`/management/reports?q=${LEGAL}&mockFail=reports.run`, 'url-legal-armed')
/* 3 — the illegal URL with nothing armed, so the refusal can be read plainly. */
await visit(`/management/reports?q=${INVERTED}`, 'url-illegal')
/* 4 — the legal URL with nothing armed: it runs, as it must. */
await visit(`/management/reports?q=${LEGAL}`, 'url-legal')

/* 5 — the same illegality, composed by EDITING, with the run armed to throw.
   The window control is the shortest path to `window-inverted` through real
   controls; the mode strip's empty funnel is the shorter one and is what the
   suite already pins, so this uses the strip. */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${BASE}/management/reports?q=${LEGAL}&mockFail=reports.run`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForTimeout(5000)
  const before = await page.evaluate(() => location.search)
  const strip = page.getByRole('group').filter({ has: page.getByRole('button', { name: 'Funnel' }) })
  await strip.getByRole('button', { name: 'Funnel' }).click()
  await page.waitForTimeout(4000)
  const after = await page.evaluate(() => {
    const canvas = [...document.querySelectorAll('section')].find(
      (s) => s.getAttribute('aria-label') === 'Result',
    )
    const text = canvas ? canvas.innerText.trim() : ''
    return {
      search: location.search,
      errored: /didn’t run|didn't run/.test(text),
      canvas: text.split('\n').filter(Boolean).slice(0, 4),
      railSaysWhy: document.body.innerText.includes('Choose the steps'),
    }
  })
  console.log('--- edit-illegal-armed (mode strip → Funnel, no rungs) ---')
  console.log('  address unchanged :', before === after.search)
  console.log('  error state       :', after.errored)
  console.log('  canvas            :', JSON.stringify(after.canvas))
  await page.screenshot({ path: `${OUT}/edit-illegal-armed.png` })
  await page.close()
}

await browser.close()
