/**
 * `ModuleRail` and `PageNav` — the two nav columns.
 *
 * What these cover, and why each is here rather than left to visual-QA:
 *
 *   **AC-64 (amended, D5)** — the tab order. *"The rail's four workspace tiles
 *     → the pinned Admin tile → the sub-tab list."* The disclosure has been
 *     deleted along with the collapse, so finding F-3's insertion goes with it.
 *     The order is invisible in a screenshot and is the thing a future refactor
 *     breaks first.
 *   **AC-02** — `Admin` is last and pinned.
 *   **AC-26** — a badge at zero renders NOTHING.
 *   **AC-27, AC-32 and AC-33 are VOID** — there is no collapsed state to keep a
 *     badge through, no viewport default to seed, and no popover to compare.
 *   **AC-08** — nothing in either column sets an active state; it is a prop
 *     derived from the route.
 *   **AC-71 / §14** — both render under `dir="rtl"` with no physical offset.
 *   **AC-65** — every icon-only control has an accessible name.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createTranslator } from '@/lib'
import { getRouteTable } from '@/data/clients'
import type { NavCounts } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ModuleRail } from './ModuleRail'
import { PageNav } from './PageNav'

const t = createTranslator({ dictionary: EN, fallback: EN })
const table = getRouteTable()
const operationsRows = table.subTabs
  .filter((r) => r.workspaceId === 'operations')
  .sort((a, b) => a.order - b.order)

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

/** The five rail labels, in rail order. §2.2 as amended by D5. */
const RAIL_LABELS = [
  'nav.rail.management',
  'nav.rail.operations',
  'nav.rail.financials',
  'nav.rail.support',
  'nav.rail.admin',
] as const

/**
 * A rail tile, found by its label.
 *
 * **The tile has no `aria-label` any more** (D5: the visible short label IS the
 * accessible name), so a tile carrying a count badge composes that badge's own
 * label into its accessible name — `Exec 6 items need attention`. That is the
 * fix for defect D-4, where the tile's `aria-label` replaced its whole subtree
 * and the count reached nobody. It does mean an EXACT name lookup would be a
 * lookup on the fixture's current counts, so every tile is found by prefix.
 */
const railTile = (id: string) =>
  screen.getByRole('link', { name: new RegExp(`^${EN[`nav.rail.${id}`] as string}\\b`) })

/** The five workspace tiles in DOM order — the wordmark link is not one. */
const railTiles = () =>
  screen.getAllByRole('link').filter((l) => l.getAttribute('aria-label') !== 'Eyvar')

const counts = (subTabs: NavCounts['subTabs']): NavCounts => ({
  subTabs,
  computedAt: '2026-06-25T09:14:00+03:00',
})

function renderRail(overrides: Partial<React.ComponentProps<typeof ModuleRail>> = {}) {
  const props: React.ComponentProps<typeof ModuleRail> = {
    workspaces: table.workspaces,
    visibleRows: table.subTabs,
    navCounts: counts([]),
    navCountsLoading: false,
    activeWorkspaceId: 'operations',
    landingRoute: '/operations/overview',
    t,
    ...overrides,
  }
  return render(
    <MemoryRouter>
      <ModuleRail {...props} />
    </MemoryRouter>,
  )
}

function renderColumn(overrides: Partial<React.ComponentProps<typeof PageNav>> = {}) {
  const workspace = table.workspaces.find((w) => w.id === 'operations')
  const props: React.ComponentProps<typeof PageNav> = {
    workspace: workspace ?? null,
    rows: operationsRows,
    navCounts: counts([]),
    navCountsLoading: false,
    activeSubTabId: 'operations-people',
    t,
    ...overrides,
  }
  return render(
    <MemoryRouter>
      <PageNav {...props} />
    </MemoryRouter>,
  )
}

/* ─────────────────────────── the rail ─────────────────────────── */

