/**
 * Rate card — the DENSITY probe. Not a rule check: a measurement of how the
 * view reads. Owner: "massive redesign, in spacing, text hierarchy, and overall
 * design". `fin-rate-card.mjs` proves the rules pass; this one prints the
 * numbers that say the page still reads badly.
 *
 *   npx vite --port 4327
 *   HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs [theme] [lang] [width]
 *
 * Prints one JSON block and exits 0. It asserts nothing — the audit reads it.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const THEME = process.argv[2] ?? 'light'
const LANG = process.argv[3] ?? 'en'
const WIDTH = Number(process.argv[4] ?? 1280)
const HEIGHT = Number(process.env.HARNESS_HEIGHT ?? 900)
const BASE = process.env.HARNESS_BASE ?? 'http://localhost:4327'
const OUT = './scripts/harness/shots'
const TAG = `rc-density-${THEME}-${LANG}-${WIDTH}`
const ROUTE = '/financials/pricing?view=rate-card'
mkdirSync(OUT, { recursive: true })

/* ── in-page helpers, lifted from fin-rate-card.mjs ─────────────────────── */
const helpers = () => {
  window.__lum = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    if (!m) return 1
    const [r, g, b] = [+m[1], +m[2], +m[3]].map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  window.__step = (a, b) => {
    const [la, lb] = [window.__lum(a), window.__lum(b)]
    return +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2))
  }
  window.__under = (n) => {
    let x = n
    while (x) {
      const bg = getComputedStyle(x).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(bg)) return bg
      x = x.parentElement
    }
    return 'rgb(255, 255, 255)'
  }
  window.__hex = (css) => {
    const m = css.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    return m ? '#' + [m[1], m[2], m[3]].map((c) => (+c).toString(16).padStart(2, '0')).join('') : css
  }
  window.__r = (n) => {
    if (!n) return null
    const b = n.getBoundingClientRect()
    const s = document.scrollingElement
    return {
      top: +(b.top + s.scrollTop).toFixed(1),
      bottom: +(b.bottom + s.scrollTop).toFixed(1),
      left: +b.left.toFixed(1),
      right: +b.right.toFixed(1),
      w: +b.width.toFixed(1),
      h: +b.height.toFixed(1),
    }
  }
  /* The painted box of a run of text, not of its element: an inline box's
     element rect is the whole cell, which hides where the ink actually is. */
  window.__ink = (node, from, to) => {
    const text = [...node.childNodes].find((c) => c.nodeType === 3)
    if (!text) return null
    const range = document.createRange()
    range.setStart(text, from ?? 0)
    range.setEnd(text, to ?? text.data.length)
    const b = range.getBoundingClientRect()
    const s = document.scrollingElement
    if (b.width === 0 && b.height === 0) return null
    return {
      top: +(b.top + s.scrollTop).toFixed(1),
      bottom: +(b.bottom + s.scrollTop).toFixed(1),
      left: +b.left.toFixed(1),
      right: +b.right.toFixed(1),
      w: +b.width.toFixed(1),
    }
  }
  /* The x of the decimal separator inside a money cell — R4's real promise. */
  window.__decimalX = (cell) => {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const i = node.data.search(/[.٫]/)
      if (i >= 0) {
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        return { x: +range.getBoundingClientRect().left.toFixed(1), text: cell.textContent.trim() }
      }
    }
    return { x: null, text: cell.textContent.trim() }
  }
  /* The ink of a cell whose text is wrapped in spans — `__ink` only reads a
     direct text child, and every money cell puts its digits inside `Money`. */
  window.__deepInk = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    let first = null
    let node
    while ((node = walker.nextNode())) {
      if (node.data.trim() === '') continue
      if (first === null) {
        range.setStart(node, 0)
        first = node
      }
      range.setEnd(node, node.data.length)
    }
    if (first === null) return null
    const b = range.getBoundingClientRect()
    const s = document.scrollingElement
    return {
      top: +(b.top + s.scrollTop).toFixed(1),
      bottom: +(b.bottom + s.scrollTop).toFixed(1),
      left: +b.left.toFixed(1),
      right: +b.right.toFixed(1),
      w: +b.width.toFixed(1),
    }
  }
  /* The page scrolls in a pane, not in the document: `scrollHeight` on the
     document reports the viewport and hides the real vertical budget. */
  window.__scroller = () =>
    [...document.querySelectorAll('*')].find(
      (n) =>
        n.scrollHeight > n.clientHeight + 4 &&
        /auto|scroll/.test(getComputedStyle(n).overflowY) &&
        n.clientHeight > 200,
    ) ?? document.scrollingElement
  window.__leaf = (root) =>
    [...root.querySelectorAll('*')].filter(
      (n) =>
        n.textContent.trim() !== '' &&
        [...n.childNodes].some((c) => c.nodeType === 3 && c.data.trim() !== '') &&
        !n.closest('.sr-only') &&
        getComputedStyle(n).display !== 'none',
    )
  window.__wrapped = (n) => {
    const cs = getComputedStyle(n)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5
    const range = document.createRange()
    range.selectNodeContents(n)
    return {
      lines: range.getClientRects().length,
      h: +n.getBoundingClientRect().height.toFixed(1),
      lineHeight: +lh.toFixed(1),
    }
  }
}

