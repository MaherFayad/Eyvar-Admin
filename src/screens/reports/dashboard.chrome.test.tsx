/**
 * **The dashboard's chrome** — Amplitude §C1, §C2, §C4, §C5, held to what this
 * product actually has behind each control.
 *
 * `dashboards.test.tsx` covers the *behaviour*: the four tile outcomes, the
 * reorder, the reference-versus-copy rule. This file covers the *frame* — the
 * things a screenshot comparison finds and a behaviour test never does, plus
 * the three places where matching Amplitude would have meant inventing data.
 *
 * Five claims, and each one is a regression that has already happened
 * somewhere in this codebase:
 *
 *   1. **One frame per tile.** `DashboardTile` cards, `ResultCanvas` cards
 *      inside it, `PanelCard` cards inside that — two hairlines, two radii and
 *      two shadows per tile. It is the single biggest reason this board read
 *      looser than the reference. The tile now *asks* for one frame
 *      (`framed={false}`) rather than overriding three from the outside, so
 *      the count below is the whole assertion and there is no constant to
 *      spell-check.
 *   2. **The period sub-line comes off the resolved report**, never off
 *      `pinnedName`, which is a display fallback for a tile whose reference is
 *      gone and is not a caption for numbers.
 *   3. **The empty board offers one primary and no template gallery.**
 *      Amplitude's four template cards are business content nobody supplied.
 *   4. **`Add content` offers exactly the two things that exist here.** Not
 *      `Generate with AI` (no model endpoint), not `Text` (§11 defines a
 *      dashboard as an ordered list of saved report ids).
 *   5. **The header has a description and an overflow, and no `Subscribe`, no
 *      `Share` and no `0 Views`** — a scheduler, an ACL model and a telemetry
 *      store this product does not have.
 *
 * Plus §9.1: the grip and the expand sit at the correct **logical** corners,
 * which under `dir="rtl"` means by flow and by `justify-self-end`, never by a
 * physical side.
 *
 * No fixture is imported. `seam.test.ts` forbids it outside `src/data`, and a
 * test that reads the seed array is testing the seed rather than the contract.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  disableMockLatency,
  getReport,
  listDashboards,
  resetDataLayer,
  saveReport,
} from '@/data/clients'
import type { Dashboard, DashboardTile } from '@/data/types'
import { DashboardDetailScreen } from './DashboardDetailScreen'
import { REPORTS_EN } from './copy'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select and dropdown both call them on
     the trigger. Same reasoning as `dashboards.test.tsx`; kept local. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

afterEach(() => {
  document.documentElement.removeAttribute('dir')
})

const copy = (key: string) => REPORTS_EN[key] as string
const named = (key: string, name: string) => copy(key).replace('{name}', name)

function mount(dashboardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/dashboards/${dashboardId}`]}>
      <ShellProvider>
        <Routes>
          <Route
            path="/management/reports/dashboards/:dashboardId"
            element={<DashboardDetailScreen />}
          />
          {/* `?q=` with nothing after it is `New report` — the builder on the
              unstarted question. The marker stands in for it so the navigation
              is assertable without mounting the builder. */}
          <Route path="/management/reports" element={<p>the reports sub-tab</p>} />
        </Routes>
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
  const all = await boards()
  const found = all.find(
    (board) =>
      board.tiles.length > 1 && !board.tiles.some((tile) => tile.reportId.includes('DELETED')),
  )
  expect(found, 'a board with more than one resolvable tile').toBeTruthy()
  return found as Dashboard
}

async function emptyBoard(): Promise<Dashboard> {
  const found = (await boards()).find((board) => board.tiles.length === 0)
  expect(found, 'a board with no tiles').toBeTruthy()
  return found as Dashboard
}

/** The `<li>` a tile renders into, found through one of that tile's controls. */
function tileOf(control: HTMLElement): HTMLElement {
  const li = control.closest('li')
  expect(li, 'every tile renders into its own list item').toBeTruthy()
  return li as HTMLElement
}

/* ───── 1. one frame per tile ────────────────────────────────────────────── */

