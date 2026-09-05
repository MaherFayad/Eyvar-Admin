/**
 * The Contact Centre inbox (design 12, plan §8) in English and Arabic at
 * 1280×800 and 390×844, plus one dark capture through the account menu's
 * theme radio. Asserts the plan's probes: three panes with a thread open,
 * zero bordered bubbles, avatar clusters, filled-button counts per pane,
 * text under 12px in the thread pane, rows per 800px, no horizontal overflow.
 *
 *   npx vite --port 4335   (or set HARNESS_BASE)
 *   node scripts/harness/support-inbox.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4335'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['inbox-list', '/support/contact-centre', {}],
  ['inbox-mine', '/support/contact-centre?view=mine', {}],
  ['inbox-thread', '/support/contact-centre/CNV-102', { thread: true }],
  ['inbox-note', '/support/contact-centre/CNV-102', { thread: true, note: true }],
  ['inbox-empty-thread', '/support/contact-centre/CNV-107', { thread: true, emptyThread: true }],
  /* V-1 and V-2: the long Arabic name, unheld; V-4: a snoozed row's three ghosts. */
  ['inbox-long-name', '/support/contact-centre/CNV-101', { thread: true, longName: true }],
  ['inbox-snoozed', '/support/contact-centre/CNV-111', { thread: true, snoozed: true }],
]

const VIEWPORTS = [
  ['wide', { width: 1280, height: 800 }],
  ['compact', { width: 390, height: 844 }],
]

async function openAccountMenu(page) {
  await page.getByRole('button', { name: /^(Account|الحساب)/ }).click()
}

async function switchToArabic(page) {
  await openAccountMenu(page)
  await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
  await page.waitForTimeout(1200)
}

async function switchToDark(page) {
  await openAccountMenu(page)
  const radio = page.getByRole('menuitemradio', { name: /^(Dark|داكن)/ })
  if ((await radio.count()) === 0) {
    await page.keyboard.press('Escape')
    return false
  }
  await radio.click()
  await page.waitForTimeout(600)
  return true
}

async function switchToNote(page, language) {
  const tab = page.getByRole('tab', { name: language === 'ar' ? 'ملاحظة داخلية' : 'Internal note' })
  await tab.click()
  await page.waitForTimeout(300)
}