/* ── the probe ──────────────────────────────────────────────────────────── */
const probe = (vh) => {
  const R = window.__r
  const ink = window.__ink
  const out = {}
  const main = document.querySelector('main') ?? document.body
  const rail = document.querySelector('ol[aria-labelledby]')
  const block = rail?.closest('[data-slot="card"]') ?? null
  const pane = block?.querySelector('section[aria-labelledby]') ?? null
  const table = pane?.querySelector('table') ?? null

  /* ── 1. vertical budget ─────────────────────────────────────────────── */
  const h1 = document.querySelector('h1')
  const tabstrip =
    document.querySelector('[role="tablist"]') ??
    document.querySelector('[data-slot="view-switcher"]')
  const banner = [...main.querySelectorAll('*')].find(
    (n) => n.getAttribute('data-slot') === 'banner' || n.className?.toString?.().includes('banner'),
  )
  const bannerAlert = [...document.querySelectorAll('[role="status"],[role="alert"],section')].find(
    (n) => /read-only until the rate card owner|قراءة فقط/.test(n.textContent ?? ''),
  )
  const firstMoney = table?.querySelector('tbody tr td:nth-child(2)') ?? null
  const scroller = window.__scroller()
  out.viewport = { w: window.innerWidth, h: vh }
  out.documentHeight = document.scrollingElement.scrollHeight
  out.scroller = {
    tag: scroller.tagName.toLowerCase() + '.' + String(scroller.className).slice(0, 40),
    scrollHeight: scroller.scrollHeight,
    clientHeight: scroller.clientHeight,
    screensToRead: +(scroller.scrollHeight / scroller.clientHeight).toFixed(2),
  }
  out.chrome = {
    h1: R(h1),
    h1Text: h1?.textContent.trim() ?? null,
    tabstrip: R(tabstrip),
    banner: R(banner ?? bannerAlert ?? null),
    bannerText: (banner ?? bannerAlert)?.textContent.trim().slice(0, 140) ?? null,
    block: R(block),
    railHeading: R(block?.querySelector('h3') ?? null),
    paneTitle: R(pane?.querySelector('h3') ?? null),
    tableHeadRow: R(table?.querySelector('thead tr') ?? null),
    firstMoneyCell: R(firstMoney),
    firstMoneyInk: firstMoney ? window.__decimalX(firstMoney) : null,
    firstMoneyText: firstMoney?.textContent.trim() ?? null,
  }

  /* ── 2. every vertical gap in the detail pane, in order ─────────────── */
  const gapsBetween = (parent) => {
    if (!parent) return []
    const kids = [...parent.children].filter(
      (n) => !n.classList.contains('sr-only') && n.getBoundingClientRect().height > 0,
    )
    const rows = []
    for (let i = 0; i < kids.length; i += 1) {
      const r = R(kids[i])
      rows.push({
        i,
        tag: kids[i].tagName.toLowerCase(),
        label: kids[i].textContent.trim().slice(0, 46).replace(/\s+/g, ' '),
        h: r.h,
        gapToNext:
          i + 1 < kids.length ? +(R(kids[i + 1]).top - r.bottom).toFixed(1) : null,
      })
    }
    return rows
  }
  out.mainRect = R(main)
  out.appChrome = {
    topBarHeight: R(main)?.top ?? null,
    aboveH1: h1 && R(main) ? +(R(h1).top - R(main).top).toFixed(1) : null,
  }
  out.paneChildren = gapsBetween(pane)

  /* The rhythm an operator SEES: ink bottom to ink top, every consecutive run
     in the pane in reading order. Box gaps are uniform; ink gaps are not. */
  out.paneInkRhythm = pane
    ? (() => {
        const runs = window
          .__leaf(pane)
          .map((n) => ({ n, ink: window.__deepInk(n) }))
          .filter((r) => r.ink)
          .sort((a, b) => a.ink.top - b.ink.top || a.ink.left - b.ink.left)
        const lines = []
        for (const r of runs) {
          const last = lines[lines.length - 1]
          if (last && Math.abs(last.top - r.ink.top) < 4) {
            last.texts.push(r.n.textContent.trim().slice(0, 22))
            last.bottom = Math.max(last.bottom, r.ink.bottom)
            last.startEdge = Math.min(last.startEdge, r.ink.left)
            continue
          }
          lines.push({
            top: r.ink.top,
            bottom: r.ink.bottom,
            startEdge: r.ink.left,
            px: parseFloat(getComputedStyle(r.n).fontSize),
            texts: [r.n.textContent.trim().slice(0, 22)],
          })
        }
        return lines.map((l, i) => ({
          text: l.texts.join(' | ').slice(0, 60),
          px: l.px,
          startEdge: +l.startEdge.toFixed(0),
          inkGapToNext: i + 1 < lines.length ? +(lines[i + 1].top - l.bottom).toFixed(1) : null,
          baselinePitch: i + 1 < lines.length ? +(lines[i + 1].top - l.top).toFixed(1) : null,
        }))
      })()
    : []
  const band = pane ? [...pane.children].find((n) => n.className.includes('grid-cols-3')) : null
  out.bandChildren = gapsBetween(band)

  /* The gap the owner sees: last table row's ink to the band's first ink. */
  const lastRow = table?.querySelector('tbody tr:last-child') ?? null
  const lastCell = lastRow?.querySelector('td') ?? null
  const bandHeading = band?.querySelector('h4') ?? null
  out.deadSpace = {
    lastRowLabel: lastCell?.textContent.trim() ?? null,
    lastRowRect: R(lastRow),
    lastRowInk: lastCell ? ink(lastCell) : null,
    tableRect: R(table),
    tableBottomMinusLastRowBottom: table && lastRow ? +(R(table).bottom - R(lastRow).bottom).toFixed(1) : null,
    bandRect: R(band),
    bandPaddingTop: band ? getComputedStyle(band).paddingTop : null,
    bandBorderTop: band ? getComputedStyle(band).borderTopWidth : null,
    bandHeadingRect: R(bandHeading),
    bandHeadingInk: bandHeading ? ink(bandHeading) : null,
    gapRowBottomToBandTop: table && band ? +(R(band).top - R(lastRow).bottom).toFixed(1) : null,
    gapInkToInk:
      lastCell && bandHeading && ink(lastCell) && ink(bandHeading)
        ? +(ink(bandHeading).top - ink(lastCell).bottom).toFixed(1)
        : null,
    paneGap: pane ? getComputedStyle(pane).rowGap : null,
    panePadding: pane ? getComputedStyle(pane).padding : null,
  }

  /* ── 3. type hierarchy ──────────────────────────────────────────────── */
  const tally = (root) => {
    const map = new Map()
    for (const n of window.__leaf(root)) {
      const cs = getComputedStyle(n)
      const key = `${parseFloat(cs.fontSize)}px/${cs.fontWeight}/${window.__hex(cs.color)}`
      const entry = map.get(key) ?? {
        px: parseFloat(cs.fontSize),
        weight: +cs.fontWeight,
        colour: window.__hex(cs.color),
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        transform: cs.textTransform,
        count: 0,
        examples: [],
      }
      entry.count += 1
      if (entry.examples.length < 3) entry.examples.push(n.textContent.trim().slice(0, 40))
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => b.px - a.px || b.weight - a.weight)
  }
  out.typeInBlock = block ? tally(block) : []
  out.typeInView = tally(main)
  out.typeSummary = {
    distinctTriplesInBlock: out.typeInBlock.length,
    distinctSizesInBlock: [...new Set(out.typeInBlock.map((r) => r.px))].sort((a, b) => a - b),
    distinctTriplesInView: out.typeInView.length,
    distinctSizesInView: [...new Set(out.typeInView.map((r) => r.px))].sort((a, b) => a - b),
    elementsAt12or13or14: out.typeInBlock
      .filter((r) => r.px >= 12 && r.px <= 14)
      .reduce((sum, r) => sum + r.count, 0),
    elementsTotal: out.typeInBlock.reduce((sum, r) => sum + r.count, 0),
  }

  /* ── 4. the class table ─────────────────────────────────────────────── */
  if (table) {
    const ths = [...table.querySelectorAll('thead th')]
    const firstBodyRow = table.querySelector('tbody tr')
    const tds = firstBodyRow ? [...firstBodyRow.children] : []
    out.table = {
      rect: R(table),
      tableLayout: getComputedStyle(table).tableLayout,
      columns: ths.map((th, i) => {
        const label = th.textContent.trim()
        const sarAt = label.indexOf('(SAR)')
        const whole = ink(th)
        const sar = sarAt >= 0 ? ink(th, sarAt, label.length) : null
        const cell = tds[i] ?? null
        const cellInk = cell ? window.__deepInk(cell) : null
        return {
          label,
          width: +th.getBoundingClientRect().width.toFixed(1),
          cellInk,
          cellInkWidth: cellInk?.w ?? null,
          /* how much of the column the widest value actually needs */
          valueSlackPx: cellInk ? +(th.getBoundingClientRect().width - cellInk.w).toFixed(1) : null,
          headerInkToValueInk: whole && cellInk ? +(cellInk.top - whole.bottom).toFixed(1) : null,
          widthPct: +((th.getBoundingClientRect().width / table.getBoundingClientRect().width) * 100).toFixed(1),
          align: getComputedStyle(th).textAlign,
          cellAlign: cell ? getComputedStyle(cell).textAlign : null,
          padding: getComputedStyle(th).padding,
          headerInkWidth: whole?.w ?? null,
          sarInkWidth: sar?.w ?? null,
          headerLines: window.__wrapped(th).lines,
          headerRight: whole?.right ?? null,
          firstValue: cell?.textContent.trim() ?? null,
          firstValueInkRight: cell ? ink(cell)?.right ?? null : null,
          headerToValueGap:
            whole && cell && ink(cell) ? +(ink(cell).top - whole.bottom).toFixed(1) : null,
        }
      }),
      rowHeights: [...table.querySelectorAll('tbody tr')].map((tr) =>
        +tr.getBoundingClientRect().height.toFixed(1),
      ),
      /* the promise of a numeric column: the decimal points share an x */
      decimals: [1, 2, 3, 4, 5].map((col) => ({
        column: ths[col]?.textContent.trim() ?? null,
        xs: [...table.querySelectorAll(`tbody tr td:nth-child(${col + 1})`)].map(
          (td) => window.__decimalX(td).x,
        ),
      })),
      sarRepetitions: ths.filter((th) => th.textContent.includes('(SAR)')).length,
      /* the table carries `-mx-(--card-spacing)` inside a pane that has no
         inline padding of its own, so it hangs OUT of the card on both edges */
      overflow: block
        ? {
            cardRect: R(block),
            paneRect: R(pane),
            pastCardEnd: +(R(table).right - R(block).right).toFixed(1),
            pastPaneStart: +(R(pane).left - R(table).left).toFixed(1),
            cardOverflowX: getComputedStyle(block).overflowX,
            lastCellInkToCardEdge: (() => {
              const last = firstBodyRow?.lastElementChild
              const i = last ? window.__deepInk(last) : null
              return i ? +(R(block).right - i.right).toFixed(1) : null
            })(),
            firstCellInkToRailDivider: (() => {
              const first = firstBodyRow?.firstElementChild
              const i = first ? window.__deepInk(first) : null
              const col = rail?.parentElement
              return i && col ? +(i.left - R(col).right).toFixed(1) : null
            })(),
            rowHoverGround: firstBodyRow ? R(firstBodyRow) : null,
          }
        : null,
    }
    out.table.sarTotalInkWidth = +out.table.columns
      .reduce((s, c) => s + (c.sarInkWidth ?? 0), 0)
      .toFixed(1)
  }

  /* ── 5. the header stats ────────────────────────────────────────────── */
  const headRow = pane ? [...pane.children].find((n) => n.className.includes('justify-between')) : null
  const titleBlock = headRow?.firstElementChild ?? null
  const dl = headRow?.querySelector('dl') ?? null
  if (headRow) {
    out.headerStats = {
      rowRect: R(headRow),
      titleBlock: R(titleBlock),
      dl: R(dl),
      wrappedBelowTitle: dl && titleBlock ? R(dl).top > R(titleBlock).top + 4 : null,
      inlineGap:
        dl && titleBlock
          ? +(document.dir === 'rtl'
              ? R(titleBlock).left - R(dl).right
              : R(dl).left - R(titleBlock).right
            ).toFixed(1)
          : null,
      columnGap: dl ? getComputedStyle(dl).columnGap : null,
      figures: dl
        ? [...dl.querySelectorAll('dt')].map((dt) => ({
            label: dt.textContent.trim(),
            ...window.__wrapped(dt),
            w: +dt.getBoundingClientRect().width.toFixed(1),
            valueW: +(dt.nextElementSibling?.getBoundingClientRect().width ?? 0).toFixed(1),
            value: dt.nextElementSibling?.textContent.trim() ?? null,
          }))
        : [],
    }
  }

  /* ── 6. the rail ────────────────────────────────────────────────────── */
  if (rail) {
    const column = rail.parentElement
    const lis = [...rail.querySelectorAll('li')]
    const selectedLink = rail.querySelector('[aria-current="page"]')
    out.rail = {
      columnRect: R(column),
      headingRect: R(column.querySelector('h3')),
      headingHeight: +(R(column.querySelector('h3'))?.h ?? 0).toFixed(1),
      rows: lis.map((li) => ({
        h: +li.getBoundingClientRect().height.toFixed(1),
        text: li.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
        linkRect: R(li.querySelector('a')),
        lines: [...li.querySelectorAll('span')].filter((s) => s.textContent.trim() !== '').length,
      })),
      gapsBetweenRows: lis.slice(0, -1).map((li, i) =>
        +(R(lis[i + 1]).top - R(li).bottom).toFixed(1),
      ),
      borderBetweenRows: lis[0] ? getComputedStyle(lis[0]).borderBottomWidth : null,
      selected: {
        rect: R(selectedLink),
        ground: selectedLink ? window.__hex(getComputedStyle(selectedLink).backgroundColor) : null,
        widthVsRail: selectedLink
          ? +(R(selectedLink).w - R(column).w).toFixed(1)
          : null,
        insetStart: selectedLink ? +(R(selectedLink).left - R(column).left).toFixed(1) : null,
        insetEnd: selectedLink ? +(R(column).right - R(selectedLink).right).toFixed(1) : null,
      },
      railHeightVsPane: pane ? +(R(column).h - R(pane).h).toFixed(1) : null,
      emptyRailBelowRows:
        lis.length > 0 ? +(R(column).bottom - R(lis[lis.length - 1]).bottom).toFixed(1) : null,
    }
  }

  /* ── 7. the banner ──────────────────────────────────────────────────── */
  const b = banner ?? bannerAlert
  if (b) {
    out.banner = {
      rect: R(b),
      padding: getComputedStyle(b).padding,
      ground: window.__hex(getComputedStyle(b).backgroundColor),
      title: b.querySelector('h2,h3,strong,p')?.textContent.trim().slice(0, 90) ?? null,
      lines: window.__wrapped(b.querySelector('p') ?? b).lines,
      pctOfFirstScreen: +((R(b).h / vh) * 100).toFixed(1),
      pctOfDocument: +((R(b).h / document.scrollingElement.scrollHeight) * 100).toFixed(1),
    }
  }

  /* ── 8. the two-column band ─────────────────────────────────────────── */
  if (band) {
    const [impact, floors] = [...band.children]
    const rhythm = (root) =>
      root
        ? [...root.querySelectorAll('dt,dd,h4,p,span')]
            .filter((n) => n.textContent.trim() !== '' && n.children.length === 0)
            .map((n) => {
              const cs = getComputedStyle(n)
              return {
                text: n.textContent.trim().slice(0, 34),
                px: parseFloat(cs.fontSize),
                weight: +cs.fontWeight,
                colour: window.__hex(cs.color),
                inkTop: ink(n)?.top ?? null,
                inkBottom: ink(n)?.bottom ?? null,
              }
            })
        : []
    out.band = {
      gridTemplate: getComputedStyle(band).gridTemplateColumns,
      columnGap: getComputedStyle(band).columnGap,
      left: { rect: R(impact), heading: R(impact?.querySelector('h4')), headingInk: impact ? ink(impact.querySelector('h4')) : null },
      right: { rect: R(floors), heading: R(floors?.querySelector('h4')), headingInk: floors ? ink(floors.querySelector('h4')) : null },
      headingBaselineDelta:
        impact && floors && ink(impact.querySelector('h4')) && ink(floors.querySelector('h4'))
          ? +(ink(floors.querySelector('h4')).bottom - ink(impact.querySelector('h4')).bottom).toFixed(1)
          : null,
      bottomDelta: impact && floors ? +(R(floors).bottom - R(impact).bottom).toFixed(1) : null,
      leftRhythm: rhythm(impact),
      rightRhythm: rhythm(floors),
      leftLayout: impact ? getComputedStyle(impact.querySelector('dl') ?? impact).display : null,
      rightLayout: floors ? getComputedStyle(floors.querySelector('dl') ?? floors).display : null,
      rightTracks: floors ? getComputedStyle(floors.querySelector('dl')).gridTemplateColumns : null,
      rightLabelNeeds: floors
        ? [...floors.querySelectorAll('dt')].map((dt) => ({
            text: dt.textContent.trim(),
            trackW: +dt.getBoundingClientRect().width.toFixed(1),
            inkW: +(window.__deepInk(dt)?.w ?? 0).toFixed(1),
            lines: +(dt.getBoundingClientRect().height / (parseFloat(getComputedStyle(dt).lineHeight) || 16)).toFixed(2),
          }))
        : [],
      leftLabelSlots: impact
        ? [...impact.querySelectorAll('dt')].map((dt) => ({
            text: dt.textContent.trim(),
            w: +dt.getBoundingClientRect().width.toFixed(1),
            valueInk: window.__deepInk(dt.nextElementSibling ?? dt)?.w ?? null,
          }))
        : [],
      /* the right column's values end here, the table's last money ends there */
      rightValueEndEdge: floors
        ? +(window.__deepInk([...floors.querySelectorAll('dd')].pop())?.right ?? 0).toFixed(1)
        : null,
    }
  }

  /* ── 9. suspend surge: the heading and its disabled twin ────────────── */
  const suspendHeading = [...document.querySelectorAll('h2')].find((h) =>
    /Suspend surge|إيقاف/.test(h.textContent),
  )
  const suspendCard = suspendHeading?.closest('[data-slot="card"]') ?? null
  const suspendButton = suspendCard
    ? [...suspendCard.querySelectorAll('button')].find(
        (btn) => btn.textContent.trim() === suspendHeading.textContent.trim(),
      ) ?? suspendCard.querySelector('button[disabled]')
    : null
  if (suspendHeading) {
    const hs = getComputedStyle(suspendHeading)
    const ground = window.__under(suspendCard)
    const sub = suspendHeading.parentElement?.querySelector('p') ?? null
    const refusal = suspendCard
      ? [...suspendCard.querySelectorAll('p,span')].find((n) =>
          /Choose a district\.|اختر/.test(n.textContent),
        )
      : null
    const bs = suspendButton ? getComputedStyle(suspendButton) : null
    out.suspend = {
      cardGround: window.__hex(ground),
      heading: {
        text: suspendHeading.textContent.trim(),
        rect: R(suspendHeading),
        px: parseFloat(hs.fontSize),
        weight: +hs.fontWeight,
        colour: window.__hex(hs.color),
        contrast: window.__step(hs.color, ground),
      },
      subtitle: sub
        ? {
            text: sub.textContent.trim(),
            px: parseFloat(getComputedStyle(sub).fontSize),
            colour: window.__hex(getComputedStyle(sub).color),
          }
        : null,
      button: bs
        ? {
            text: suspendButton.textContent.trim(),
            disabled: suspendButton.disabled,
            rect: R(suspendButton),
            px: parseFloat(bs.fontSize),
            weight: +bs.fontWeight,
            colour: window.__hex(bs.color),
            background: bs.backgroundColor,
            backgroundHex: window.__hex(bs.backgroundColor),
            backgroundIsPaint: bs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(bs.backgroundColor),
            opacity: bs.opacity,
            border: bs.borderWidth + ' ' + bs.borderStyle,
            borderHex: window.__hex(bs.borderTopColor),
            borderContrastVsCard: window.__step(bs.borderTopColor, ground),
            contrastVsCard: window.__step(bs.color, ground),
            /* what the button's ink really paints at, opacity folded in */
            effectiveOpacity: +bs.opacity,
          }
        : null,
      refusal: refusal
        ? {
            text: refusal.textContent.trim(),
            px: parseFloat(getComputedStyle(refusal).fontSize),
            colour: window.__hex(getComputedStyle(refusal).color),
            contrast: window.__step(getComputedStyle(refusal).color, ground),
            rect: R(refusal),
          }
        : null,
      /* how far apart the h2 and the disabled button read */
      distinguishability:
        bs && suspendHeading
          ? {
              sizeDelta: +(parseFloat(bs.fontSize) - parseFloat(hs.fontSize)).toFixed(1),
              weightDelta: +bs.fontWeight - +hs.fontWeight,
              sameColour: window.__hex(bs.color) === window.__hex(hs.color),
              colourStepBetweenThem: window.__step(bs.color, hs.color),
              verticalDistance: +(R(suspendButton).top - R(suspendHeading).bottom).toFixed(1),
            }
          : null,
      /* D35b deleted the `Suspend surge` heading, so this selector can now
         land on an h2 outside any card. Guarded rather than removed: the
         baseline number has to stay reproducible. */
      duplicateStrings: suspendCard
        ? [...suspendCard.querySelectorAll('*')]
            .filter((n) => n.children.length === 0)
            .map((n) => n.textContent.trim())
            .filter((s, i, a) => s !== '' && a.indexOf(s) !== i)
        : null,
    }
  }

  /* ── 10. everything else that reads badly ───────────────────────────── */
  const cards = [...main.querySelectorAll('[data-slot="card"]')]
  out.extra = {
    cardCount: cards.length,
    cardRects: cards.map((c) => ({
      h: +c.getBoundingClientRect().height.toFixed(1),
      w: +c.getBoundingClientRect().width.toFixed(1),
      padding: getComputedStyle(c).padding,
      gap: getComputedStyle(c).rowGap,
      first: c.textContent.trim().replace(/\s+/g, ' ').slice(0, 44),
    })),
    /* start edges: how many distinct x an operator's eye has to track */
    startEdges: (() => {
      const xs = window
        .__leaf(block ?? main)
        .map((n) => (document.dir === 'rtl' ? +window.__ink(n)?.right.toFixed(0) : +window.__ink(n)?.left.toFixed(0)))
        .filter((x) => Number.isFinite(x))
      const counted = {}
      for (const x of xs) counted[x] = (counted[x] ?? 0) + 1
      return Object.entries(counted)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([x, n]) => ({ x: +x, elements: n }))
    })(),
    /* every wrapped label in the block — the Arabic pass lives here */
    wrappedLabels: window
      .__leaf(block ?? main)
      .map((n) => ({ text: n.textContent.trim().slice(0, 40), ...window.__wrapped(n) }))
      .filter((r) => r.lines > 1),
    /* the surge grid: two cards, do their tops and bottoms agree */
    surgeGrid: (() => {
      const grid = [...main.querySelectorAll('div')].find(
        (d) =>
          d.className.includes('grid-cols-3') &&
          d.querySelectorAll(':scope > [data-slot="card"]').length === 2,
      )
      if (!grid) return null
      const [a, c] = [...grid.children]
      return {
        left: R(a),
        right: R(c),
        heightDelta: +(R(c).h - R(a).h).toFixed(1),
        rightEmptyBelowLastInk: (() => {
          const leaves = window.__leaf(c)
          const last = leaves[leaves.length - 1]
          return last ? +(R(c).bottom - (window.__ink(last)?.bottom ?? R(last).bottom)).toFixed(1) : null
        })(),
      }
    })(),
    /* the onboarding beacon is `fixed z-40`: what does it sit on top of here */
    beacon: (() => {
      const b = document.querySelector('[data-testid="onboarding-beacon"]')
      if (!b) return null
      const r = b.getBoundingClientRect()
      const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      const card = under.find((n) => n.getAttribute?.('data-slot') === 'card')
      return {
        rect: { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        overCard: card ? card.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) : null,
        overInteractive: under.some(
          (n) => /^(BUTTON|A|INPUT)$/.test(n.tagName) && !b.contains(n),
        ),
        nearestChip: (() => {
          const chips = [...document.querySelectorAll('[role="radio"],[data-slot="toggle-group-item"]')]
          const d = chips
            .map((c) => {
              const cr = c.getBoundingClientRect()
              return +Math.hypot(
                Math.max(0, Math.max(cr.left - r.right, r.left - cr.right)),
                Math.max(0, Math.max(cr.top - r.bottom, r.top - cr.bottom)),
              ).toFixed(1)
            })
            .sort((a, z) => a - z)
          return d[0] ?? null
        })(),
      }
    })(),
    /* page-level: how much of the document is the rate card block */
    blockShareOfDocument: block
      ? +((R(block).h / document.scrollingElement.scrollHeight) * 100).toFixed(1)
      : null,
  }

  return out
}


