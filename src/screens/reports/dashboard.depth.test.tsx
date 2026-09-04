/**
 * **The dashboard's DEPTH** — Amplitude §C4 and §C5, and the three things a
 * board could not do before.
 *
 * `dashboards.test.tsx` covers the tile lifecycle; `dashboard.chrome.test.tsx`
 * covers the frame. This file covers the behaviour those two do not reach, and
 * every block below is one of the gaps the fidelity audit named:
 *
 *   1. **A board-level range that drives every tile** (§C4). Each tile used to
 *      render its report's own saved window, so a nine-tile board was nine
 *      unrelated windows and nothing on screen said so.
 *   2. **A tile that cannot answer at the board's range keeps its own AND SAYS
 *      SO.** The refusal is the point: quietly narrowing a four-column
 *      retention matrix to one column because a board asked is worse than not
 *      having the control.
 *   3. **Board-level filters** (§C4 `Add Filter`), in the EXISTING `FilterSpec`
 *      vocabulary, applied only where a report can legally take one — and
 *      **named on every tile that cannot**.
 *   4. **Tiles of different sizes** (§C5), so a board reads as a composition
 *      rather than as a uniform 2-up.
 *   5. **The dashboards LIST**, which the previous pass did not touch.
 *
 * ## Two disciplines this file keeps
 *
 * **No fixture is imported.** `seam.test.ts` forbids it outside `src/data`, and
 * a test that reads the seed array tests the seed rather than the contract.
 * Every board, report and catalogue entry below comes through its client.
 *
 * **Every new prop is exercised through a real caller.** The failure mode this
 * codebase has already had twice is a prop that is declared, plumbed, tested in
 * isolation and passed by nobody (`PanelCard.onExpand`,
 * `ResultCanvas.withRefresh`). So `scope` and `onSetSpan` are driven here by
 * clicking the screen's own controls and then **reading the record back through
 * `getDashboard`** — a change that reached the screen and not the server is the
 * failure worth catching.
 */

import { useMemo } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import {
  EYVAR_TODAY,
  disableMockLatency,
  getDashboard,
  getReport,
  listDashboards,
  listDimensions,
  listMeasures,
  resetDataLayer,
} from '@/data/clients'
import { applyBoardScope, boardFilterFields } from '@/data/clients/dashboards'
import type { Dashboard, DashboardTile, ReportQuery } from '@/data/types'
import { withFallback } from '../operations/localCopy'
import { DashboardDetailScreen } from './DashboardDetailScreen'
import { DashboardsView } from './DashboardsView'
import { REPORTS_EN } from './copy'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select, popover and dropdown all call
     them on the trigger. Same reasoning as `dashboards.test.tsx`; kept local. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

const copy = (key: string) => REPORTS_EN[key] as string
const named = (key: string, name: string) => copy(key).replace('{name}', name)
const field = (key: string, label: string) => copy(key).replace('{field}', label)