describe('a tile draws exactly one card frame', () => {
  it('is the only card in the tile, and the panels beneath it are really there', async () => {
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    const title = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.open', report.name),
    })
    const tile = tileOf(title)

    /* **The panels are asserted first, because they are what stops this being
       vacuous.** One card is trivially true of a tile that rendered nothing —
       an empty body, a swallowed error, a composer that stopped drawing. Every
       panel `ResultCanvas` draws carries `data-slot="panel-frame"`, so a real,
       multi-panel composition inside the tile is a precondition of the count
       below rather than an assumption behind it. */
    const panels = Array.from(tile.querySelectorAll<HTMLElement>('[data-slot="panel-frame"]'))
    expect(
      panels.length,
      'the tile must actually compose panels, or one-card is true of nothing',
    ).toBeGreaterThan(0)

    const cards = Array.from(tile.querySelectorAll<HTMLElement>('[data-slot="card"]'))
    expect(cards, 'one tile, one hairline, one radius, one shadow').toHaveLength(1)
    const root = cards[0] as HTMLElement
    expect(tile.firstElementChild).toBe(root)
    /* And every panel is INSIDE that one frame — a panel that escaped the tile
       would also satisfy a count of one. */
    for (const panel of panels) expect(panel.closest('[data-slot="card"]')).toBe(root)
  })

  /**
   * **The flush workaround is gone, and it must not come back.**
   *
   * The double frame was first neutralised from outside, by a structural
   * selector on the tile root that reached into `PanelCard`'s internals
   * (`[&_[data-slot=card]]:border-0` and three like it). It worked and it was
   * unowned: the day that markup moved, the rule would have stopped matching
   * silently, and a flush tile is not something a DOM test can see failing.
   * `framed` replaced it. This asserts the replacement rather than the removal,
   * because re-adding the selector is the cheap fix somebody reaches for.
   */
  it('does not reach into another component to strip its frame', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/reports/DashboardTile.tsx'),
      'utf8',
    )
    /* The selector itself, absent from the file entirely — the header narrates
       the old fix in prose, deliberately without spelling it, so this can be a
       plain containment check rather than a comment-stripping parser. */
    expect(
      source,
      'the tile must ASK for one frame, not reach in and override three',
    ).not.toContain('data-slot=card')
    expect(source, 'the tile passes framed={false} to the composer').toContain('framed={false}')
  })

  /**
   * **The 268px floor, measured rather than assumed** (`ResultCanvas` states
   * it, R4-1 owns it).
   *
   * The tightening this round is a gutter (12 → 8) and the tile's own content
   * padding (12 → 0, because the panel inside brings its own). Both give the
   * plot *more* width, not less, and the arithmetic runs off the shipped
   * tokens rather than off a remembered number.
   */
  it('keeps a one-panel tile above the floor at both widths the two-across grid exists at', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')
    const token = (name: string): number => {
      const found = new RegExp(`${name}:\\s*(\\d+)px`).exec(css)
      expect(found, `${name} is declared in globals.css`).toBeTruthy()
      return Number(found?.[1])
    }
    const chrome = token('--ev-rail-w') + token('--ev-subnav-w')
    const padWide = token('--ev-page-pad-wide')
    const wide = token('--ev-bp-wide')
    const FLOOR = 268

    /**
     * **The two figures this arithmetic is ABOUT are read off the shipped
     * source, not typed in here.**
     *
     * They used to be the literals `8` and `0` in the calls below, which is the
     * one thing this test could not afford: the `8` IS `gap-2` on the tile grid
     * and the `0` IS `px-0` on a resolved tile's content box, and those are
     * exactly the two values this round changed. Spelled as constants, a revert
     * of either left the test green while the arithmetic it claims to guard
     * became false — the test would have reported a floor it was no longer
     * measuring.
     */
    const classNumber = (file: string, pattern: RegExp, what: string): number => {
      const found = pattern.exec(readFileSync(resolve(process.cwd(), file), 'utf8'))
      expect(found, `${what} is still written the way this test reads it`).toBeTruthy()
      /* Tailwind's stock spacing step. `globals.css` overrides a great many
         tokens and deliberately not this one, so a `gap-2` is 8px — asserted
         rather than assumed, because the day it IS overridden every number
         below moves. */
      expect(css, 'globals.css declares no --spacing override').not.toMatch(/^\s*--spacing:/m)
      return Number(found?.[1]) * 4
    }

    /* `gap-2` on the two-across tile grid. */
    const gutter = classNumber(
      'src/screens/reports/DashboardDetailScreen.tsx',
      /className="grid list-none grid-cols-1 gap-(\d+) wide:grid-cols-2"/,
      'the tile grid gutter',
    )
    /* `px-0` on a resolved tile's `CardContent` — the panel inside brings its
       own inset, and two nested paddings is the defect this removed. */
    const tilePad = classNumber(
      'src/components/reports/DashboardTile.tsx',
      /state\?\.kind === 'ok' && 'px-(\d+)'/,
      "the resolved tile's content inset",
    )

    /* `wide:grid-cols-2` is the only place two tiles share a row, so the
       narrowest a tile ever gets is at the breakpoint itself. */
    const panelWidth = (viewport: number, rowGutter: number, contentInset: number) => {
      const content = viewport - chrome - 2 * padWide
      const tile = (content - rowGutter) / 2
      /* 1px of hairline each side, then whatever the tile's own content box
         insets before the panel starts. */
      return tile - 2 - 2 * contentInset
    }

    expect(panelWidth(wide, gutter, tilePad)).toBeGreaterThanOrEqual(FLOOR)
    expect(panelWidth(1440, gutter, tilePad)).toBeGreaterThanOrEqual(FLOOR)
    /* And the SHIPPED configuration is strictly better than the one it replaced
       — a 12px gutter with a 12px content inset on top of the panel's own.
       Both sides used to be literals, which made this two calls to a pure local
       function with constant arguments: true for every possible state of the
       codebase, including one where neither value had ever been changed. The
       left side is now read off the source, so a revert of `gap-2` or `px-0`
       collapses this to `x > x` and the test goes red where the regression is.
       The right side stays literal on purpose: it is history, and history does
       not live in the tree any more. */
    expect(panelWidth(1440, gutter, tilePad)).toBeGreaterThan(panelWidth(1440, 12, 12))

    /**
     * **A TWO-panel tile is the same figure now, and it did not used to be.**
     *
     * `ResultCanvas` split a multi-panel run two across inside whatever width
     * it was given, so the tile handed 514px to two panels and each got 251 —
     * 227 at the breakpoint. Measured, not predicted: `scratch/tile-density.mjs`
     * reads them off the running board, and viewport arithmetic could not have
     * found this at all, because a tile's width is not a function of the
     * viewport alone.
     *
     * The split is now a container query on the canvas, and `@xl` is 36rem =
     * 576px. A tile-width canvas is under that at every width the two-across
     * tile grid exists at, so the run is ONE column and each panel is the whole
     * canvas.
     */
    const CONTAINER_XL = 576
    const CANVAS_GUTTER = 12
    for (const viewport of [wide, 1440]) {
      const canvas = panelWidth(viewport, gutter, tilePad)
      expect(
        canvas,
        `a tile canvas at ${viewport} must sit under @xl, or the panels split two across again`,
      ).toBeLessThan(CONTAINER_XL)
      expect(canvas, 'and one column across it clears the floor').toBeGreaterThanOrEqual(FLOOR)
      /* The violation this closes, stated: two across at this width was under. */
      expect((canvas - CANVAS_GUTTER) / 2).toBeLessThan(FLOOR)
    }
  })
})