/* ── the REBUILD probe (revision 2) ──────────────────────────────────────
   The probe above measures the pre-rebuild DOM and several of its selectors
   now return null. This one measures what revision 2 actually draws: D36's
   unit rung, D35a's hairline, the district band's alignment, each band's
   rule channel, and every off-scale gap (AC-RC-45). Same contract as the
   probe above: it asserts nothing and prints numbers. */
const probe2 = (vh) => {
  const out = {}
  try {
  const R = window.__r
  const D = window.__deepInk
  const main = document.querySelector('main') ?? document.body
  const scroller = window.__scroller()
  const rail = document.querySelector('ol[aria-labelledby]')
  const block = rail?.closest('[data-slot="card"]') ?? null
  const pane = block?.querySelector('section[aria-labelledby]') ?? null
  const table = pane?.querySelector('table') ?? null
  const cards = [...main.querySelectorAll('[data-slot="card"]')]
  const cardOf = (n) => n?.closest('[data-slot="card"]') ?? null
  const cls = (n) => (n.className?.baseVal ?? n.className ?? '').toString().slice(0, 70)

  /* ── the banner ─────────────────────────────────────────────────────── */
  const banner = [...main.querySelectorAll('div,section,aside')].find((n) => {
    const t = n.textContent ?? ''
    return (
      /read-only|للقراءة/.test(t) &&
      t.length < 220 &&
      getComputedStyle(n).backgroundColor !== 'rgba(0, 0, 0, 0)'
    )
  })
  out.banner = banner
    ? {
        text: banner.textContent.trim(),
        rect: R(banner),
        ground: window.__hex(getComputedStyle(banner).backgroundColor),
        runs: [...banner.querySelectorAll('*')]
          .filter((n) => !n.children.length && n.textContent.trim())
          .map((n) => ({
            text: n.textContent.trim().slice(0, 70),
            renderedLines: n.getClientRects().length,
            px: parseFloat(getComputedStyle(n).fontSize),
            weight: +getComputedStyle(n).fontWeight,
            colour: window.__hex(getComputedStyle(n).color),
            contrast: window.__step(getComputedStyle(n).color, window.__under(n)),
          })),
      }
    : null

  /* ── first price ink — the F2 number ────────────────────────────────── */
  const firstMoney = table?.querySelector('tbody tr td:nth-child(2)') ?? null
  const firstInk = firstMoney ? D(firstMoney) : null
  out.firstPrice = {
    text: firstMoney?.textContent.trim() ?? null,
    inkTop: firstInk?.top ?? null,
    shareOfScrollport: firstInk
      ? +(((firstInk.top - 52) / (scroller.clientHeight || vh)) * 100).toFixed(1)
      : null,
    scrollHeight: scroller.scrollHeight,
    clientHeight: scroller.clientHeight,
    screensToRead: +(scroller.scrollHeight / scroller.clientHeight).toFixed(2),
    blockTop: block ? R(block).top : null,
  }

  /* ── D36 — the unit rung ────────────────────────────────────────────── */
  const heads = table ? [...table.querySelectorAll('thead tr')] : []
  const labelRow = heads[0] ?? null
  const unitRow = heads[1] ?? null
  const unitCell = unitRow ? [...unitRow.children].find((c) => c.colSpan > 1) : null
  const colRects = labelRow
    ? [...labelRow.children].map((c) => ({ label: c.textContent.trim(), ...R(c) }))
    : []
  const unitInk = unitCell ? D(unitCell) : null
  const moneyCols = colRects.slice(1)
  const spanStart = moneyCols.length ? Math.min(...moneyCols.map((c) => c.left)) : null
  const spanEnd = moneyCols.length ? Math.max(...moneyCols.map((c) => c.right)) : null
  const spanMid = spanStart === null ? null : (spanStart + spanEnd) / 2
  const unitMid = unitInk ? (unitInk.left + unitInk.right) / 2 : null
  out.unitRung = {
    text: unitCell?.textContent.trim() ?? null,
    colSpan: unitCell?.colSpan ?? null,
    ariaHidden: unitRow?.getAttribute('aria-hidden') ?? null,
    hasBdi: !!unitCell?.querySelector('bdi'),
    align: unitCell ? getComputedStyle(unitCell).textAlign : null,
    px: unitCell ? parseFloat(getComputedStyle(unitCell).fontSize) : null,
    weight: unitCell ? +getComputedStyle(unitCell).fontWeight : null,
    colour: unitCell ? window.__hex(getComputedStyle(unitCell).color) : null,
    ink: unitInk,
    columns: colRects.map((c) => ({ label: c.label, left: c.left, right: c.right, w: c.w })),
    moneySpan: { start: spanStart, end: spanEnd, mid: spanMid },
    inkMid: unitMid,
    offCentreBy: unitMid === null ? null : +(unitMid - spanMid).toFixed(1),
    landsInColumn:
      unitMid === null
        ? null
        : (colRects.find((c) => unitMid >= c.left && unitMid <= c.right)?.label ?? null),
    headerInkOverlapping: labelRow
      ? [...labelRow.children]
          .map((c) => ({ label: c.textContent.trim(), ink: D(c) }))
          .filter((c) => c.ink && unitInk && c.ink.right > unitInk.left && c.ink.left < unitInk.right)
          .map((c) => ({
            label: c.label,
            inkLeft: c.ink.left,
            inkRight: c.ink.right,
            clearBelowPx: +(unitInk.top - c.ink.bottom).toFixed(1),
          }))
      : [],
    sarRunsInHead: table ? (table.querySelector('thead').textContent.match(/SAR/g) ?? []).length : null,
    sarRunsInTable: table ? (table.textContent.match(/SAR/g) ?? []).length : null,
    caption: table?.querySelector('caption')?.textContent.trim() ?? null,
  }

  /* ── D35a — every disabled control, and whether its box survives ────── */
  out.disabled = [...main.querySelectorAll('button')]
    .filter((b) => b.disabled || b.getAttribute('aria-disabled') === 'true')
    .map((b) => {
      const cs = getComputedStyle(b)
      const ground = window.__under(b.parentElement)
      const box = R(b)
      const ink = D(b)
      return {
        label: b.textContent.trim().slice(0, 40),
        inCard: cardOf(b)?.textContent.trim().slice(0, 22) ?? null,
        box,
        px: parseFloat(cs.fontSize),
        weight: +cs.fontWeight,
        colour: window.__hex(cs.color),
        background: cs.backgroundColor,
        borderWidth: cs.borderTopWidth,
        borderColour: window.__hex(cs.borderTopColor),
        borderRaw: cs.borderTopColor,
        radius: cs.borderRadius,
        padInline: [cs.paddingLeft, cs.paddingRight],
        ground: window.__hex(ground),
        borderVsGround: window.__step(cs.borderTopColor, ground),
        inkVsGround: window.__step(cs.color, ground),
        labelInsetFromBox: ink && box ? +(ink.left - box.left).toFixed(1) : null,
      }
    })

  /* ── the filled controls (R3 / AC-RC-42) ────────────────────────────── */
  out.filled = [...main.querySelectorAll('button,a')]
    .map((b) => ({ b, bg: getComputedStyle(b).backgroundColor }))
    .filter(({ bg }) => bg !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(bg) && window.__lum(bg) < 0.35)
    .map(({ b, bg }) => ({
      label: b.textContent.trim().slice(0, 30),
      bg: window.__hex(bg),
      disabled: !!b.disabled,
    }))

  /* ── the district band, flush alignment ─────────────────────────────── */
  const districtLabel = [...main.querySelectorAll('span,label')].find(
    (n) => n.id && !n.children.length && n.textContent.trim().length < 20 && /District|المنطقة|الحي/.test(n.textContent.trim()),
  )
  const districtBand = districtLabel ? districtLabel.parentElement?.parentElement : null
  const suspendBtn = [...main.querySelectorAll('button')].find((b) =>
    /Suspend surge|إيقاف/.test(b.textContent.trim()),
  )
  const chips = districtBand
    ? [...districtBand.querySelectorAll('[data-slot="toggle-group-item"],button[role="radio"]')]
    : []
  const refusal = suspendBtn?.parentElement?.querySelector('[id]')
  out.district = {
    bandRect: districtBand ? R(districtBand) : null,
    bandClass: districtBand ? cls(districtBand) : null,
    bandPadTop: districtBand ? getComputedStyle(districtBand).paddingTop : null,
    bandBorderTop: districtBand ? getComputedStyle(districtBand).borderTopWidth : null,
    bandGap: districtBand ? getComputedStyle(districtBand).rowGap : null,
    gapAboveRule:
      districtBand && districtBand.previousElementSibling
        ? +(R(districtBand).top - R(districtBand.previousElementSibling).bottom).toFixed(1)
        : null,
    labelInk: districtLabel ? D(districtLabel) : null,
    chipCount: chips.length,
    chipFirstBox: chips.length ? R(chips[0]) : null,
    chipsBottom: chips.length ? Math.max(...chips.map((c) => R(c).bottom)) : null,
    buttonBox: suspendBtn ? R(suspendBtn) : null,
    buttonLabelInk: suspendBtn ? D(suspendBtn) : null,
    refusalInk: refusal ? D(refusal) : null,
    refusalText: refusal?.textContent.trim() ?? null,
    chipsToButton:
      chips.length && suspendBtn
        ? +(R(suspendBtn).top - Math.max(...chips.map((c) => R(c).bottom))).toFixed(1)
        : null,
    buttonToRefusal:
      suspendBtn && refusal ? +(R(refusal).top - R(suspendBtn).bottom).toFixed(1) : null,
  }

  /* ── every band rule inside a card, and its channel ─────────────────── */
  out.bandRules = [...main.querySelectorAll('*')]
    .filter(
      (n) =>
        parseFloat(getComputedStyle(n).borderTopWidth) > 0 &&
        n.previousElementSibling &&
        cardOf(n) &&
        n.tagName !== 'TR' &&
        n.tagName !== 'TD' &&
        n.tagName !== 'TH' &&
        n.tagName !== 'LI',
    )
    .slice(0, 14)
    .map((n) => {
      const cs = getComputedStyle(n)
      const prev = R(n.previousElementSibling)
      const me = R(n)
      const above = +(me.top - prev.bottom).toFixed(1)
      return {
        card: cardOf(n)?.textContent.trim().slice(0, 18),
        label: n.textContent.trim().slice(0, 26),
        gapAboveRule: above,
        borderTop: cs.borderTopWidth,
        padUnderRule: cs.paddingTop,
        channel: +(above + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop)).toFixed(1),
      }
    })

  /* ── the gaps between the top-level cards ───────────────────────────── */
  const topCards = cards.filter((c) => !cardOf(c.parentElement))
  out.cardGaps = topCards
    .map((c, i) => (i === 0 ? null : +(R(c).top - R(topCards[i - 1]).bottom).toFixed(1)))
    .filter((n) => n !== null)

  /* ── AC-RC-45 — every off-scale gap and pad in the block + Surge ────── */
  const scale = new Set([0, 4, 8, 12, 24])
  const rowTokens = new Set([36, 40, 60, 64])
  const region = [block, topCards.find((c) => /^Surge/.test(c.textContent.trim()))].filter(Boolean)
  const offScale = []
  for (const root of region) {
    for (const n of [root, ...root.querySelectorAll('*')]) {
      const s = getComputedStyle(n)
      for (const prop of [
        'rowGap',
        'columnGap',
        'paddingTop',
        'paddingBottom',
        'paddingLeft',
        'paddingRight',
      ]) {
        const v = parseFloat(s[prop])
        if (!v || Number.isNaN(v)) continue
        if (scale.has(v) || rowTokens.has(v)) continue
        offScale.push({
          prop,
          v,
          tag: n.tagName.toLowerCase(),
          cls: cls(n),
          text: n.textContent.trim().slice(0, 26),
        })
      }
    }
  }
  out.offScale = offScale

  /* ── row pitch across every table on the view ───────────────────────── */
  out.rowPitch = [...main.querySelectorAll('table')].map((tb) => ({
    firstHead: tb.querySelector('th')?.textContent.trim().slice(0, 20) ?? null,
    headRowH: tb.querySelector('thead tr') ? +R(tb.querySelector('thead tr')).h.toFixed(1) : null,
    bodyRowH: tb.querySelector('tbody tr') ? +R(tb.querySelector('tbody tr')).h.toFixed(1) : null,
    rows: tb.querySelectorAll('tbody tr').length,
  }))

  /* ── the pane's reading edges — F6 re-measured ──────────────────────── */
  const edges = {}
  const ends = {}
  if (pane) {
    for (const n of pane.querySelectorAll('*')) {
      if (n.children.length) continue
      const t = n.textContent.trim()
      if (!t || n.closest('.sr-only')) continue
      const ink = D(n)
      if (!ink || ink.w < 2) continue
      ;(edges[Math.round(ink.left)] ??= []).push(t.slice(0, 18))
      ;(ends[Math.round(ink.right)] ??= []).push(t.slice(0, 18))
    }
  }
  const hist = (o) =>
    Object.entries(o)
      .map(([x, v]) => ({ x: +x, n: v.length, sample: v.slice(0, 3) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
  out.paneStartEdges = hist(edges)
  out.paneEndEdges = hist(ends)

  /* ── every wrapped run on the view, so an Arabic-only wrap shows up ─── */
  out.wrapped = [...main.querySelectorAll('*')]
    .filter((n) => !n.children.length && n.textContent.trim() && !n.closest('.sr-only'))
    .map((n) => ({
      text: n.textContent.trim().slice(0, 34),
      renderedLines: n.getClientRects().length,
      px: parseFloat(getComputedStyle(n).fontSize),
    }))
    .filter((n) => n.renderedLines > 1)

  /* ── rail geometry — F4 re-measured ─────────────────────────────────── */
  const railCol = rail?.parentElement ?? null
  const footer = railCol ? [...railCol.children].find((n) => n.tagName === 'P') : null
  const lastRow = rail?.lastElementChild ?? null
  out.rail = {
    columnRect: railCol ? R(railCol) : null,
    lastRowBottom: lastRow ? R(lastRow).bottom : null,
    footerRect: footer ? R(footer) : null,
    footerText: footer?.textContent.trim() ?? null,
    footerTransform: footer ? getComputedStyle(footer).textTransform : null,
    footerTracking: footer ? getComputedStyle(footer).letterSpacing : null,
    footerPx: footer ? parseFloat(getComputedStyle(footer).fontSize) : null,
    footerTruncated: footer ? footer.scrollWidth > footer.clientWidth + 1 : null,
    runwayPx: footer && lastRow ? +(R(footer).top - R(lastRow).bottom).toFixed(1) : null,
    rowHeights: rail ? [...rail.children].map((li) => +R(li).h.toFixed(1)) : [],
    clipped: rail
      ? [...rail.querySelectorAll('a')].map((a) => ({
          h: +R(a).h.toFixed(1),
          scrollH: a.scrollHeight,
          clipped: a.scrollHeight > a.clientHeight + 1,
        }))
      : [],
  }

  /* ── AC-RC-40 — uppercase and tracking sweep ────────────────────────── */
  out.uppercase = [...main.querySelectorAll('*')]
    .filter((n) => !n.children.length && n.textContent.trim())
    .map((n) => ({
      t: n.textContent.trim().slice(0, 24),
      transform: getComputedStyle(n).textTransform,
      tracking: getComputedStyle(n).letterSpacing,
    }))
    .filter((n) => n.transform !== 'none' || (n.tracking !== 'normal' && parseFloat(n.tracking) !== 0))

  /* ── surfaces — D33 / D33b / D33c / D34 ─────────────────────────────── */
  const strip = block?.querySelector('h2') ?? null
  const thead = table?.querySelector('thead th') ?? null
  out.surfaces = {
    page: window.__hex(window.__under(main)),
    card: block ? window.__hex(getComputedStyle(block).backgroundColor) : null,
    cardVsPage: block
      ? window.__step(getComputedStyle(block).backgroundColor, window.__under(main))
      : null,
    railStrip: strip ? window.__hex(window.__under(strip)) : null,
    railStripVsCard:
      strip && block
        ? window.__step(window.__under(strip), getComputedStyle(block).backgroundColor)
        : null,
    tableStrip: thead ? window.__hex(window.__under(thead)) : null,
    tableStripVsCard:
      thead && block
        ? window.__step(window.__under(thead), getComputedStyle(block).backgroundColor)
        : null,
    theadInk: thead ? window.__hex(getComputedStyle(thead).color) : null,
    theadContrast: thead ? window.__step(getComputedStyle(thead).color, window.__under(thead)) : null,
    shadows: [...main.querySelectorAll('*')]
      .filter((n) => {
        const s = getComputedStyle(n).boxShadow
        return s && s !== 'none'
      })
      .map((n) => ({ tag: n.tagName.toLowerCase(), cls: cls(n), shadow: getComputedStyle(n).boxShadow.slice(0, 60) })),
  }

  } catch (e) {
    out.__error = String(e)
    out.__stack = String(e && e.stack).slice(0, 700)
  }
  return out
}

/* ── drive ──────────────────────────────────────────────────────────────── */
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } })
const page = await ctx.newPage()
await page.clock.install({ time: new Date('2026-06-25T09:14:00+03:00') })
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