function mount(dashboardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/dashboards/${dashboardId}`]}>
      <ShellProvider>
        <Routes>
          <Route
            path="/management/reports/dashboards/:dashboardId"
            element={<DashboardDetailScreen />}
          />
          <Route path="/management/reports" element={<p>the reports sub-tab</p>} />
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/**
 * The list, mounted the way `ReportsScreen` mounts it — through the shell's own
 * translator with `withFallback` over this screen's dictionary. A hand-rolled
 * `t` in a test is a second i18n implementation, and it would pass on keys the
 * real one throws for.
 */
function ListHost() {
  const shell = useShell()
  const t = useMemo(() => withFallback(shell.language.t, REPORTS_EN), [shell.language.t])
  return (
    <DashboardsView
      title={t('rb.page.title')}
      onOpen={() => {}}
      t={t}
      language={shell.language.language}
      dir={shell.language.dir}
    />
  )
}

function mountList() {
  return render(
    <MemoryRouter initialEntries={['/management/reports?view=dashboards']}>
      <ShellProvider>
        <ListHost />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function boards(): Promise<Dashboard[]> {
  return (await listDashboards({ pageSize: 50 })).items
}

const ordered = (tiles: readonly DashboardTile[]) => [...tiles].sort((a, b) => a.order - b.order)

/** A board whose every tile resolves — no dangling reference to confuse a count. */
async function healthyBoard(): Promise<Dashboard> {
  const found = (await boards()).find(
    (board) =>
      board.tiles.length > 1 && !board.tiles.some((tile) => tile.reportId.includes('DELETED')),
  )
  expect(found, 'a board with more than one resolvable tile').toBeTruthy()
  return found as Dashboard
}

/** The board the fixtures seed with a range and a filter already on it. */
async function scopedBoard(): Promise<Dashboard> {
  const found = (await boards()).find((board) => board.range !== null)
  expect(found, 'a seeded board carrying a board-level range').toBeTruthy()
  return found as Dashboard
}

/** The `<li>` a tile renders into, found through one of that tile's controls. */
function tileOf(control: HTMLElement): HTMLElement {
  const li = control.closest('li')
  expect(li, 'every tile renders into its own list item').toBeTruthy()
  return li as HTMLElement
}

/** That tile's own list item, found by the report it resolves to. */
async function tileFor(reportId: string): Promise<HTMLElement> {
  const report = (await getReport(reportId)).data
  return tileOf(
    await screen.findByRole('button', { name: named('rb.dashboard.tile.open', report.name) }),
  )
}

async function catalogue() {
  const [measures, dimensions] = await Promise.all([
    listMeasures({ pageSize: 100 }),
    listDimensions({ pageSize: 100 }),
  ])
  return { measures: measures.items, dimensions: dimensions.items }
}

/* ═══ 1. applyBoardScope — the definition, before any pixels ══════════════ */

describe('applyBoardScope refuses rather than distorts', () => {
  it('applies a filter the report can take, and names the one it cannot', async () => {
    const cat = await catalogue()
    /* `trips.completed` declares `trip.*` filterable fields; the two-measure
       captains-vs-riders report intersects driver and rider fields to nothing
       at all, which is §3.4's stated correct behaviour and not a bug. */
    const trips = (await getReport('RPT-2')).data.query
    const both = (await getReport('RPT-1')).data.query

    const scope = { range: null, filters: [{ field: 'trip.kind', op: 'eq' as const, value: 'quick' }] }

    const onTrips = applyBoardScope(trips, scope, cat, EYVAR_TODAY)
    expect(onTrips.appliedFilterFields).toEqual(['trip.kind'])
    expect(onTrips.refusedFilterFields).toEqual([])
    expect(onTrips.query.filters).toContainEqual({ field: 'trip.kind', op: 'eq', value: 'quick' })

    const onBoth = applyBoardScope(both, scope, cat, EYVAR_TODAY)
    /* **Not sent, and named.** Sending it comes back `no-shared-filter-field`,
       which would turn a healthy tile into §8.3 state 12 — a lie about the
       report, whose only offered way out is removing the tile. */
    expect(onBoth.appliedFilterFields).toEqual([])
    expect(onBoth.refusedFilterFields).toEqual(['trip.kind'])
    expect(onBoth.query.filters).toEqual(both.filters)
  })

  it('replaces the report’s own filter on the same field rather than joining it', async () => {
    const cat = await catalogue()
    const base = (await getReport('RPT-2')).data.query
    const withOwn: ReportQuery = {
      ...base,
      filters: [{ field: 'trip.kind', op: 'eq', value: 'scheduled' }],
    }

    const scoped = applyBoardScope(
      withOwn,
      { range: null, filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
      cat,
      EYVAR_TODAY,
    )

    /* Two `eq` filters on one field is the empty set, and an operator who typed
       one value on the board did not ask for both. */
    expect(scoped.query.filters).toEqual([{ field: 'trip.kind', op: 'eq', value: 'quick' }])
  })

  it('applies a range that introduces no new violation', async () => {
    const cat = await catalogue()
    const trend = (await getReport('RPT-2')).data.query
    expect(trend.window).toEqual({ kind: 'preset', preset: 'last-30d' })

    const scoped = applyBoardScope(
      trend,
      { range: { kind: 'preset', preset: 'last-7d' }, filters: [] },
      cat,
      EYVAR_TODAY,
    )

    expect(scoped.rangeRefused).toBe(false)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-7d' })
  })

  it('refuses a range the report cannot answer at, and keeps the saved window', async () => {
    const cat = await catalogue()
    /* A monthly cohort reaching `M3` needs four calendar months in its window.
       `planQuery` answers `cohort-window-too-short` for seven days, so the
       override is backed out rather than silently producing a one-column
       matrix under a four-column title. */
    const cohort = (await getReport('RPT-7')).data.query
    expect(cohort.window).toEqual({ kind: 'preset', preset: 'last-365d' })

    const scoped = applyBoardScope(
      cohort,
      { range: { kind: 'preset', preset: 'last-7d' }, filters: [] },
      cat,
      EYVAR_TODAY,
    )

    expect(scoped.rangeRefused).toBe(true)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-365d' })
  })

  it('does not blame the board for a violation the report already carried', async () => {
    const cat = await catalogue()
    const cohort = (await getReport('RPT-7')).data.query
    /* Already too short before the board says anything. The comparison is
       against the report's OWN plan, so the board is not held responsible for
       a state it did not create — and the tile does not claim a range works
       when nothing about it does. */
    const alreadyBroken: ReportQuery = {
      ...cohort,
      window: { kind: 'preset', preset: 'last-30d' },
    }

    const scoped = applyBoardScope(
      alreadyBroken,
      { range: { kind: 'preset', preset: 'last-7d' }, filters: [] },
      cat,
      EYVAR_TODAY,
    )

    expect(scoped.rangeRefused).toBe(false)
    expect(scoped.query.window).toEqual({ kind: 'preset', preset: 'last-7d' })
  })

  it('offers only filter fields the catalogue really names', async () => {
    const cat = await catalogue()
    const fields = boardFilterFields(cat.measures, cat.dimensions)

    expect(fields.length, 'the catalogue declares filterable fields').toBeGreaterThan(0)
    /* Every offered field resolves to a dimension, or the control has no label
       to render and the chip beside it would read a raw key at an operator. */
    for (const key of fields) {
      expect(cat.dimensions.some((dimension) => dimension.key === key), key).toBe(true)
    }
    /* And it is the union of what measures declare, not a hand-kept list. */
    const declared = new Set(cat.measures.flatMap((measure) => measure.filterableFields))
    for (const key of fields) expect(declared.has(key)).toBe(true)
  })
})

/* ═══ 2. the board range drives every tile ════════════════════════════════ */

describe('§C4 — one range, and every tile answers at it', () => {
  it('starts by naming the open state, never by faking a range for it', async () => {
    const board = await healthyBoard()
    expect(board.range, 'the seeded board imposes nothing').toBeNull()

    mount(board.id)

    /* The trigger says *"each report's own range"* in those words. A control
       that showed `Last 30 days` while three tiles rendered three windows would
       be the exact caption failure this module refuses elsewhere. */
    const trigger = await screen.findByRole('button', { name: copy('rb.dashboard.range') })
    expect(within(trigger).getByText(copy('rb.dashboard.range.own'))).toBeInTheDocument()
  })

  it('overrides every tile’s window, and persists it to the record', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const tiles = ordered(board.tiles)

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.range') }))
    await user.click(await screen.findByRole('button', { name: copy('rb.preset.last-7d') }))

    /* **The record, not the screen.** A board range that reached the tiles and
       not the server is a range nobody else will ever see. */
    await waitFor(async () => {
      const after = (await getDashboard(board.id)).data
      expect(after.range).toEqual({ kind: 'preset', preset: 'last-7d' })
    })

    /* And every resolvable tile now captions the board's window rather than its
       report's. Scoped per tile, because the toolbar trigger carries the same
       string and a bare text query would match it too. */
    for (const tile of tiles) {
      const li = await tileFor(tile.reportId)
      await waitFor(() =>
        expect(within(li).getByText(copy('rb.preset.last-7d'))).toBeInTheDocument(),
      )
      expect(within(li).queryByText(copy('rb.dashboard.tile.ownRange'))).not.toBeInTheDocument()
    }
  })

  it('hands the range back with one control, and says so', async () => {
    const user = userEvent.setup()
    const board = await scopedBoard()
    expect(board.range).not.toBeNull()

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.range') }))
    /* The open state is one of the choices and the FIRST of them — not a
       `Clear` at the bottom. It is the default and the commonest answer. */
    await user.click(
      await screen.findByRole('button', {
        name: copy('rb.dashboard.range.own'),
        pressed: false,
      }),
    )

    await waitFor(async () => {
      expect((await getDashboard(board.id)).data.range).toBeNull()
    })
    expect(
      await screen.findByText(copy('rb.dashboard.range.cleared.toast')),
    ).toBeInTheDocument()
  })

  it('does not touch the reports themselves — the board asks, it does not edit', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const before = (await getReport(first.reportId)).data.query.window

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.range') }))
    await user.click(await screen.findByRole('button', { name: copy('rb.preset.last-7d') }))

    await waitFor(async () => {
      expect((await getDashboard(board.id)).data.range).not.toBeNull()
    })
    /* AC-867 in the other direction: a tile points at a report, so the board
       must not be able to rewrite the definition every other board is showing. */
    expect((await getReport(first.reportId)).data.query.window).toEqual(before)
  })
})

/* ═══ 3. a tile that cannot answer keeps its own, and says so ═════════════ */

describe('§C4 — the refusal is stated on the tile, never swallowed', () => {
  it('marks the tile, names the window it kept, and says why', async () => {
    const board = await scopedBoard()
    /* The seeded board asks for seven days; one of its tiles is a monthly
       cohort reaching M3, which needs four months. */
    const cohortTile = board.tiles.find((tile) => tile.reportId === 'RPT-7')
    expect(cohortTile, 'a seeded tile that cannot answer at the board range').toBeTruthy()

    mount(board.id)

    const li = await tileFor((cohortTile as DashboardTile).reportId)
    await waitFor(() =>
      expect(within(li).getByText(copy('rb.dashboard.tile.ownRange'))).toBeInTheDocument(),
    )
    expect(within(li).getByText(copy('rb.dashboard.tile.ownRange.why'))).toBeInTheDocument()
    /* The caption reads the window that produced the numbers — the report's
       own — and not the board's. */
    expect(within(li).getByText(copy('rb.preset.last-365d'))).toBeInTheDocument()
    expect(within(li).queryByText(copy('rb.preset.last-7d'))).not.toBeInTheDocument()
  })

  it('leaves the tiles that CAN answer answering, on the same board', async () => {
    const board = await scopedBoard()
    const answering = board.tiles.find((tile) => tile.reportId === 'RPT-4')
    expect(answering, 'a seeded tile the board range does reach').toBeTruthy()

    mount(board.id)

    const li = await tileFor((answering as DashboardTile).reportId)
    await waitFor(() =>
      expect(within(li).getByText(copy('rb.preset.last-7d'))).toBeInTheDocument(),
    )
    /* One refusal on one tile is not a refusal on the board. */
    expect(within(li).queryByText(copy('rb.dashboard.tile.ownRange'))).not.toBeInTheDocument()
  })
})

/* ═══ 4. board filters, in the vocabulary that already exists ═════════════ */

describe('§C4 — Add Filter, applied where legal and named where not', () => {
  it('adds a FilterSpec to the record and narrows only the tiles that take it', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const cat = await catalogue()
    const tripKind = cat.dimensions.find((d) => d.key === 'trip.kind')
    expect(tripKind, 'the trip-kind dimension').toBeTruthy()
    const label = copy((tripKind as { labelKey: string }).labelKey)

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.filters.add') }))

    /* The consequence is under the control, not in a help doc (principle 6). */
    expect(await screen.findByText(copy('rb.dashboard.filters.hint'))).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: copy('rb.dashboard.filters.field') }))
    await user.click(await screen.findByRole('option', { name: label }))
    await user.type(screen.getByLabelText(copy('rb.dashboard.filters.value')), 'quick')
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.filters.apply') }))

    /* **The same `FilterSpec` an index table emits** — one vocabulary, one
       shape, no second filter model (AC-814). */
    await waitFor(async () => {
      expect((await getDashboard(board.id)).data.filters).toEqual([
        { field: 'trip.kind', op: 'eq', value: 'quick' },
      ])
    })

    /* The tile whose measure declares `trip.kind` takes it silently — a control
       that worked needs no sentence. */
    const trips = await tileFor('RPT-2')
    expect(
      within(trips).queryByText(field('rb.dashboard.tile.filterRefused', label)),
    ).not.toBeInTheDocument()

    /* The two that cannot SAY SO, by name. This is the whole point: a tile that
       quietly ignored the chip two inches above it would be right about a
       question nobody asked. */
    for (const reportId of ['RPT-1', 'RPT-4']) {
      const li = await tileFor(reportId)
      await waitFor(() =>
        expect(
          within(li).getByText(field('rb.dashboard.tile.filterRefused', label)),
        ).toBeInTheDocument(),
      )
    }
  })

  it('renders each filter as a removable chip whose accessible name opens with what is visible', async () => {
    const board = await scopedBoard()
    const cat = await catalogue()
    const seeded = board.filters[0]
    expect(seeded, 'the seeded board carries a board filter').toBeTruthy()
    const label = copy(
      (cat.dimensions.find((d) => d.key === seeded?.field) as { labelKey: string }).labelKey,
    )
    const visible = copy('rb.dashboard.filters.chip')
      .replace('{field}', label)
      .replace('{value}', String(seeded?.value))

    mount(board.id)

    const chip = await screen.findByRole('button', {
      name: new RegExp(`^${visible.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    })
    /* SC 2.5.3 Label in Name — the visible text comes FIRST and WHOLE in the
       accessible name, so "click Trip kind: quick" reaches it. An `aria-label`
       would have replaced the subtree and made that phrase unusable. */
    expect(chip).toHaveTextContent(visible)
    expect(chip).toHaveAccessibleName(new RegExp(field('rb.dashboard.filters.remove', label)))
  })

  it('removes a board filter from the record and from every tile’s sentence', async () => {
    const user = userEvent.setup()
    const board = await scopedBoard()
    const cat = await catalogue()
    const seeded = board.filters[0] as { field: string; value: unknown }
    const label = copy(
      (cat.dimensions.find((d) => d.key === seeded.field) as { labelKey: string }).labelKey,
    )

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(
      screen.getByRole('button', { name: new RegExp(field('rb.dashboard.filters.remove', label)) }),
    )

    await waitFor(async () => {
      expect((await getDashboard(board.id)).data.filters).toEqual([])
    })
    await waitFor(() =>
      expect(
        screen.queryByText(field('rb.dashboard.tile.filterRefused', label)),
      ).not.toBeInTheDocument(),
    )
  })
})