/* ───── 2. the period sub-line ───────────────────────────────────────────── */

describe('the period sub-line names the report’s window', () => {
  it('reads the resolved query, never pinnedName — §C5', async () => {
    const board = await healthyBoard()
    const tiles = ordered(board.tiles)
    const first = tiles[0] as DashboardTile
    const before = (await getReport(first.reportId)).data
    /* Renamed AFTER it was pinned, so `pinnedName` and the report's name are
       now different strings and any use of the wrong one is visible. */
    const renamed = 'Renamed after it was pinned'
    expect(
      (
        await saveReport({
          id: before.id,
          name: renamed,
          description: before.description,
          query: before.query,
          visibility: before.visibility,
        })
      ).status,
    ).toBe('saved')

    mount(board.id)

    const title = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.open', renamed),
    })
    const tile = tileOf(title)

    /* Every report on this board carries the same preset, so the sub-line is
       the preset's own name — the sentence an operator recognises at a glance,
       and the one `WindowControl` puts on the builder's range trigger. */
    const windows = await Promise.all(
      tiles.map(async (t) => (await getReport(t.reportId)).data.query.window),
    )
    for (const [index, window] of windows.entries()) {
      expect(window.kind, `tile ${index + 1} pins a preset window`).toBe('preset')
    }
    const label = copy(`rb.preset.${(windows[0] as { preset: string }).preset}`)
    expect(within(tile).getByText(label)).toBeInTheDocument()
    expect(screen.getAllByText(label).length).toBe(tiles.length)

    /* AC-869 — `pinnedName` renders in exactly one place, and a resolvable
       tile is not it. Neither the title nor the caption may read it. */
    expect(screen.queryByText(first.pinnedName)).not.toBeInTheDocument()
    expect(tile.textContent).not.toContain(first.pinnedName)
  })

  it('gives the tile the expand affordance and the corner meta, both named', async () => {
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    /* §C5's `⊞`. Same destination as the title, DIFFERENT accessible name —
       two buttons answering to `Open {name}` is an ambiguity nobody can
       resolve by listening. */
    const expand = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.expand', report.name),
    })
    expect(expand).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: named('rb.dashboard.tile.open', report.name) }),
    ).toBeInTheDocument()

    /* The corner meta names the QUESTION and what it counts, both read off the
       resolved query. Nothing here is stored on the tile. */
    const tile = tileOf(expand)
    expect(within(tile).getByText(copy(`rb.mode.${report.query.mode ?? 'trend'}`))).toBeInTheDocument()
  })
})