async function probe(page, opts, compact) {
  return page.evaluate(
    ({ opts, compact }) => {
      const px = (el) => Number.parseFloat(getComputedStyle(el).fontSize)
      const visible = (el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const isFilled = (button) => {
        const s = getComputedStyle(button)
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
        const probe = document.createElement('span')
        probe.style.color = primary
        document.body.appendChild(probe)
        const resolved = getComputedStyle(probe).color
        probe.remove()
        return s.backgroundColor === resolved
      }
      const panes = ['list', 'thread'].map((name) => document.querySelector(`[data-inbox-pane="${name}"]`))
      const rail = document.querySelector('aside')
      const panesVisible = [...panes, rail].filter((el) => el !== null && visible(el)).length
      const thread = panes[1]
      const bubbles = [...document.querySelectorAll('[data-bubble]')]
      const bordered = bubbles.filter((el) => Number.parseFloat(getComputedStyle(el).borderTopWidth) > 0).length
      const avatarClusters = thread ? thread.querySelectorAll('[data-slot="avatar"]').length : 0
      const header = document.querySelector('[data-inbox-pane="thread"] header')
      const headerFilled = header ? [...header.querySelectorAll('button')].filter(isFilled).length : 0
      const composer = thread ? thread.querySelector('[data-inbox-composer]') : null
      const composerFilled = composer ? [...composer.querySelectorAll('button')].filter(isFilled).length : 0
      /* `small` counts every text node under 12px; `smallProse` leaves out badge
         labels, the one job `--text-2xs` is declared for (globals.css H2). */
      let small = 0
      let smallProse = 0
      const smallSamples = []
      if (thread) {
        const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent || node.textContent.trim() === '') continue
          const el = node.parentElement
          if (!el || !visible(el) || el.classList.contains('sr-only')) continue
          if (px(el) < 12) {
            small += 1
            if (el.closest('[data-slot="badge"]') === null) smallProse += 1
            if (smallSamples.length < 6) smallSamples.push(`${node.textContent.trim().slice(0, 24)}@${px(el)}`)
          }
        }
      }
      const rows = [...document.querySelectorAll('[data-inbox-row]')].filter(visible)
      const rowPitch = rows.length > 1 ? Math.round(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top) : null
      const viewportRows = rows.filter((el) => el.getBoundingClientRect().bottom <= window.innerHeight).length
      /* Rows the list's box could show at this pitch: the probe is about pitch, and a folder may hold fewer. */
      const listBox = rows[0]?.closest('ol')?.getBoundingClientRect() ?? null
      const rowCapacity = listBox && rowPitch ? Math.floor((window.innerHeight - listBox.top) / rowPitch) : null
      const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth
      const dir = document.documentElement.getAttribute('dir')
      const send = composer ? [...composer.querySelectorAll('button')].find(isFilled) ?? null : null
      const sendEdge =
        send && composer
          ? dir === 'rtl'
            ? Math.round(send.getBoundingClientRect().left - composer.getBoundingClientRect().left)
            : Math.round(composer.getBoundingClientRect().right - send.getBoundingClientRect().right)
          : null
      const sides = bubbles.map((el) => {
        const r = el.getBoundingClientRect()
        const p = thread.getBoundingClientRect()
        return { dir: el.getAttribute('data-direction'), start: Math.round(r.left - p.left), end: Math.round(p.right - r.right) }
      })
      const bubbleSidesOk = sides.every((s) =>
        dir === 'rtl' ? (s.dir === 'inbound' ? s.end < s.start : s.start < s.end) : s.dir === 'inbound' ? s.start < s.end : s.end < s.start,
      )
      /* V-1: no header button rect intersects any line-2 child rect. */
      const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
      const line2 = header ? header.querySelector('[data-inbox-line2]') : null
      /* A clipped child still reports its full box; only its painted part can collide. */
      const clip = (r, box) => ({ left: Math.max(r.left, box.left), right: Math.min(r.right, box.right), top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) })
      const line2Box = line2 ? line2.getBoundingClientRect() : null
      const line2Children = line2
        ? [...line2.querySelectorAll('*')].filter(visible).map((el) => clip(el.getBoundingClientRect(), line2Box)).filter((r) => r.right > r.left && r.bottom > r.top)
        : []
      const headerButtons = header ? [...header.querySelectorAll('button')].filter(visible).map((b) => b.getBoundingClientRect()) : []
      const headerCollisions = headerButtons.filter((b) => line2Children.some((c) => intersects(b, c))).length
      const clockVisible = line2 ? [...line2.querySelectorAll('[data-inbox-clock]')].every((el) => {
        const r = el.getBoundingClientRect()
        const p = line2.getBoundingClientRect()
        return r.left >= p.left - 1 && r.right <= p.right + 1
      }) : true
      const identityWidth = line2 ? Math.round(line2.getBoundingClientRect().width) : null
      /* V-2: neither register tab leaves the list's box. */
      const tabList = composer ? composer.querySelector('[role="tablist"]') : null
      const tabsOutside = tabList
        ? [...tabList.querySelectorAll('[role="tab"]')].filter((tab) => {
            const r = tab.getBoundingClientRect()
            const l = tabList.getBoundingClientRect()
            return r.left < l.left - 1 || r.right > l.right + 1
          }).length
        : 0
      const surface = composer ? composer.querySelector('[data-inbox-composer-surface]') : null
      const noteSurface = surface ? getComputedStyle(surface).backgroundColor : null
      const held = header
        ? [...header.querySelectorAll('button')].every((b) => !/^(Claim|Take over|Reopen|استلام|تولّي|إعادة فتح)$/.test(b.textContent?.trim() ?? ''))
        : null
      return {
        dir,
        compact,
        panesVisible,
        bubbles: bubbles.length,
        bordered,
        avatarClusters,
        headerFilled,
        composerFilled,
        small,
        smallProse,
        smallSamples,
        rows: rows.length,
        viewportRows,
        rowCapacity,
        rowPitch,
        held,
        overflowX,
        sendEdge,
        bubbleSidesOk,
        noteSurface,
        headerCollisions,
        clockVisible,
        identityWidth,
        tabsOutside,
        headerButtons: header ? [...header.querySelectorAll('button')].filter(visible).map((b) => b.textContent?.trim() || b.getAttribute('aria-label')) : [],
        text: opts.emptyThread ? (thread?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 120) : undefined,
      }
    },
    { opts, compact },
  )
}