/* ═══ 5. §C5 — tiles of different sizes ═══════════════════════════════════ */

describe('§C5 — a board is a composition, not a uniform 2-up', () => {
  it('gives the hero tile the whole row and leaves the rest half width', async () => {
    const board = await healthyBoard()
    const tiles = ordered(board.tiles)
    const hero = tiles[0] as DashboardTile
    expect(hero.span, 'the seeded board leads with a full-width tile').toBe('full')

    mount(board.id)

    const heroLi = await tileFor(hero.reportId)
    /* `wide:col-span-2` and nothing else: below the breakpoint the grid is one
       column and every tile is already full width, so the span is inert rather
       than wrong. */
    expect(heroLi.className).toContain('wide:col-span-2')

    for (const tile of tiles.slice(1)) {
      const li = await tileFor(tile.reportId)
      expect(li.className).not.toContain('col-span-2')
    }
  })

  it('toggles a tile’s width from its own overflow, and saves the layout', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const hero = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(hero.reportId)).data

    mount(board.id)

    await user.click(
      await screen.findByRole('button', {
        name: named('rb.dashboard.tile.actions', report.name),
      }),
    )
    /* §11.2 rejected a drag reorder on keyboard-operability grounds, and the
       same objection applies word for word to a drag resize — so the size is a
       menu item, which has the keyboard story for free. The label names the
       state it MOVES TO; the accessible name names the tile. */
    await user.click(
      await screen.findByRole('menuitem', {
        name: named('rb.dashboard.tile.span.halfA11y', report.name),
      }),
    )

    await waitFor(async () => {
      const after = (await getDashboard(board.id)).data
      const moved = after.tiles.find((tile) => tile.tileId === hero.tileId)
      expect(moved?.span).toBe('half')
    })
    await waitFor(async () =>
      expect((await tileFor(hero.reportId)).className).not.toContain('col-span-2'),
    )
    expect(await screen.findByText(copy('rb.dashboard.tile.span.toast'))).toBeInTheDocument()
  })

  it('leaves the order it did not edit alone', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const hero = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(hero.reportId)).data
    const before = ordered(board.tiles).map((tile) => tile.tileId)

    mount(board.id)

    await user.click(
      await screen.findByRole('button', {
        name: named('rb.dashboard.tile.actions', report.name),
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', {
        name: named('rb.dashboard.tile.span.halfA11y', report.name),
      }),
    )

    await waitFor(async () => {
      const after = ordered((await getDashboard(board.id)).data.tiles)
      /* A resize is not a reorder. `saveDashboard` renormalises `order` to
         1..n, so this also pins that the renormalisation did not shuffle. */
      expect(after.map((tile) => tile.tileId)).toEqual(before)
      expect(after.map((tile) => tile.order)).toEqual(after.map((_, index) => index + 1))
    })
  })
})