/* ───── 3. the empty board ───────────────────────────────────────────────── */

describe('an empty dashboard is an illustration, one sentence and one primary', () => {
  it('offers Add content and does NOT offer a template gallery — §C1', async () => {
    const board = await emptyBoard()

    const { container } = mount(board.id)

    expect(await screen.findByText(copy('rb.dashboard.empty.heading'))).toBeInTheDocument()
    expect(screen.getByText(copy('rb.dashboard.empty.body'))).toBeInTheDocument()
    /* Two of them: the header's and the empty state's own. R8 requires the
       empty state to carry an action rather than point at the header. */
    expect(
      screen.getAllByRole('button', { name: copy('rb.dashboard.empty.action') }).length,
    ).toBeGreaterThanOrEqual(2)

    /* §1.5 — an ILLUSTRATION, not a scaled-up icon. The board art is the only
       thing on this screen that draws a polyline. */
    const illustrations = Array.from(container.querySelectorAll('svg')).filter((svg) =>
      svg.querySelector('polyline'),
    )
    expect(illustrations.length).toBe(1)

    /* **No template gallery.** Amplitude's `User Activity`, `Product KPIs`,
       `Funnel Analysis` and `Feature Adoption` are business content nobody has
       supplied; porting the four names would put four invented reports in
       front of an operator. */
    expect(screen.queryByText(/template/i)).not.toBeInTheDocument()
  })
})

/* ───── 4. the Add content chooser ───────────────────────────────────────── */

describe('Add content offers exactly the two things that exist here', () => {
  it('lists Existing report and New report, and neither AI nor Text — §C2', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.add') }))

    const dialog = await screen.findByRole('alertdialog')
    const list = within(dialog).getByRole('list')
    /* EXACTLY two. A third row here means somebody added a control with no
       feature behind it. */
    expect(within(list).getAllByRole('listitem').length).toBe(2)
    expect(
      within(list).getByRole('button', { name: new RegExp(copy('rb.dashboard.addContent.existing')) }),
    ).toBeInTheDocument()
    expect(
      within(list).getByRole('button', { name: new RegExp(copy('rb.dashboard.addContent.new')) }),
    ).toBeInTheDocument()

    /* §E3's described list: a name AND a one-line purpose, never a bare label. */
    expect(within(dialog).getByText(copy('rb.dashboard.addContent.existing.hint'))).toBeInTheDocument()
    expect(within(dialog).getByText(copy('rb.dashboard.addContent.new.hint'))).toBeInTheDocument()

    expect(within(dialog).queryByText(/\bAI\b/)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/^Text$/)).not.toBeInTheDocument()
  })

  it('sends New report to the builder on the unstarted question', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.add') }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', {
        name: new RegExp(copy('rb.dashboard.addContent.new')),
      }),
    )

    expect(await screen.findByText('the reports sub-tab')).toBeInTheDocument()
  })

  it('steps into the saved-report picker and back, without losing the surface', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.add') }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: new RegExp(copy('rb.dashboard.addContent.existing')),
      }),
    )

    /* Step two is the picker that already shipped, heading unchanged. */
    expect(await screen.findByText(copy('rb.dashboard.add.title'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.addContent.back') }))
    /* Back is a STEP, not a dismissal: cancelling here would throw away the
       choice as well as the step. Asserted on the dialog's HEADING rather than
       on the string, because `Add content` is also the header primary's label
       and a bare text query would match two nodes. */
    const back = await screen.findByRole('alertdialog')
    expect(
      within(back).getByRole('heading', { name: copy('rb.dashboard.addContent.title') }),
    ).toBeInTheDocument()
    expect(within(back).getAllByRole('listitem').length).toBe(2)
  })
})

