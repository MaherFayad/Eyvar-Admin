/**
 * R5 build verification, measured rather than eyeballed.
 *
 *   V-3   the section grid at 1280 AND 1440 - a breakdown never exceeds half
 *         the content width, and the label-to-value gap that motivated it
 *   R5-6  the bar's token, its height, and whether its fractions are monotonic
 *   R5-1  which tiles render, which carry an absent value, and what they say
 *
 * Run against `vite preview` or `vite dev`. Writes scratch/shots/r5-report.json.
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5433'
const BOARDS = [
  ['mgmt-overview', '/management/overview'],
  ['mgmt-performance', '/management/performance'],
  ['mgmt-risk', '/management/risk'],
  ['mgmt-growth', '/management/growth'],
  ['mgmt-zones', '/management/zones'],
  ['ops-overview', '/operations/overview'],
  ['support-overview', '/support/overview'],
  ['admin-overview', '/admin/overview'],
]

const PROBE = () => {
  const main = document.querySelector('main') ?? document.body
  const px = (n) => Math.round(n * 100) / 100
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return { x: px(r.x), right: px(r.right), w: px(r.width), h: px(r.height) }
  }
  const ink = (el) => {
    const r = document.createRange()
    r.selectNodeContents(el)
    const b = r.getBoundingClientRect()
    return { x: px(b.x), right: px(b.right), w: px(b.width) }
  }

  const cards = [...main.querySelectorAll('[data-slot="card"]')]

  const isList = (c) => !!c.querySelector('ul[aria-labelledby]') || /Nothing to rank|Nothing is recorded/i.test(c.textContent ?? '')
  const isChart = (c) => !!c.querySelector('svg.recharts-surface') || /no data found for this date range|Nothing is recorded/i.test(c.textContent ?? '')
  const isTile = (c) => !isList(c) && !isChart(c) && !!c.querySelector('.text-lg')

  /* **The content column is the SECTION GRID's own width, not a card's
     grandparent.** A first cut walked two parents up from the first card and
     got 296px - a tile's grid CELL - which made every breakdown look wider than
     half and reported four boards over the limit that were not. The R5-8
     measurement lives in `r5-width.mjs`, which finds the grid by its children;
     this file now does the same rather than keeping a second, wrong answer to
     the same question. */
  const sectionGrid = [...main.querySelectorAll('div.grid')].find((g) =>
    [...g.children].some((c) => isList(c) || isChart(c)),
  )
  const content = sectionGrid ? rect(sectionGrid) : null

  const sections = cards.filter((c) => isList(c) || isChart(c)).map((c) => ({
    kind: isList(c) ? 'breakdown' : 'chart',
    heading: c.querySelector('[data-slot="card-title"]')?.textContent ?? null,
    ...rect(c),
    /* the top-left grid cell of the section grid, for row detection */
    gridRowTop: px(c.getBoundingClientRect().top),
  }))

  /* V-3's own measurement: the distance between a row's label and its number. */
  const gaps = [...main.querySelectorAll('ul[aria-labelledby] > li')].slice(0, 12).map((li) => {
    const leaves = [...li.querySelectorAll('span,bdi')].filter(
      (n) => n.children.length === 0 && (n.textContent ?? '').trim(),
    )
    if (leaves.length < 2) return null
    const label = ink(leaves[0])
    const value = ink(leaves[1])
    return {
      label: leaves[0].textContent,
      value: leaves[1].textContent,
      gap: px(Math.max(value.x - label.right, label.x - value.right)),
    }
  }).filter(Boolean)

  const lists = [...main.querySelectorAll('ul[aria-labelledby]')].map((ul) => {
    const fills = [...ul.querySelectorAll('.bg-chart-series')]
    const rows = [...ul.querySelectorAll(':scope > li')]
    return {
      heading: document.getElementById(ul.getAttribute('aria-labelledby'))?.textContent ?? null,
      rows: rows.length,
      rowHeights: [...new Set(rows.map((r) => px(r.getBoundingClientRect().height)))],
      barCount: fills.length,
      staleFillCount: ul.querySelectorAll('.bg-chart-fill').length,
      barFill: fills[0] ? getComputedStyle(fills[0]).backgroundColor : null,
      barHeight: fills[0] ? px(fills[0].getBoundingClientRect().height) : null,
      barTrackHeight: fills[0]?.parentElement ? px(fills[0].parentElement.getBoundingClientRect().height) : null,
      /* R5-6: share-of-max, so this should be [1, ...descending] on a ranked list */
      barFractions: fills.map((f) => f.style.inlineSize),
      values: rows.map((r) => {
        const leaves = [...r.querySelectorAll('span,bdi')].filter(
          (n) => n.children.length === 0 && (n.textContent ?? '').trim(),
        )
        return leaves.length > 1 ? leaves[1].textContent : null
      }),
      subLabels: rows.map((r) => r.querySelector('span.truncate.text-xs')?.textContent ?? null),
    }
  })

  const tiles = cards.filter(isTile).map((c) => {
    const val = c.querySelector('.text-lg')
    const lines = [...c.querySelectorAll('span')]
      .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim())
      .map((n) => n.textContent)
    return {
      value: val?.textContent ?? null,
      valueHidden: !!val?.closest('[aria-hidden="true"]'),
      lines,
      srOnly: [...c.querySelectorAll('.sr-only')].map((n) => n.textContent),
      ...rect(c),
    }
  })

  return { content, sections, gaps, lists, tiles, tileCount: tiles.length }
}