/* ═══ 6. the toolbar itself ═══════════════════════════════════════════════ */

describe('the board toolbar governs something, or it is not there', () => {
  it('is absent on a board with no tiles — four controls over nothing', async () => {
    const empty = (await boards()).find((board) => board.tiles.length === 0)
    expect(empty, 'a board with no tiles').toBeTruthy()

    mount((empty as Dashboard).id)

    /* R8's first-run empty is one heading, one line and one action. A range
       control above it would govern nothing and would be the only thing on
       screen competing with the action. */
    expect(await screen.findByText(copy('rb.dashboard.empty.heading'))).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('rb.dashboard.range') }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('rb.dashboard.filters.add') }),
    ).not.toBeInTheDocument()
  })

  it('carries no physical direction utility, and survives dir="rtl"', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const board = await scopedBoard()

      mount(board.id)

      const range = await screen.findByRole('button', { name: copy('rb.dashboard.range') })
      const toolbar = range.parentElement as HTMLElement
      for (const node of [toolbar, ...Array.from(toolbar.querySelectorAll<HTMLElement>('*'))]) {
        const className = node.getAttribute('class') ?? ''
        expect(className, `${node.tagName} carries a physical direction`).not.toMatch(
          /(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/,
        )
      }
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })
})

/* ═══ 7. the dashboards LIST ══════════════════════════════════════════════ */