/* ───── 5. the header ────────────────────────────────────────────────────── */

describe('the dashboard header says what the board is for, and claims nothing else', () => {
  it('renders the description, the overflow, and no Subscribe / Share / Views — §C4', async () => {
    const user = userEvent.setup()
    const board = (await boards()).find((row) => row.description !== null)
    expect(board, 'a board whose author wrote a description').toBeTruthy()

    mount((board as Dashboard).id)

    await screen.findByRole('heading', { name: (board as Dashboard).name })
    /* On the record, and the one thing a name and a tile count cannot say. */
    expect(screen.getByText((board as Dashboard).description as string)).toBeInTheDocument()

    /* **The three Amplitude controls that are absent, and why.** A scheduler,
       an ACL model and a telemetry store are all missing, and a control wired
       to none of them is worse than no control. */
    expect(screen.queryByText(/subscribe/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/share/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/views/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /more/i }))
    expect(
      await screen.findByRole('menuitem', { name: copy('rb.dashboard.rename.action') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: copy('rb.dashboards.delete') }),
    ).toBeInTheDocument()
  })

  it('offers an unwritten description as a real control, not as grey prose', async () => {
    const user = userEvent.setup()
    const board = (await boards()).find((row) => row.description === null)
    expect(board, 'a board whose author wrote nothing').toBeTruthy()

    mount((board as Dashboard).id)

    /* §7.4 — a `<button>`, so it is reachable and focusable. An empty
       description is the commonest state of a board somebody else made. */
    const prompt = await screen.findByRole('button', {
      name: copy('rb.dashboard.description.add'),
    })
    await user.click(prompt)
    expect(await screen.findByText(copy('rb.dashboard.rename'))).toBeInTheDocument()
  })
})

/* ───── §9.1 — the corners are logical ───────────────────────────────────── */

describe('under dir="rtl" the tile chrome sits at the logical corners', () => {
  it('keeps the grip at the header’s inline-start and the expand in the action slot', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    const expand = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.expand', report.name),
    })
    const tile = tileOf(expand)

    /* The grip is the FIRST thing in the title row, so it lands inline-start in
       both directions by flow — no `ms-auto`, no `left`, no second rule. It is
       chrome: `aria-hidden`, not focusable, and not the only way to reorder
       (§11.2 rejected a drag grid on exactly that ground). */
    const titleRow = tile.querySelector('[data-slot="card-title"]') as HTMLElement
    const grip = titleRow.querySelector('svg.lucide-grip-vertical')
    expect(grip).not.toBeNull()
    expect(titleRow.firstElementChild).toBe(grip)
    expect(grip?.getAttribute('aria-hidden')).toBe('true')
    expect(grip?.closest('button')).toBeNull()

    /* The expand rides in `CardAction`, whose `justify-self-end` is logical, so
       the corner follows the direction without a mirrored rule. */
    const action = tile.querySelector('[data-slot="card-action"]') as HTMLElement
    expect(action.contains(expand)).toBe(true)
    expect(action.className).toContain('justify-self-end')

    /* §9.5 — neither mark mirrors, and neither is placed by a physical side. */
    const chrome = [grip?.getAttribute('class') ?? '', expand.className, action.className]
    for (const className of chrome) {
      expect(className).not.toMatch(/\b(ml|mr|pl|pr|left|right)-/)
      expect(className).not.toMatch(/rtl:/)
      expect(className).not.toMatch(/scale-x/)
    }
  })

  it('renders the whole board without a physical direction utility on the tile', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    const title = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.open', report.name),
    })
    const tile = tileOf(title)

    await waitFor(() => {
      for (const node of Array.from(tile.querySelectorAll<HTMLElement>('*'))) {
        const className = node.getAttribute('class') ?? ''
        expect(className, `${node.tagName} carries a physical direction`).not.toMatch(
          /(?:^|\s)(?:ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/,
        )
      }
    })
  })
})