async function menu(name) {
  await page.getByRole('button', { name: /Account|الحساب/ }).click()
  await page.getByRole('menuitemradio', { name }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

async function shot(name, opts = {}) {
  const path = `${OUT}/${TAG}-${name}.png`
  await page.screenshot({ path, ...opts })
  return path
}

const out = { theme: THEME, lang: LANG, width: WIDTH, height: HEIGHT, base: BASE, shots: [] }
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
if (THEME === 'dark') await menu('Dark')
if (LANG === 'ar') await menu('Arabic')
await page.waitForTimeout(1000)
await page.evaluate(helpers)
out.themeInForce = await page.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  dir: document.documentElement.getAttribute('dir'),
  lang: document.documentElement.getAttribute('lang'),
}))

out.live = await page.evaluate(probe, HEIGHT)
out.rebuild = await page.evaluate(probe2, HEIGHT)
out.shots.push(await shot('firstscreen'))
out.shots.push(await shot('full', { fullPage: true }))

/* the block alone, so the gaps are readable in the capture */
async function element(locator, name) {
  if ((await locator.count()) === 0) return
  const path = `${OUT}/${TAG}-${name}.png`
  await locator.first().screenshot({ path })
  out.shots.push(path)
}
await element(page.locator('[data-slot="card"]').first(), 'block')
await element(
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { level: 2, name: /Suspend surge|إيقاف/ }) }),
  'suspend',
)
await element(
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { level: 2, name: /Surge windows|نوافذ/ }) }),
  'surge-windows',
)