const browser = await chromium.launch()
const report = {}
for (const width of [1280, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1200 } })
  for (const [name, route] of BOARDS) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    report[`${name}@${width}`] = await page.evaluate(PROBE)
  }
  await page.close()
}
await browser.close()
writeFileSync('./scratch/shots/r5-report.json', JSON.stringify(report, null, 2))

/* ── the assertions, printed, not asserted: this is a measurement pass ─── */
const say = (...a) => console.log(...a)
for (const [key, r] of Object.entries(report)) {
  const half = r.content ? r.content.w / 2 : null
  const over = r.sections.filter((s) => s.kind === 'breakdown' && half && s.w > half + 2)
  const rows = [...new Set(r.sections.map((s) => Math.round(s.gridRowTop)))]
  say(
    `${key.padEnd(24)} content=${r.content?.w ?? '?'} tiles=${r.tileCount}` +
      ` sections=${r.sections.length} in ${rows.length} row(s)` +
      ` | breakdowns over half: ${over.length}` +
      ` | widest breakdown: ${Math.max(0, ...r.sections.filter((s) => s.kind === 'breakdown').map((s) => s.w))}`,
  )
  const worstGap = Math.max(0, ...r.gaps.map((g) => g.gap))
  if (r.gaps.length) say(`${' '.repeat(24)} worst label-to-value gap: ${worstGap}px`)
  for (const l of r.lists) {
    if (l.barCount === 0 && l.staleFillCount === 0) continue
    const fr = l.barFractions.map((f) => parseFloat(f))
    const monotonic = fr.every((v, i) => i === 0 || v <= fr[i - 1] + 0.001)
    say(
      `${' '.repeat(24)} bar "${l.heading}": n=${l.barCount} fill=${l.barFill}` +
        ` h=${l.barHeight}/${l.barTrackHeight} stale=${l.staleFillCount}` +
        ` fractions=${l.barFractions.join(',')} monotonic=${monotonic}`,
    )
  }
  for (const t of r.tiles.filter((t) => t.value === '—')) {
    say(`${' '.repeat(24)} absent tile: ${JSON.stringify(t.lines)} hidden=${t.valueHidden} sr=${JSON.stringify(t.srOnly)}`)
  }
  for (const t of r.tiles.filter((t) => t.srOnly.length)) {
    say(`${' '.repeat(24)} sr-only tile: ${JSON.stringify(t.lines)} sr=${JSON.stringify(t.srOnly)}`)
  }
}