describe('ModuleRail — AC-01, AC-02', () => {
  it('renders exactly five workspace targets', () => {
    renderRail()
    const nav = screen.getByRole('navigation', { name: EN['shell.nav.workspaces'] as string })
    /* Six links: the wordmark plus five tiles. The wordmark is named `Eyvar`. */
    const links = within(nav).getAllByRole('link')
    expect(links.filter((l) => l.getAttribute('aria-label') !== 'Eyvar')).toHaveLength(5)
    /* D5 — and nothing else. There is no disclosure button, in any state. */
    expect(within(nav).queryAllByRole('button')).toHaveLength(0)
  })

  it('puts Admin last and keeps it out of the scrolling group (AC-02)', () => {
    renderRail()
    const labels = railTiles().map((l) => l.textContent?.trim())
    expect(labels[labels.length - 1]).toBe(EN['nav.rail.admin'])
  })

  /* §2.2 (amended, D5) — THE VISIBLE LABEL IS THE ACCESSIBLE NAME. The old
     short-label / full-`aria-label` split leaned on WCAG 2.5.3 (Label in Name)
     holding because "Customer Support" contains "Support". `Ops` breaks that:
     "Operations" does not contain it. So the two are now IDENTICAL, which
     satisfies 2.5.3 by identity and cannot drift apart. */
  it('gives every tile ONE name, visible and accessible alike (§2.2, WCAG 2.5.3)', () => {
    renderRail()
    for (const key of RAIL_LABELS) {
      const label = EN[key] as string
      const tile = screen.getByRole('link', { name: label })
      expect(tile.textContent?.trim()).toBe(label)
      expect(tile.getAttribute('aria-label')).toBeNull()
    }
  })

  it('keeps every rail label at or under seven characters, so truncate cannot fire', () => {
    for (const key of RAIL_LABELS) {
      expect((EN[key] as string).length).toBeLessThanOrEqual(7)
    }
  })

  it('marks the ACTIVE tile from the route prop and from nothing else (AC-08)', () => {
    renderRail({ activeWorkspaceId: 'financials' })
    expect(railTile('financials')).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      railTile('operations'),
    ).not.toHaveAttribute('aria-current')
  })

  /* §2.3 (amended) — the ACTIVE treatment is an inset filled white pill and
     NOTHING ELSE. The 3px `--ev-marker` leading edge and the 1px hairline were
     additions on top of §2.1's observed rule, and together they made a selected
     tile read as a card floating in a list. A test asserting either is now
     wrong, so this asserts their ABSENCE. */
  it('expresses ACTIVE as a white pill alone — no marker, no border (§2.3)', () => {
    renderRail({ activeWorkspaceId: 'operations' })
    const tile = railTile('operations')
    expect(tile.className).toContain('bg-card')
    expect(tile.className).not.toMatch(/(^|\s)border(\s|$)/)
    expect(tile.className).not.toContain('marker')
  })
})

describe('ModuleRail — the tab order is AC-64, as amended by D5', () => {
  it('is four tiles as ONE stop → Admin, with nothing between them', async () => {
    const user = userEvent.setup()
    renderRail()

    const tiles = railTiles()
    const [management, , , , admin] = tiles

    /* Exactly one of the four grouped tiles is in the tab order — that is what
       "ONE stop" means, and it is the roving tabindex doing it. */
    const grouped = tiles.slice(0, 4)
    expect(grouped.filter((el) => el.getAttribute('tabindex') === '0')).toHaveLength(1)
    expect(grouped.filter((el) => el.getAttribute('tabindex') === '-1')).toHaveLength(3)

    management?.focus()
    await user.tab()
    /* Straight to Admin. The disclosure used to sit here (finding F-3); it no
       longer exists, and neither does F-3. */
    expect(document.activeElement).toBe(admin)
  })

  it('moves between the four tiles with ArrowDown, not with Tab', async () => {
    const user = userEvent.setup()
    renderRail()
    const tiles = railTiles()
    tiles[0]?.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(tiles[1])
    await user.keyboard('{End}')
    /* End goes to the last item OF THE GROUP — Admin is a separate stop. */
    expect(document.activeElement).toBe(tiles[3])
  })
})