describe('§E6/§E7 — the content list says more than a name', () => {
  it('leads every row with a preview of the board’s layout, and claims no data', async () => {
    const all = await boards()

    const { container } = mountList()

    await screen.findByText(all[0]?.name as string)
    /* One preview per row. It draws the ARRANGEMENT — tile count and each
       tile's width, both on the record — and never numbers: painting a
       miniature of the charts means running every report on every row, and a
       stale or sampled one is a picture of numbers that are not the numbers. */
    const previews = Array.from(container.querySelectorAll('svg')).filter(
      (svg) => svg.getAttribute('aria-hidden') === 'true' && svg.querySelector('rect'),
    )
    expect(previews.length).toBeGreaterThanOrEqual(all.length)

    /* A board with no tiles gets the frame it will fill rather than a blank —
       an empty outline reads as *a board, empty*; nothing at all reads as a
       bug. */
    const hasEmptyBoard = all.some((board) => board.tiles.length === 0)
    expect(hasEmptyBoard).toBe(true)
    expect(previews.some((svg) => svg.querySelector('rect[fill="none"]'))).toBe(true)
  })

  it('names each board’s range, including the open one, in words', async () => {
    const all = await boards()
    const open = all.filter((board) => board.range === null)
    const scoped = all.find((board) => board.range?.kind === 'preset')
    expect(open.length, 'boards that impose nothing').toBeGreaterThan(0)
    expect(scoped, 'a board that imposes a preset').toBeTruthy()

    const range = (scoped as Dashboard).range
    expect(range?.kind).toBe('preset')
    const preset = range?.kind === 'preset' ? range.preset : ''

    mountList()

    await screen.findByText((scoped as Dashboard).name)
    /* R8 / copy rule 10 — an absence is stated in words, never left blank. */
    expect(screen.getAllByText(copy('rb.dashboard.range.own')).length).toBe(open.length)
    expect(screen.getByText(copy(`rb.preset.${preset}`))).toBeInTheDocument()
  })

  it('duplicates a board without duplicating the reports on it', async () => {
    const user = userEvent.setup()
    const source = await scopedBoard()

    mountList()

    await screen.findByText(source.name)
    const row = screen.getByText(source.name).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /more|actions/i }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.dashboards.duplicate') }))

    const copied = named('rb.dashboards.duplicate.name', source.name)
    await waitFor(async () => {
      const made = (await boards()).find((board) => board.name === copied)
      expect(made, 'the copy exists on the server, not merely on screen').toBeTruthy()
      /* A tile is a REFERENCE, so a copy shares the definitions rather than
         forking them (AC-867). Same report ids, same scope, new tile ids. */
      expect(ordered(made?.tiles ?? []).map((tile) => tile.reportId)).toEqual(
        ordered(source.tiles).map((tile) => tile.reportId),
      )
      expect(made?.range).toEqual(source.range)
      expect(made?.filters).toEqual(source.filters)
      expect(
        (made?.tiles ?? []).some((tile) =>
          source.tiles.some((original) => original.tileId === tile.tileId),
        ),
      ).toBe(false)
    })
  })
})