const browser = await chromium.launch()
let failures = 0

for (const language of ['en', 'ar']) {
  for (const [vpName, viewport] of VIEWPORTS) {
    for (const [name, url, opts] of ROUTES) {
      const compact = viewport.width < 768
      const ctx = await browser.newContext({ viewport })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
      await page.goto(BASE + url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)
      if (language === 'ar') await switchToArabic(page)
      await page.waitForTimeout(600)
      if (opts.note) await switchToNote(page, language)
      await page.screenshot({ path: `${OUT}/${name}-${vpName}-${language}-${LABEL}.png`, fullPage: false })

      const facts = await probe(page, opts, compact)
      const bad = []
      if (facts.overflowX > 0) bad.push(`overflowX ${facts.overflowX}`)
      if (errors.length) bad.push(`errors ${errors.join(' | ')}`)
      if (!compact) {
        if (opts.thread && facts.panesVisible !== 3) bad.push(`panes ${facts.panesVisible}`)
        /* Arabic controls are 36px and rows 64px by token, so seven is its ceiling at 800. */
        if (!opts.thread && (facts.rowCapacity ?? 0) < (language === 'ar' ? 7 : 8)) bad.push(`rows/800 capacity ${facts.rowCapacity}`)
      }
      if (opts.thread) {
        if (facts.bordered !== 0) bad.push(`bordered bubbles ${facts.bordered}`)
        if (!opts.emptyThread && !opts.longName && !opts.snoozed && facts.avatarClusters < 2) bad.push(`avatar clusters ${facts.avatarClusters}`)
        if (facts.headerCollisions !== 0) bad.push(`header collisions ${facts.headerCollisions}`)
        if (!facts.clockVisible) bad.push('clock clipped')
        if (facts.tabsOutside !== 0) bad.push(`tabs outside list ${facts.tabsOutside}`)
        /* Zero filled in the header while held; `Claim` is the one filled button when unheld (§4.1). */
        if (facts.headerFilled !== (facts.held ? 0 : 1)) bad.push(`header filled ${facts.headerFilled} (held ${facts.held})`)
        if (facts.composerFilled !== (opts.note ? 0 : 1)) bad.push(`composer filled ${facts.composerFilled}`)
        if (facts.smallProse > 0) bad.push(`small text ${facts.smallProse} of ${facts.small} ${facts.smallSamples.join(',')}`)
        if (!facts.bubbleSidesOk) bad.push('bubble sides')
        if (!opts.note && facts.sendEdge !== null && facts.sendEdge > 12) bad.push(`send edge ${facts.sendEdge}`)
      }
      if (bad.length) failures += 1
      console.log(`${name} ${vpName} ${language} ${LABEL}`, JSON.stringify(facts), bad.length ? `FAIL ${bad.join('; ')}` : 'ok')
      await ctx.close()
    }
  }
}

/* Dark captures of CNV-102 in both registers, through the account menu's theme radio (Q-CC1). */
for (const note of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(`${BASE}/support/contact-centre/CNV-102`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const dark = await switchToDark(page)
  if (note) await switchToNote(page, 'en')
  const name = note ? 'inbox-note' : 'inbox-thread'
  await page.screenshot({ path: `${OUT}/${name}-wide-en-dark-${LABEL}.png`, fullPage: false })
  const facts = await probe(page, { thread: true, note }, false)
  const bad = []
  if (!dark) bad.push('no dark radio')
  if (facts.bordered !== 0) bad.push(`bordered bubbles ${facts.bordered}`)
  if (facts.headerFilled !== 0) bad.push(`header filled ${facts.headerFilled}`)
  if (facts.composerFilled !== (note ? 0 : 1)) bad.push(`composer filled ${facts.composerFilled}`)
  if (errors.length) bad.push(`errors ${errors.join(' | ')}`)
  if (bad.length) failures += 1
  console.log(`${name} wide en dark ${LABEL}`, JSON.stringify(facts), bad.length ? `FAIL ${bad.join('; ')}` : 'ok')
  await ctx.close()
}

await browser.close()
process.exit(failures ? 1 : 0)