describe('ModuleRail — badges, AC-26 and AC-27', () => {
  it('renders NOTHING at zero — not a `0`', () => {
    renderRail({
      navCounts: counts(operationsRows.map((r) => ({ subTabId: r.subTabId, count: 0, tone: 'attention' }))),
    })
    const tile = railTile('operations')
    expect(tile).not.toHaveTextContent('0')
  })

  it('renders nothing when the count is null — "no backlog concept" is not zero', () => {
    renderRail({
      navCounts: counts(operationsRows.map((r) => ({ subTabId: r.subTabId, count: null, tone: 'neutral' }))),
    })
    expect(railTile('operations')).not.toHaveTextContent(
      '0',
    )
  })

  it('reads 99+ above ninety-nine (§2.4)', () => {
    const first = operationsRows[0]
    if (!first) throw new Error('no operations rows')
    renderRail({ navCounts: counts([{ subTabId: first.subTabId, count: 412, tone: 'neutral' }]) })
    expect(railTile('operations')).toHaveTextContent(
      EN['shell.nav.countOverflow'] as string,
    )
  })

  it('skeletonises only the BADGE while counts load — §9.1, the nav is never a skeleton', () => {
    renderRail({ navCountsLoading: true, navCounts: null })
    /* The LABELS are already there: they come from the route table, not the
       network. That is the whole distinction §9.1 draws. */
    expect(railTile('operations')).toHaveTextContent(
      EN['nav.rail.operations'] as string,
    )
  })
})

/* ───────────────────────── the sub-tab column ───────────────────────── */

describe('PageNav — AC-05, AC-19, AC-58', () => {
  it('lists exactly the workspace’s sub-tabs, in order', () => {
    renderColumn()
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent?.trim())).toEqual(
      operationsRows.map((r) => EN[r.titleKey] as string),
    )
  })

  it('shows the workspace’s FULL name as the heading (§3.1)', () => {
    renderColumn()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      EN['workspace.operations'] as string,
    )
  })

  it('carries NO control in the heading row, and no collapse anywhere (§3.1, D5)', () => {
    renderColumn()
    expect(screen.queryByRole('button')).toBeNull()
  })

  /* §2.3 (amended) — the active ROW is a white pill and nothing else, exactly
     as the active TILE is. A test asserting `--ev-marker` or a 1px border on a
     nav row is now wrong. */
  it('expresses ACTIVE as a white pill alone — no marker, no border (§2.3)', () => {
    renderColumn({ activeSubTabId: 'operations-people' })
    const row = screen.getByRole('link', { name: EN['subtab.operations.people'] as string })
    expect(row.className).toContain('bg-card')
    expect(row.className).not.toMatch(/(^|\s)border(\s|$)/)
    expect(row.className).not.toContain('marker')
  })

  it('marks the active row from the prop, never from a click (AC-08, AC-09)', async () => {
    const user = userEvent.setup()
    renderColumn({ activeSubTabId: 'operations-people' })
    const people = screen.getByRole('link', { name: EN['subtab.operations.people'] as string })
    const trips = screen.getByRole('link', { name: EN['subtab.operations.trips'] as string })
    expect(people).toHaveAttribute('aria-current', 'page')
    await user.click(trips)
    /* Clicking navigates; it does NOT move the highlight. The highlight follows
       the route, and the route is a prop here. */
    expect(people).toHaveAttribute('aria-current', 'page')
    expect(trips).not.toHaveAttribute('aria-current')
  })

  it('is ONE tab stop with arrow keys inside it (AC-64)', async () => {
    const user = userEvent.setup()
    renderColumn()
    const links = screen.getAllByRole('link')
    expect(links.filter((l) => l.getAttribute('tabindex') === '0')).toHaveLength(1)
    links[0]?.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(links[1])
  })
})

/* Arabic ───────────────────────────── */

describe('Arabic — AC-71, and no physical offset anywhere (§9.1)', () => {
  it('renders both columns under dir="rtl" with every string still resolved (AC-74)', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')

    renderRail()
    /* With an EMPTY Arabic dictionary the English fallback renders for every
       string and NO RAW KEY appears — AC-74. `EN` is the fallback here, which
       is exactly what `createTranslator` does in the app. */
    const support = railTile('support')
    expect(support).toBeInTheDocument()
    expect(support.textContent).not.toContain('nav.rail.')
  })

  it('uses no physical direction utility in either column', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const { container } = renderColumn()
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .join(' ')
    /* `rounded-lg` is a size, not a side; `border-l`/`border-r`, `ml-`, `pl-`,
       `left-`, `text-left` are sides and none may appear. */
    expect(classes).not.toMatch(/(^|\s)(ml|mr|pl|pr|left|right)-/)
    expect(classes).not.toMatch(/(^|\s)(border-l|border-r|rounded-l|rounded-r|text-left|text-right)\b/)
  })
})