/* the row ground under a hover: the table hangs out of the card, so the ground
   is where an operator sees it */
const firstRow = page.locator('[data-slot="key-value-table"] tbody tr').first()
if (await firstRow.count()) {
  await firstRow.hover()
  await page.waitForTimeout(300)
  await element(page.locator('[data-slot="card"]').first(), 'block-hover')
  await page.mouse.move(0, 0)
}

/* the second screen: what an operator sees after one scroll */
await page.evaluate(() => {
  const s =
    [...document.querySelectorAll('*')].find(
      (n) =>
        n.scrollHeight > n.clientHeight + 4 &&
        /auto|scroll/.test(getComputedStyle(n).overflowY) &&
        n.clientHeight > 200,
    ) ?? document.scrollingElement
  s.scrollTop = s.scrollHeight
})
await page.waitForTimeout(500)
out.shots.push(await shot('scrolled-bottom'))
await page.evaluate(() => {
  const s =
    [...document.querySelectorAll('*')].find(
      (n) => n.scrollHeight > n.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(n).overflowY) && n.clientHeight > 200,
    ) ?? document.scrollingElement
  s.scrollTop = 0
})

/* a draft, which is the only pane that carries a control */
await page.goto(`${BASE}${ROUTE}&card=RC-2026-08-01`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate(helpers)
out.draft = await page.evaluate(probe, HEIGHT)
out.draftRebuild = await page.evaluate(probe2, HEIGHT)
out.shots.push(await shot('draft'))
await element(page.locator('[data-slot="card"]').first(), 'draft-block')
/* the draft's own refusal, which is the pane's only control */
out.draftControl = await page.evaluate(() => {
  const pane = document.querySelector('section[aria-labelledby]')
  const btn = pane?.querySelector('button')
  if (!btn) return null
  const cs = getComputedStyle(btn)
  const ground = window.__under(btn.parentElement)
  const refusal = btn.parentElement?.querySelector('span[id]')
  return {
    label: btn.textContent.trim(),
    disabled: btn.disabled,
    px: parseFloat(cs.fontSize),
    weight: +cs.fontWeight,
    colour: window.__hex(cs.color),
    background: cs.backgroundColor,
    height: +btn.getBoundingClientRect().height.toFixed(1),
    contrast: window.__step(cs.color, ground),
    refusal: refusal
      ? {
          text: refusal.textContent.trim(),
          px: parseFloat(getComputedStyle(refusal).fontSize),
          colour: window.__hex(getComputedStyle(refusal).color),
          contrast: window.__step(getComputedStyle(refusal).color, ground),
        }
      : null,
  }
})

out.pageErrors = errors
console.log(JSON.stringify(out, null, 2))
await browser.close()
